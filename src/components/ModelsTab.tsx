'use client';

import useSWR from 'swr';
import { ModelUsage } from '@/types';
import { formatCost, formatKRW } from '@/lib/format';
import { useUnitMode } from '@/lib/unitMode';
import { useExchangeRate } from '@/lib/useExchangeRate';
import { ModelPieChart } from './charts/ModelPieChart';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ModelsTab() {
  const { data, isLoading } = useSWR<ModelUsage[]>('/api/models', fetcher, { refreshInterval: 30000 });

  const { fmt } = useUnitMode();
  const { rate: exchangeRate } = useExchangeRate();
  if (isLoading) return <div className="text-zinc-400 text-sm p-4">불러오는 중...</div>;
  if (!data?.length) return <div className="text-zinc-500 text-sm p-4">모델 데이터가 없습니다</div>;

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1" style={{ minHeight: 200 }}>
        <ModelPieChart data={data} />
      </div>
      <div className="w-48 flex flex-col gap-1 overflow-auto">
        {data.map((m) => (
          <div key={m.model} className="bg-zinc-800 rounded p-2 text-xs">
            <div className="text-zinc-200 font-medium truncate">{m.model}</div>
            <div className="text-zinc-400">{formatCost(m.usage.totalCost)} <span className="text-zinc-600">{formatKRW(m.usage.totalCost, exchangeRate)}</span> · {m.percentage.toFixed(1)}%</div>
            <div className="text-zinc-500">{fmt(m.usage.totalTokens)} 토큰</div>
          </div>
        ))}
      </div>
    </div>
  );
}
