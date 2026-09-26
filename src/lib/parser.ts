import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { TokenUsage, SessionUsage, UsageSummary, ModelUsage, UnknownModelUsage, Granularity, BucketPeriod, BucketUsage } from '@/types';
import { PERIOD_HOURS } from '@/lib/buckets';

// Claude pricing per million tokens (USD) — https://platform.claude.com/docs/en/about-claude/pricing
// 키는 normalizeModelId 결과와 정확히 일치해야 함 (부분 매칭은 신모델을 구모델 단가로 삼켜버림)
// cacheCreate = 5분 캐시 쓰기 요금 기준
type ModelPricing = { input: number; output: number; cacheCreate: number; cacheRead: number };

const FABLE_5_1_TIER: ModelPricing = { input: 10.0, output: 50.0, cacheCreate: 12.5,  cacheRead: 0.25 };
const FABLE_5_TIER: ModelPricing   = { input: 10.0, output: 50.0, cacheCreate: 12.5,  cacheRead: 1.0  };
const OPUS_5_5_TIER: ModelPricing  = { input: 4.0,  output: 20.0, cacheCreate: 5.0,   cacheRead: 0.2  };
const OPUS_TIER: ModelPricing      = { input: 5.0,  output: 25.0, cacheCreate: 6.25,  cacheRead: 0.5  };
const OPUS_LEGACY_TIER: ModelPricing = { input: 15.0, output: 75.0, cacheCreate: 18.75, cacheRead: 1.5 };
const SONNET_5_TIER: ModelPricing  = { input: 2.0,  output: 10.0, cacheCreate: 2.5,   cacheRead: 0.2  };
const SONNET_TIER: ModelPricing    = { input: 3.0,  output: 15.0, cacheCreate: 3.75,  cacheRead: 0.3  };
const HAIKU_4_5_TIER: ModelPricing = { input: 1.0,  output: 5.0,  cacheCreate: 1.25,  cacheRead: 0.1  };

const PRICING: Record<string, ModelPricing> = {
  'fable-5-1':  FABLE_5_1_TIER,
  'mythos-5-1': FABLE_5_1_TIER,
  'fable-5':    FABLE_5_TIER,
  'mythos-5':   FABLE_5_TIER,
  'opus-5-5':   OPUS_5_5_TIER,
  'opus-5':     OPUS_TIER,
  'sonnet-5':   SONNET_5_TIER,
  'opus-4-8':   OPUS_TIER,
  'opus-4-7':   OPUS_TIER,
  'opus-4-6':   OPUS_TIER,
  'opus-4-5':   OPUS_TIER,
  'opus-4-1':   OPUS_LEGACY_TIER,
  'opus-4':     OPUS_LEGACY_TIER,
  'sonnet-4-6': SONNET_TIER,
  'sonnet-4-5': SONNET_TIER,
  'sonnet-4':   SONNET_TIER,
  'haiku-4-5':  HAIKU_4_5_TIER,
  '3-7-sonnet': SONNET_TIER,
  '3-5-sonnet': SONNET_TIER,
  '3-5-haiku':  { input: 0.8,  output: 4.0,  cacheCreate: 1.0,    cacheRead: 0.08 },
  '3-opus':     OPUS_LEGACY_TIER,
  '3-haiku':    { input: 0.25, output: 1.25, cacheCreate: 0.3125, cacheRead: 0.03 },
  '3-sonnet':   SONNET_TIER,
  // Claude Code가 모델 별칭 문자열로 남긴 레코드
  'fable':      FABLE_5_TIER,
  'opus':       OPUS_TIER,
  'sonnet':     SONNET_5_TIER,
  'haiku':      HAIKU_4_5_TIER,
};

// 미등록 모델의 추정 계산용 폴백 단가 (Sonnet 기준)
const FALLBACK_PRICING: ModelPricing = SONNET_TIER;

/** 'us.anthropic.claude-opus-4-5-20251101-v1:0', 'claude-opus-5[1m]' 등 → 'opus-4-5', 'opus-5' */
function normalizeModelId(model: string): string {
  return model
    .toLowerCase()
    .replace(/\[.*\]$/, '')
    .replace(/^.*anthropic\./, '')
    .replace(/^claude-/, '')
    .replace(/-v\d+(:\d+)?$/, '')
    .replace(/[-@]\d{8}$/, '');
}

