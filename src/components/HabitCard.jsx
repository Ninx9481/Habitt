import { useMemo, useState } from 'react';
import { Check, Flame, Pencil } from 'lucide-react';
import Heatmap from './Heatmap.jsx';
import { calcStreaks } from '../lib/habits.js';
import { colorVars } from '../lib/colors.js';
import { iconBtn, mutedText } from './ui.js';

const accentText = 'text-[color:var(--habit)] dark:text-[color:var(--habit-dark)]';

export default function HabitCard({ habit, doneSet, today, weeks, onToggle, onEdit }) {
  const [pop, setPop] = useState(false);
  const doneToday = doneSet.has(today);
  const { current, best } = useMemo(() => calcStreaks(doneSet, today), [doneSet, today]);

  const checkIn = () => {
    if (!doneToday) {
      setPop(true);
      setTimeout(() => setPop(false), 400);
      navigator.vibrate?.(12); // light haptic on phones that support it
    }
    onToggle(habit.id, today);
  };

  return (
    <article
      style={colorVars(habit.color)}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-700/70 dark:bg-zinc-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="h-3 w-3 shrink-0 rounded-full bg-[var(--habit)] dark:bg-[var(--habit-dark)]" />
          <h2 className="truncate text-base font-semibold">{habit.name}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`inline-flex items-center gap-1 text-sm ${current > 0 ? 'font-medium' : mutedText}`}>
            <Flame className={`h-4 w-4 ${current > 0 ? accentText : ''}`} />
            {current > 0 ? `${current}-day streak` : 'No streak yet'}
          </span>
          <button type="button" onClick={() => onEdit(habit)} className={iconBtn} aria-label={`Edit ${habit.name}`}>
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={checkIn}
        aria-pressed={doneToday}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-semibold transition active:scale-[0.98] ${
          doneToday
            ? 'border border-slate-200 bg-slate-50 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-300'
            : 'bg-[var(--habit)] text-white shadow-sm hover:brightness-110 dark:bg-[var(--habit-dark)] dark:text-[color:var(--habit-fg-dark)]'
        } ${pop ? 'animate-pop' : ''}`}
      >
        {doneToday ? (
          <>
            <Check className={`animate-check h-5 w-5 ${accentText}`} strokeWidth={3} />
            Done today · tap to undo
          </>
        ) : (
          'Check in today'
        )}
      </button>

      <div className="mt-5">
        <Heatmap doneSet={doneSet} today={today} weeks={weeks} onToggle={(date) => onToggle(habit.id, date)} />
      </div>

      <p className={`mt-1 text-xs ${mutedText}`}>
        Best streak {best} · {doneSet.size} day{doneSet.size === 1 ? '' : 's'} completed
      </p>
    </article>
  );
}
