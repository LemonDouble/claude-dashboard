/**
 * Lemon Design System – 차트 단색 팔레트
 * 레몬(lemon)과 코랄(coral) 스케일 + 웜 그레이로 구성.
 * 여러 시리즈(모델/프로젝트/요일 등)를 단조롭게 구분할 때 사용.
 */

export const DS = {
  // Brand
  lemon: '#F0B90B',
  lemonDark: '#D4A30A',
  lemonDarker: '#A88208',
  lemonLight: '#FBDB73',
  coral: '#CD6B5E',
  coralDark: '#B85A4E',
  coralLight: '#E79A8E',

  // Warm grays
  warmGray: '#A89E95',
  warmGrayDark: '#5C524A',
  warmGrayBorder: '#2E2723',
  warmGraySurface: '#1C1816',

  // 차트 축/그리드/참조선
  axis: '#5C524A',
  axisDim: '#3D3530',
  tooltipBg: '#1C1816',
  tooltipBorder: '#2E2723',
} as const;

/**
 * 여러 시리즈에 순서대로 배정할 단색 팔레트.
 * 사용자가 "전부 레몬 옐로우로" 요청하여 레몬 스케일을 우선 배치 후 코랄/그레이 보조.
 */
export const SERIES_COLORS = [
  DS.lemon,
  DS.coral,
  DS.lemonDark,
  DS.coralDark,
  DS.lemonLight,
  DS.coralLight,
  DS.warmGray,
  DS.lemonDarker,
  DS.warmGrayDark,
] as const;

/** 모델명 → 색 매핑 (기본은 lemon, 구버전/sonnet/haiku는 coral/gray 톤) */
export const MODEL_COLORS: Record<string, string> = {
  'claude-opus-4-7': DS.lemon,
  'claude-opus-4-6': DS.lemonDark,
  'claude-opus-4': DS.lemonDarker,
  'claude-sonnet-4-6': DS.coral,
  'claude-sonnet-4': DS.coralDark,
  'claude-3-5-sonnet': DS.coralLight,
  'claude-3-5-haiku': DS.warmGray,
  'claude-3-haiku': DS.warmGrayDark,
  'claude-3-opus': DS.lemonLight,
};

export const DEFAULT_MODEL_COLOR = DS.warmGray;

export function modelColor(name: string): string {
  return MODEL_COLORS[name] ?? DEFAULT_MODEL_COLOR;
}

export function seriesColor(i: number): string {
  return SERIES_COLORS[i % SERIES_COLORS.length];
}
