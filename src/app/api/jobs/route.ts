import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createJob, getJobStats, getSettings, listJobs } from '@/lib/db';
import { checkDiskSpace, saveFileToDisk } from '@/lib/storage';
import { validateUploadFile } from '@/lib/file-validator';
import { eventBus } from '@/lib/events';
import { JobStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

function generateJobId(): string {
  // Generates short, human-friendly shop reference: e.g. RPS-4829
  const num = Math.floor(1000 + Math.random() * 9000);
  return `RPS-${num}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as JobStatus | 'all') || 'all';
    const search = searchParams.get('search') || '';
    const limit = Number(searchParams.get('limit')) || 50;
    const offset = Number(searchParams.get('offset')) || 0;

    const { jobs, total } = listJobs({ status, search, limit, offset });
    const stats = getJobStats();
    const disk = checkDiskSpace();

    return NextResponse.json({
      jobs,
      total,
      stats,
      disk,
    });
  } catch (err: any) {
    console.error('Error fetching jobs:', err);
    return NextResponse.json({ error: err.message || 'Failed to list jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Check disk space before accepting files
    const disk = checkDiskSpace();
    if (disk.isLowSpace) {
      return NextResponse.json(
        { error: 'Printing shop PC storage is nearly full. Please notify the shopkeeper.' },
        { status: 507 } // Insufficient Storage
      );
    }

    // 2. Fetch current settings for limits
    const settings = getSettings();

    // 3. Parse FormData
    const formData = await request.formData();
    const customerName = (formData.get('customerName') as string) || 'Customer';
    const customerPhone = (formData.get('customerPhone') as string) || '';
    const notes = (formData.get('notes') as string) || '';

    // Collect all files from FormData
    const fileEntries = formData.getAll('files') as File[];
    if (!fileEntries || fileEntries.length === 0) {
      return NextResponse.json({ error: 'No files were selected for upload.' }, { status: 400 });
    }

    if (fileEntries.length > settings.maxFilesPerJob) {
      return NextResponse.json(
        { error: `Too many files. Shop allows maximum ${settings.maxFilesPerJob} files per job.` },
        { status: 400 }
      );
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    // Generate unique Job ID
    const jobId = generateJobId();

    const preparedFiles: Array<{
      id: string;
      originalName: string;
      storedFilename: string;
      fileSize: number;
      mimeType: string;
      fileExtension: string;
      buffer: Buffer;
    }> = [];

    let totalJobBytes = 0;

    // Validate each file
    for (const file of fileEntries) {
      if (typeof file === 'string' || !file.name) continue;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      totalJobBytes += buffer.length;

      // Check per-file size and magic numbers
      const validation = validateUploadFile(
        file.name,
        buffer,
        settings.allowedExtensions,
        settings.maxFileSizeMb
      );

      if (!validation.isValid) {
        return NextResponse.json(
          { error: `Error in file "${file.name}": ${validation.error}` },
          { status: 400 }
        );
      }

      const fileId = crypto.randomUUID();
      // Collision-resistant filename: safe timestamp + random hex + original name
      const randomHex = crypto.randomBytes(4).toString('hex');
      const storedFilename = `${Date.now()}_${randomHex}_${validation.sanitizedFilename}`;

      preparedFiles.push({
        id: fileId,
        originalName: validation.sanitizedFilename,
        storedFilename,
        fileSize: buffer.length,
        mimeType: validation.detectedMime || file.type || 'application/octet-stream',
        fileExtension: validation.extension,
        buffer,
      });
    }

    // Check total job size limit
    const maxJobBytes = settings.maxJobSizeMb * 1024 * 1024;
    if (totalJobBytes > maxJobBytes) {
      return NextResponse.json(
        { error: `Total upload size exceeds shop limit of ${settings.maxJobSizeMb} MB.` },
        { status: 400 }
      );
    }

    // Save files to disk safely
    for (const item of preparedFiles) {
      saveFileToDisk(jobId, item.storedFilename, item.buffer);
    }

    // Save job and file metadata to database
    const created = createJob({
      id: jobId,
      customerName,
      customerPhone,
      notes,
      clientIp,
      userAgent,
      files: preparedFiles.map(f => ({
        id: f.id,
        originalName: f.originalName,
        storedFilename: f.storedFilename,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        fileExtension: f.fileExtension,
      })),
    });

    // Broadcast real-time SSE event to owner's dashboard
    eventBus.emit('job_created', created);

    return NextResponse.json({
      success: true,
      message: 'Documents sent successfully! Please inform the shop operator of your job number.',
      job: created,
    });
  } catch (err: any) {
    console.error('Upload processing error:', err);
    return NextResponse.json({ error: err.message || 'File upload failed' }, { status: 500 });
  }
}
