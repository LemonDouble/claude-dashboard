'use client';

import { BillingBlock } from '@/types';
import { formatCost, formatKRW } from '@/lib/format';
import { useUnitMode } from '@/lib/unitMode';

interface Props {
  blocks: BillingBlock[];
  exchangeRate: number;
}

export function BillingBlockBar({ blocks, exchangeRate }: Props) {
  const { fmt } = useUnitMode();
  const maxCost = Math.max(...blocks.map((b) => b.usage.totalCost), 0.0001);

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-zinc-400 mb-1">청구 블록 (5시간 UTC 단위 · 현재 블록 강조)</div>
      <div className="flex gap-2 items-end h-16">
        {blocks.map((block) => {
          const heightPct = Math.max((block.usage.totalCost / maxCost) * 100, 2);
          return (
            <div key={block.blockIndex} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs text-zinc-400">{formatCost(block.usage.totalCost)} <span className="text-zinc-600">{formatKRW(block.usage.totalCost, exchangeRate)}</span></div>
              <div className="w-full relative" style={{ height: 40 }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t transition-all ${
                    block.isActive
                      ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                      : 'bg-zinc-700'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        {blocks.map((block) => {
          const kstStart = (block.startHour + 9) % 24;
          const kstEnd = (block.startHour + 9 + 5) % 24;
          const pad = (n: number) => String(n).padStart(2, '0');
          return (
            <div key={block.blockIndex} className="flex-1 text-center">
              <div className={`text-xs ${block.isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                {pad(block.startHour)}–{pad(block.startHour + 5)} UTC
              </div>
              <div className="text-xs text-zinc-600">
                {pad(kstStart)}–{pad(kstEnd)}시 (KST)
              </div>
              <div className="text-xs text-zinc-600">{fmt(block.usage.totalTokens)} 토큰</div>
              <div className="text-xs text-zinc-700">{block.promptCount}개 프롬프트</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
