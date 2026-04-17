export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
}

export interface DailyUsage extends TokenUsage {
  date: string; // YYYY-MM-DD
  modelBreakdown: Record<string, TokenUsage>;
}

export interface SessionUsage extends TokenUsage {
  sessionId: string;
  projectName: string;
  lastActivity: string;
}

export interface MonthlyUsage extends TokenUsage {
  month: string; // YYYY-MM
}

export interface BurnRate {
  tokensPerHour: number;
  costPerHour: number;
  projectedDailyCost: number;
  projectedMonthlyCost: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  activeSessions: number;
}

export interface Projection {
  date: string;
  projectedCost: number;
  projectedTokens: number;
  isProjected: boolean;
}

export interface UsageSummary {
  today: TokenUsage;
  thisMonth: TokenUsage;
  allTime: TokenUsage;
  daily: DailyUsage[];
  monthly: MonthlyUsage[];
  burnRate: BurnRate;
  projections: Projection[];
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
