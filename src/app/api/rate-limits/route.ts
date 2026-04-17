import { NextResponse } from 'next/server';
import { getRateLimits } from '@/lib/rateLimits';

export async function GET() {
  const data = await getRateLimits();
  if (!data) {
    return NextResponse.json(
      { fiveHour: null, sevenDay: null, sevenDaySonnet: null, error: 'unavailable' },
      { status: 200 },
    );
  }
  return NextResponse.json(data);
}
