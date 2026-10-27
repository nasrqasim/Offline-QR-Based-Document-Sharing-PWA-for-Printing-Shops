import { NextResponse } from 'next/server';
import { getFullNetworkStatus } from '@/lib/network';
import { getSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = getSettings();
    const status = getFullNetworkStatus(settings.preferredNetworkInterface);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to detect network' }, { status: 500 });
  }
}
