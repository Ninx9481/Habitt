import { useCallback, useState } from 'react';
import { Cloud, CloudOff, Plus, RefreshCw, Settings } from 'lucide-react';
import { useStore } from './hooks/useStore.js';
import { useTheme } from './hooks/useTheme.js';
import { useToday } from './hooks/useToday.js';
import { formatLong } from './lib/dates.js';
import HabitCard from './components/HabitCard.jsx';
import HabitModal from './components/HabitModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { iconBtn, mutedText } from './components/ui.js';

const EMPTY = new Set();

export default function App() {
  const store = useStore();
  const today = useToday();
  const [theme, setTheme] = useTheme();
  const [editing, setEditing] = useState(null); // null | 'new' | habit
  const [showSettings, setShowSettings] = useState(false);

  const { habits, doneSets, settings, sync, configured, updateSettings } = store;
  const doneCount = habits.filter((h) => doneSets.get(h.id)?.has(today)).length;

  const closeEditor = useCallback(() => setEditing(null), []);
  const openEditor = useCallback((h) => setEditing(h), []);

  const saveHabit = (values) => {
    if (editing === 'new') store.addHabit(values);
    else store.updateHabit(editing.id, values);
    setEditing(null);
  };

  const removeHabit = () => {
    store.deleteHabit(editing.id);
    setEditing(null);
  };

  // Grid visibility is a per-device preference (stored in settings, not synced)
  const toggleGrid = (id) => {
    const next = { ...settings.hiddenGrids };
    if (next[id]) delete next[id];
    else next[id] = true;
    updateSettings({ hiddenGrids: next });
  };
  const setAllGrids = (hide) =>
    updateSettings({ hiddenGrids: hide ? Object.fromEntries(habits.map((h) => [h.id, true])) : {} });

  const SyncIcon = sync.status === 'syncing' ? RefreshCw : sync.status === 'error' ? CloudOff : Cloud;
  const syncTitle =
    sync.status === 'error' ? `Sync failed: ${sync.error} (tap to retry)` : sync.status === 'syncing' ? 'Syncing…' : 'Sync now';

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:pt-10">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Habit Grid</h1>
          <p className={`text-sm ${mutedText}`}>{formatLong(today)}</p>
        </div>
        <div className="flex items-center gap-1">
          {configured && (
            <button type="button" onClick={store.syncNow} className={iconBtn} aria-label={syncTitle} title={syncTitle}>
              <SyncIcon
                className={`h-[18px] w-[18px] ${sync.status === 'syncing' ? 'animate-spin' : ''} ${
                  sync.status === 'error' ? 'text-rose-500' : ''
                }`}
              />
            </button>
          )}
          <button type="button" onClick={() => setShowSettings(true)} className={iconBtn} aria-label="Settings" title="Settings">
            <Settings className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      <div className="mt-7 flex items-center justify-between gap-3">
        <p className={`text-sm ${mutedText}`}>
          {habits.length > 0 ? `${doneCount} of ${habits.length} done today` : ''}
        </p>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <Plus className="h-4 w-4" />
          Add habit
        </button>
      </div>

      <main className="mt-4 space-y-4">
        {habits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-zinc-700">
            <p className="font-medium">No habits yet</p>
            <p className={`mt-1 text-sm ${mutedText}`}>Add one, then tap “Check in today” each day to fill your grid.</p>
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              <Plus className="h-4 w-4" />
              Add New Habit
            </button>
          </div>
        ) : (
          habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              doneSet={doneSets.get(h.id) ?? EMPTY}
              today={today}
              weeks={settings.weeks}
              gridHidden={Boolean(settings.hiddenGrids[h.id])}
              onToggleGrid={toggleGrid}
              onToggle={store.toggleCheckin}
              onEdit={openEditor}
            />
          ))
        )}
      </main>

      {editing && (
        <HabitModal
          key={editing === 'new' ? 'new' : editing.id}
          habit={editing === 'new' ? null : editing}
          onSave={saveHabit}
          onDelete={removeHabit}
          onClose={closeEditor}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          sync={sync}
          configured={configured}
          theme={theme}
          onTheme={setTheme}
          onGridsAll={setAllGrids}
          onWeeks={(weeks) => updateSettings({ weeks })}
          onConnect={store.connect}
          onDisconnect={store.disconnect}
          onSyncNow={store.syncNow}
          onExport={store.exportData}
          onImport={store.importData}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
