'use client';

import { HourlyPattern } from '@/types';
import { formatCost } from '@/lib/format';

interface Props {
  data: HourlyPattern[];
}

function hourLabel(h: number): string {
  if (h === 0) return '자정(0시)';
  if (h === 12) return '정오(12시)';
  if (h < 12) return `오전 ${h}시`;
  return `오후 ${h - 12}시`;
}

export function HourlyHeatmap({ data }: Props) {
  const maxCost = Math.max(...data.map((d) => d.avgCost), 0.0001);
  const peakHour = data.reduce((best, d) => (d.avgCost > best.avgCost ? d : best), data[0]);

  return (
    <div className="flex flex-col gap-2">
      {/* Header + 범례 설명 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-400 font-medium">시간대별 사용 패턴</div>
          <div className="text-xs text-zinc-600 mt-0.5">
            각 칸 = 해당 시간에 발생한 API 호출의 <span className="text-zinc-500">평균 비용</span> (색이 밝을수록 비쌈) · 숫자 = 고유 세션 수
          </div>
        </div>
        {peakHour.sessionCount > 0 && (
          <div className="text-xs text-zinc-500 shrink-0 text-right">
            최고 비용 시간대{' '}
            <span className="text-zinc-300 font-medium">{hourLabel(peakHour.hour)}</span>
            <br />
            <span className="text-zinc-600">평균 {formatCost(peakHour.avgCost)}/호출 · {peakHour.sessionCount}개 세션</span>
          </div>
        )}
      </div>

      {/* AM / PM 구분 */}
      <div className="flex text-xs text-zinc-600">
        <div className="w-1/2 text-left pl-1">← 오전 (0–11시)</div>
        <div className="w-1/2 text-right pr-1">오후 (12–23시) →</div>
      </div>

      {/* Heatmap */}
      <div className="flex gap-0.5">
        {data.map((d) => {
          const intensity = d.avgCost / maxCost;
          const bg =
            d.sessionCount === 0
              ? '#18181b'
              : intensity < 0.2 ? '#1e3a5f'
              : intensity < 0.4 ? '#1d4ed8'
              : intensity < 0.6 ? '#2563eb'
              : intensity < 0.8 ? '#7c3aed'
              : '#a855f7';

          return (
            <div
              key={d.hour}
              className="flex-1 rounded flex flex-col items-center justify-center cursor-default group relative"
              style={{ height: 44, backgroundColor: bg }}
            >
              <span className="text-zinc-400 text-[9px] leading-tight">{d.hour}시</span>
              <span className="text-white text-[10px] font-medium leading-tight">
                {d.sessionCount > 0 ? `${d.sessionCount}개` : '–'}
              </span>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block pointer-events-none">
                <div className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs whitespace-nowrap shadow-lg">
                  <div className="text-white font-semibold">{hourLabel(d.hour)}</div>
                  {d.sessionCount > 0 ? (
                    <>
                      <div className="text-zinc-400">세션 수: <span className="text-white">{d.sessionCount}개</span></div>
                      <div className="text-zinc-400">평균 비용: <span className="text-yellow-300">{formatCost(d.avgCost)}</span>/호출</div>
                    </>
                  ) : (
                    <div className="text-zinc-600">활동 없음</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-600">비용 낮음</span>
        <div className="flex gap-0.5 flex-1">
          {['#18181b', '#1e3a5f', '#1d4ed8', '#2563eb', '#7c3aed', '#a855f7'].map((c, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-sm" style={{ backgroundColor: c }} />
          ))}
        </div>
        <span className="text-xs text-zinc-600">비용 높음</span>
      </div>
    </div>
  );
}
