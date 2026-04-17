'use client';

import useSWR from 'swr';
import { RateLimits, RateLimitWindow } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatResetCountdown(iso: string | null): string {
  if (!iso) return '초기화 시간 미정';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return '곧 초기화';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}일 ${h % 24}시간 후 초기화`;
  if (h > 0) return `${h}시간 ${m}분 후 초기화`;
  return `${m}분 후 초기화`;
}

function barColor(pct: number): string {
  if (pct >= 80) return 'bg-destructive';
  if (pct >= 50) return 'bg-secondary';
  return 'bg-primary';
}

function accentBorder(pct: number): string {
  if (pct >= 80) return 'border-l-destructive';
  if (pct >= 50) return 'border-l-secondary';
  return 'border-l-primary';
}

interface CardProps {
  label: string;
  window: RateLimitWindow;
}

function RateLimitCard({ label, window }: CardProps) {
  const pct = Math.round(window.utilization);
  return (
    <div
      className={`bg-card border border-border border-l-2 ${accentBorder(pct)} rounded-xl p-3 flex flex-col gap-1.5`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-base font-semibold font-mono text-foreground leading-none">{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor(pct)} transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground/70 font-mono">
        {formatResetCountdown(window.resetsAt)}
      </div>
    </div>
  );
}

export function RateLimitWidgets() {
  const { data, isLoading } = useSWR<RateLimits>('/api/rate-limits', fetcher, {
    refreshInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground">
        사용 한도 불러오는 중…
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground">
        사용 한도를 불러올 수 없습니다. <code className="font-mono text-foreground">~/.claude/.credentials.json</code>에 OAuth 토큰이 있는지 확인해주세요.
      </div>
    );
  }

  const windows: Array<[string, RateLimitWindow | null]> = [
    ['5시간 한도', data.fiveHour],
    ['7일 한도', data.sevenDay],
    ['7일 Sonnet 한도', data.sevenDaySonnet],
  ];

  const present = windows.filter((w): w is [string, RateLimitWindow] => w[1] !== null);

  if (present.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground">
        사용 한도 데이터 없음
      </div>
    );
  }

  return (
    <div className={`grid gap-3 grid-cols-${present.length}`} style={{ gridTemplateColumns: `repeat(${present.length}, minmax(0, 1fr))` }}>
      {present.map(([label, w]) => (
        <RateLimitCard key={label} label={label} window={w} />
      ))}
    </div>
  );
}
