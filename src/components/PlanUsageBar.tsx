'use client';

import { useState, useRef } from 'react';
import { usePlan, PLANS, PlanId } from '@/lib/usePlan';
import { BillingBlock } from '@/types';

interface Props {
  billingBlocks: BillingBlock[];
}

export function PlanUsageBar({ billingBlocks }: Props) {
  const { planId, currentPlan, promptLimit, selectPlan, customPrompts, updateCustomPrompts } = usePlan();
  const [open, setOpen] = useState(false);
  const [editingCustom, setEditingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const activeBlock = billingBlocks.find((b) => b.isActive);
  const promptCount = activeBlock?.promptCount ?? 0;

  const commitCustom = () => {
    const v = parseInt(customInput, 10);
    if (!isNaN(v) && v > 0) updateCustomPrompts(v);
    setEditingCustom(false);
  };

  // 플랜 미설정 상태
  if (planId === 'none') {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <span>플랜 한도 표시:</span>
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="text-zinc-500 hover:text-zinc-300 px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
          >
            플랜 선택 ▾
          </button>
          {open && (
            <PlanDropdown planId={planId} onSelect={(id) => { selectPlan(id); setOpen(false); }} />
          )}
        </div>
      </div>
    );
  }

  const pct = promptLimit > 0 ? Math.min((promptCount / promptLimit) * 100, 999) : 0;
  const over = pct >= 100;
  const warn = pct >= 80;
  const barColor  = over ? 'bg-red-500'    : warn ? 'bg-yellow-500' : 'bg-emerald-500';
  const textColor = over ? 'text-red-400'  : warn ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <div className="flex items-center gap-3 text-xs">

      {/* 플랜 선택 */}
      <div className="relative shrink-0">
        <button
          onClick={() => setOpen(!open)}
          className="text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          <span className="font-medium">{currentPlan.label}</span>
          <span className="text-zinc-600">▾</span>
        </button>
        {open && (
          <PlanDropdown planId={planId} onSelect={(id) => { selectPlan(id); setOpen(false); }} />
        )}
      </div>

      <span className="text-zinc-700">·</span>

      {/* 현재 블록 프롬프트 수 / 한도 */}
      <span className="text-zinc-500 shrink-0">
        현재 5시간 블록{' '}
        <span className="text-zinc-300 font-medium tabular-nums">{promptCount}</span>
        {promptLimit > 0 && (
          <>
            {' / '}
            {planId === 'custom' && !editingCustom ? (
              <button
                onClick={() => { setCustomInput(String(customPrompts)); setEditingCustom(true); setTimeout(() => inputRef.current?.select(), 0); }}
                className="text-zinc-400 hover:text-zinc-200 underline decoration-dotted"
              >
                {customPrompts}
              </button>
            ) : planId === 'custom' && editingCustom ? (
              <input
                ref={inputRef}
                type="number"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onBlur={commitCustom}
                onKeyDown={(e) => { if (e.key === 'Enter') commitCustom(); if (e.key === 'Escape') setEditingCustom(false); }}
                className="w-14 bg-zinc-800 border border-zinc-600 rounded px-1 text-white text-xs focus:outline-none focus:border-blue-500"
                autoFocus
              />
            ) : (
              <span className="text-zinc-500">{promptLimit}</span>
            )}
            {' '}프롬프트
          </>
        )}
      </span>

      {/* 프로그레스 바 + % */}
      {promptLimit > 0 && (
        <>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-1 bg-zinc-800 rounded-full h-1.5 min-w-[80px]">
              <div
                className={`h-1.5 rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className={`shrink-0 font-medium tabular-nums ${textColor}`}>
              {pct.toFixed(0)}%
            </span>
          </div>

          {over && (
            <span className="text-red-400 shrink-0">⚠ 한도 초과</span>
          )}
        </>
      )}

      <span className="text-zinc-700 shrink-0">·</span>
      <span className="text-zinc-700 shrink-0">커뮤니티 추정 근사치</span>
      <a
        href="https://claude.ai/settings/usage"
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-600 hover:text-blue-400 transition-colors shrink-0"
      >
        실제 사용량 확인 →
      </a>
    </div>
  );
}

function PlanDropdown({ planId, onSelect }: { planId: PlanId; onSelect: (id: PlanId) => void }) {
  return (
    <div className="absolute top-full mt-1 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px]">
      {PLANS.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-800 transition-colors flex justify-between items-center gap-4 ${
            planId === p.id ? 'text-blue-400' : 'text-zinc-300'
          }`}
        >
          <span>{p.label}</span>
          {p.promptLimit > 0 && (
            <span className="text-zinc-600">~{p.promptLimit}개/5시간</span>
          )}
        </button>
      ))}
    </div>
  );
}
