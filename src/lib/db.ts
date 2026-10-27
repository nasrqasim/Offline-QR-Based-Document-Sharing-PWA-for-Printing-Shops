import path from 'path';
import fs from 'fs';
import { DB_PATH, DEFAULT_SETTINGS } from './config';
import { JobFile, JobStatus, PrintJob, ShopSettings } from './types';

let DatabaseSyncClass: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sqlite = require('node:sqlite');
  DatabaseSyncClass = sqlite.DatabaseSync;
} catch (e) {
  console.warn('node:sqlite not found directly, will check on first call');
}

let dbInstance: any = null;

export function getDb(): any {
  if (dbInstance) {
    return dbInstance;
  }

  const resolvedDbPath = path.resolve(process.cwd(), DB_PATH);
  const dbDir = path.dirname(resolvedDbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (!DatabaseSyncClass) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sqlite = require('node:sqlite');
    DatabaseSyncClass = sqlite.DatabaseSync;
  }

  if (DatabaseSyncClass) {
    dbInstance = new DatabaseSyncClass(resolvedDbPath);
    try {
      dbInstance.exec('PRAGMA journal_mode = WAL;');
      dbInstance.exec('PRAGMA synchronous = NORMAL;');
    } catch {
      // ignore in-memory or unsupported pragma
    }
    initSchema(dbInstance);
    return dbInstance;
  }

  throw new Error('SQLite database engine is unavailable. Please run with node --experimental-sqlite.');
}

function initSchema(db: any) {
  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      customer_name TEXT DEFAULT 'Customer',
      customer_phone TEXT,
      notes TEXT,
      client_ip TEXT NOT NULL,
      user_agent TEXT,
      status TEXT DEFAULT 'pending',
      total_files INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
  `);

  // Job Files table
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_files (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      file_extension TEXT NOT NULL,
      status TEXT DEFAULT 'uploaded',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_job_files_job_id ON job_files(job_id);
  `);
}

