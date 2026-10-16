import { sanitizeData } from './habits.js';

// Google Sheets sync via an Apps Script web app (see apps-script/Code.gs).
// Protocol: POST {token, action:'sync', since, habits[], checkins[]}
//           -> {ok, habits[] (all rows), checkins[] (all rows)}
// We send text/plain so the browser treats it as a "simple" request (no CORS preflight).

const URL_RE = /^https:\/\/script\.google\.com\/[^\s]+\/exec$/;
export const isValidScriptUrl = (u) => URL_RE.test(u);

/** Local records changed since `since` -> flat rows for the sheet. since === 0 sends everything. */
export function toRows(data, since) {
  const dirty = (t) => since === 0 || t > since;
  const habits = data.habits.filter((h) => dirty(h.updatedAt)).map((h) => ({ ...h }));
  const checkins = [];
  for (const [key, v] of Object.entries(data.checkins)) {
    if (!dirty(v.t)) continue;
    const i = key.indexOf('|');
    checkins.push({ habitId: key.slice(0, i), date: key.slice(i + 1), done: v.done, updatedAt: v.t });
  }
  return { habits, checkins };
}

/** Rows from the sheet -> data model. */
export function fromRows(habits, checkins) {
  const map = {};
  for (const r of checkins ?? []) {
    map[`${r.habitId}|${r.date}`] = { done: r.done, t: r.updatedAt };
  }
  return sanitizeData({ habits: habits ?? [], checkins: map });
}

export async function syncRequest({ url, token, since, habits, checkins }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'sync', token, since, habits, checkins }),
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error('Unexpected response — is the script deployed for "Anyone"?');
    }
    if (!json.ok) throw new Error(json.error || 'Sync failed');
    return json;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Sync timed out');
    if (err instanceof TypeError) throw new Error('Network error — check your connection and the script URL');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// A "setup code" lets you move URL + token to another device with one paste.
export const encodeSetup = (url, token) => btoa(JSON.stringify({ u: url, k: token }));

export function decodeSetup(code) {
  try {
    const { u, k } = JSON.parse(atob(code.trim()));
    if (typeof u === 'string' && typeof k === 'string' && isValidScriptUrl(u) && k) {
      return { syncUrl: u, token: k };
    }
  } catch {
    /* fall through */
  }
  return null;
}
