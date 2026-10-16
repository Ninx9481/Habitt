import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildWeeks, formatLong, monthLabels } from '../lib/dates.js';

const CELL = 14;
const GAP = 4;
const STEP = CELL + GAP;
const MONTH_ROW = 16;
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

/**
 * GitHub-style contribution grid (Mon..Sun rows, one column per week, newest week on the right).
 * Hover = tooltip with date + status. Click / tap = pinned tooltip with a button to mark/undo that day.
 * Uses the --habit CSS variables set on the parent card for the filled colour.
 */
export default function Heatmap({ doneSet, today, weeks, onToggle }) {
  const cols = useMemo(() => buildWeeks(today, weeks), [today, weeks]);
  const labels = useMemo(() => monthLabels(cols), [cols]);
  const wrapRef = useRef(null);
  const scrollRef = useRef(null);
  const [tip, setTip] = useState(null); // { date, x, y, pinned }

  // Start scrolled to the newest week (matters on narrow screens)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  // Close a pinned tooltip when tapping anywhere else
  useEffect(() => {
    if (!tip?.pinned) return;
    const close = () => setTip(null);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [tip?.pinned]);

  const show = (e, date, pinned) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = e.currentTarget.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const x = Math.min(Math.max(r.left - w.left + r.width / 2, 64), Math.max(w.width - 64, 64));
    setTip({ date, x, y: r.top - w.top, pinned });
  };

  const tipDone = tip ? doneSet.has(tip.date) : false;

  return (
    <div ref={wrapRef} className="relative flex gap-2">
      {/* weekday labels (fixed, outside the scroll area) */}
      <div
        className="flex shrink-0 flex-col text-[10px] leading-none text-zinc-400 dark:text-zinc-500"
        style={{ paddingTop: MONTH_ROW + 4, gap: GAP }}
        aria-hidden="true"
      >
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="flex items-center" style={{ height: CELL }}>
            {d}
          </div>
        ))}
      </div>

      <div
        ref={scrollRef}
        onScroll={() => tip && setTip(null)}
        className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]"
      >
        <div className="w-max pr-3">
          <div className="relative" style={{ height: MONTH_ROW, marginBottom: 4, width: weeks * STEP }}>
            {labels.map((l) => (
              <span
                key={l.index}
                className="absolute top-0 text-[10px] leading-none text-zinc-400 dark:text-zinc-500"
                style={{ left: l.index * STEP }}
              >
                {l.label}
              </span>
            ))}
          </div>

          <div className="flex" style={{ gap: GAP }}>
            {cols.map((col) => (
              <div key={col[0].date} className="flex flex-col" style={{ gap: GAP }}>
                {col.map((c) => {
                  if (c.future) return <div key={c.date} style={{ width: CELL, height: CELL }} aria-hidden="true" />;
                  const done = doneSet.has(c.date);
                  const isToday = c.date === today;
                  return (
                    <button
                      key={c.date}
                      type="button"
                      tabIndex={-1}
                      aria-label={`${formatLong(c.date)}: ${done ? 'Completed' : 'Not completed'}`}
                      onMouseEnter={(e) => !tip?.pinned && show(e, c.date, false)}
                      onMouseLeave={() => !tip?.pinned && setTip(null)}
                      onClick={(e) => show(e, c.date, true)}
                      style={{ width: CELL, height: CELL }}
                      className={`rounded-[3px] transition-colors duration-200 ${
                        done
                          ? 'bg-[var(--habit)] dark:bg-[var(--habit-dark)]'
                          : 'bg-zinc-200 dark:bg-zinc-700/70'
                      } ${isToday ? 'ring-1 ring-zinc-400 ring-offset-1 ring-offset-white dark:ring-zinc-400 dark:ring-offset-zinc-800' : ''} ${
                        isToday && done ? 'animate-check' : ''
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tip && (
        <div
          className={`absolute z-30 -translate-x-1/2 -translate-y-full rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900 ${
            tip.pinned ? '' : 'pointer-events-none'
          }`}
          style={{ left: tip.x, top: tip.y - 6 }}
          onPointerDown={(e) => e.stopPropagation()}
          role="status"
        >
          <div className="whitespace-nowrap font-medium">{formatLong(tip.date)}</div>
          <div className="whitespace-nowrap opacity-75">{tipDone ? 'Completed' : 'Not completed'}</div>
          {tip.pinned && (
            <button
              type="button"
              onClick={() => onToggle(tip.date)}
              className="mt-1.5 w-full rounded-md bg-white/15 px-2 py-1 text-[11px] font-medium hover:bg-white/25 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/20"
            >
              {tipDone ? 'Undo' : 'Mark as done'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
