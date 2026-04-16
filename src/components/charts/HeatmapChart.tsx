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

/** Lemon Design System 히트맵 팔레트 – 비어있음→보더 → 레몬 Dim → 레몬 → 코랄 (피크) */
const HEAT_SCALE = [
  '#1C1816', // empty
  '#2E2723', // 0–20%
  '#4D3C04', // 20–40%  (lemon-800)
  '#A88208', // 40–60%  (lemon-600)
  '#D4A30A', // 60–80%  (lemon-500)
  '#F0B90B', // 80–100% (lemon-400 brand)
];

export function HourlyHeatmap({ data }: Props) {
  const maxCost = Math.max(...data.map((d) => d.avgCost), 0.0001);
  const peakHour = data.reduce((best, d) => (d.avgCost > best.avgCost ? d : best), data[0]);

  return (
    <div className="flex flex-col gap-2">
      {/* Header + 범례 설명 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-foreground">시간대별 사용 패턴</div>
          <div className="text-xs text-muted-foreground/70 mt-0.5">
            각 칸 = 해당 시간에 발생한 API 호출의 <span className="text-muted-foreground">평균 비용</span> (색이 밝을수록 비쌈) · 숫자 = 고유 세션 수
          </div>
        </div>
        {peakHour.sessionCount > 0 && (
          <div className="text-xs text-muted-foreground shrink-0 text-right">
            최고 비용 시간대{' '}
            <span className="text-foreground font-semibold">{hourLabel(peakHour.hour)}</span>
            <br />
            <span className="text-muted-foreground/70">평균 {formatCost(peakHour.avgCost)}/호출 · {peakHour.sessionCount}개 세션</span>
          </div>
        )}
      </div>

      {/* AM / PM 구분 */}
      <div className="flex text-xs text-muted-foreground/70">
        <div className="w-1/2 text-left pl-1">← 오전 (0–11시)</div>
        <div className="w-1/2 text-right pr-1">오후 (12–23시) →</div>
      </div>

      {/* Heatmap */}
      <div className="flex gap-0.5">
        {data.map((d) => {
          const intensity = d.avgCost / maxCost;
          const bg =
            d.sessionCount === 0
              ? HEAT_SCALE[0]
              : intensity < 0.2 ? HEAT_SCALE[1]
              : intensity < 0.4 ? HEAT_SCALE[2]
              : intensity < 0.6 ? HEAT_SCALE[3]
              : intensity < 0.8 ? HEAT_SCALE[4]
              : HEAT_SCALE[5];

          // 배경이 밝을수록 어두운 글자, 어두울수록 밝은 글자
          const isLight = intensity >= 0.6 && d.sessionCount > 0;
          const labelCls = isLight ? 'text-[#12100E]' : 'text-muted-foreground';
          const valueCls = isLight ? 'text-[#12100E]' : 'text-foreground';

          return (
            <div
              key={d.hour}
              className="flex-1 rounded flex flex-col items-center justify-center cursor-default group relative"
              style={{ height: 44, backgroundColor: bg }}
            >
              <span className={`${labelCls} text-[9px] leading-tight`}>{d.hour}시</span>
              <span className={`${valueCls} text-[10px] font-medium leading-tight`}>
                {d.sessionCount > 0 ? `${d.sessionCount}개` : '–'}
              </span>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block pointer-events-none">
                <div className="bg-card border border-border rounded-md px-2 py-1.5 text-xs whitespace-nowrap">
                  <div className="text-foreground font-semibold">{hourLabel(d.hour)}</div>
                  {d.sessionCount > 0 ? (
                    <>
                      <div className="text-muted-foreground">세션 수: <span className="text-foreground">{d.sessionCount}개</span></div>
                      <div className="text-muted-foreground">평균 비용: <span className="text-primary">{formatCost(d.avgCost)}</span>/호출</div>
                    </>
                  ) : (
                    <div className="text-muted-foreground/60">활동 없음</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground/70">비용 낮음</span>
        <div className="flex gap-0.5 flex-1">
          {HEAT_SCALE.map((c, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-sm" style={{ backgroundColor: c }} />
          ))}
        </div>
        <span className="text-xs text-muted-foreground/70">비용 높음</span>
      </div>
    </div>
  );
}
