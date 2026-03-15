import { NextResponse } from 'next/server';
import { getUsageSummary } from '@/lib/parser';

export async function GET() {
  try {
    const data = await getUsageSummary();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get usage summary:', error);
    return NextResponse.json({ error: 'Failed to parse Claude usage data' }, { status: 500 });
  }
}
