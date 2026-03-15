'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ModelUsage, CacheStats, PatternsData, SessionUsage } from '@/types';
import { formatCost, formatKRW, formatRelativeTime } from '@/lib/format';
import { useUnitMode } from '@/lib/unitMode';
import { useExchangeRate } from '@/lib/useExchangeRate';
import { ModelPieChart } from './charts/ModelPieChart';
import { ProjectPieChart, ProjectUsage } from './charts/ProjectPieChart';
import { CacheChart } from './charts/CacheChart';
import { HourlyHeatmap } from './charts/HeatmapChart';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const KR_DAYS   = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_COLORS = ['#f87171', '#60a5fa', '#60a5fa', '#60a5fa', '#60a5fa', '#60a5fa', '#fb923c'];

export function StatsTab() {
  const { data: models,   isLoading: mLoading } = useSWR<ModelUsage[]> ('/api/models',   fetcher, { refreshInterval: 30000 });
  const { data: cache,    isLoading: cLoading } = useSWR<CacheStats>   ('/api/cache',    fetcher, { refreshInterval: 30000 });
  const { data: patterns, isLoading: pLoading } = useSWR<PatternsData> ('/api/patterns', fetcher, { refreshInterval: 30000 });
  const { data: sessions, isLoading: sLoading } = useSWR<SessionUsage[]>('/api/sessions', fetcher, { refreshInterval: 30000 });

  const { fmt }            = useUnitMode();
  const { rate: exchangeRate } = useExchangeRate();
  const [search, setSearch]   = useState('');

  if (mLoading || cLoading || pLoading || sLoading) return <div className="text-zinc-400 text-sm p-4">불러오는 중...</div>;

  const dowData = (patterns?.dayOfWeek ?? []).map((d) => ({
    ...d,
    label: KR_DAYS[d.dayIndex] ?? d.day,
  }));
  const peakDay = dowData.reduce((best, d) => (d.avgCost > best.avgCost ? d : best), dowData[0]);

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

  const DowTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = dowData.find((x) => x.label === label);
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xs">
        <div className="text-white font-semibold mb-1">{label}요일</div>
        <div className="text-zinc-400">평균 비용 <span className="text-white">{formatCost(d?.avgCost ?? 0)}</span>/호출</div>
        <div className="text-zinc-400">세션 수 <span className="text-white">{d?.sessionCount ?? 0}개</span></div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-0 overflow-hidden">

      {/* ── 상단: 모델 + 캐시 + 요일 ── */}
      <div className="flex gap-4 shrink-0" style={{ height: '38%' }}>

        {/* 모델 분포 + 프로젝트 분포 */}
        <div className="flex gap-3 flex-1 min-w-0 min-h-0">

          {/* 모델별 */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <div className="text-xs text-zinc-400 font-medium">모델별 사용 분포</div>
              <div className="text-xs text-zinc-600">{formatCost((models ?? []).reduce((s, m) => s + m.usage.totalCost, 0))} · {formatKRW((models ?? []).reduce((s, m) => s + m.usage.totalCost, 0), exchangeRate)}</div>
            </div>
            <div className="flex gap-2 flex-1 min-h-0">
              <div className="flex-1 min-h-0">
                <ModelPieChart data={models ?? []} />
              </div>
              <div className="w-44 flex flex-col gap-1 overflow-auto">
                {(models ?? []).map((m) => (
                  <div key={m.model} className="bg-zinc-800 rounded p-1.5 text-xs shrink-0">
                    <div className="text-zinc-200 font-medium truncate">{m.model}</div>
                    <div className="text-zinc-400">
                      {formatCost(m.usage.totalCost)}{' '}
                      <span className="text-zinc-600">{formatKRW(m.usage.totalCost, exchangeRate)}</span>
                      {' · '}{m.percentage.toFixed(1)}%
                    </div>
                    <div className="text-zinc-500">{fmt(m.usage.totalTokens)} 토큰</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-px bg-zinc-800 self-stretch shrink-0" />

          {/* 프로젝트별 */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <div className="text-xs text-zinc-400 font-medium">프로젝트별 사용 분포</div>
              <div className="text-xs text-zinc-600">{formatCost(projectData.reduce((s, p) => s + p.totalCost, 0))} · {formatKRW(projectData.reduce((s, p) => s + p.totalCost, 0), exchangeRate)}</div>
            </div>
            <div className="flex gap-2 flex-1 min-h-0">
              <div className="flex-1 min-h-0">
                <ProjectPieChart data={projectData} />
              </div>
              <div className="w-44 flex flex-col gap-1 overflow-auto">
                {projectData.map((p, i) => (
                  <div key={p.projectName} className="bg-zinc-800 rounded p-1.5 text-xs shrink-0">
                    <div className="text-zinc-200 font-medium truncate" title={p.projectName}>{p.projectName}</div>
                    <div className="text-zinc-400">
                      {formatCost(p.totalCost)}{' '}
                      <span className="text-zinc-600">{formatKRW(p.totalCost, exchangeRate)}</span>
                      {' · '}{p.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        <div className="w-px bg-zinc-800 self-stretch shrink-0" />

        {/* 캐시 효율 */}
        <div className="flex flex-col gap-2 w-48 shrink-0">
          <div className="text-xs text-zinc-400 font-medium">캐시 효율</div>
          {cache && (
            <>
              <div className="flex gap-2 shrink-0">
                <div className="bg-zinc-800 rounded-lg p-2 flex-1 text-center">
                  <div className="text-xs text-zinc-500 mb-0.5">절약한 비용</div>
                  <div className="text-sm font-bold text-emerald-400">{formatCost(cache.totalSaved)}</div>
                  <div className="text-xs text-zinc-600">{formatKRW(cache.totalSaved, exchangeRate)}</div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-2 flex-1 text-center">
                  <div className="text-xs text-zinc-500 mb-0.5">히트율</div>
                  <div className="text-sm font-bold text-blue-400">{cache.efficiency.toFixed(1)}%</div>
                </div>
              </div>
              <div className="text-xs text-zinc-600">일별 캐시 절약액 추이</div>
              <div className="text-xs text-zinc-700">절약액 = cacheRead토큰 × (input단가 − cacheRead단가) ÷ 10⁶</div>
              <div className="text-xs text-zinc-700">히트율 = cacheRead ÷ (input + cacheRead) × 100%</div>
              <div className="flex-1 min-h-0">
                <CacheChart data={cache} />
              </div>
            </>
          )}
        </div>

        <div className="w-px bg-zinc-800 self-stretch shrink-0" />

        {/* 요일별 */}
        <div className="flex flex-col gap-2 w-52 shrink-0">
          <div className="text-xs text-zinc-400 font-medium">요일별 평균 API 호출당 비용</div>
          {peakDay?.sessionCount > 0 && (
            <div className="text-xs text-zinc-500">
              최고 <span className="text-zinc-300 font-medium">{peakDay.label}요일</span>{' '}
              ({formatCost(peakDay.avgCost)}/호출)
            </div>
          )}
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dowData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
                <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={46} tickFormatter={(v) => `$${v.toFixed(3)}`} />
                <Tooltip content={<DowTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="avgCost" radius={[4, 4, 0, 0]}>
                  {dowData.map((_, i) => <Cell key={i} fill={DAY_COLORS[i] ?? '#60a5fa'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-0.5 shrink-0">
            {dowData.map((d) => (
              <div key={d.dayIndex} className="flex-1 text-center text-xs text-zinc-600">{d.sessionCount}개</div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px bg-zinc-800 my-3 shrink-0" />

      {/* ── 중단: 시간대 히트맵 ── */}
      <div className="shrink-0">
        {patterns && <HourlyHeatmap data={patterns.hourly} />}
      </div>

      <div className="h-px bg-zinc-800 my-3 shrink-0" />

      {/* ── 하단: 차트 + 세션 목록 ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* 왼쪽: 프로젝트 효율 + 세션 비용 분포 */}
        <div className="flex flex-col gap-3 w-72 shrink-0">

          {/* 프로젝트 효율 scatter */}
          <div className="flex flex-col gap-1 flex-1 min-h-0">
            <div className="text-xs text-zinc-400 font-medium">프로젝트 효율 비교</div>
            <div className="text-xs text-zinc-600">x=세션 수, y=총비용 · 점 크기=세션당 평균비용</div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="sessionCount" type="number" name="세션 수" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: '세션 수', position: 'insideBottom', offset: -2, fill: '#52525b', fontSize: 9 }} />
                  <YAxis dataKey="totalCost" type="number" name="총비용" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => `$${v.toFixed(1)}`} />
                  <ZAxis dataKey="avgCost" range={[40, 400]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3', stroke: '#3f3f46' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xs">
                          <div className="text-white font-medium truncate max-w-[160px]">{d.projectName}</div>
                          <div className="text-zinc-400">총비용 <span className="text-yellow-400">{formatCost(d.totalCost)}</span></div>
                          <div className="text-zinc-400">세션 수 <span className="text-white">{d.sessionCount}개</span></div>
                          <div className="text-zinc-400">세션당 <span className="text-blue-400">{formatCost(d.avgCost)}</span></div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={projectData.map((p) => ({ ...p, avgCost: p.sessionCount > 0 ? p.totalCost / p.sessionCount : 0 }))}
                    fill="#3b82f6"
                    fillOpacity={0.8}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        <div className="w-px bg-zinc-800 shrink-0" />

        {/* 오른쪽: 세션 목록 */}
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs text-zinc-400 font-medium">세션 목록</div>
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white placeholder-zinc-600 outline-none focus:border-blue-500"
            />
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-zinc-950">
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="pb-1.5 pr-3 font-medium">프로젝트</th>
                  <th className="pb-1.5 pr-3 font-medium text-right">토큰</th>
                  <th className="pb-1.5 pr-3 font-medium text-right">비용</th>
                  <th className="pb-1.5 font-medium text-right">마지막 활동</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.sessionId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-1.5 pr-3 text-zinc-200 max-w-[180px] truncate">{s.projectName}</td>
                    <td className="py-1.5 pr-3 text-right text-zinc-300">{fmt(s.totalTokens)}</td>
                    <td className="py-1.5 pr-3 text-right text-yellow-400">{formatCost(s.totalCost)}</td>
                    <td className="py-1.5 text-right text-zinc-500">{formatRelativeTime(s.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-zinc-600 text-center py-6">세션이 없습니다</div>}
          </div>
        </div>

      </div>

    </div>
  );
}
