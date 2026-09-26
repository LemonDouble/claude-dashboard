'use client';

import { formatCost } from '@/lib/format';
import { seriesColor } from '@/lib/chartPalette';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, TooltipContentProps } from 'recharts';

export interface ProjectUsage {
  projectName: string;
  totalCost: number;
  percentage: number;
  sessionCount?: number;
  color?: string;
}

interface Props {
  data: ProjectUsage[];
}

export function ProjectPieChart({ data }: Props) {
  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
      <div className="bg-card border border-border rounded-md p-2 text-xs">
        <div className="font-semibold text-foreground truncate max-w-[160px]">{p.name}</div>
        <div className="text-foreground">{formatCost(p.payload.totalCost)}</div>
        <div className="text-muted-foreground">{Number(p.value).toFixed(1)}%</div>
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
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? seriesColor(i)} />
          ))}
        </Pie>
        <Tooltip content={renderTooltip} />
      </PieChart>
    </ResponsiveContainer>
  );
}