// Settings repository
export function getSettings(): ShopSettings {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  
  if (rows.length === 0) {
    saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  const settingsMap: Record<string, string> = {};
  for (const row of rows) {
    settingsMap[row.key] = row.value;
  }

  return {
    shopName: settingsMap.shopName || DEFAULT_SETTINGS.shopName,
    shopContact: settingsMap.shopContact || DEFAULT_SETTINGS.shopContact,
    shopOperator: settingsMap.shopOperator || DEFAULT_SETTINGS.shopOperator,
    ownerPin: settingsMap.ownerPin || DEFAULT_SETTINGS.ownerPin,
    welcomeMessage: settingsMap.welcomeMessage || DEFAULT_SETTINGS.welcomeMessage,
    hotspotInstructions: settingsMap.hotspotInstructions || DEFAULT_SETTINGS.hotspotInstructions,
    maxFileSizeMb: settingsMap.maxFileSizeMb ? Number(settingsMap.maxFileSizeMb) : DEFAULT_SETTINGS.maxFileSizeMb,
    maxJobSizeMb: settingsMap.maxJobSizeMb ? Number(settingsMap.maxJobSizeMb) : DEFAULT_SETTINGS.maxJobSizeMb,
    maxFilesPerJob: settingsMap.maxFilesPerJob ? Number(settingsMap.maxFilesPerJob) : DEFAULT_SETTINGS.maxFilesPerJob,
    jobRetentionHours: settingsMap.jobRetentionHours ? Number(settingsMap.jobRetentionHours) : DEFAULT_SETTINGS.jobRetentionHours,
    allowedExtensions: settingsMap.allowedExtensions ? JSON.parse(settingsMap.allowedExtensions) : DEFAULT_SETTINGS.allowedExtensions,
    preferredNetworkInterface: settingsMap.preferredNetworkInterface || DEFAULT_SETTINGS.preferredNetworkInterface,
    defaultPaperSize: (settingsMap.defaultPaperSize as any) || DEFAULT_SETTINGS.defaultPaperSize,
    defaultColorMode: (settingsMap.defaultColorMode as any) || DEFAULT_SETTINGS.defaultColorMode,
  };
}

export function saveSettings(settings: Partial<ShopSettings>) {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const [key, val] of Object.entries(settings)) {
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      insert.run(key, valStr);
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// Jobs repository
export function createJob(job: {
  id: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  clientIp: string;
  userAgent?: string;
  files: Array<{
    id: string;
    originalName: string;
    storedFilename: string;
    fileSize: number;
    mimeType: string;
    fileExtension: string;
  }>;
}): PrintJob {
  const db = getDb();
  const totalFiles = job.files.length;
  const totalBytes = job.files.reduce((sum, f) => sum + f.fileSize, 0);

  const insertJob = db.prepare(`
    INSERT INTO jobs (id, customer_name, customer_phone, notes, client_ip, user_agent, status, total_files, total_bytes)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `);

  const insertFile = db.prepare(`
    INSERT INTO job_files (id, job_id, original_name, stored_filename, file_size, mime_type, file_extension, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded')
  `);

  db.exec('BEGIN TRANSACTION;');
  try {
    insertJob.run(
      job.id,
      job.customerName || 'Customer',
      job.customerPhone || null,
      job.notes || null,
      job.clientIp,
      job.userAgent || null,
      totalFiles,
      totalBytes
    );

    for (const f of job.files) {
      insertFile.run(
        f.id,
        job.id,
        f.originalName,
        f.storedFilename,
        f.fileSize,
        f.mimeType,
        f.fileExtension
      );
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return getJobById(job.id)!;
}

export function getJobById(id: string): PrintJob | null {
  const db = getDb();
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as PrintJob | undefined;
  if (!job) return null;

  const files = db.prepare('SELECT * FROM job_files WHERE job_id = ? ORDER BY created_at ASC').all(id) as JobFile[];
  return { ...job, files };
}

export function listJobs(options?: {
  status?: JobStatus | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}): { jobs: PrintJob[]; total: number } {
  const db = getDb();
  const whereClauses = ['1=1'];
  const params: any[] = [];

  if (options?.status && options.status !== 'all') {
    whereClauses.push('status = ?');
    params.push(options.status);
  }

  if (options?.search && options.search.trim()) {
    whereClauses.push('(id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)');
    const searchTerm = `%${options.search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.join(' AND ');

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE ${whereSql}`).get(...params) as { count: number };
  const total = countRow ? Number(countRow.count) : 0;

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const jobs = db.prepare(`
    SELECT * FROM jobs 
    WHERE ${whereSql} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as PrintJob[];

  // Attach files to each job
  for (const job of jobs) {
    job.files = db.prepare('SELECT * FROM job_files WHERE job_id = ? ORDER BY created_at ASC').all(job.id) as JobFile[];
  }

  return { jobs, total };
}

export function updateJobStatus(id: string, status: JobStatus): boolean {
  const db = getDb();
  const res = db.prepare(`
    UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(status, id);
  return res.changes > 0;
}

export function deleteJob(id: string): { success: boolean; files: JobFile[] } {
  const db = getDb();
  const files = db.prepare('SELECT * FROM job_files WHERE job_id = ?').all(id) as JobFile[];
  
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('DELETE FROM job_files WHERE job_id = ?').run(id);
    db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { success: true, files };
}

export function deleteJobFile(jobId: string, fileId: string): { success: boolean; file?: JobFile } {
  const db = getDb();
  const file = db.prepare('SELECT * FROM job_files WHERE id = ? AND job_id = ?').get(fileId, jobId) as JobFile | undefined;
  if (!file) return { success: false };

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('DELETE FROM job_files WHERE id = ?').run(fileId);
    db.prepare(`
      UPDATE jobs 
      SET total_files = (SELECT COUNT(*) FROM job_files WHERE job_id = ?),
          total_bytes = COALESCE((SELECT SUM(file_size) FROM job_files WHERE job_id = ?), 0),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(jobId, jobId, jobId);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { success: true, file };
}

export function getJobStats(): {
  totalJobs: number;
  pendingJobs: number;
  printedJobs: number;
  todayJobs: number;
  totalFiles: number;
  totalBytes: number;
} {
  const db = getDb();
  const row = db.prepare(`
    SELECT 
      COUNT(*) as totalJobs,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingJobs,
      SUM(CASE WHEN status = 'printed' THEN 1 ELSE 0 END) as printedJobs,
      SUM(CASE WHEN date(created_at) = date('now', 'localtime') THEN 1 ELSE 0 END) as todayJobs,
      COALESCE(SUM(total_files), 0) as totalFiles,
      COALESCE(SUM(total_bytes), 0) as totalBytes
    FROM jobs
  `).get() as any;

  return {
    totalJobs: row?.totalJobs ? Number(row.totalJobs) : 0,
    pendingJobs: row?.pendingJobs ? Number(row.pendingJobs) : 0,
    printedJobs: row?.printedJobs ? Number(row.printedJobs) : 0,
    todayJobs: row?.todayJobs ? Number(row.todayJobs) : 0,
    totalFiles: row?.totalFiles ? Number(row.totalFiles) : 0,
    totalBytes: row?.totalBytes ? Number(row.totalBytes) : 0,
  };
}

export function cleanupExpiredJobs(retentionHours: number): { deletedJobsCount: number; deletedJobIds: string[] } {
  if (retentionHours <= 0) return { deletedJobsCount: 0, deletedJobIds: [] };

  const db = getDb();
  const cutoffSql = `datetime('now', '-${retentionHours} hours')`;
  const expiredJobs = db.prepare(`SELECT id FROM jobs WHERE created_at < ${cutoffSql}`).all() as { id: string }[];

  const ids = expiredJobs.map(j => j.id);
  if (ids.length === 0) return { deletedJobsCount: 0, deletedJobIds: [] };

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const id of ids) {
      db.prepare('DELETE FROM job_files WHERE job_id = ?').run(id);
      db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { deletedJobsCount: ids.length, deletedJobIds: ids };
}
