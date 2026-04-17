import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { TokenUsage, DailyUsage, SessionUsage, BurnRate, Projection, UsageSummary, ModelUsage } from '@/types';

// Claude pricing per million tokens (USD)
// 순서 중요: 더 구체적인 패턴을 먼저 배치
// cacheCreate = 5분 캐시 쓰기 요금 기준
const PRICING: Record<string, { input: number; output: number; cacheCreate: number; cacheRead: number }> = {
  // Claude Opus 4.x 계열
  'opus-4-7':         { input: 5.0,  output: 25.0,  cacheCreate: 6.25,  cacheRead: 0.5  }, // Opus 4.7
  'opus-4-6':         { input: 5.0,  output: 25.0,  cacheCreate: 6.25,  cacheRead: 0.5  }, // Opus 4.6
  'opus-4-5':         { input: 5.0,  output: 25.0,  cacheCreate: 6.25,  cacheRead: 0.5  }, // Opus 4.5
  'opus-4-1':         { input: 15.0, output: 75.0,  cacheCreate: 18.75, cacheRead: 1.5  }, // Opus 4.1
  'claude-opus-4':    { input: 15.0, output: 75.0,  cacheCreate: 18.75, cacheRead: 1.5  }, // Opus 4
  // Claude Sonnet 4.x 계열
  'claude-sonnet-4':  { input: 3.0,  output: 15.0,  cacheCreate: 3.75,  cacheRead: 0.3  }, // Sonnet 4/4.5/4.6
  // Claude Haiku 4.5 계열
  'haiku-4-5':        { input: 1.0,  output: 5.0,   cacheCreate: 1.25,  cacheRead: 0.10 }, // Haiku 4.5
  // Claude 3.x 계열 (구체적 → 일반 순)
  'claude-3-7-sonnet':{ input: 3.0,  output: 15.0,  cacheCreate: 3.75,  cacheRead: 0.3  }, // Sonnet 3.7
  'claude-3-5-sonnet':{ input: 3.0,  output: 15.0,  cacheCreate: 3.75,  cacheRead: 0.3  }, // Sonnet 3.5
  'claude-3-5-haiku': { input: 0.8,  output: 4.0,   cacheCreate: 1.0,   cacheRead: 0.08 }, // Haiku 3.5
  'claude-3-opus':    { input: 15.0, output: 75.0,  cacheCreate: 18.75, cacheRead: 1.5  }, // Opus 3
  'claude-3-haiku':   { input: 0.25, output: 1.25,  cacheCreate: 0.3125, cacheRead: 0.03 }, // Haiku 3
  'claude-3-sonnet':  { input: 3.0,  output: 15.0,  cacheCreate: 3.75,  cacheRead: 0.3  }, // Sonnet 3
};

function getPricing(model: string): { input: number; output: number; cacheCreate: number; cacheRead: number } {
  const DEFAULT = { input: 3.0, output: 15.0, cacheCreate: 3.75, cacheRead: 0.3 };
  if (!model) return DEFAULT;
  const lower = model.toLowerCase();
  for (const [key, pricing] of Object.entries(PRICING)) {
    if (lower.includes(key)) return pricing;
  }
  return DEFAULT;
}

