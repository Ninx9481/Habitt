// Date helpers. All dates are LOCAL calendar days stored as "YYYY-MM-DD".
// We never use toISOString(): it converts to UTC and would shift the day
// for users in UTC+7 who check in early in the morning.

const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayStr = () => toDateStr(new Date());

export function parseDateStr(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toDateStr(parseDateStr(s)) === s;
}

export function addDays(s, n) {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n); // local-calendar arithmetic, safe across DST
  return toDateStr(d);
}

// Whole-day index (UTC based, so consecutive days always differ by exactly 1)
export function dayNumber(s) {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// Monday = 0 ... Sunday = 6
export const weekdayMon0 = (s) => (parseDateStr(s).getDay() + 6) % 7;

/**
 * Build the heatmap grid: `weeks` columns x 7 rows (Mon..Sun).
 * The last column is the current week; days after `today` are flagged `future`.
 */
export function buildWeeks(today, weeks) {
  const start = addDays(today, -((weeks - 1) * 7 + weekdayMon0(today)));
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      col.push({ date, future: date > today }); // ISO strings compare chronologically
    }
    cols.push(col);
  }
  return cols;
}

// Month labels placed above the first column of each new month
export function monthLabels(cols) {
  const out = [];
  let last = -1;
  cols.forEach((col, i) => {
    const m = Number(col[0].date.slice(5, 7)) - 1;
    if (m !== last) {
      out.push({ index: i, label: MONTHS[m] });
      last = m;
    }
  });
  // drop a label if the next one would overlap it
  return out.filter((l, i) => i === out.length - 1 || out[i + 1].index - l.index >= 3);
}

const longFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
export const formatLong = (s) => longFmt.format(parseDateStr(s));

export const formatTime = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
