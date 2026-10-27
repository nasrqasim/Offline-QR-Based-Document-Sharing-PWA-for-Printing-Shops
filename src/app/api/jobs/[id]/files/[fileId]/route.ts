import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { deleteJobFile, getJobById } from '@/lib/db';
import { deleteSingleFileFromDisk, getJobFilePath } from '@/lib/storage';
import { eventBus } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const job = getJobById(params.id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const file = job.files?.find(f => f.id === params.fileId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const filePath = getJobFilePath(params.id, file.stored_filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File missing on disk' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';

    const fileBuffer = fs.readFileSync(filePath);
    const dispositionType = download ? 'attachment' : 'inline';
    // Encode filename for Content-Disposition header
    const encodedName = encodeURIComponent(file.original_name);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Disposition': `${dispositionType}; filename="${file.original_name}"; filename*=UTF-8''${encodedName}`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const job = getJobById(params.id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const file = job.files?.find(f => f.id === params.fileId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete from disk
    deleteSingleFileFromDisk(params.id, file.stored_filename);

    // Delete from DB
    deleteJobFile(params.id, params.fileId);

    const updatedJob = getJobById(params.id);
    eventBus.emit('job_updated', updatedJob);

    return NextResponse.json({ success: true, message: 'File deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
