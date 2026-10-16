import { Monitor, Moon, Sun } from 'lucide-react';

const OPTIONS = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

// Segmented control, lives in Settings -> Appearance
export default function ThemeToggle({ theme, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-zinc-700" role="group" aria-label="Theme">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