// 미등록 모델이면 null 반환 — 호출부에서 FALLBACK_PRICING으로 추정하되 unknownPricing으로 표시
function getPricing(model: string): ModelPricing | null {
  return PRICING[normalizeModelId(model)] ?? null;
}

function getModelFamily(model: string): string {
  if (!model) return 'unknown';
  const id = normalizeModelId(model);
  return id in PRICING ? `claude-${id}` : model;
}

function calculateCost(usage: { input: number; output: number; cacheCreate5m: number; cacheCreate1h: number; cacheRead: number }, model: string): { cost: number; unknownPricing: boolean } {
  const known = getPricing(model);
  const pricing = known ?? FALLBACK_PRICING;
  // 1h TTL 캐시 쓰기는 모든 모델에서 input의 2배
  const cost =
    (usage.input * pricing.input +
      usage.output * pricing.output +
      usage.cacheCreate5m * pricing.cacheCreate +
      usage.cacheCreate1h * pricing.input * 2 +
      usage.cacheRead * pricing.cacheRead) /
    1_000_000;
  return { cost, unknownPricing: known === null };
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
  cwd?: string;
  requestId?: string;
  isSidechain?: boolean;
  message?: {
    id?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation?: {
        ephemeral_5m_input_tokens?: number;
        ephemeral_1h_input_tokens?: number;
      };
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
  /** 세션의 실제 작업 디렉토리(레코드 cwd 기준). cwd가 없으면 디렉토리명 기반 폴백 */
  projectPath: string;
  /** 표시용 프로젝트명 — 병합 시점에 projectPath 충돌을 고려해 재계산됨 */
  projectName: string;
  /** 단가 미등록 모델 — totalCost는 FALLBACK_PRICING 기준 추정치 */
  unknownPricing?: boolean;
  /** dedup 키 — 한 API 응답이 content block 수만큼 여러 줄로 기록되므로 응답당 1회만 집계 */
  messageId?: string;
  requestId?: string;
  /** 서브에이전트(sidechain) 레코드 — 부모 메시지가 새 requestId로 재기록될 수 있어 dedup 판단에 사용 */
  isSidechain?: boolean;
}

/** 경로의 마지막 depth개 세그먼트를 표시명으로 사용 (예: depth 2 → 'archived/claude-dashboard') */
function nameAtDepth(p: string, depth: number): string {
  const parts = p.split('/').filter(Boolean);
  if (parts.length === 0) return p || 'unknown';
  return parts.slice(-depth).join('/');
}

/**
 * projectPath 목록 → 표시명 맵.
 * 기본은 basename, 서로 다른 경로끼리 이름이 겹치면 겹치는 것들만 부모 디렉토리를 붙여가며 구분.
 * (예: .../hayakoe vs .../archived/hayakoe → 'claude-projects/hayakoe' / 'archived/hayakoe')
 */
function resolveProjectNames(paths: Iterable<string>): Map<string, string> {
  const unique = Array.from(new Set(paths));
  const depth = new Map<string, number>(unique.map((p) => [p, 1]));
  for (;;) {
    const groups = new Map<string, string[]>();
    for (const p of unique) {
      const n = nameAtDepth(p, depth.get(p)!);
      const g = groups.get(n);
      if (g) g.push(p); else groups.set(n, [p]);
    }
    let changed = false;
    for (const ps of groups.values()) {
      if (ps.length <= 1) continue;
      for (const p of ps) {
        const maxDepth = p.split('/').filter(Boolean).length;
        const d = depth.get(p)!;
        if (d < maxDepth) { depth.set(p, d + 1); changed = true; }
      }
    }
    if (!changed) break;
  }
  return new Map(unique.map((p) => [p, nameAtDepth(p, depth.get(p)!)]));
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
  // Claude Code는 세션 ID를 파일명으로 사용 (<uuid>.jsonl)
  const sessionId = path.basename(filePath, '.jsonl') || 'unknown';

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
  const { sessionId, projectName: fallbackName } = extractSessionInfo(filePath, claudePath);
  const records: ParsedRecord[] = [];
  let cwd: string | null = null;

  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const raw: RawRecord = JSON.parse(line);
      if (!cwd && typeof raw.cwd === 'string' && raw.cwd) cwd = raw.cwd;
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
      // 캐시 쓰기는 5m/1h TTL 단가가 다르므로 breakdown이 있으면 분리, 없으면 전량 5m으로 간주
      const cacheCreate1h = u.cache_creation?.ephemeral_1h_input_tokens || 0;
      const cacheCreate5m = u.cache_creation ? (u.cache_creation.ephemeral_5m_input_tokens || 0) : cacheCreate;
      // claudelytics/ccusage와 동일하게 항상 토큰으로 재계산
      // costUSD는 모델 정보 없이 계산 불가한 경우에만 폴백으로 사용
      const calc = calculateCost({ input, output, cacheCreate5m, cacheCreate1h, cacheRead }, model);
      let cost = calc.cost;
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
        projectPath: '', // 파일 전체를 읽은 뒤 아래에서 일괄 확정
        projectName: '',
        ...(calc.unknownPricing ? { unknownPricing: true } : {}),
        messageId: raw.message.id,
        requestId: raw.requestId,
        ...(raw.isSidechain ? { isSidechain: true } : {}),
      });
    } catch {}
  }

  // cwd가 있으면 실제 경로 사용, 없으면 디렉토리명 기반 폴백.
  // 표시명(projectName)은 병합 시점에 전체 projectPath를 보고 재계산되므로 여기선 잠정값만.
  const projectPath = cwd ?? fallbackName;
  const provisionalName = nameAtDepth(projectPath, 1);
  for (const r of records) {
    r.projectPath = projectPath;
    r.projectName = provisionalName;
  }
  return records;
}

