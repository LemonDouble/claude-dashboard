'use client';

import { Projection } from '@/types';
import { formatDate, formatCost } from '@/lib/format';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface Props {
  data: Projection[];
}

export function ProjectionChart({ data }: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const chartData = data.map((p) => ({
    date: formatDate(p.date),
    rawDate: p.date,
    actual: !p.isProjected ? Number(p.projectedCost.toFixed(4)) : null,
    projected: p.isProjected ? Number(p.projectedCost.toFixed(4)) : null,
  }));

  const todayIdx = chartData.findLastIndex((d) => !d.projected);

  // 경계 포인트에 projected 값도 채워서 두 선을 이어줌
  if (todayIdx >= 0 && chartData[todayIdx]) {
    chartData[todayIdx] = { ...chartData[todayIdx], projected: chartData[todayIdx].actual };
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value ?? payload[1]?.value;
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xs">
        <div className="text-zinc-400">{label}</div>
        <div className="text-white font-semibold">{formatCost(val)}</div>
        <div className="text-zinc-500">{payload[0]?.name === 'projected' ? 'projected' : 'actual'}</div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fill: '#71717a', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#71717a', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(v) => v >= 100 ? `$${Math.round(v)}` : `$${v.toFixed(1)}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="actual"
          name="actual"
          stroke="#3b82f6"
          fill="url(#actualGrad)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Area
          type="monotone"
          dataKey="projected"
          name="projected"
          stroke="#8b5cf6"
          fill="url(#projGrad)"
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 4"
          connectNulls={false}
        />
        {todayIdx >= 0 && (
          <ReferenceLine
            x={chartData[todayIdx]?.date}
            stroke="#52525b"
            strokeDasharray="3 3"
            label={{ value: 'today', fill: '#71717a', fontSize: 9, position: 'top' }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
