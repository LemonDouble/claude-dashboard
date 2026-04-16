'use client';

import { Projection } from '@/types';
import { formatDate, formatCost } from '@/lib/format';
import { DS } from '@/lib/chartPalette';
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
      <div className="bg-card border border-border rounded-md p-2 text-xs">
        <div className="text-muted-foreground">{label}</div>
        <div className="text-foreground font-semibold">{formatCost(val)}</div>
        <div className="text-muted-foreground/70">{payload[0]?.name === 'projected' ? 'projected' : 'actual'}</div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={DS.lemon} stopOpacity={0.32} />
            <stop offset="95%" stopColor={DS.lemon} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={DS.coral} stopOpacity={0.22} />
            <stop offset="95%" stopColor={DS.coral} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fill: DS.axis, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: DS.axis, fontSize: 10 }}
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
          stroke={DS.lemon}
          fill="url(#actualGrad)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Area
          type="monotone"
          dataKey="projected"
          name="projected"
          stroke={DS.coral}
          fill="url(#projGrad)"
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 4"
          connectNulls={false}
        />
        {todayIdx >= 0 && (
          <ReferenceLine
            x={chartData[todayIdx]?.date}
            stroke={DS.axisDim}
            strokeDasharray="3 3"
            label={{ value: 'today', fill: DS.axis, fontSize: 9, position: 'top' }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
