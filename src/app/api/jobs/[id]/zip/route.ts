import { NextRequest, NextResponse } from 'next/server';
import { getJobById } from '@/lib/db';
import { createJobZipStream } from '@/lib/storage';
import { PassThrough } from 'stream';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = getJobById(params.id);
    if (!job || !job.files || job.files.length === 0) {
      return NextResponse.json({ error: 'Job not found or has no files' }, { status: 404 });
    }

    const archive = await createJobZipStream(params.id, job.files);
    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    // Finalize archive
    archive.finalize();

    const stream = new ReadableStream({
      start(controller) {
        passThrough.on('data', chunk => controller.enqueue(chunk));
        passThrough.on('end', () => controller.close());
        passThrough.on('error', err => controller.error(err));
      },
    });

    const zipFilename = `${job.id}_${job.customer_name.replace(/\s+/g, '_')}_documents.zip`;

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
