import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = getSettings();
    // Return settings (omitting full PIN or returning masked for security)
    return NextResponse.json({
      ...settings,
      hasOwnerPin: Boolean(settings.ownerPin),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const current = getSettings();

    // Verify current PIN if PIN is set
    if (current.ownerPin && body.currentPin !== current.ownerPin) {
      return NextResponse.json({ error: 'Incorrect Owner PIN. Access denied.' }, { status: 403 });
    }

    const {
      shopName,
      shopContact,
      shopOperator,
      ownerPin,
      welcomeMessage,
      hotspotInstructions,
      maxFileSizeMb,
      maxJobSizeMb,
      maxFilesPerJob,
      jobRetentionHours,
      allowedExtensions,
      preferredNetworkInterface,
      defaultPaperSize,
      defaultColorMode,
    } = body;

    saveSettings({
      ...(shopName && { shopName }),
      ...(shopContact && { shopContact }),
      ...(shopOperator && { shopOperator }),
      ...(ownerPin && { ownerPin }),
      ...(welcomeMessage && { welcomeMessage }),
      ...(hotspotInstructions && { hotspotInstructions }),
      ...(maxFileSizeMb && { maxFileSizeMb: Number(maxFileSizeMb) }),
      ...(maxJobSizeMb && { maxJobSizeMb: Number(maxJobSizeMb) }),
      ...(maxFilesPerJob && { maxFilesPerJob: Number(maxFilesPerJob) }),
      ...(jobRetentionHours !== undefined && { jobRetentionHours: Number(jobRetentionHours) }),
      ...(allowedExtensions && { allowedExtensions }),
      ...(preferredNetworkInterface !== undefined && { preferredNetworkInterface }),
      ...(defaultPaperSize && { defaultPaperSize }),
      ...(defaultColorMode && { defaultColorMode }),
    });

    const updated = getSettings();
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
