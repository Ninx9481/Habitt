/**
 * Habit Grid — Google Sheets sync endpoint (Google Apps Script web app)
 *
 * Setup (see README.md for the full walkthrough):
 *   1. Create a Google Sheet, then Extensions > Apps Script, and paste this file.
 *   2. Change TOKEN below to a long random string.
 *   3. Run `setup` once (authorises the script and creates the two tabs).
 *   4. Deploy > New deployment > Web app
 *        Execute as: Me      Who has access: Anyone
 *   5. Copy the web app URL (ends with /exec) into the app's Settings, with the same token.
 *
 * The sheet gets two tabs:
 *   habits   : id | name | color | createdAt | updatedAt | deleted
 *   checkins : habitId | date | done | updatedAt
 *
 * Conflict rule: per row, the highest updatedAt wins. Rows are never removed
 * (deleted habits are flagged deleted=TRUE) so deletions reach every device.
 */

const TOKEN = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING';

const SCHEMAS = {
  habits: [
    ['id', 'text'],
    ['name', 'text'],
    ['color', 'text'],
    ['createdAt', 'number'],
    ['updatedAt', 'number'],
    ['deleted', 'bool'],
  ],
  checkins: [
    ['habitId', 'text'],
    ['date', 'text'],
    ['done', 'bool'],
    ['updatedAt', 'number'],
  ],
};

const KEY_OF = {
  habits: (o) => o.id,
  checkins: (o) => o.habitId + '|' + o.date,
};

/** Run once from the editor: creates the tabs and triggers the authorisation prompt. */
function setup() {
  Object.keys(SCHEMAS).forEach(getSheet_);
}

/** Opening the /exec URL in a browser just confirms the deployment is alive. */
function doGet() {
  return json_({ ok: true, service: 'habit-grid-sync', hint: 'The app talks to this URL with POST.' });
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (TOKEN === 'CHANGE_ME_TO_A_LONG_RANDOM_STRING') {
      return json_({ ok: false, error: 'Set TOKEN in Code.gs and redeploy a new version' });
    }
    if (req.token !== TOKEN) return json_({ ok: false, error: 'Wrong token' });
    if (req.action !== 'sync') return json_({ ok: false, error: 'Unknown action' });

    const lock = LockService.getScriptLock();
    lock.waitLock(25000); // two devices syncing at once are queued, not interleaved
    try {
      const habits = syncTable_('habits', req.habits);
      const checkins = syncTable_('checkins', req.checkins);
      return json_({ ok: true, serverTime: Date.now(), habits: habits, checkins: checkins });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

// ---------------------------------------------------------------- helpers

/** Merge `incoming` rows into the sheet (newest updatedAt wins) and return every row. */
function syncTable_(name, incoming) {
  const schema = SCHEMAS[name];
  const keyOf = KEY_OF[name];
  const sheet = getSheet_(name);

  const last = sheet.getLastRow();
  const raw = last > 1 ? sheet.getRange(2, 1, last - 1, schema.length).getValues() : [];

  const rows = [];
  const index = {};
  raw.forEach((r) => {
    const o = toObject_(schema, r);
    if (!isValid_(name, o)) return; // skips blank / junk rows
    index[keyOf(o)] = rows.length;
    rows.push(o);
  });

  let changed = false;
  (Array.isArray(incoming) ? incoming : []).forEach((inc) => {
    if (!inc || typeof inc !== 'object') return;
    const o = toObject_(schema, schema.map((c) => inc[c[0]]));
    if (!isValid_(name, o)) return;
    const k = keyOf(o);
    if (k in index) {
      if (o.updatedAt > rows[index[k]].updatedAt) {
        rows[index[k]] = o;
        changed = true;
      }
    } else {
      index[k] = rows.length;
      rows.push(o);
      changed = true;
    }
  });

  if (changed) writeRows_(sheet, schema, rows);
  return rows;
}

function isValid_(name, o) {
  if (name === 'habits') return !!o.id && o.id.indexOf('|') === -1;
  return !!o.habitId && o.habitId.indexOf('|') === -1 && /^\d{4}-\d{2}-\d{2}$/.test(o.date);
}

function toObject_(schema, values) {
  const o = {};
  schema.forEach((c, i) => {
    o[c[0]] = coerce_(c[1], values[i]);
  });
  return o;
}

function coerce_(type, v) {
  if (type === 'number') {
    const n = Number(v);
    return isFinite(n) ? n : 0;
  }
  if (type === 'bool') return v === true || String(v).toLowerCase() === 'true';
  // Sheets may auto-convert "2026-10-17" into a Date if someone edits a cell by hand
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : String(v);
}

function writeRows_(sheet, schema, rows) {
  const n = rows.length;
  const cols = schema.length;

  const body = sheet.getLastRow() - 1;
  if (body > 0) sheet.getRange(2, 1, body, cols).clearContent();
  if (n === 0) return;

  if (sheet.getMaxRows() < n + 1) sheet.insertRowsAfter(sheet.getMaxRows(), n + 1 - sheet.getMaxRows());

  // Plain-text format keeps ids, names and dates from being "helpfully" converted
  // (e.g. a habit named 2024 -> number, 2026-10-17 -> date) and blocks formula injection.
  schema.forEach((c, j) => {
    const fmt = c[1] === 'text' ? '@' : c[1] === 'number' ? '0' : 'General';
    sheet.getRange(2, j + 1, n, 1).setNumberFormat(fmt);
  });

  sheet.getRange(2, 1, n, cols).setValues(rows.map((o) => schema.map((c) => o[c[0]])));
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const headers = SCHEMAS[name].map((c) => c[0]);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
