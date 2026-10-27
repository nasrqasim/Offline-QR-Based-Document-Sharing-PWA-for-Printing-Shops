import { NextResponse } from 'next/server';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    appName: 'Roonjha Print Share',
    serverTime: new Date().toISOString(),
    hostname: os.hostname(),
    uptime: Math.floor(process.uptime()),
  });
}
