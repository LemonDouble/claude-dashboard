'use client';

import { useState, useEffect } from 'react';

export type PlanId = 'none' | 'pro' | 'max5' | 'max20' | 'custom';

export interface Plan {
  id: PlanId;
  label: string;
  monthlyUSD: number;       // 0 = 미설정
  promptLimit: number;      // 5시간 블록당 추정 프롬프트 상한 (0 = 미설정)
}

// promptLimit 출처: CCTray/AppPreferences.swift 커뮤니티 추정값
export const PLANS: Plan[] = [
  { id: 'none',   label: '플랜 미설정',  monthlyUSD: 0,   promptLimit: 0   },
  { id: 'pro',    label: 'Pro',         monthlyUSD: 20,  promptLimit: 40  },
  { id: 'max5',   label: 'Max 5×',      monthlyUSD: 100, promptLimit: 200 },
  { id: 'max20',  label: 'Max 20×',     monthlyUSD: 200, promptLimit: 800 },
  { id: 'custom', label: '직접 입력',    monthlyUSD: 0,   promptLimit: 0   },
];

const LS_PLAN          = 'claude-dashboard-plan-id';
const LS_CUSTOM_PROMPT = 'claude-dashboard-plan-custom-prompts';

export function usePlan() {
  const [planId, setPlanId]               = useState<PlanId>('none');
  const [customPrompts, setCustomPrompts] = useState<number>(100);

  useEffect(() => {
    const id = localStorage.getItem(LS_PLAN) as PlanId | null;
    if (id && PLANS.some((p) => p.id === id)) setPlanId(id);
    const c = parseInt(localStorage.getItem(LS_CUSTOM_PROMPT) ?? '', 10);
    if (!isNaN(c) && c > 0) setCustomPrompts(c);
  }, []);

  const selectPlan = (id: PlanId) => {
    setPlanId(id);
    localStorage.setItem(LS_PLAN, id);
  };

  const updateCustomPrompts = (n: number) => {
    setCustomPrompts(n);
    localStorage.setItem(LS_CUSTOM_PROMPT, String(n));
  };

  const currentPlan   = PLANS.find((p) => p.id === planId)!;
  const promptLimit   = planId === 'custom' ? customPrompts : currentPlan.promptLimit;

  return { planId, currentPlan, promptLimit, selectPlan, customPrompts, updateCustomPrompts };
}
