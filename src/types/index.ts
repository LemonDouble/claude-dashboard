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

export interface BillingBlock {
  blockIndex: number; // 0-4
  startHour: number; // UTC hour
  endHour: number;
  usage: TokenUsage;
  promptCount: number; // API 호출 횟수 (메시지 수)
  isActive: boolean;
  label: string;
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
  billingBlocks: BillingBlock[];
  burnRate: BurnRate;
  projections: Projection[];
}

export interface ModelUsage {
  model: string;
  family: string;
  usage: TokenUsage;
  percentage: number;
}

export interface CacheStats {
  totalSaved: number; // USD saved by caching
  efficiency: number; // percentage
  daily: { date: string; efficiency: number; saved: number }[];
}

export interface HourlyPattern {
  hour: number;
  avgCost: number;
  avgTokens: number;
  sessionCount: number;
}

export interface DayOfWeekPattern {
  day: string;
  dayIndex: number;
  avgCost: number;
  avgTokens: number;
  sessionCount: number;
}

export interface PatternsData {
  hourly: HourlyPattern[];
  dayOfWeek: DayOfWeekPattern[];
}
