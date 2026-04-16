'use client';

import { BillingBlock } from '@/types';
import { formatCost, formatKRW } from '@/lib/format';
import { useUnitMode } from '@/lib/unitMode';

interface Props {
  blocks: BillingBlock[];
  exchangeRate: number;
}

// ISO 타임스탬프를 KST HH:MM 으로 변환
function fmtKst(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  });
}

// ISO 타임스탬프를 UTC HH:MM 으로 변환
function fmtUtc(iso: string): string {
  return iso.slice(11, 16);
}

// KST 기준 날짜 라벨 (M/D)
function fmtKstDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  });
}

export function BillingBlockBar({ blocks, exchangeRate }: Props) {
  const { fmt } = useUnitMode();

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-foreground mb-1">청구 블록 (5시간 롤링 윈도우)</div>
        <div className="text-xs text-muted-foreground py-4 text-center">사용 기록이 없습니다</div>
      </div>
    );
  }

  const hasActive = blocks.some((b) => b.isActive);
  const maxCost = Math.max(...blocks.map((b) => b.usage.totalCost), 0.0001);

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold text-foreground mb-1">
        청구 블록 (5시간 롤링 윈도우 · 최근 5개)
        {!hasActive && (
          <span className="ml-2 text-muted-foreground font-normal">현재 활성 블록 없음 (5시간 이상 미사용)</span>
        )}
      </div>
      <div className="flex gap-2 items-end h-16">
        {blocks.map((block) => {
          const heightPct = Math.max((block.usage.totalCost / maxCost) * 100, 2);
          return (
            <div key={block.blockIndex} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs text-muted-foreground">
                {formatCost(block.usage.totalCost)}{' '}
                <span className="text-muted-foreground/60">{formatKRW(block.usage.totalCost, exchangeRate)}</span>
              </div>
              <div className="w-full relative" style={{ height: 40 }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t transition-all ${
                    block.isActive ? 'bg-primary' : 'bg-muted border border-border'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        {blocks.map((block) => (
          <div key={block.blockIndex} className="flex-1 text-center">
            <div className={`text-xs ${block.isActive ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
              {fmtKst(block.startTime)}–{fmtKst(block.endTime)} KST
            </div>
            <div className="text-xs text-muted-foreground/60">
              {fmtKstDate(block.startTime)} · {fmtUtc(block.startTime)}–{fmtUtc(block.endTime)} UTC
            </div>
            <div className="text-xs text-muted-foreground/60">{fmt(block.usage.totalTokens)} 토큰</div>
            <div className="text-xs text-muted-foreground/50">{block.promptCount}개 프롬프트</div>
          </div>
        ))}
      </div>
    </div>
  );
}