// ── 응답 단위 dedup ────────────────────────────────────────────────────
// Claude Code는 한 API 응답을 content block 수만큼 여러 JSONL 줄로 기록하고,
// 줄마다 동일한 usage 객체가 복사된다. 과금은 응답당 1회이므로
// (messageId, requestId) 기준으로 토큰 합계가 가장 큰 스냅샷 하나만 남긴다.
// sidechain(서브에이전트) 로그는 부모 메시지를 새 requestId로 재기록할 수 있어
// messageId 단독으로도 한 번 더 걸러낸다. — ccusage와 동일한 규칙

function shouldReplaceDeduped(candidate: ParsedRecord, existing: ParsedRecord): boolean {
  if (!!candidate.isSidechain !== !!existing.isSidechain) return !!existing.isSidechain; // 비-sidechain 우선
  if (candidate.usage.totalTokens !== existing.usage.totalTokens) {
    return candidate.usage.totalTokens > existing.usage.totalTokens;
  }
  return candidate.usage.totalCost > existing.usage.totalCost;
}

function dedupeRecords(records: ParsedRecord[]): ParsedRecord[] {
  const out: ParsedRecord[] = [];
  const byExact = new Map<string, number>();     // 'messageId:requestId' → out 인덱스
  const byMessage = new Map<string, number[]>(); // messageId → out 인덱스들 (sidechain 재기록 대비)
  for (const r of records) {
    if (!r.messageId) { out.push(r); continue; }
    const exactKey = `${r.messageId}:${r.requestId ?? ''}`;
    let idx = byExact.get(exactKey);
    if (idx === undefined) {
      const candidates = byMessage.get(r.messageId);
      if (candidates) idx = candidates.find((i) => r.isSidechain || out[i].isSidechain);
    }
    if (idx !== undefined) {
      if (shouldReplaceDeduped(r, out[idx])) out[idx] = r;
      continue;
    }
    const i = out.length;
    out.push(r);
    byExact.set(exactKey, i);
    const list = byMessage.get(r.messageId);
    if (list) list.push(i); else byMessage.set(r.messageId, [i]);
  }
  return out;
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
// 단가 테이블/레코드 스키마 변경 시 bump — 캐시된 totalCost/family/projectPath가 구버전으로 남는 것을 방지
// v5: 응답 단위 dedup용 messageId/requestId/isSidechain 추가 + 1h 캐시 쓰기 단가 분리
// v6: Sonnet 5 출시 프로모션 단가($2/$10, ~2026-08-31) 기간 조건부 적용
// v7: Opus 5 단가 추가 — 폴백 단가로 계산된 기존 opus-5 레코드 무효화
// v8: 모델 ID 정확 일치 매칭 (Opus 5.5·Fable 5.1 분리) + Sonnet 5 정가 $2/$10 확정
const DISK_CACHE_VERSION = 8;

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

  // 전체 목록 재구성 — 파일별 원본 레코드를 모은 뒤 응답 단위로 dedup
  const all: ParsedRecord[] = [];
  for (const e of _fileCache.values()) all.push(...e.records);
  const merged = dedupeRecords(all);
  merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // 표시명 확정 — 전체 projectPath를 보고 basename 충돌 시에만 부모 디렉토리를 붙여 구분
  const nameMap = resolveProjectNames(merged.map((r) => r.projectPath));
  for (const r of merged) r.projectName = nameMap.get(r.projectPath)!;

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

  let today = emptyUsage();
  let thisMonth = emptyUsage();
  let allTime = emptyUsage();
  // 단가 미등록 모델 집계 — UI 경고 배너용
  const unknownMap = new Map<string, { records: number; estimatedCost: number }>();

  for (const record of records) {
    allTime = addUsage(allTime, record.usage);
    if (toLocalMonthStr(record.timestamp) === thisMonthStr) thisMonth = addUsage(thisMonth, record.usage);
    if (toLocalDateStr(record.timestamp) === todayStr) today = addUsage(today, record.usage);
    if (record.unknownPricing) {
      const unknown = unknownMap.get(record.model) ?? { records: 0, estimatedCost: 0 };
      unknown.records++;
      unknown.estimatedCost += record.usage.totalCost;
      unknownMap.set(record.model, unknown);
    }
  }

  const unknownModels: UnknownModelUsage[] = Array.from(unknownMap.entries())
    .map(([model, unknown]) => ({ model, ...unknown }))
    .sort((a, b) => b.estimatedCost - a.estimatedCost);

  return { today, thisMonth, allTime, unknownModels };
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

export async function getSessions(): Promise<SessionUsage[]> {
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

// ── 기간/집계 단위 기반 버킷 집계 ──────────────────────────────────────

function startOfBucket(d: Date, g: Granularity): Date {
  switch (g) {
    case 'hour':  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours());
    case 'day':   return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    case 'week':  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); // 월요일 시작
    case 'month': return new Date(d.getFullYear(), d.getMonth(), 1);
  }
}

