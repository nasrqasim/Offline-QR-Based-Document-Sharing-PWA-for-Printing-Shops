import { NextRequest, NextResponse } from 'next/server';
import { deleteJob, getJobById, updateJobStatus } from '@/lib/db';
import { deleteJobFilesFromDisk } from '@/lib/storage';
import { eventBus } from '@/lib/events';
import { JobStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = getJobById(params.id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = body as { status: JobStatus };

    if (!['pending', 'reviewing', 'printed', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = updateJobStatus(params.id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = getJobById(params.id);
    eventBus.emit('job_updated', job);

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = getJobById(params.id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Delete files from disk
    deleteJobFilesFromDisk(params.id);

    // Delete from DB
    deleteJob(params.id);

    // Emit event
    eventBus.emit('job_deleted', { id: params.id });

    return NextResponse.json({ success: true, message: `Job ${params.id} deleted successfully` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
