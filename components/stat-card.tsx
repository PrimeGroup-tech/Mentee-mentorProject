'use client';

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: 'navy' | 'orange' | 'green' | 'blue' | 'purple' | 'amber' | 'emerald';
}

const colorMap = {
  navy: {
    bg: 'bg-[hsl(211,100%,28%)]/10',
    icon: 'bg-[hsl(211,100%,28%)] text-white',
    text: 'text-[hsl(211,100%,28%)]',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-[hsl(22,100%,58%)] text-white',
    text: 'text-[hsl(22,100%,58%)]',
  },
  green: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-600 text-white',
    text: 'text-emerald-700',
  },
  blue: {
    bg: 'bg-sky-50',
    icon: 'bg-sky-600 text-white',
    text: 'text-sky-700',
  },
  purple: {
    bg: 'bg-violet-50',
    icon: 'bg-violet-600 text-white',
    text: 'text-violet-700',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-600 text-white',
    text: 'text-amber-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-600 text-white',
    text: 'text-emerald-700',
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colors = colorMap[color];
  return (
    <div className={`rounded-xl p-5 ${colors.bg} border border-transparent hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colors.icon} shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
