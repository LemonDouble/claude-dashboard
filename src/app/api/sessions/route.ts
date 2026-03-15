import { NextResponse } from 'next/server';
import { getSessions } from '@/lib/parser';

export async function GET() {
  try {
    const data = await getSessions();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get sessions:', error);
    return NextResponse.json({ error: 'Failed to parse sessions' }, { status: 500 });
  }
}
