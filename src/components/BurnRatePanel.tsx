'use client';

import { BurnRate } from '@/types';
import { formatCost, formatKRW } from '@/lib/format';
import { useUnitMode } from '@/lib/unitMode';

const trendLabel = { increasing: '↑ 증가 중', decreasing: '↓ 감소 중', stable: '→ 안정' };
const trendColor = {
  increasing: 'text-destructive',
  decreasing: 'text-primary',
  stable: 'text-muted-foreground',
};

interface Props {
  data: BurnRate;
  exchangeRate: number;
}

export function BurnRatePanel({ data, exchangeRate }: Props) {
  const { fmt } = useUnitMode();
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-baseline gap-2">
        <div className="text-xs font-semibold text-foreground uppercase tracking-wider">실시간 번 레이트</div>
        <div className="text-xs text-muted-foreground/70">최근 2시간 평균 기준</div>
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1">
        <div className="bg-muted rounded-lg p-2 flex flex-col gap-1 border border-border">
          <div className="flex gap-3">
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="text-xs text-muted-foreground font-medium">시간당 비용</div>
              <div className="text-lg font-semibold text-foreground leading-tight">
                {formatCost(data.costPerHour)}
                <span className="text-xs font-normal text-muted-foreground/70 ml-1">{formatKRW(data.costPerHour, exchangeRate)}</span>
              </div>
            </div>
            <div className="w-px bg-border self-stretch" />
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="text-xs text-muted-foreground font-medium">분당 비용</div>
              <div className="text-lg font-semibold text-foreground leading-tight">
                {formatCost(data.costPerHour / 60)}
                <span className="text-xs font-normal text-muted-foreground/70 ml-1">{formatKRW(data.costPerHour / 60, exchangeRate)}</span>
              </div>
            </div>
          </div>
          <div className={`text-sm font-semibold ${trendColor[data.trend]}`}>
            {trendLabel[data.trend]}
          </div>
        </div>
        <div className="bg-muted rounded-lg p-2 flex flex-col gap-1 border border-border">
          <div className="flex gap-3">
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="text-xs text-muted-foreground font-medium">시간당 토큰</div>
              <div className="text-lg font-semibold text-foreground leading-tight">{fmt(data.tokensPerHour)}</div>
            </div>
            <div className="w-px bg-border self-stretch" />
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="text-xs text-muted-foreground font-medium">분당 토큰</div>
              <div className="text-lg font-semibold text-foreground leading-tight">{fmt(data.tokensPerHour / 60)}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">활성 세션 {data.activeSessions}개</div>
        </div>
        <div className="bg-muted rounded-lg p-2 flex flex-col gap-1 border border-border">
          <div className="text-xs text-muted-foreground font-medium">일간 예측</div>
          <div className="text-base font-semibold text-secondary">
            {formatCost(data.projectedDailyCost)}
            <span className="text-xs font-normal text-muted-foreground/70 ml-1">{formatKRW(data.projectedDailyCost, exchangeRate)}</span>
          </div>
          <div className="text-xs text-muted-foreground/70">시간당 × 24</div>
        </div>
        <div className="bg-muted rounded-lg p-2 flex flex-col gap-1 border border-border">
          <div className="text-xs text-muted-foreground font-medium">월간 예측</div>
          <div className="text-base font-semibold text-secondary">
            {formatCost(data.projectedMonthlyCost)}
            <span className="text-xs font-normal text-muted-foreground/70 ml-1">{formatKRW(data.projectedMonthlyCost, exchangeRate)}</span>
          </div>
          <div className="text-xs text-muted-foreground/70">시간당 × 24 × 30</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground/60">
        추세: 최근 1시간이 평균 대비 +20% 초과 시 ↑, -20% 미만 시 ↓
      </div>
    </div>
  );
}
