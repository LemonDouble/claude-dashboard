'use client';

import useSWR from 'swr';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { UsageSummary } from '@/types';
import { formatCost, formatKRW } from '@/lib/format';
import { useExchangeRate } from '@/lib/useExchangeRate';
import { UnitModeProvider, useUnitMode } from '@/lib/unitMode';
import { KpiCard } from '@/components/KpiCard';
import { BillingBlockBar } from '@/components/BillingBlockBar';
import { BurnRatePanel } from '@/components/BurnRatePanel';
import { DailyChart } from '@/components/charts/DailyChart';
import { ProjectionChart } from '@/components/charts/ProjectionChart';
import { StatsTab } from '@/components/StatsTab';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SubTab = 'stats';
type ChartMode = 'cost' | 'tokens' | 'cumulative';

function LastUpdated({ ts }: { ts: number }) {
  const d = new Date(ts);
  return (
    <span className="text-muted-foreground/70 text-xs font-mono">
      갱신 {d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

function ExchangeRateSetting({ rate, onUpdate }: { rate: number; onUpdate: (r: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setInput(String(rate));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    const parsed = parseInt(input, 10);
    if (!isNaN(parsed) && parsed > 0) onUpdate(parsed);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-xs">₩</span>
        <input
          ref={inputRef}
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-20 bg-muted border border-border rounded-md px-1.5 py-0.5 text-xs text-foreground text-right font-mono focus:outline-none focus:border-primary"
          autoFocus
        />
        <span className="text-muted-foreground text-xs">/$</span>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded-md hover:bg-muted transition-colors font-mono"
      title="환율 설정"
    >
      ₩{rate.toLocaleString('ko-KR')}/$
    </button>
  );
}

export default function Dashboard() {
  return (
    <UnitModeProvider>
      <DashboardInner />
    </UnitModeProvider>
  );
}

function DashboardInner() {
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const { rate: exchangeRate, updateRate } = useExchangeRate();
  const { mode: unitMode, toggle: toggleUnit, fmt } = useUnitMode();
  const { data, isLoading, error } = useSWR<UsageSummary>(
    '/api/usage',
    async (url: string) => {
      const r = await fetch(url);
      setLastUpdated(Date.now());
      return r.json();
    },
    { refreshInterval: 30_000 }
  );

  const [activeTab, setActiveTab] = useState<SubTab | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>('cost');

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="font-display text-2xl text-foreground mb-2">Claude 대시보드</div>
          <div className="text-sm">사용 데이터 파싱 중…</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen bg-background flex items-center justify-center text-destructive">
        <div className="text-center">
          <div className="text-lg font-semibold mb-1">데이터 로드 실패</div>
          <div className="text-sm text-muted-foreground">
            <code className="text-foreground font-mono">~/.claude/projects/</code> 경로를 확인해주세요
          </div>
        </div>
      </div>
    );
  }

  const SUB_TABS: { id: SubTab; label: string }[] = [
    { id: 'stats', label: '통계' },
  ];

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Image src="/lemon_logo.webp" alt="logo" width={28} height={28} className="rounded-full" />
          <span className="font-display text-sm tracking-tight text-foreground">Claude 대시보드</span>
          <div className="flex gap-1">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleUnit}
            className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded-md hover:bg-muted transition-colors font-mono"
            title="토큰 단위 전환"
          >
            {unitMode === 'kr' ? '만/억' : 'K/M'}
          </button>
          <ExchangeRateSetting rate={exchangeRate} onUpdate={updateRate} />
          {lastUpdated && <LastUpdated ts={lastUpdated} />}
        </div>
      </header>

      {/* Sub-tab overlay */}
      {activeTab && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col" style={{ top: 41 }}>
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <span className="text-sm font-semibold text-foreground">통계</span>
            <button
              onClick={() => setActiveTab(null)}
              className="ml-auto text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded-md hover:bg-muted"
            >
              ✕ 닫기
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            {activeTab === 'stats' && <StatsTab />}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden p-3 grid grid-rows-[auto_1fr_auto] gap-3">
        {/* Row 1: KPI cards */}
        <div className="grid grid-cols-6 gap-2 shrink-0">
          <KpiCard
            title="오늘 비용"
            value={formatCost(data.today.totalCost)}
            krw={formatKRW(data.today.totalCost, exchangeRate)}
            sub={`${fmt(data.today.totalTokens)} 토큰`}
            accent="primary"
          />
          <KpiCard
            title="이번 달 비용"
            value={formatCost(data.thisMonth.totalCost)}
            krw={formatKRW(data.thisMonth.totalCost, exchangeRate)}
            sub={`${fmt(data.thisMonth.totalTokens)} 토큰`}
            accent="primary"
          />
          <KpiCard
            title="누적 비용"
            value={formatCost(data.allTime.totalCost)}
            krw={formatKRW(data.allTime.totalCost, exchangeRate)}
            sub={`${fmt(data.allTime.totalTokens)} 토큰`}
          />
          <KpiCard
            title="일간 예측"
            value={formatCost(data.burnRate.projectedDailyCost)}
            krw={formatKRW(data.burnRate.projectedDailyCost, exchangeRate)}
            sub="최근 2시간 평균 × 24h"
            accent={data.burnRate.trend === 'increasing' ? 'destructive' : 'secondary'}
          />
          <KpiCard
            title="월간 예측"
            value={formatCost(data.burnRate.projectedMonthlyCost)}
            krw={formatKRW(data.burnRate.projectedMonthlyCost, exchangeRate)}
            sub="최근 2시간 평균 × 24h × 30일"
            accent="secondary"
          />
          <KpiCard
            title="활성 세션"
            value={String(data.burnRate.activeSessions)}
            sub={data.burnRate.trend === 'increasing' ? '↑ 증가 중' : data.burnRate.trend === 'decreasing' ? '↓ 감소 중' : '→ 안정'}
            accent={data.burnRate.activeSessions > 0 ? 'primary' : 'default'}
          />
        </div>

        {/* Row 2: Main charts */}
        <div className="grid grid-cols-3 gap-3 min-h-0">
          {/* Daily chart - 2 cols */}
          <div className="col-span-2 bg-card border border-border rounded-xl p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-xs font-semibold text-foreground">일별 사용량 (최근 30일)</span>
              <div className="flex gap-1">
                {(['cost', 'tokens', 'cumulative'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMode(m)}
                    className={`text-xs font-medium px-2 py-0.5 rounded-md transition-colors ${
                      chartMode === m
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {m === 'cost' ? '비용' : m === 'tokens' ? '토큰' : '누적'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <DailyChart data={data.daily} mode={chartMode} />
            </div>
          </div>

          {/* Right column: Burn rate + Projection */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="bg-card border border-border rounded-xl p-3 flex-1 min-h-0">
              <BurnRatePanel data={data.burnRate} exchangeRate={exchangeRate} />
            </div>
            <div className="bg-card border border-border rounded-xl p-3 flex-1 min-h-0 flex flex-col">
              <div className="shrink-0 mb-2">
                <div className="text-xs font-semibold text-foreground">예측 (30일 실제 + 14일 전망)</div>
                <div className="text-xs text-muted-foreground/70 mt-0.5">최근 7일 평균 일별 비용 기준으로 향후 14일 동일 지출 가정</div>
              </div>
              <div className="flex-1 min-h-0">
                <ProjectionChart data={data.projections} />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Billing blocks */}
        <div className="bg-card border border-border rounded-xl p-3 shrink-0">
          <BillingBlockBar blocks={data.billingBlocks} exchangeRate={exchangeRate} />
        </div>
      </main>
    </div>
  );
}
