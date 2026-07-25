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
 * 차트 카테고리 팔레트 — 다크 서피스(#1C1816) 기준 검증 완료.
 * 기존 레몬/코랄 명도 단계 팔레트는 인접 시리즈 구분이 안 되어 교체 (2026-07).
 *
 * 8개 상이한 hue, 고정 순서. 순서 자체가 색약(CVD) 안전 장치이므로 임의로 바꾸지 말 것.
 * 검증(dataviz validate_palette.js): 인접쌍 CVD ΔE ≥ 8.4 / 일반 시야 ΔE ≥ 19.8 / 대비 전부 ≥ 3:1.
 * 슬롯 1 골드는 브랜드 레몬(#F0B90B)을 다크 밝기 밴드(L ≤ 0.67)에 맞게 스냅한 값.
 */
export const CHART = {
  gold: '#C98500',
  aqua: '#199E70',
  orange: '#D95926',
  violet: '#9085E9',
  coral: '#CD6B5E',
  blue: '#3987E5',
  green: '#008300',
  magenta: '#D55181',
} as const;

/**
 * 여러 시리즈에 순서대로 배정할 팔레트 (검증된 고정 순서 — 재배열 금지).
 * 8개 초과 시리즈는 색을 순환시키지 말고 '기타'로 접을 것.
 */
export const SERIES_COLORS = [
  CHART.gold,
  CHART.aqua,
  CHART.orange,
  CHART.violet,
  CHART.coral,
  CHART.blue,
  CHART.green,
  CHART.magenta,
] as const;

/**
 * 모델명 → 색 매핑 (엔티티 고정 — 시리즈 수가 바뀌어도 색이 따라가지 않도록).
 * 상시 공존하는 현세대 4종(fable/opus-4.8/sonnet-5/haiku)은 all-pairs 검증을 통과한
 * gold/blue/magenta/green 4색 조합에 배정. 구세대는 잔여 슬롯, 3.x는 기본 그레이.
 */
export const MODEL_COLORS: Record<string, string> = {
  'claude-fable-5': CHART.gold,
  'claude-opus-5': CHART.coral, // 구세대 sonnet-4와 공유 — 공존 가능성 최저 (mythos/opus-4-7의 violet 공유와 같은 방식)
  'claude-opus-4-8': CHART.blue,
  'claude-sonnet-5': CHART.magenta,
  'claude-haiku-4-5': CHART.green,
  'claude-mythos-5': CHART.violet,
  'claude-opus-4-7': CHART.violet,
  'claude-opus-4-6': CHART.aqua,
  'claude-sonnet-4-6': CHART.orange,
  'claude-sonnet-4': CHART.coral,
};

export const DEFAULT_MODEL_COLOR = DS.warmGray;

export function modelColor(name: string): string {
  return MODEL_COLORS[name] ?? DEFAULT_MODEL_COLOR;
}

export function seriesColor(i: number): string {
  return SERIES_COLORS[i % SERIES_COLORS.length];
}
