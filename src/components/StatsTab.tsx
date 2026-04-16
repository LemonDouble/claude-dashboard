'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ModelUsage, SessionUsage } from '@/types';
import { formatCost, formatKRW, formatRelativeTime } from '@/lib/format';
import { useUnitMode } from '@/lib/unitMode';
import { useExchangeRate } from '@/lib/useExchangeRate';
import { ModelPieChart } from './charts/ModelPieChart';
import { ProjectPieChart, ProjectUsage } from './charts/ProjectPieChart';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function StatsTab() {
  const { data: models,   isLoading: mLoading } = useSWR<ModelUsage[]> ('/api/models',   fetcher, { refreshInterval: 30000 });
  const { data: sessions, isLoading: sLoading } = useSWR<SessionUsage[]>('/api/sessions', fetcher, { refreshInterval: 30000 });

  const { fmt }            = useUnitMode();
  const { rate: exchangeRate } = useExchangeRate();
  const [search, setSearch]   = useState('');

  if (mLoading || sLoading) return <div className="text-muted-foreground text-sm p-4">불러오는 중...</div>;

  const projectData: ProjectUsage[] = (() => {
    const costMap = new Map<string, number>();
    const countMap = new Map<string, number>();
    for (const s of sessions ?? []) {
      costMap.set(s.projectName, (costMap.get(s.projectName) ?? 0) + s.totalCost);
      countMap.set(s.projectName, (countMap.get(s.projectName) ?? 0) + 1);
    }
    const total = Array.from(costMap.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(costMap.entries())
      .map(([projectName, totalCost]) => ({
        projectName,
        totalCost,
        percentage: (totalCost / total) * 100,
        sessionCount: countMap.get(projectName) ?? 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  })();


  const filtered = (sessions ?? [])
    .filter(
      (s) =>
        s.projectName.toLowerCase().includes(search.toLowerCase()) ||
        s.sessionId.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="h-full flex flex-col gap-0 overflow-hidden">

      {/* ── 상단: 모델 + 프로젝트 ── */}
      <div className="flex gap-4 shrink-0" style={{ height: '38%' }}>

        {/* 모델 분포 + 프로젝트 분포 */}
        <div className="flex gap-3 flex-1 min-w-0 min-h-0">

          {/* 모델별 */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <div className="font-semibold text-xs text-foreground">모델별 사용 분포</div>
              <div className="text-xs text-muted-foreground/70">{formatCost((models ?? []).reduce((s, m) => s + m.usage.totalCost, 0))} · {formatKRW((models ?? []).reduce((s, m) => s + m.usage.totalCost, 0), exchangeRate)}</div>
            </div>
            <div className="flex gap-2 flex-1 min-h-0">
              <div className="flex-1 min-h-0">
                <ModelPieChart data={models ?? []} />
              </div>
              <div className="w-44 flex flex-col gap-1 overflow-auto">
                {(models ?? []).map((m) => (
                  <div key={m.model} className="bg-muted rounded-md p-1.5 text-xs shrink-0 border border-border">
                    <div className="text-foreground font-medium truncate">{m.model}</div>
                    <div className="text-muted-foreground">
                      {formatCost(m.usage.totalCost)}{' '}
                      <span className="text-muted-foreground/60">{formatKRW(m.usage.totalCost, exchangeRate)}</span>
                      {' · '}{m.percentage.toFixed(1)}%
                    </div>
                    <div className="text-muted-foreground/70">{fmt(m.usage.totalTokens)} 토큰</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-px bg-border self-stretch shrink-0" />

          {/* 프로젝트별 */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <div className="font-semibold text-xs text-foreground">프로젝트별 사용 분포</div>
              <div className="text-xs text-muted-foreground/70">{formatCost(projectData.reduce((s, p) => s + p.totalCost, 0))} · {formatKRW(projectData.reduce((s, p) => s + p.totalCost, 0), exchangeRate)}</div>
            </div>
            <div className="flex gap-2 flex-1 min-h-0">
              <div className="flex-1 min-h-0">
                <ProjectPieChart data={projectData} />
              </div>
              <div className="w-44 flex flex-col gap-1 overflow-auto">
                {projectData.map((p) => (
                  <div key={p.projectName} className="bg-muted rounded-md p-1.5 text-xs shrink-0 border border-border">
                    <div className="text-foreground font-medium truncate" title={p.projectName}>{p.projectName}</div>
                    <div className="text-muted-foreground">
                      {formatCost(p.totalCost)}{' '}
                      <span className="text-muted-foreground/60">{formatKRW(p.totalCost, exchangeRate)}</span>
                      {' · '}{p.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="h-px bg-border my-3 shrink-0" />

      {/* ── 하단: 세션 목록 ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* 세션 목록 */}
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="font-semibold text-xs text-foreground">세션 목록</div>
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-muted border border-border rounded-md px-2 py-1 text-xs text-foreground placeholder-muted-foreground/60 outline-none focus:border-primary"
            />
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-background">
                <tr className="text-muted-foreground border-b border-border">
                  <th className="pb-1.5 pr-3 font-semibold">프로젝트</th>
                  <th className="pb-1.5 pr-3 font-semibold text-right">토큰</th>
                  <th className="pb-1.5 pr-3 font-semibold text-right">비용</th>
                  <th className="pb-1.5 font-semibold text-right">마지막 활동</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.sessionId} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="py-1.5 pr-3 text-foreground max-w-[180px] truncate">{s.projectName}</td>
                    <td className="py-1.5 pr-3 text-right text-muted-foreground">{fmt(s.totalTokens)}</td>
                    <td className="py-1.5 pr-3 text-right text-primary">{formatCost(s.totalCost)}</td>
                    <td className="py-1.5 text-right text-muted-foreground/70">{formatRelativeTime(s.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-muted-foreground/60 text-center py-6">세션이 없습니다</div>}
          </div>
        </div>

      </div>

    </div>
  );
}
