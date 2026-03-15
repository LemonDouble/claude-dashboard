'use client';

import { BurnRate } from '@/types';
import { formatCost, formatKRW } from '@/lib/format';
import { useUnitMode } from '@/lib/unitMode';

const trendLabel = { increasing: '↑ 증가 중', decreasing: '↓ 감소 중', stable: '→ 안정' };
const trendColor = { increasing: 'text-red-400', decreasing: 'text-emerald-400', stable: 'text-zinc-400' };

interface Props {
  data: BurnRate;
  exchangeRate: number;
}

export function BurnRatePanel({ data, exchangeRate }: Props) {
  const { fmt } = useUnitMode();
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-baseline gap-2">
        <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">실시간 번 레이트</div>
        <div className="text-xs text-zinc-600">최근 2시간 평균 기준</div>
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1">
        <div className="bg-zinc-800 rounded-lg p-2 flex flex-col gap-1">
          <div className="flex gap-3">
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="text-xs text-zinc-500">시간당 비용</div>
              <div className="text-lg font-bold text-white leading-tight">
                {formatCost(data.costPerHour)}
                <span className="text-xs font-normal text-zinc-500 ml-1">{formatKRW(data.costPerHour, exchangeRate)}</span>
              </div>
            </div>
            <div className="w-px bg-zinc-700 self-stretch" />
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="text-xs text-zinc-500">분당 비용</div>
              <div className="text-lg font-bold text-white leading-tight">
                {formatCost(data.costPerHour / 60)}
                <span className="text-xs font-normal text-zinc-500 ml-1">{formatKRW(data.costPerHour / 60, exchangeRate)}</span>
              </div>
            </div>
          </div>
          <div className={`text-sm font-semibold ${trendColor[data.trend]}`}>
            {trendLabel[data.trend]}
          </div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-2 flex flex-col gap-1">
          <div className="flex gap-3">
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="text-xs text-zinc-500">시간당 토큰</div>
              <div className="text-lg font-bold text-white leading-tight">{fmt(data.tokensPerHour)}</div>
            </div>
            <div className="w-px bg-zinc-700 self-stretch" />
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="text-xs text-zinc-500">분당 토큰</div>
              <div className="text-lg font-bold text-white leading-tight">{fmt(data.tokensPerHour / 60)}</div>
            </div>
          </div>
          <div className="text-xs text-zinc-500">활성 세션 {data.activeSessions}개</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-2 flex flex-col gap-1">
          <div className="text-xs text-zinc-500">일간 예측</div>
          <div className="text-base font-bold text-yellow-400">
            {formatCost(data.projectedDailyCost)}
            <span className="text-xs font-normal text-zinc-500 ml-1">{formatKRW(data.projectedDailyCost, exchangeRate)}</span>
          </div>
          <div className="text-xs text-zinc-600">시간당 × 24</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-2 flex flex-col gap-1">
          <div className="text-xs text-zinc-500">월간 예측</div>
          <div className="text-base font-bold text-orange-400">
            {formatCost(data.projectedMonthlyCost)}
            <span className="text-xs font-normal text-zinc-500 ml-1">{formatKRW(data.projectedMonthlyCost, exchangeRate)}</span>
          </div>
          <div className="text-xs text-zinc-600">시간당 × 24 × 30</div>
        </div>
      </div>
      <div className="text-xs text-zinc-700">
        추세: 최근 1시간이 평균 대비 +20% 초과 시 ↑, -20% 미만 시 ↓
      </div>
    </div>
  );
}
