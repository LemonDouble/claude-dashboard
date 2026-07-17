import { NextRequest, NextResponse } from 'next/server';
import { getBucketedUsage } from '@/lib/parser';
import { Granularity, BucketPeriod } from '@/types';
import { PERIODS_BY_GRANULARITY, DEFAULT_PERIOD } from '@/lib/buckets';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const g = sp.get('granularity') as Granularity | null;
    const granularity: Granularity = g && g in PERIODS_BY_GRANULARITY ? g : 'day';
    const p = sp.get('period') as BucketPeriod | null;
    const period: BucketPeriod =
      p && PERIODS_BY_GRANULARITY[granularity].includes(p) ? p : DEFAULT_PERIOD[granularity];

    const data = await getBucketedUsage(granularity, period);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get bucketed usage:', error);
    return NextResponse.json({ error: 'Failed to parse usage buckets' }, { status: 500 });
  }
}
