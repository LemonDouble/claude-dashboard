'use client';

import { useSyncExternalStore } from 'react';

const SAME_TAB_CHANGE_EVENT = 'claude-dashboard-storage-change';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(SAME_TAB_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SAME_TAB_CHANGE_EVENT, onChange);
  };
}

export function useStoredValue(key: string, fallback: string): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? fallback,
    () => fallback,
  );
  const setValue = (next: string) => {
    localStorage.setItem(key, next);
    window.dispatchEvent(new Event(SAME_TAB_CHANGE_EVENT));
  };
  return [value, setValue];
}

export function useStoredPositiveNumber(key: string, fallback: number): [number, (value: number) => void] {
  const [stored, setStored] = useStoredValue(key, String(fallback));
  const parsed = parseInt(stored, 10);
  const value = parsed > 0 ? parsed : fallback;
  const setValue = (next: number) => {
    if (next > 0) setStored(String(next));
  };
  return [value, setValue];
}
