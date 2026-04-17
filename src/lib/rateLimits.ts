import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { RateLimits, RateLimitWindow } from '@/types';

const API_URL = 'https://api.anthropic.com/api/oauth/usage';
const API_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 60_000;
const NEG_CACHE_TTL_MS = 30_000;
const STALE_FALLBACK_MS = 60 * 60_000;

interface CacheEntry {
  at: number;
  data: RateLimits | null;
  isError: boolean;
}

let cache: CacheEntry | null = null;
let inflight: Promise<RateLimits | null> | null = null;

interface CredCache { token: string | null; mtimeMs: number }
let credCache: CredCache | null = null;

async function readOAuthToken(): Promise<string | null> {
  try {
    const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
    const st = await fs.stat(credPath);
    if (credCache && credCache.mtimeMs === st.mtimeMs) return credCache.token;
    const content = await fs.readFile(credPath, 'utf8');
    const creds = JSON.parse(content);
    const token: string | null = creds?.claudeAiOauth?.accessToken ?? null;
    credCache = { token, mtimeMs: st.mtimeMs };
    return token;
  } catch {
    return null;
  }
}

function parseWindow(raw: unknown): RateLimitWindow | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as Record<string, unknown>;
  if (typeof w.utilization !== 'number') return null;
  return {
    utilization: w.utilization,
    resetsAt: typeof w.resets_at === 'string' ? w.resets_at : null,
  };
}

function parseResponse(data: unknown): RateLimits {
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    fiveHour: parseWindow(d.five_hour),
    sevenDay: parseWindow(d.seven_day),
    sevenDaySonnet: parseWindow(d.seven_day_sonnet),
  };
}

async function fetchViaNode(token: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'claude-dashboard/1.0',
        Authorization: `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Node.js on Linux often gets 403 from this endpoint due to TLS fingerprint.
// curl subprocess has a standard fingerprint and usually succeeds.
async function fetchViaCurl(token: string): Promise<{ ok: boolean; status: number; data: unknown } | null> {
  return new Promise((resolve) => {
    execFile(
      'curl',
      [
        '-s',
        '-w', '\n%{http_code}',
        API_URL,
        '-H', 'Accept: application/json',
        '-H', 'User-Agent: claude-dashboard/1.0',
        '-H', `Authorization: Bearer ${token}`,
        '-H', 'anthropic-beta: oauth-2025-04-20',
      ],
      { encoding: 'utf-8', timeout: API_TIMEOUT_MS },
      (error, stdout) => {
        if (error) return resolve(null);
        try {
          const lines = stdout.trimEnd().split('\n');
          const status = parseInt(lines[lines.length - 1], 10);
          const body = lines.slice(0, -1).join('\n');
          const data = JSON.parse(body);
          resolve({ ok: status >= 200 && status < 300, status, data });
        } catch {
          resolve(null);
        }
      }
    );
  });
}

async function fetchFromApi(token: string): Promise<RateLimits | null> {
  try {
    let res = await fetchViaNode(token);

    // 429: respect retry-after if short, retry once
    if (res.status === 429) {
      const ra = parseInt(res.headers.get('retry-after') ?? '', 10);
      if (!isNaN(ra) && ra > 0 && ra <= 10) {
        await new Promise((r) => setTimeout(r, ra * 1000));
        res = await fetchViaNode(token);
      }
    }

    // 403: Linux Node TLS fingerprint often rejected — fall back to curl
    if (res.status === 403) {
      const curl = await fetchViaCurl(token);
      if (curl?.ok) return parseResponse(curl.data);
      return null;
    }

    if (!res.ok) return null;
    return parseResponse(await res.json());
  } catch {
    const curl = await fetchViaCurl(token);
    if (curl?.ok) return parseResponse(curl.data);
    return null;
  }
}

async function doFetch(): Promise<RateLimits | null> {
  const token = await readOAuthToken();
  if (!token) {
    cache = { at: Date.now(), data: null, isError: true };
    return null;
  }

  const data = await fetchFromApi(token);
  if (data) {
    cache = { at: Date.now(), data, isError: false };
    return data;
  }

  // Failure: set negative cache, but keep returning stale data if recent enough
  const stale = cache;
  cache = { at: Date.now(), data: null, isError: true };
  if (stale && !stale.isError && Date.now() - stale.at < STALE_FALLBACK_MS) {
    return stale.data;
  }
  return null;
}

export async function getRateLimits(): Promise<RateLimits | null> {
  if (cache) {
    const age = Date.now() - cache.at;
    const ttl = cache.isError ? NEG_CACHE_TTL_MS : CACHE_TTL_MS;
    if (age < ttl) {
      if (cache.isError && cache.data === null) return null;
      return cache.data;
    }
  }

  if (inflight) return inflight;
  inflight = doFetch().finally(() => { inflight = null; });
  return inflight;
}
