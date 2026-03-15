'use client';

import { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  krw?: string;
  sub?: string;
  icon?: ReactNode;
  accent?: 'default' | 'green' | 'yellow' | 'red' | 'blue';
}

const accentMap = {
  default: 'border-zinc-700',
  green: 'border-emerald-500',
  yellow: 'border-yellow-500',
  red: 'border-red-500',
  blue: 'border-blue-500',
};

export function KpiCard({ title, value, krw, sub, icon, accent = 'default' }: KpiCardProps) {
  return (
    <div className={`bg-zinc-900 border ${accentMap[accent]} border-l-2 rounded-lg p-3 flex flex-col gap-1`}>
      <div className="flex items-center justify-between text-zinc-400 text-xs">
        <span>{title}</span>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <div className="text-xl font-bold text-white leading-tight">
        {value}
        {krw && <span className="text-xs font-normal text-zinc-500 ml-1.5">{krw}</span>}
      </div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}
