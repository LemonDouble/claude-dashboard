'use client';

import { useState, useEffect } from 'react';

const LS_KEY = 'claude-dashboard-subscription-usd';
const DEFAULT_COST = 200; // Claude Max 20x 기준 (USD/월)

export function useSubscriptionCost() {
  const [cost, setCost] = useState(DEFAULT_COST);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) setCost(parsed);
    }
  }, []);

  const updateCost = (newCost: number) => {
    if (newCost > 0) {
      setCost(newCost);
      localStorage.setItem(LS_KEY, String(newCost));
    }
  };

  return { cost, updateCost };
}
