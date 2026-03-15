'use client';

import useSWR from 'swr';
import { CacheStats } from '@/types';
import { formatCost, formatKRW } from '@/lib/format';
import { useExchangeRate } from '@/lib/useExchangeRate';
import { CacheChart } from './charts/CacheChart';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CacheTab() {
  const { data, isLoading } = useSWR<CacheStats>('/api/cache', fetcher, { refreshInterval: 30000 });
  const { rate: exchangeRate } = useExchangeRate();

  if (isLoading) return <div className="text-zinc-400 text-sm p-4">불러오는 중...</div>;
  if (!data) return <div className="text-zinc-500 text-sm p-4">캐시 데이터가 없습니다</div>;

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex gap-3">
        <div className="bg-zinc-800 rounded-lg p-3 flex-1 text-center">
          <div className="text-xs text-zinc-400">캐시로 절약한 비용</div>
          <div className="text-xl font-bold text-emerald-400">
            {formatCost(data.totalSaved)}
            <span className="text-sm font-normal text-zinc-500 ml-1.5">{formatKRW(data.totalSaved, exchangeRate)}</span>
          </div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 flex-1 text-center">
          <div className="text-xs text-zinc-400">평균 캐시 효율</div>
          <div className="text-xl font-bold text-blue-400">{data.efficiency.toFixed(1)}%</div>
        </div>
      </div>
      <div className="flex-1" style={{ minHeight: 160 }}>
        <CacheChart data={data} />
      </div>
    </div>
  );
}
