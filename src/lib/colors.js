// Habit colour palette (Tailwind shades). `light` (600) is used on light backgrounds,
// `dark` (500) on dark ones. Text colour on top of each shade is picked automatically
// for readability. Components apply these as CSS variables (see colorVars) so
// Tailwind classes stay static. To add a colour, add one line to COLORS.

const FG_DARK = '#18181b';

function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// light mode: prefer white text unless it would be hard to read
const fgOnLight = (hex) => (contrast(hex, '#ffffff') >= 3 ? '#ffffff' : FG_DARK);
// dark mode: whichever of white / near-black reads better
const fgOnDark = (hex) => (contrast(hex, '#ffffff') >= contrast(hex, FG_DARK) ? '#ffffff' : FG_DARK);

const c = (label, light, dark) => ({ label, light, dark, fg: fgOnLight(light), darkFg: fgOnDark(dark) });

export const COLORS = {
  red: c('Red', '#dc2626', '#ef4444'),
  orange: c('Orange', '#ea580c', '#f97316'),
  amber: c('Amber', '#d97706', '#f59e0b'),
  yellow: c('Yellow', '#ca8a04', '#eab308'),
  lime: c('Lime', '#65a30d', '#84cc16'),
  green: c('Green', '#16a34a', '#22c55e'),
  emerald: c('Emerald', '#059669', '#10b981'),
  teal: c('Teal', '#0d9488', '#14b8a6'),
  cyan: c('Cyan', '#0891b2', '#06b6d4'),
  sky: c('Sky', '#0284c7', '#0ea5e9'),
  blue: c('Blue', '#2563eb', '#3b82f6'),
  indigo: c('Indigo', '#4f46e5', '#6366f1'),
  violet: c('Violet', '#7c3aed', '#8b5cf6'),
  purple: c('Purple', '#9333ea', '#a855f7'),
  fuchsia: c('Fuchsia', '#c026d3', '#d946ef'),
  pink: c('Pink', '#db2777', '#ec4899'),
  rose: c('Rose', '#e11d48', '#f43f5e'),
  slate: c('Slate', '#475569', '#64748b'),
};

export const COLOR_KEYS = Object.keys(COLORS);

export function colorVars(key) {
  const col = COLORS[key] ?? COLORS.emerald;
  return {
    '--habit': col.light,
    '--habit-dark': col.dark,
    '--habit-fg': col.fg,
    '--habit-fg-dark': col.darkFg,
  };
}
