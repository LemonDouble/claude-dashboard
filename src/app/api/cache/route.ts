import { NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/parser';

export async function GET() {
  try {
    const data = await getCacheStats();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return NextResponse.json({ error: 'Failed to parse cache stats' }, { status: 500 });
  }
}
