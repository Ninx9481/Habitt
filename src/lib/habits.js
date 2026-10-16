import { COLOR_KEYS } from './colors.js';
import { dayNumber } from './dates.js';

/*
 * Data model (version 2)
 * {
 *   version: 2,
 *   habits:   [{ id, name, color, createdAt(ms), updatedAt(ms), deleted }],
 *   checkins: { "<habitId>|YYYY-MM-DD": { done: boolean, t: updatedAtMs } }
 * }
 * Every record carries its own timestamp so two devices can be merged
 * record-by-record (newest edit wins). Deletes are soft (tombstones) so
 * they propagate to other devices.
 */

export const DATA_VERSION = 2;
const KEY_RE = /^[^|]+\|\d{4}-\d{2}-\d{2}$/;

export const emptyData = () => ({ version: DATA_VERSION, habits: [], checkins: {} });

export const checkinKey = (habitId, date) => `${habitId}|${date}`;

export function newId() {
  // randomUUID only exists in secure contexts (https / localhost)
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

const num = (x, fallback) => (Number.isFinite(Number(x)) ? Number(x) : fallback);

/** Validate + normalise untrusted data (localStorage, import file, server). Throws if unusable. */
export function sanitizeData(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.habits)) {
    throw new Error('This is not a Habit Grid backup file');
  }
  const habits = [];
  const seen = new Set();
  for (const h of raw.habits) {
    if (!h || typeof h.id !== 'string' || !h.id || h.id.includes('|') || seen.has(h.id)) continue;
    seen.add(h.id);
    habits.push({
      id: h.id,
      name: String(h.name ?? '').slice(0, 80) || 'Untitled',
      color: COLOR_KEYS.includes(h.color) ? h.color : 'emerald',
      createdAt: num(h.createdAt, Date.now()),
      updatedAt: num(h.updatedAt, 0),
      deleted: h.deleted === true,
    });
  }
  const checkins = {};
  const src = raw.checkins && typeof raw.checkins === 'object' ? raw.checkins : {};
  for (const [k, v] of Object.entries(src)) {
    if (!KEY_RE.test(k) || !v || typeof v !== 'object') continue;
    checkins[k] = { done: v.done === true, t: num(v.t, 0) };
  }
  return { version: DATA_VERSION, habits, checkins };
}

/** Merge b into a, record by record, newest timestamp wins. Returns `a` itself if nothing changed. */
export function mergeData(a, b) {
  let changed = false;
  const byId = new Map(a.habits.map((h) => [h.id, h]));
  for (const h of b.habits) {
    const cur = byId.get(h.id);
    if (!cur || h.updatedAt > cur.updatedAt) {
      byId.set(h.id, h);
      changed = true;
    }
  }
  let checkins = a.checkins;
  for (const [k, v] of Object.entries(b.checkins)) {
    const cur = checkins[k];
    if (!cur || v.t > cur.t) {
      if (checkins === a.checkins) checkins = { ...a.checkins };
      checkins[k] = v;
      changed = true;
    }
  }
  return changed ? { version: DATA_VERSION, habits: [...byId.values()], checkins } : a;
}

/** Visible habits, oldest first. */
export function activeHabits(data) {
  return data.habits
    .filter((h) => !h.deleted)
    .sort((x, y) => x.createdAt - y.createdAt || (x.id < y.id ? -1 : 1));
}

/** Map<habitId, Set<'YYYY-MM-DD'>> of completed days. */
export function doneSetsByHabit(data) {
  const map = new Map();
  for (const [key, v] of Object.entries(data.checkins)) {
    if (!v.done) continue;
    const i = key.indexOf('|');
    const id = key.slice(0, i);
    if (!map.has(id)) map.set(id, new Set());
    map.get(id).add(key.slice(i + 1));
  }
  return map;
}

/**
 * Current + best streak.
 * The current streak stays alive if you haven't checked in *yet* today:
 * it counts back from yesterday until the day actually ends.
 */
export function calcStreaks(doneSet, today) {
  const nums = [...doneSet].map(dayNumber).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = null;
  for (const n of nums) {
    run = prev !== null && n === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = n;
  }
  const set = new Set(nums);
  const t = dayNumber(today);
  let cursor = set.has(t) ? t : t - 1;
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor--;
  }
  return { current, best };
}
