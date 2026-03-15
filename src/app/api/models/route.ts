import { NextResponse } from 'next/server';
import { getModelUsage } from '@/lib/parser';

export async function GET() {
  try {
    const data = await getModelUsage();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get model usage:', error);
    return NextResponse.json({ error: 'Failed to parse model usage' }, { status: 500 });
  }
}
