'use client';

import { ModelUsage } from '@/types';
import { formatCost } from '@/lib/format';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  data: ModelUsage[];
}

export function ModelPieChart({ data }: Props) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xs">
        <div className="font-semibold" style={{ color: p.payload.fill }}>{p.name}</div>
        <div className="text-white">{formatCost(p.payload.usage.totalCost)}</div>
        <div className="text-zinc-400">{p.value.toFixed(1)}%</div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="percentage"
          nameKey="model"
          cx="50%"
          cy="50%"
          innerRadius="45%"
          outerRadius="70%"
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.model} fill={MODEL_COLORS[entry.model] || DEFAULT_COLOR} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ color: MODEL_COLORS[value] || DEFAULT_COLOR, fontSize: 11 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
