import { NextResponse } from 'next/server';
import { getDailyNumber, getYesterdayNumber, getTodayString } from '@/lib/numbers';

export async function GET() {
  return NextResponse.json({
    date: getTodayString(),
    number: getDailyNumber(),
    yesterday: getYesterdayNumber(),
  });
}