import { NextResponse } from 'next/server';
import { getPatterns } from '@/lib/parser';

export async function GET() {
  try {
    const data = await getPatterns();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get patterns:', error);
    return NextResponse.json({ error: 'Failed to parse patterns' }, { status: 500 });
  }
}
