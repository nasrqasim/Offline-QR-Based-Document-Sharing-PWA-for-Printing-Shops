import { NextRequest, NextResponse } from 'next/server';
import { getFullNetworkStatus } from '@/lib/network';
import { getSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const settings = getSettings();
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');

    const status = getFullNetworkStatus(settings.preferredNetworkInterface, host, proto);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to detect network' }, { status: 500 });
  }
}
