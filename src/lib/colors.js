// Habit colour palette. `light` is used on light backgrounds, `dark` on dark ones.
// `darkFg` is the readable text colour on top of the `dark` shade.
// Components apply these as CSS variables (see colorVars) so Tailwind classes stay static.

export const COLORS = {
  emerald: { label: 'Emerald', light: '#059669', dark: '#10b981', darkFg: '#18181b' },
  indigo: { label: 'Indigo', light: '#4f46e5', dark: '#6366f1', darkFg: '#ffffff' },
  amber: { label: 'Amber', light: '#d97706', dark: '#f59e0b', darkFg: '#18181b' },
  rose: { label: 'Rose', light: '#e11d48', dark: '#f43f5e', darkFg: '#18181b' },
  cyan: { label: 'Cyan', light: '#0891b2', dark: '#06b6d4', darkFg: '#18181b' },
  violet: { label: 'Violet', light: '#7c3aed', dark: '#8b5cf6', darkFg: '#ffffff' },
};

export const COLOR_KEYS = Object.keys(COLORS);

export function colorVars(key) {
  const c = COLORS[key] ?? COLORS.emerald;
  return { '--habit': c.light, '--habit-dark': c.dark, '--habit-fg-dark': c.darkFg };
}
