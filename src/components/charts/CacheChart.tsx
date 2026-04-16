'use client';

import { CacheStats } from '@/types';
import { formatCost, formatDate } from '@/lib/format';
import { DS } from '@/lib/chartPalette';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  data: CacheStats;
}

export function CacheChart({ data }: Props) {
  const chartData = data.daily.map((d) => ({
    date: formatDate(d.date),
    efficiency: Number(d.efficiency.toFixed(1)),
    saved: Number(d.saved.toFixed(4)),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-md p-2 text-xs">
        <div className="text-muted-foreground">{label}</div>
        <div className="text-primary">절약액: {formatCost(payload[0]?.value ?? 0)}</div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fill: DS.axis, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: DS.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `$${v.toFixed(2)}`} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(240, 185, 11, 0.06)' }} />
        <Bar dataKey="saved" fill={DS.lemon} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
