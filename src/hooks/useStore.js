import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadData, saveData, loadSettings, saveSettings, requestPersistence } from '../lib/storage.js';
import { activeHabits, checkinKey, doneSetsByHabit, mergeData, newId, sanitizeData } from '../lib/habits.js';
import { fromRows, syncRequest, toRows } from '../lib/sync.js';

/**
 * Single source of truth: habits + check-ins (persisted to localStorage on every change)
 * and optional background sync with Google Sheets.
 * localStorage is always written first, so the UI never waits for the network.
 */
export function useStore() {
  const [data, setData] = useState(loadData);
  const [settings, setSettings] = useState(loadSettings);
  const [sync, setSync] = useState({ status: 'idle', error: '', at: null });

  const dataRef = useRef(data);
  const settingsRef = useRef(settings);
  const busy = useRef(false);
  const again = useRef(false);
  const timer = useRef(null);
  const lastRun = useRef(0);
  const runSyncRef = useRef(null);

  const configured = Boolean(settings.syncUrl && settings.token);

  // Persist on every change
  useEffect(() => {
    dataRef.current = data;
    saveData(data);
  }, [data]);

  useEffect(() => {
    requestPersistence();
  }, []);

  const updateSettings = useCallback((patch) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next; // update synchronously so a sync started right after sees it
    setSettings(next);
    saveSettings(next);
  }, []);

  // ---------- sync ----------
  const runSync = useCallback(async () => {
    const s = settingsRef.current;
    if (!s.syncUrl || !s.token) return;
    if (busy.current) {
      again.current = true; // something changed mid-flight: go again afterwards
      return;
    }
    busy.current = true;
    lastRun.current = Date.now();
    setSync((p) => ({ ...p, status: 'syncing', error: '' }));
    const startedAt = Date.now();
    try {
      const since = s.lastPush || 0;
      const rows = toRows(dataRef.current, since);
      const res = await syncRequest({ url: s.syncUrl, token: s.token, since, ...rows });
      const remote = fromRows(res.habits, res.checkins);
      setData((d) => mergeData(d, remote));
      // Anything edited after startedAt is still "dirty" and goes out next time
      updateSettings({ lastPush: startedAt - 1 });
      setSync({ status: 'ok', error: '', at: Date.now() });
    } catch (err) {
      setSync((p) => ({ ...p, status: 'error', error: err?.message || 'Sync failed' }));
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        setTimeout(() => runSyncRef.current?.(), 300);
      }
    }
  }, [updateSettings]);

  useEffect(() => {
    runSyncRef.current = runSync;
  }, [runSync]);

  const schedulePush = useCallback(() => {
    if (!settingsRef.current.syncUrl) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => runSyncRef.current?.(), 700);
  }, []);

  // Pull on open, and whenever the app comes back to the foreground
  useEffect(() => {
    const maybe = (force) => {
      const s = settingsRef.current;
      if (!s.syncUrl || !s.token || document.visibilityState !== 'visible') return;
      if (!force && Date.now() - lastRun.current < 15000) return;
      runSyncRef.current?.();
    };
    const onFocus = () => maybe(false);
    maybe(true);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      clearTimeout(timer.current);
    };
  }, []);

  const connect = useCallback(
    ({ syncUrl, token }) => {
      updateSettings({ syncUrl, token, lastPush: 0 }); // lastPush 0 => push everything once
      setSync({ status: 'idle', error: '', at: null });
      runSyncRef.current?.();
    },
    [updateSettings],
  );

  const disconnect = useCallback(() => {
    updateSettings({ syncUrl: '', token: '', lastPush: 0 });
    setSync({ status: 'idle', error: '', at: null });
  }, [updateSettings]);

  // ---------- mutations ----------
  const addHabit = useCallback(
    ({ name, color }) => {
      const now = Date.now();
      const habit = { id: newId(), name: name.trim(), color, createdAt: now, updatedAt: now, deleted: false };
      setData((d) => ({ ...d, habits: [...d.habits, habit] }));
      schedulePush();
    },
    [schedulePush],
  );

  const updateHabit = useCallback(
    (id, { name, color }) => {
      const now = Date.now();
      setData((d) => ({
        ...d,
        habits: d.habits.map((h) => (h.id === id ? { ...h, name: name.trim(), color, updatedAt: now } : h)),
      }));
      schedulePush();
    },
    [schedulePush],
  );

  const deleteHabit = useCallback(
    (id) => {
      const now = Date.now();
      setData((d) => ({
        ...d,
        habits: d.habits.map((h) => (h.id === id ? { ...h, deleted: true, updatedAt: now } : h)),
      }));
      schedulePush();
    },
    [schedulePush],
  );

  const toggleCheckin = useCallback(
    (habitId, date) => {
      const now = Date.now();
      const key = checkinKey(habitId, date);
      setData((d) => ({
        ...d,
        checkins: { ...d.checkins, [key]: { done: !d.checkins[key]?.done, t: now } },
      }));
      schedulePush();
    },
    [schedulePush],
  );

  // ---------- backup ----------
  const exportData = useCallback(
    () => JSON.stringify({ ...dataRef.current, exportedAt: new Date().toISOString() }, null, 2),
    [],
  );

  // Import MERGES into current data (newest edit per record wins) - it never wipes existing data.
  const importData = useCallback(
    (text) => {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('That file is not valid JSON');
      }
      const imported = sanitizeData(parsed);
      setData((d) => mergeData(d, imported));
      updateSettings({ lastPush: 0 }); // make sure imported records also reach the sheet
      schedulePush();
      return {
        habits: imported.habits.filter((h) => !h.deleted).length,
        checkins: Object.values(imported.checkins).filter((c) => c.done).length,
      };
    },
    [schedulePush, updateSettings],
  );

  const habits = useMemo(() => activeHabits(data), [data.habits]); // eslint-disable-line react-hooks/exhaustive-deps
  const doneSets = useMemo(() => doneSetsByHabit(data), [data.checkins]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    habits,
    doneSets,
    settings,
    sync,
    configured,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleCheckin,
    updateSettings,
    syncNow: runSync,
    connect,
    disconnect,
    exportData,
    importData,
  };
}
