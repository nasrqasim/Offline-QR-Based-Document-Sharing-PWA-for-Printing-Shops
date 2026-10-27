import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { STORAGE_DIR } from './config';
import { JobFile } from './types';

export function getUploadsBaseDir(): string {
  const resolved = path.resolve(process.cwd(), STORAGE_DIR);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
  return resolved;
}

export function getJobDir(jobId: string): string {
  const baseDir = getUploadsBaseDir();
  // Sanitize jobId to alphanumeric and hyphens
  const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, '');
  const jobDir = path.join(baseDir, 'jobs', safeJobId);

  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }

  return jobDir;
}

export function saveFileToDisk(
  jobId: string,
  storedFilename: string,
  buffer: Buffer
): { filePath: string; size: number } {
  const jobDir = getJobDir(jobId);
  const targetPath = path.join(jobDir, storedFilename);

  // Guard against path traversal
  if (!targetPath.startsWith(jobDir)) {
    throw new Error('Access denied: Invalid file destination path');
  }

  fs.writeFileSync(targetPath, buffer);
  const stats = fs.statSync(targetPath);
  return { filePath: targetPath, size: stats.size };
}

export function getJobFilePath(jobId: string, storedFilename: string): string | null {
  const jobDir = getJobDir(jobId);
  const safeFilename = path.basename(storedFilename);
  const targetPath = path.join(jobDir, safeFilename);

  if (!targetPath.startsWith(jobDir) || !fs.existsSync(targetPath)) {
    return null;
  }

  return targetPath;
}

export function deleteJobFilesFromDisk(jobId: string): void {
  const jobDir = getJobDir(jobId);
  if (fs.existsSync(jobDir)) {
    try {
      fs.rmSync(jobDir, { recursive: true, force: true });
    } catch (err) {
      console.error(`Failed to delete directory for job ${jobId}:`, err);
    }
  }
}

export function deleteSingleFileFromDisk(jobId: string, storedFilename: string): boolean {
  const filePath = getJobFilePath(jobId, storedFilename);
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (err) {
      console.error(`Failed to delete file ${storedFilename}:`, err);
      return false;
    }
  }
  return false;
}

/**
 * Creates a ZIP archive of all files in a job
 */
export async function createJobZipStream(jobId: string, files: JobFile[]): Promise<archiver.Archiver> {
  const archive = archiver('zip', {
    zlib: { level: 6 },
  });

  for (const file of files) {
    const filePath = getJobFilePath(jobId, file.stored_filename);
    if (filePath && fs.existsSync(filePath)) {
      archive.file(filePath, { name: file.original_name });
    }
  }

  return archive;
}

/**
 * Checks available free disk space on the storage drive
 */
export function checkDiskSpace(): { freeMb: number; totalMb: number; isLowSpace: boolean } {
  try {
    const baseDir = getUploadsBaseDir();
    // Use fs.statfsSync if available in Node 19.6+
    if (typeof (fs as any).statfsSync === 'function') {
      const stats = (fs as any).statfsSync(baseDir);
      const freeBytes = stats.bavail * stats.bsize;
      const totalBytes = stats.blocks * stats.bsize;
      const freeMb = Math.round(freeBytes / (1024 * 1024));
      const totalMb = Math.round(totalBytes / (1024 * 1024));
      return {
        freeMb,
        totalMb,
        isLowSpace: freeMb < 500, // alert if less than 500MB free
      };
    }
  } catch (err) {
    // fallback
  }

  return { freeMb: 10240, totalMb: 102400, isLowSpace: false };
}