function nextBucketStart(d: Date, g: Granularity): Date {
  switch (g) {
    case 'hour':  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1);
    case 'day':   return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    case 'week':  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
    case 'month': return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
}

function bucketKey(d: Date, g: Granularity): string {
  const s = startOfBucket(d, g);
  if (g === 'month') return toLocalMonthStr(s);
  if (g === 'hour') return `${toLocalDateStr(s)} ${String(s.getHours()).padStart(2, '0')}`;
  return toLocalDateStr(s);
}

/** 기간 내 사용량을 granularity 단위 버킷으로 집계. 사용량 없는 구간도 0으로 채워 시간축을 연속으로 유지 */
export async function getBucketedUsage(granularity: Granularity, period: BucketPeriod): Promise<BucketUsage[]> {
  const records = await getAllRecords();
  const now = new Date();
  const rawStart = period === 'all'
    ? (records[0]?.timestamp ?? now)
    : new Date(now.getTime() - PERIOD_HOURS[period] * 3600_000);
  const start = startOfBucket(rawStart, granularity);

  const map = new Map<string, { usage: TokenUsage; models: Map<string, TokenUsage> }>();
  for (let t = start; t <= now; t = nextBucketStart(t, granularity)) {
    map.set(bucketKey(t, granularity), { usage: emptyUsage(), models: new Map() });
  }

  for (const r of records) {
    if (r.timestamp < start) continue;
    const entry = map.get(bucketKey(r.timestamp, granularity));
    if (!entry) continue; // 미래 타임스탬프 등 방어
    entry.usage = addUsage(entry.usage, r.usage);
    entry.models.set(r.family, addUsage(entry.models.get(r.family) || emptyUsage(), r.usage));
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, { usage, models }]) => ({
      bucket,
      ...usage,
      modelBreakdown: Object.fromEntries(models.entries()),
    }));
}
