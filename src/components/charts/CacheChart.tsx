'use client';

import { CacheStats } from '@/types';
import { formatCost, formatDate } from '@/lib/format';
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
      <div className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xs">
        <div className="text-zinc-400">{label}</div>
        <div className="text-emerald-400">절약액: {formatCost(payload[0]?.value ?? 0)}</div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `$${v.toFixed(2)}`} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="saved" fill="#10b981" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
