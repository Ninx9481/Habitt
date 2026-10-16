import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import Modal from './Modal.jsx';
import { COLORS, COLOR_KEYS, colorVars } from '../lib/colors.js';
import { btnDanger, btnPrimary, btnSecondary, inputCls } from './ui.js';

// Used for both "Add New Habit" (habit = null) and editing an existing one.
export default function HabitModal({ habit, onSave, onDelete, onClose }) {
  const [name, setName] = useState(habit?.name ?? '');
  const [color, setColor] = useState(habit?.color ?? 'emerald');
  const [confirming, setConfirming] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSave({ name: trimmed, color });
  };

  return (
    <Modal title={habit ? 'Edit habit' : 'Add new habit'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="habit-name" className="mb-1.5 block text-sm font-medium">
            Name
          </label>
          <input
            id="habit-name"
            autoFocus
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Read 20 minutes"
            className={inputCls}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium">Colour</span>
          <div className="grid grid-cols-6 justify-items-center gap-2.5 sm:grid-cols-9" role="radiogroup" aria-label="Colour">
            {COLOR_KEYS.map((key) => {
              const selected = color === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={COLORS[key].label}
                  title={COLORS[key].label}
                  onClick={() => setColor(key)}
                  style={colorVars(key)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-[var(--habit)] text-[color:var(--habit-fg)] transition active:scale-95 dark:bg-[var(--habit-dark)] dark:text-[color:var(--habit-fg-dark)] ${
                    selected ? 'ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-800' : ''
                  }`}
                >
                  {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {habit ? (
            <button
              type="button"
              className={btnDanger}
              onClick={() => (confirming ? onDelete() : setConfirming(true))}
            >
              <Trash2 className="h-4 w-4" />
              {confirming ? 'Tap again to delete' : 'Delete'}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={!name.trim()}>
              {habit ? 'Save' : 'Add habit'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
