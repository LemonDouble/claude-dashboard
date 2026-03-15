import { NextResponse } from 'next/server';
import { getHourlyCosts } from '@/lib/parser';

export async function GET() {
  try {
    const data = await getHourlyCosts();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get hourly costs:', error);
    return NextResponse.json({ error: 'Failed to parse hourly costs' }, { status: 500 });
  }
}
