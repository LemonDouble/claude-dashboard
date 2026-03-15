'use client';

import { formatCost } from '@/lib/format';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f97316', '#06b6d4', '#ec4899', '#a3e635'];

export interface ProjectUsage {
  projectName: string;
  totalCost: number;
  percentage: number;
  sessionCount?: number;
}

interface Props {
  data: ProjectUsage[];
}

export function ProjectPieChart({ data }: Props) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xs">
        <div className="font-semibold text-white truncate max-w-[160px]">{p.name}</div>
        <div className="text-white">{formatCost(p.payload.totalCost)}</div>
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
          nameKey="projectName"
          cx="50%"
          cy="50%"
          innerRadius="45%"
          outerRadius="70%"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
