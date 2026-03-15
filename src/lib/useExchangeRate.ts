'use client';

import { useState, useEffect } from 'react';

const LS_KEY = 'claude-dashboard-exchange-rate';
const DEFAULT_RATE = 1480;

export function useExchangeRate() {
  const [rate, setRate] = useState(DEFAULT_RATE);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) setRate(parsed);
    }
  }, []);

  const updateRate = (newRate: number) => {
    if (newRate > 0) {
      setRate(newRate);
      localStorage.setItem(LS_KEY, String(newRate));
    }
  };

  return { rate, updateRate };
}
