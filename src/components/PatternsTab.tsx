'use client';

import useSWR from 'swr';
import { PatternsData } from '@/types';
import { formatCost } from '@/lib/format';
import { HourlyHeatmap } from './charts/HeatmapChart';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const KR_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_COLORS = ['#f87171', '#60a5fa', '#60a5fa', '#60a5fa', '#60a5fa', '#60a5fa', '#fb923c'];

function timeSlotLabel(hour: number): string {
  if (hour >= 0 && hour < 6) return '새벽';
  if (hour < 12) return '오전';
  if (hour < 18) return '오후';
  return '저녁';
}

export function PatternsTab() {
  const { data, isLoading } = useSWR<PatternsData>('/api/patterns', fetcher, { refreshInterval: 30000 });

  if (isLoading) return <div className="text-zinc-400 text-sm p-4">불러오는 중...</div>;
  if (!data) return <div className="text-zinc-500 text-sm p-4">패턴 데이터가 없습니다</div>;

  const dowData = data.dayOfWeek.map((d) => ({
    ...d,
    label: KR_DAYS[d.dayIndex] ?? d.day,
  }));

  // 주말 vs 평일 비교
  const weekday = dowData.filter((d) => d.dayIndex >= 1 && d.dayIndex <= 5);
  const weekend = dowData.filter((d) => d.dayIndex === 0 || d.dayIndex === 6);
  const avgWeekdayCost = weekday.length ? weekday.reduce((s, d) => s + d.avgCost, 0) / weekday.length : 0;
  const avgWeekendCost = weekend.length ? weekend.reduce((s, d) => s + d.avgCost, 0) / weekend.length : 0;
  const weekdaySessions = weekday.reduce((s, d) => s + d.sessionCount, 0);
  const weekendSessions = weekend.reduce((s, d) => s + d.sessionCount, 0);

  // 시간대별 슬롯 분석 (새벽/오전/오후/저녁)
  const slots: Record<string, { cost: number; sessions: number; count: number }> = {
    새벽: { cost: 0, sessions: 0, count: 0 },
    오전: { cost: 0, sessions: 0, count: 0 },
    오후: { cost: 0, sessions: 0, count: 0 },
    저녁: { cost: 0, sessions: 0, count: 0 },
  };
  for (const h of data.hourly) {
    const slot = timeSlotLabel(h.hour);
    slots[slot].cost += h.avgCost;
    slots[slot].sessions += h.sessionCount;
    slots[slot].count++;
  }
  const slotList = Object.entries(slots).map(([name, v]) => ({
    name,
    avgCost: v.count > 0 ? v.cost / v.count : 0,
    sessions: v.sessions,
  }));
  const busiestSlot = slotList.reduce((best, s) => (s.sessions > best.sessions ? s : best), slotList[0]);

  const peakDay = dowData.reduce((best, d) => (d.avgCost > best.avgCost ? d : best), dowData[0]);
  const busiestDay = dowData.reduce((best, d) => (d.sessionCount > best.sessionCount ? d : best), dowData[0]);

  const CustomTooltip = ({ active, payload, label }: any) => {
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
    <div className="flex flex-col gap-5 h-full overflow-auto pr-1">

      {/* 시간대 히트맵 */}
      <HourlyHeatmap data={data.hourly} />

      {/* 인사이트 요약 카드 */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-zinc-800/60 rounded-lg p-2 text-xs">
          <div className="text-zinc-500 mb-1">가장 활발한 시간대</div>
          <div className="text-zinc-200 font-medium">{busiestSlot.name}</div>
          <div className="text-zinc-500">{busiestSlot.sessions}개 세션</div>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-2 text-xs">
          <div className="text-zinc-500 mb-1">평일 평균 비용</div>
          <div className="text-zinc-200 font-medium">{formatCost(avgWeekdayCost)}/호출</div>
          <div className="text-zinc-500">{weekdaySessions}개 세션</div>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-2 text-xs">
          <div className="text-zinc-500 mb-1">주말 평균 비용</div>
          <div className="text-zinc-200 font-medium">{formatCost(avgWeekendCost)}/호출</div>
          <div className="text-zinc-500">{weekendSessions}개 세션</div>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-2 text-xs">
          <div className="text-zinc-500 mb-1">가장 바쁜 요일</div>
          <div className="text-zinc-200 font-medium">{busiestDay.label}요일</div>
          <div className="text-zinc-500">{busiestDay.sessionCount}개 세션</div>
        </div>
      </div>

      {/* 요일별 패턴 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-400 font-medium">요일별 평균 API 호출 비용</div>
          <div className="text-xs text-zinc-600">막대 높이 = 해당 요일에서 평균적으로 API 한 번 호출할 때 드는 비용</div>
        </div>
        {peakDay.sessionCount > 0 && (
          <div className="text-xs text-zinc-500">
            최고 비용 <span className="text-zinc-300 font-medium">{peakDay.label}요일</span>{' '}
            (평균 {formatCost(peakDay.avgCost)}/호출)
          </div>
        )}

        <div style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dowData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}요일`}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={46}
                tickFormatter={(v) => `$${v.toFixed(3)}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="avgCost" radius={[4, 4, 0, 0]} name="평균 비용">
                {dowData.map((_, i) => (
                  <Cell key={i} fill={DAY_COLORS[i] ?? '#60a5fa'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 세션 수 요약 행 */}
        <div className="flex gap-0.5">
          {dowData.map((d) => (
            <div key={d.dayIndex} className="flex-1 text-center">
              <div className="text-xs text-zinc-500">{d.sessionCount}개</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-zinc-600 text-center">↑ 요일별 세션 수</div>
      </div>
    </div>
  );
}
