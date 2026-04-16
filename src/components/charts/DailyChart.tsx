'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { DailyUsage } from '@/types';
import { formatDate, formatCost } from '@/lib/format';
import { useUnitMode } from '@/lib/unitMode';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';

const MODEL_COLORS: Record<string, string> = {
  'claude-opus-4-7': '#fbbf24',
  'claude-opus-4': '#f59e0b',
  'claude-sonnet-4': '#3b82f6',
  'claude-3-5-sonnet': '#6366f1',
  'claude-3-5-haiku': '#10b981',
  'claude-3-haiku': '#22d3ee',
  'claude-3-opus': '#f97316',
};
const DEFAULT_COLOR = '#8b5cf6';

interface Props {
  data: DailyUsage[];
  mode: 'cost' | 'tokens' | 'cumulative';
}

export function DailyChart({ data, mode }: Props) {
  const { fmt } = useUnitMode();
  const [granularity, setGranularity] = useState<'daily' | 'hourly'>('daily');
  const { data: hourlyCosts } = useSWR<{ datetime: string; cost: number }[]>(
    mode === 'cumulative' && granularity === 'hourly' ? '/api/hourly-costs' : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  // ── 누적 모드 ──
  if (mode === 'cumulative') {
    // 일별 누적
    let runningDaily = 0;
    const cumDaily = data.map((d) => ({
      label: formatDate(d.date),
      cumCost: Number((runningDaily += d.totalCost).toFixed(4)),
      delta: Number(d.totalCost.toFixed(4)),
    }));
    const peakDaily = cumDaily.reduce((best, d) => d.delta > best.delta ? d : best, cumDaily[0]);

    // 시간별 누적
    let runningHourly = 0;
    const cumHourly = (hourlyCosts ?? []).map((h) => ({
      label: h.datetime.slice(5), // "MM-DD HH"
      cumCost: Number((runningHourly += h.cost).toFixed(4)),
      delta: Number(h.cost.toFixed(4)),
    }));
    const peakHourly = cumHourly.length ? cumHourly.reduce((best, d) => d.delta > best.delta ? d : best, cumHourly[0]) : null;

    const isHourly = granularity === 'hourly';
    const cumData = isHourly ? cumHourly : cumDaily;
    const peak = isHourly ? peakHourly : peakDaily;

    const CumTooltip = ({ active, payload, label }: any) => {
      if (!active || !payload?.length) return null;
      const d = payload[0]?.payload;
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xs">
          <div className="font-semibold text-white mb-1">{label}</div>
          <div className="text-blue-400">누적 {formatCost(d.cumCost)}</div>
          <div className="text-zinc-400">{isHourly ? '해당 시간' : '당일'} +{formatCost(d.delta)}</div>
        </div>
      );
    };

    return (
      <div className="flex flex-col h-full gap-1">
        <div className="flex gap-1 justify-end shrink-0">
          {(['daily', 'hourly'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${granularity === g ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {g === 'daily' ? '일별' : '시간별'}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={48}
                tickFormatter={(v) => v >= 100 ? `$${Math.round(v)}` : `$${v.toFixed(1)}`} />
              <Tooltip content={<CumTooltip />} />
              {peak && (
                <ReferenceLine
                  x={peak.label}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  label={{ value: `최고 +${formatCost(peak.delta)}`, fill: '#f59e0b', fontSize: 9, position: 'top' }}
                />
              )}
              <Area type="monotone" dataKey="cumCost" stroke="#3b82f6" fill="url(#cumGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ── 비용 / 토큰 모드 ──
  const modelFamilies = Array.from(
    new Set(data.flatMap((d) => Object.keys(d.modelBreakdown)))
  );

  const chartData = data.map((d) => {
    const point: Record<string, number | string> = { date: formatDate(d.date) };
    for (const m of modelFamilies) {
      const mu = d.modelBreakdown[m];
      point[m] = mu ? (mode === 'cost' ? Number(mu.totalCost.toFixed(4)) : mu.totalTokens) : 0;
    }
    return point;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value as number), 0);
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xs">
        <div className="font-semibold text-white mb-1">{label}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-3" style={{ color: p.fill }}>
            <span>{p.dataKey}</span>
            <span>{mode === 'cost' ? formatCost(p.value) : fmt(p.value)}</span>
          </div>
        ))}
        <div className="border-t border-zinc-600 mt-1 pt-1 text-white">
          합계: {mode === 'cost' ? formatCost(total) : fmt(total)}
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={40}
          tickFormatter={(v) => mode === 'cost' ? `$${v.toFixed(2)}` : fmt(v)} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Legend wrapperStyle={{ fontSize: 10, color: '#a1a1aa' }}
          formatter={(value) => <span style={{ color: MODEL_COLORS[value] || DEFAULT_COLOR }}>{value}</span>} />
        {modelFamilies.map((m) => (
          <Bar key={m} dataKey={m} stackId="a" fill={MODEL_COLORS[m] || DEFAULT_COLOR} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
