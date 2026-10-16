import { emptyData, sanitizeData } from './habits.js';

// All persistence lives here. Swap this module to change where data is stored.
const DATA_KEY = 'habitgrid:data:v2';
const SETTINGS_KEY = 'habitgrid:settings:v1';

export const WEEK_OPTIONS = [12, 26, 52];
export const DEFAULT_SETTINGS = { weeks: 26, syncUrl: '', token: '', lastPush: 0 };

export function loadData() {
  let raw = null;
  try {
    raw = localStorage.getItem(DATA_KEY);
  } catch {
    return emptyData(); // storage blocked
  }
  if (!raw) return emptyData();
  try {
    return sanitizeData(JSON.parse(raw));
  } catch {
    // Corrupt data: keep a copy instead of silently overwriting it on the next save
    try {
      localStorage.setItem(`${DATA_KEY}:corrupt:${Date.now()}`, raw);
    } catch {
      /* ignore */
    }
    return emptyData();
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('Could not save to localStorage', err);
    return false;
  }
}

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      weeks: WEEK_OPTIONS.includes(s.weeks) ? s.weeks : DEFAULT_SETTINGS.weeks,
      syncUrl: typeof s.syncUrl === 'string' ? s.syncUrl : '',
      token: typeof s.token === 'string' ? s.token : '',
      lastPush: Number.isFinite(s.lastPush) ? s.lastPush : 0,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

// Ask the browser not to evict our data under storage pressure (best effort)
export async function requestPersistence() {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
}