function getModelFamily(model: string): string {
  if (!model) return 'unknown';
  const lower = model.toLowerCase();
  // Claude Opus 4.x (구체적 버전 먼저)
  if (lower.includes('opus-4-7'))  return 'claude-opus-4-7';
  if (lower.includes('opus-4-6'))  return 'claude-opus-4-6';
  if (lower.includes('opus-4-5'))  return 'claude-opus-4-5';
  if (lower.includes('opus-4-1'))  return 'claude-opus-4-1';
  if (lower.includes('opus-4'))    return 'claude-opus-4';
  // Claude Sonnet 4.x
  if (lower.includes('haiku-4-5') || lower.includes('haiku4-5')) return 'claude-haiku-4-5';
  if (lower.includes('sonnet-4'))  return 'claude-sonnet-4';
  // Claude 3.x 계열
  if (lower.includes('3-7-sonnet') || lower.includes('3.7-sonnet')) return 'claude-3-7-sonnet';
  if (lower.includes('3-5-sonnet') || lower.includes('3.5-sonnet')) return 'claude-3-5-sonnet';
  if (lower.includes('3-5-haiku')  || lower.includes('3.5-haiku'))  return 'claude-3-5-haiku';
  if (lower.includes('3-opus'))    return 'claude-3-opus';
  if (lower.includes('3-haiku'))   return 'claude-3-haiku';
  if (lower.includes('3-sonnet'))  return 'claude-3-sonnet';
  return model;
}

function calculateCost(usage: { input: number; output: number; cacheCreate: number; cacheRead: number }, model: string): number {
  const p = getPricing(model);
  return (
    (usage.input * p.input +
      usage.output * p.output +
      usage.cacheCreate * p.cacheCreate +
      usage.cacheRead * p.cacheRead) /
    1_000_000
  );
}

function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, totalTokens: 0, totalCost: 0 };
}

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheCreationTokens: a.cacheCreationTokens + b.cacheCreationTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    totalCost: a.totalCost + b.totalCost,
  };
}

interface RawRecord {
  type?: string;
  timestamp?: string;
  message?: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    model?: string;
    stop_reason?: string | null;
  };
  costUSD?: number;
}

interface ParsedRecord {
  timestamp: Date;
  model: string;
  family: string;
  usage: TokenUsage;
  sessionId: string;
  projectName: string;
}

export function getClaudePath(): string {
  return process.env.CLAUDE_PATH || path.join(process.env.HOME || '~', '.claude');
}

function findJsonlFiles(claudePath: string): string[] {
  const projectsPath = path.join(claudePath, 'projects');
  if (!fs.existsSync(projectsPath)) return [];

  const files: string[] = [];
  function walk(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.jsonl')) files.push(full);
      }
    } catch {}
  }
  walk(projectsPath);
  return files;
}

function extractSessionInfo(filePath: string, claudePath: string): { sessionId: string; projectName: string } {
  const projectsPath = path.join(claudePath, 'projects');
  const relative = path.relative(projectsPath, filePath);
  const parts = relative.split(path.sep);
  const rawName = parts[0] || 'unknown';
  const sessionId = parts[parts.length - 2] || parts[parts.length - 1] || 'unknown';

  // Claude Code names project dirs by replacing '/' with '-' in the full path.
  // Strip the home directory prefix (e.g. '-home-lemon-') to get a readable name.
  const home = process.env.HOME || '';
  const homePrefix = home.replace(/\//g, '-') + '-'; // e.g. '-home-lemon-'
  let projectName = rawName.startsWith(homePrefix) ? rawName.slice(homePrefix.length) : rawName;
  // Strip one additional common path segment (e.g. 'repo-') if present
  const repoDir = process.env.CLAUDE_REPO_PREFIX ?? 'repo-';
  if (projectName.startsWith(repoDir)) projectName = projectName.slice(repoDir.length);

  return { sessionId, projectName };
}

async function parseFile(filePath: string, claudePath: string): Promise<ParsedRecord[]> {
  const { sessionId, projectName } = extractSessionInfo(filePath, claudePath);
  const records: ParsedRecord[] = [];

  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const raw: RawRecord = JSON.parse(line);
      if (!raw.timestamp || !raw.message?.usage) continue;

      const ts = new Date(raw.timestamp);
      if (isNaN(ts.getTime())) continue;

      const u = raw.message.usage;
      const model = raw.message.model || '';
      if (model.startsWith('<') && model.endsWith('>')) continue; // <synthetic> 등 내부 레코드 제외
      const family = getModelFamily(model);
      const input = u.input_tokens || 0;
      const output = u.output_tokens || 0;
      const cacheCreate = u.cache_creation_input_tokens || 0;
      const cacheRead = u.cache_read_input_tokens || 0;
      // claudelytics/ccusage와 동일하게 항상 토큰으로 재계산
      // costUSD는 모델 정보 없이 계산 불가한 경우에만 폴백으로 사용
      let cost = calculateCost({ input, output, cacheCreate, cacheRead }, model);
      if (cost === 0 && raw.costUSD) cost = raw.costUSD;

      records.push({
        timestamp: ts,
        model,
        family,
        usage: {
          inputTokens: input,
          outputTokens: output,
          cacheCreationTokens: cacheCreate,
          cacheReadTokens: cacheRead,
          totalTokens: input + output + cacheCreate + cacheRead,
          totalCost: cost,
        },
        sessionId,
        projectName,
      });
    } catch {}
  }
  return records;
}

