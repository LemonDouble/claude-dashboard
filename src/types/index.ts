export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
}

export interface SessionUsage extends TokenUsage {
  sessionId: string;
  projectName: string;
  lastActivity: string;
}

export type Granularity = 'hour' | 'day' | 'week' | 'month';
export type BucketPeriod = '24h' | '7d' | '30d' | '90d' | 'all';

export interface BucketUsage extends TokenUsage {
  /** hour: "YYYY-MM-DD HH" · day/week(월요일 시작): "YYYY-MM-DD" · month: "YYYY-MM" */
  bucket: string;
  modelBreakdown: Record<string, TokenUsage>;
}

export interface UnknownModelUsage {
  model: string;
  records: number;
  /** FALLBACK_PRICING(Sonnet 단가) 기준 추정치 */
  estimatedCost: number;
}

export interface UsageSummary {
  today: TokenUsage;
  thisMonth: TokenUsage;
  allTime: TokenUsage;
  /** 단가 미등록 모델 목록 — 비어 있지 않으면 UI에서 경고 배너 표시 */
  unknownModels: UnknownModelUsage[];
}

export interface ModelUsage {
  model: string;
  family: string;
  usage: TokenUsage;
  percentage: number;
}

export interface RateLimitWindow {
  utilization: number; // 0-100
  resetsAt: string | null; // ISO 8601
}

export interface RateLimits {
  fiveHour: RateLimitWindow | null;
  sevenDay: RateLimitWindow | null;
  sevenDaySonnet: RateLimitWindow | null;
  error?: string;
}
