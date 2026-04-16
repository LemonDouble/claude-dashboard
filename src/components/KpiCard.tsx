'use client';

import { ReactNode } from 'react';

type Accent = 'default' | 'primary' | 'secondary' | 'destructive';

interface KpiCardProps {
  title: string;
  value: string;
  krw?: string;
  sub?: string;
  icon?: ReactNode;
  accent?: Accent;
}

const accentBar: Record<Accent, string> = {
  default: 'border-l-border',
  primary: 'border-l-primary',
  secondary: 'border-l-secondary',
  destructive: 'border-l-destructive',
};

export function KpiCard({ title, value, krw, sub, icon, accent = 'default' }: KpiCardProps) {
  return (
    <div
      className={`bg-card border border-border border-l-2 ${accentBar[accent]} rounded-xl p-3 flex flex-col gap-1 transition-colors hover:border-primary-dim`}
    >
      <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
        <span>{title}</span>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <div className="text-xl font-semibold text-foreground leading-tight">
        {value}
        {krw && <span className="text-xs font-normal text-muted-foreground/70 ml-1.5">{krw}</span>}
      </div>
      {sub && <div className="text-xs text-muted-foreground/70">{sub}</div>}
    </div>
  );
}