// ── 캐시 레이어 ────────────────────────────────────────────────────────
// 1) 파일별 파싱 결과를 mtime + size 키로 메모리에 보관
// 2) _recordsVersion을 파일 변경 시마다 bump → aggregate 함수들이 버전 키로 메모이즈
// 3) CACHE_DIR에 디바운스 저장 → 서버 재시작 후 콜드 스타트 제거

interface FileCacheEntry {
  mtimeMs: number;
  size: number;
  records: ParsedRecord[];
}

const _fileCache = new Map<string, FileCacheEntry>();
let _mergedCache: ParsedRecord[] | null = null;
let _recordsVersion = 0;
let _diskLoaded = false;
let _inflight: Promise<ParsedRecord[]> | null = null;

const CACHE_DIR = process.env.CACHE_DIR || path.join(os.tmpdir(), 'claude-dashboard-cache');
const DISK_CACHE_FILE = path.join(CACHE_DIR, 'records.json');
const DISK_CACHE_VERSION = 1;

function loadDiskCache(): void {
  try {
    if (!fs.existsSync(DISK_CACHE_FILE)) return;
    const raw = fs.readFileSync(DISK_CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== DISK_CACHE_VERSION || !Array.isArray(parsed.entries)) return;
    for (const [p, e] of parsed.entries as Array<[string, { mtimeMs: number; size: number; records: Array<Omit<ParsedRecord, 'timestamp'> & { timestamp: string }> }]>) {
      const records: ParsedRecord[] = e.records.map((r) => ({ ...r, timestamp: new Date(r.timestamp) }));
      _fileCache.set(p, { mtimeMs: e.mtimeMs, size: e.size, records });
    }
  } catch {
    _fileCache.clear();
  }
}

let _saveTimer: NodeJS.Timeout | null = null;
function scheduleDiskSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    _saveTimer = null;
    try {
      await fs.promises.mkdir(CACHE_DIR, { recursive: true });
      const entries = Array.from(_fileCache.entries()).map(([p, e]) => [p, {
        mtimeMs: e.mtimeMs,
        size: e.size,
        records: e.records.map((r) => ({ ...r, timestamp: r.timestamp.toISOString() })),
      }]);
      const payload = JSON.stringify({ version: DISK_CACHE_VERSION, entries });
      const tmp = DISK_CACHE_FILE + '.tmp';
      await fs.promises.writeFile(tmp, payload);
      await fs.promises.rename(tmp, DISK_CACHE_FILE);
    } catch {}
  }, 5_000);
}

