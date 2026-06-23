// Level configuration for the PASS Mentoring System
// Levels 12-23 represent organizational hierarchy levels

export const LEVEL_CONFIG: Record<number, { label: string; color: string; bgColor: string }> = {
  12: { label: 'Level 12', color: 'text-purple-800', bgColor: 'bg-purple-100' },
  13: { label: 'Level 13', color: 'text-indigo-800', bgColor: 'bg-indigo-100' },
  14: { label: 'Level 14', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  15: { label: 'Level 15', color: 'text-sky-800', bgColor: 'bg-sky-100' },
  16: { label: 'Level 16', color: 'text-cyan-800', bgColor: 'bg-cyan-100' },
  17: { label: 'Level 17', color: 'text-teal-800', bgColor: 'bg-teal-100' },
  18: { label: 'Level 18', color: 'text-emerald-800', bgColor: 'bg-emerald-100' },
  19: { label: 'Level 19', color: 'text-green-800', bgColor: 'bg-green-100' },
  20: { label: 'Level 20', color: 'text-amber-800', bgColor: 'bg-amber-100' },
  21: { label: 'Level 21', color: 'text-orange-800', bgColor: 'bg-orange-100' },
  22: { label: 'Level 22', color: 'text-rose-800', bgColor: 'bg-rose-100' },
  23: { label: 'Level 23', color: 'text-red-800', bgColor: 'bg-red-100' },
};

export const LEVEL_OPTIONS = Object.entries(LEVEL_CONFIG).map(([value, config]) => ({
  value: parseInt(value),
  label: config.label,
}));

export function getLevelBadge(level: number | null | undefined) {
  if (!level || !LEVEL_CONFIG[level]) return null;
  return LEVEL_CONFIG[level];
}