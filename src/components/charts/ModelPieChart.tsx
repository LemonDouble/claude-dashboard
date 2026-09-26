'use client';

import { ModelUsage } from '@/types';
import { formatCost } from '@/lib/format';
import { modelColor } from '@/lib/chartPalette';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, TooltipContentProps } from 'recharts';

interface Props {
  data: ModelUsage[];
}

export function ModelPieChart({ data }: Props) {
  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
      <div className="bg-card border border-border rounded-md p-2 text-xs">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-[2px] shrink-0" style={{ background: p.payload.fill }} />
          {p.name}
        </div>
        <div className="text-foreground">{formatCost(p.payload.usage.totalCost)}</div>
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
          nameKey="model"
          cx="50%"
          cy="50%"
          innerRadius="45%"
          outerRadius="70%"
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.model} fill={modelColor(entry.model)} />
          ))}
        </Pie>
        <Tooltip content={renderTooltip} />
      </PieChart>
    </ResponsiveContainer>
  );
}