async function doGetAllRecords(): Promise<ParsedRecord[]> {
  if (!_diskLoaded) {
    loadDiskCache();
    _diskLoaded = true;
  }

  const claudePath = getClaudePath();
  const files = findJsonlFiles(claudePath);
  const currentSet = new Set(files);

  let dirty = false;

  // 사라진 파일 제거
  for (const k of Array.from(_fileCache.keys())) {
    if (!currentSet.has(k)) {
      _fileCache.delete(k);
      dirty = true;
    }
  }

  // 변경된 파일만 재파싱
  await Promise.all(files.map(async (f) => {
    try {
      const st = await fs.promises.stat(f);
      const cached = _fileCache.get(f);
      if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) return;
      const records = await parseFile(f, claudePath);
      _fileCache.set(f, { mtimeMs: st.mtimeMs, size: st.size, records });
      dirty = true;
    } catch {}
  }));

  if (!dirty && _mergedCache) return _mergedCache;

  // 전체 목록 재구성
  const merged: ParsedRecord[] = [];
  for (const e of _fileCache.values()) merged.push(...e.records);
  merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  _mergedCache = merged;
  _recordsVersion++;

  if (dirty) scheduleDiskSave();

  return merged;
}

export async function getAllRecords(): Promise<ParsedRecord[]> {
  if (_inflight) return _inflight;
  _inflight = doGetAllRecords().finally(() => { _inflight = null; });
  return _inflight;
}

// ── Aggregate 결과 메모이즈 (records 버전 키) ──────────────────────────
const _aggCache = new Map<string, { version: number; data: unknown }>();

async function memoByVersion<T>(key: string, compute: () => Promise<T> | T): Promise<T> {
  const existing = _aggCache.get(key);
  if (existing && existing.version === _recordsVersion) return existing.data as T;
  const data = await compute();
  _aggCache.set(key, { version: _recordsVersion, data });
  return data;
}

// --- Aggregation helpers ---
// claudelytics와 동일하게 로컬 시간 기준으로 집계

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalMonthStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const records = await getAllRecords();
  const now = new Date();
  const todayStr = toLocalDateStr(now);
  const thisMonthStr = toLocalMonthStr(now);

  // Daily aggregation (로컬 시간 기준 - claudelytics와 동일)
  const dailyMap = new Map<string, { usage: TokenUsage; models: Map<string, TokenUsage> }>();
  for (const r of records) {
    const dateStr = toLocalDateStr(r.timestamp);
    if (!dailyMap.has(dateStr)) dailyMap.set(dateStr, { usage: emptyUsage(), models: new Map() });
    const entry = dailyMap.get(dateStr)!;
    entry.usage = addUsage(entry.usage, r.usage);
    const mUsage = entry.models.get(r.family) || emptyUsage();
    entry.models.set(r.family, addUsage(mUsage, r.usage));
  }

  const daily: DailyUsage[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { usage, models }]) => ({
      date,
      ...usage,
      modelBreakdown: Object.fromEntries(models.entries()),
    }));

  // Last 30 days only for chart
  const last30 = daily.slice(-30);

  // Monthly (로컬 시간 기준)
  const monthlyMap = new Map<string, TokenUsage>();
  for (const r of records) {
    const mStr = toLocalMonthStr(r.timestamp);
    monthlyMap.set(mStr, addUsage(monthlyMap.get(mStr) || emptyUsage(), r.usage));
  }

  // Today / this month
  const today = dailyMap.get(todayStr)?.usage || emptyUsage();
  const thisMonth = monthlyMap.get(thisMonthStr) || emptyUsage();
  const allTime = records.reduce((acc, r) => addUsage(acc, r.usage), emptyUsage());

  // Burn rate (last 2 hours)
  const burnRate = getBurnRate(records, now);

  // Projections (30 days forward from today)
  const projections = getProjections(daily, now);

  return {
    today,
    thisMonth,
    allTime,
    daily: last30,
    monthly: Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, usage]) => ({ month, ...usage })),
    burnRate,
    projections,
  };
}

