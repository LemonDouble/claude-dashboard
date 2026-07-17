import { Granularity, BucketPeriod } from '@/types';
import { formatDate } from '@/lib/format';

// 집계 단위별 허용 기간 — 시간 단위에 '전체'를 열면 버킷 수가 폭발하므로 조합을 제한
export const PERIODS_BY_GRANULARITY: Record<Granularity, BucketPeriod[]> = {
  hour:  ['24h', '7d'],
  day:   ['7d', '30d', '90d'],
  week:  ['30d', '90d', 'all'],
  month: ['90d', 'all'],
};

export const DEFAULT_PERIOD: Record<Granularity, BucketPeriod> = {
  hour: '24h',
  day: '30d',
  week: '90d',
  month: 'all',
};

export const PERIOD_HOURS: Record<Exclude<BucketPeriod, 'all'>, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
  '90d': 24 * 90,
};

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  hour: '시간',
  day: '일',
  week: '주',
  month: '월',
};

export const PERIOD_LABELS: Record<BucketPeriod, string> = {
  '24h': '24시간',
  '7d': '7일',
  '30d': '30일',
  '90d': '90일',
  all: '전체',
};

/** 버킷 키 → X축 표시용 짧은 라벨 */
export function bucketLabel(bucket: string, granularity: Granularity, period: BucketPeriod): string {
  switch (granularity) {
    case 'hour':
      // "YYYY-MM-DD HH" → 24시간 뷰는 "14시", 그 이상은 "MM-DD HH"
      return period === '24h' ? `${parseInt(bucket.slice(11), 10)}시` : bucket.slice(5);
    case 'day':
      return formatDate(bucket);
    case 'week': {
      // 주 시작(월요일) 날짜 → "7/14~"
      const [, m, d] = bucket.split('-');
      return `${parseInt(m, 10)}/${parseInt(d, 10)}~`;
    }
    case 'month':
      return bucket; // "YYYY-MM"
  }
}
