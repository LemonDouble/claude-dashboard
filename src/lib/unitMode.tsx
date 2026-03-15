'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UnitMode = 'kr' | 'en';

const LS_KEY = 'claude-dashboard-unit-mode';

function formatTokensKR(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}천`;
  return String(n);
}

function formatTokensEN(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface UnitModeContextValue {
  mode: UnitMode;
  toggle: () => void;
  fmt: (n: number) => string;
}

const UnitModeContext = createContext<UnitModeContextValue>({
  mode: 'kr',
  toggle: () => {},
  fmt: formatTokensKR,
});

export function UnitModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<UnitMode>('kr');

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === 'kr' || stored === 'en') setMode(stored);
  }, []);

  const toggle = () => {
    const next: UnitMode = mode === 'kr' ? 'en' : 'kr';
    setMode(next);
    localStorage.setItem(LS_KEY, next);
  };

  return (
    <UnitModeContext.Provider value={{ mode, toggle, fmt: mode === 'kr' ? formatTokensKR : formatTokensEN }}>
      {children}
    </UnitModeContext.Provider>
  );
}

export const useUnitMode = () => useContext(UnitModeContext);
