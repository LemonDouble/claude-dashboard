'use client';

import useSWR from 'swr';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { UsageSummary, ModelUsage, SessionUsage } from '@/types';
import { formatCost, formatKRW } from '@/lib/format';
import { modelColor, seriesColor, DS } from '@/lib/chartPalette';
import { useExchangeRate } from '@/lib/useExchangeRate';
import { UnitModeProvider, useUnitMode } from '@/lib/unitMode';
import { KpiCard } from '@/components/KpiCard';
import { RateLimitWidgets } from '@/components/RateLimitWidgets';
import { DailyChart } from '@/components/charts/DailyChart';
import { ModelPieChart } from '@/components/charts/ModelPieChart';
import { ProjectPieChart, ProjectUsage } from '@/components/charts/ProjectPieChart';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ChartMode = 'cost' | 'tokens' | 'cumulative';

function LastUpdated({ ts }: { ts: number }) {
  const d = new Date(ts);
  return (
    <span className="text-foreground/70 text-xs">
      <span className="opacity-60">갱신 </span>
      {d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
      className="text-foreground/80 hover:text-foreground text-xs px-1.5 py-0.5 rounded-md hover:bg-muted transition-colors"
      title="환율 설정"
    >
      <span className="opacity-60">환율 </span>
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
  const { data: models } = useSWR<ModelUsage[]>('/api/models', fetcher, { refreshInterval: 30_000 });
  const { data: sessions } = useSWR<SessionUsage[]>('/api/sessions', fetcher, { refreshInterval: 30_000 });

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

  const projectData: ProjectUsage[] = (() => {
    const costMap = new Map<string, number>();
    for (const s of sessions ?? []) {
      costMap.set(s.projectName, (costMap.get(s.projectName) ?? 0) + s.totalCost);
    }
    const sorted = Array.from(costMap.entries()).sort(([, a], [, b]) => b - a);
    const grandTotal = sorted.reduce((a, [, c]) => a + c, 0) || 1;
    const top = sorted.slice(0, 10);
    const rest = sorted.slice(10);
    const items: ProjectUsage[] = top.map(([projectName, totalCost], i) => ({
      projectName,
      totalCost,
      percentage: (totalCost / grandTotal) * 100,
      color: seriesColor(i),
    }));
    if (rest.length > 0) {
      const restCost = rest.reduce((a, [, c]) => a + c, 0);
      items.push({
        projectName: `기타 (${rest.length}개)`,
        totalCost: restCost,
        percentage: (restCost / grandTotal) * 100,
        color: DS.warmGrayDark,
      });
    }
    return items;
  })();

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Image src="/lemon_logo.webp" alt="logo" width={28} height={28} className="rounded-full" />
          <span className="font-display text-sm tracking-tight text-foreground">Claude 대시보드</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleUnit}
            className="text-foreground/80 hover:text-foreground text-xs px-1.5 py-0.5 rounded-md hover:bg-muted transition-colors"
            title="토큰 단위 전환"
          >
            <span className="opacity-60">단위 </span>
            {unitMode === 'kr' ? '만/억' : 'K/M'}
          </button>
          <span className="text-foreground/25 text-xs select-none">|</span>
          <ExchangeRateSetting rate={exchangeRate} onUpdate={updateRate} />
          {lastUpdated && (
            <>
              <span className="text-foreground/25 text-xs select-none">|</span>
              <LastUpdated ts={lastUpdated} />
            </>
          )}
        </div>
      </header>

      {/* Main content: 2구획 세로 분할 */}
      <main className="flex-1 overflow-hidden p-3 grid grid-rows-[auto_1fr] gap-3">
        {/* ── 상단: 사용 한도 ── */}
        <section className="shrink-0">
          <RateLimitWidgets />
        </section>

        {/* ── 하단: 비용 & 추세 ── */}
        <section className="grid grid-rows-[auto_1fr] gap-3 min-h-0">
          <div className="grid grid-cols-3 gap-2 shrink-0">
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
          </div>

          <div className="grid grid-cols-2 gap-3 min-h-0">
            {/* 왼쪽: 일별 차트 */}
            <div className="bg-card border border-border rounded-xl p-3 flex flex-col min-h-0">
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

            {/* 오른쪽: 모델 + 프로젝트 분포 */}
            <div className="grid grid-rows-2 gap-3 min-h-0">
              <div className="bg-card border border-border rounded-xl p-3 flex flex-col min-h-0">
                <div className="flex items-baseline gap-2 shrink-0 mb-2">
                  <span className="text-xs font-semibold text-foreground">모델별 사용 분포</span>
                  <span className="text-xs text-muted-foreground/70">
                    {formatCost((models ?? []).reduce((s, m) => s + m.usage.totalCost, 0))}
                  </span>
                </div>
                <div className="flex gap-2 flex-1 min-h-0">
                  <div className="flex-1 min-w-0 min-h-0">
                    <ModelPieChart data={models ?? []} />
                  </div>
                  <div className="flex flex-col gap-1 overflow-auto text-xs shrink-0">
                    {(models ?? []).map((m) => (
                      <div key={m.model} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ background: modelColor(m.model) }}
                        />
                        <span className="text-foreground" title={m.model}>
                          {m.model}
                        </span>
                        <span className="text-muted-foreground/70 shrink-0 font-mono ml-auto pl-2">
                          {m.percentage.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-3 flex flex-col min-h-0">
                <div className="flex items-baseline gap-2 shrink-0 mb-2">
                  <span className="text-xs font-semibold text-foreground">프로젝트별 사용 분포</span>
                  <span className="text-xs text-muted-foreground/70">
                    상위 10개 · {formatCost(projectData.reduce((s, p) => s + p.totalCost, 0))}
                  </span>
                </div>
                <div className="flex gap-2 flex-1 min-h-0">
                  <div className="flex-1 min-w-0 min-h-0">
                    <ProjectPieChart data={projectData} />
                  </div>
                  <div className="flex flex-col gap-1 overflow-auto text-xs shrink-0">
                    {projectData.map((p) => (
                      <div key={p.projectName} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ background: p.color }}
                        />
                        <span className="text-foreground" title={p.projectName}>
                          {p.projectName}
                        </span>
                        <span className="text-muted-foreground/70 shrink-0 font-mono ml-auto pl-2">
                          {p.percentage.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
