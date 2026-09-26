'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { BucketUsage, Granularity, BucketPeriod } from '@/types';
import { formatCost } from '@/lib/format';
import { useUnitMode } from '@/lib/unitMode';
import { DS, modelColor } from '@/lib/chartPalette';
import {
  PERIODS_BY_GRANULARITY,
  DEFAULT_PERIOD,
  GRANULARITY_LABELS,
  PERIOD_LABELS,
  bucketLabel,
} from '@/lib/buckets';
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
  TooltipContentProps,
} from 'recharts';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  mode: 'cost' | 'tokens' | 'cumulative';
}

const DELTA_LABELS: Record<Granularity, string> = {
  hour: '해당 시간',
  day: '당일',
  week: '해당 주',
  month: '해당 월',
};

export function UsageTrendChart({ mode }: Props) {
  const { fmt } = useUnitMode();
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [period, setPeriod] = useState<BucketPeriod>('30d');

  const { data } = useSWR<BucketUsage[]>(
    `/api/usage-buckets?granularity=${granularity}&period=${period}`,
    fetcher,
    { refreshInterval: 30_000, keepPreviousData: true }
  );
  const buckets = data ?? [];

  const selectGranularity = (g: Granularity) => {
    setGranularity(g);
    if (!PERIODS_BY_GRANULARITY[g].includes(period)) setPeriod(DEFAULT_PERIOD[g]);
  };

  const btnClass = (active: boolean) =>
    `text-xs font-medium px-2 py-0.5 rounded-md transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`;

  const controls = (
    <div className="flex items-center gap-2 justify-end shrink-0">
      <div className="flex gap-1">
        {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((g) => (
          <button key={g} onClick={() => selectGranularity(g)} className={btnClass(granularity === g)}>
            {GRANULARITY_LABELS[g]}
          </button>
        ))}
      </div>
      <span className="text-foreground/25 text-xs select-none">|</span>
      <div className="flex gap-1">
        {PERIODS_BY_GRANULARITY[granularity].map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={btnClass(period === p)}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
    </div>
  );

  const tickLabel = (bucket: string) => bucketLabel(bucket, granularity, period);

  // ── 누적 모드 ──
  if (mode === 'cumulative') {
    const cumData = buckets.reduce<{ bucket: string; cumCost: number; delta: number }[]>((points, bucket) => {
      const cumCost = (points.at(-1)?.cumCost ?? 0) + bucket.totalCost;
      return [...points, { bucket: bucket.bucket, cumCost, delta: bucket.totalCost }];
    }, []);
    const peak = cumData.length
      ? cumData.reduce((best, d) => (d.delta > best.delta ? d : best), cumData[0])
      : null;

    const renderCumulativeTooltip = ({ active, payload, label }: TooltipContentProps) => {
      if (!active || !payload?.length) return null;
      const d = payload[0]?.payload;
      return (
        <div className="bg-card border border-border rounded-md p-2 text-xs">
          <div className="font-semibold text-foreground mb-1">{label}</div>
          <div className="text-primary">누적 {formatCost(d.cumCost)}</div>
          <div className="text-muted-foreground">{DELTA_LABELS[granularity]} +{formatCost(d.delta)}</div>
        </div>
      );
    };

    return (
      <div className="flex flex-col h-full gap-1">
        {controls}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DS.lemon} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={DS.lemon} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="bucket" tick={{ fill: DS.axis, fontSize: 10 }} axisLine={false} tickLine={false}
                interval="preserveStartEnd" tickFormatter={tickLabel} />
              <YAxis tick={{ fill: DS.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={48}
                tickFormatter={(v) => v >= 100 ? `$${Math.round(v)}` : `$${v.toFixed(1)}`} />
              <Tooltip content={renderCumulativeTooltip} />
              {peak && (
                <ReferenceLine
                  x={peak.bucket}
                  stroke={DS.coral}
                  strokeDasharray="3 3"
                  label={{ value: `최고 +${formatCost(peak.delta)}`, fill: DS.coral, fontSize: 9, position: 'top' }}
                />
              )}
              <Area type="monotone" dataKey="cumCost" stroke={DS.lemon} fill="url(#cumGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ── 비용 / 토큰 모드 ──
  const modelFamilies = Array.from(
    new Set(buckets.flatMap((b) => Object.keys(b.modelBreakdown)))
  );

  const chartData = buckets.map((b) => {
    const point: Record<string, number | string> = { bucket: b.bucket };
    for (const m of modelFamilies) {
      const mu = b.modelBreakdown[m];
      point[m] = mu ? (mode === 'cost' ? Number(mu.totalCost.toFixed(4)) : mu.totalTokens) : 0;
    }
    return point;
  });

  const renderTooltip = ({ active, payload, label }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((sum, entry) => sum + Number(entry.value), 0);
    return (
      <div className="bg-card border border-border rounded-md p-2 text-xs">
        <div className="font-semibold text-foreground mb-1">{label}</div>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-3 text-foreground/85">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-[2px] shrink-0" style={{ background: p.fill }} />
              {p.name}
            </span>
            <span>{mode === 'cost' ? formatCost(Number(p.value)) : fmt(Number(p.value))}</span>
          </div>
        ))}
        <div className="border-t border-border mt-1 pt-1 text-foreground">
          합계: {mode === 'cost' ? formatCost(total) : fmt(total)}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-1">
      {controls}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="bucket" tick={{ fill: DS.axis, fontSize: 10 }} axisLine={false} tickLine={false}
              interval="preserveStartEnd" tickFormatter={tickLabel} />
            <YAxis tick={{ fill: DS.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={40}
              tickFormatter={(v) => mode === 'cost' ? `$${v.toFixed(2)}` : fmt(v)} />
            <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(240, 185, 11, 0.06)' }} />
            <Legend wrapperStyle={{ fontSize: 10 }}
              formatter={(value) => <span style={{ color: DS.warmGray }}>{value}</span>} />
            {modelFamilies.map((m) => (
              <Bar key={m} dataKey={m} stackId="a" fill={modelColor(m)} stroke={DS.warmGraySurface} strokeWidth={1} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
