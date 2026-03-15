'use client';

import useSWR from 'swr';
import { SessionUsage } from '@/types';
import { formatCost, formatRelativeTime } from '@/lib/format';
import { useUnitMode } from '@/lib/unitMode';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SessionsTab() {
  const { data, isLoading } = useSWR<SessionUsage[]>('/api/sessions', fetcher, { refreshInterval: 30000 });
  const { fmt } = useUnitMode();
  const [search, setSearch] = useState('');

  const filtered = (data || []).filter(
    (s) =>
      s.projectName.toLowerCase().includes(search.toLowerCase()) ||
      s.sessionId.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="text-zinc-400 text-sm p-4">불러오는 중...</div>;

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      <input
        type="text"
        placeholder="세션 또는 프로젝트 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
      />
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs text-left">
          <thead className="sticky top-0 bg-zinc-900">
            <tr className="text-zinc-400 border-b border-zinc-800">
              <th className="pb-2 pr-3 font-medium">프로젝트</th>
              <th className="pb-2 pr-3 font-medium">세션</th>
              <th className="pb-2 pr-3 font-medium text-right">토큰</th>
              <th className="pb-2 pr-3 font-medium text-right">비용</th>
              <th className="pb-2 font-medium text-right">마지막 활동</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.sessionId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="py-1.5 pr-3 text-zinc-200 max-w-[120px] truncate">{s.projectName}</td>
                <td className="py-1.5 pr-3 text-zinc-500 font-mono max-w-[100px] truncate">{s.sessionId.slice(0, 12)}…</td>
                <td className="py-1.5 pr-3 text-right text-zinc-300">{fmt(s.totalTokens)}</td>
                <td className="py-1.5 pr-3 text-right text-yellow-400">{formatCost(s.totalCost)}</td>
                <td className="py-1.5 text-right text-zinc-500">{formatRelativeTime(s.lastActivity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-zinc-500 text-center py-8">세션이 없습니다</div>}
      </div>
    </div>
  );
}