function getBurnRate(records: ParsedRecord[], now: Date): BurnRate {
  const twoHoursAgo = new Date(now.getTime() - 2 * 3600_000);
  const oneHourAgo = new Date(now.getTime() - 3600_000);

  const recent2h = records.filter((r) => r.timestamp >= twoHoursAgo);
  const recent1h = records.filter((r) => r.timestamp >= oneHourAgo);

  const cost2h = recent2h.reduce((s, r) => s + r.usage.totalCost, 0);
  const tokens2h = recent2h.reduce((s, r) => s + r.usage.totalTokens, 0);
  const cost1h = recent1h.reduce((s, r) => s + r.usage.totalCost, 0);

  const costPerHour = cost2h / 2;
  const tokensPerHour = tokens2h / 2;

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (cost1h > costPerHour * 1.2) trend = 'increasing';
  else if (cost1h < costPerHour * 0.8) trend = 'decreasing';

  // Count unique sessions active in last hour
  const activeSessions = new Set(recent1h.map((r) => r.sessionId)).size;

  return {
    tokensPerHour,
    costPerHour,
    projectedDailyCost: costPerHour * 24,
    projectedMonthlyCost: costPerHour * 24 * 30,
    trend,
    activeSessions,
  };
}

function getProjections(daily: DailyUsage[], now: Date): Projection[] {
  // Use last 7 days average as baseline
  const last7 = daily.slice(-7);
  const avgDailyCost = last7.length > 0
    ? last7.reduce((s, d) => s + d.totalCost, 0) / last7.length
    : 0;
  const avgDailyTokens = last7.length > 0
    ? last7.reduce((s, d) => s + d.totalTokens, 0) / last7.length
    : 0;

  const result: Projection[] = [];

  // Past 30 days (actual)
  for (const d of daily) {
    result.push({ date: d.date, projectedCost: d.totalCost, projectedTokens: d.totalTokens, isProjected: false });
  }

  // Next 14 days (projected)
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now.getTime() + i * 86_400_000);
    result.push({
      date: toLocalDateStr(d),
      projectedCost: avgDailyCost,
      projectedTokens: avgDailyTokens,
      isProjected: true,
    });
  }

  return result;
}

export async function getModelUsage(): Promise<ModelUsage[]> {
  const records = await getAllRecords();
  return memoByVersion('models', () => {
    const modelMap = new Map<string, TokenUsage>();

    for (const r of records) {
      modelMap.set(r.family, addUsage(modelMap.get(r.family) || emptyUsage(), r.usage));
    }

    const total = Array.from(modelMap.values()).reduce((s, u) => s + u.totalCost, 0);

    return Array.from(modelMap.entries())
      .map(([model, usage]) => ({
        model,
        family: model,
        usage,
        percentage: total > 0 ? (usage.totalCost / total) * 100 : 0,
      }))
      .sort((a, b) => b.usage.totalCost - a.usage.totalCost);
  });
}

export async function getSessions(): Promise<import('@/types').SessionUsage[]> {
  const records = await getAllRecords();
  return memoByVersion('sessions', () => {
    const sessionMap = new Map<string, { usage: TokenUsage; lastActivity: Date; projectName: string }>();

    for (const r of records) {
      const key = r.sessionId;
      const existing = sessionMap.get(key);
      if (!existing) {
        sessionMap.set(key, { usage: r.usage, lastActivity: r.timestamp, projectName: r.projectName });
      } else {
        existing.usage = addUsage(existing.usage, r.usage);
        if (r.timestamp > existing.lastActivity) existing.lastActivity = r.timestamp;
      }
    }

    return Array.from(sessionMap.entries())
      .map(([sessionId, { usage, lastActivity, projectName }]) => ({
        sessionId,
        projectName,
        lastActivity: lastActivity.toISOString(),
        ...usage,
      }))
      .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  });
}

export async function getHourlyCosts(): Promise<{ datetime: string; cost: number }[]> {
  const records = await getAllRecords();
  return memoByVersion('hourlyCosts', () => {
    const map = new Map<string, number>();

    for (const r of records) {
      // key: "YYYY-MM-DD HH" in local time
      const d = r.timestamp;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + r.usage.totalCost);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([datetime, cost]) => ({ datetime, cost }));
  });
}
