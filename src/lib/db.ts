import path from 'path';
import fs from 'fs';
import { DB_PATH, DEFAULT_SETTINGS } from './config';
import { JobFile, JobStatus, PrintJob, ShopSettings } from './types';

// Detect whether node:sqlite is available
let DatabaseSyncClass: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sqlite = require('node:sqlite');
  DatabaseSyncClass = sqlite.DatabaseSync;
} catch {
  // node:sqlite not available without flag; JSON store fallback will be used
}

let dbInstance: any = null;
let useJsonFallback = false;

// JSON fallback file path
const jsonStorePath = path.resolve(process.cwd(), DB_PATH.replace(/\.db$/, '.json'));

interface JsonDatabase {
  settings: Record<string, string>;
  jobs: Record<string, PrintJob>;
  jobFiles: Record<string, JobFile[]>;
}

let jsonCache: JsonDatabase | null = null;

function getJsonStore(): JsonDatabase {
  if (jsonCache) return jsonCache;

  const dir = path.dirname(jsonStorePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(jsonStorePath)) {
    try {
      const data = fs.readFileSync(jsonStorePath, 'utf8');
      jsonCache = JSON.parse(data);
      return jsonCache!;
    } catch {
      // fallback to fresh
    }
  }

  jsonCache = {
    settings: {},
    jobs: {},
    jobFiles: {},
  };
  persistJsonStore();
  return jsonCache;
}

function persistJsonStore() {
  if (!jsonCache) return;
  try {
    const dir = path.dirname(jsonStorePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(jsonStorePath, JSON.stringify(jsonCache, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist JSON store:', err);
  }
}

export function getDb(): any {
  if (useJsonFallback) {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  const resolvedDbPath = path.resolve(process.cwd(), DB_PATH);
  const dbDir = path.dirname(resolvedDbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (!DatabaseSyncClass) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sqlite = require('node:sqlite');
      DatabaseSyncClass = sqlite.DatabaseSync;
    } catch {
      useJsonFallback = true;
      return null;
    }
  }

  if (DatabaseSyncClass) {
    try {
      dbInstance = new DatabaseSyncClass(resolvedDbPath);
      try {
        dbInstance.exec('PRAGMA journal_mode = WAL;');
        dbInstance.exec('PRAGMA synchronous = NORMAL;');
      } catch {
        // WAL pragma might be ignored in in-memory mode
      }
      initSchema(dbInstance);
      return dbInstance;
    } catch (e) {
      console.warn('Failed to open SQLite database, falling back to JSON storage:', e);
      useJsonFallback = true;
      return null;
    }
  }

  useJsonFallback = true;
  return null;
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
  if (db) {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    
    if (rows.length === 0) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }

    const settingsMap: Record<string, string> = {};
    for (const row of rows) {
      settingsMap[row.key] = row.value;
    }

    return parseSettingsMap(settingsMap);
  }

  // Fallback JSON store
  const store = getJsonStore();
  if (Object.keys(store.settings).length === 0) {
    saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return parseSettingsMap(store.settings);
}

function parseSettingsMap(settingsMap: Record<string, string>): ShopSettings {
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
  if (db) {
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
    return;
  }

  // Fallback JSON store
  const store = getJsonStore();
  for (const [key, val] of Object.entries(settings)) {
    store.settings[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
  }
  persistJsonStore();
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
  const totalFiles = job.files.length;
  const totalBytes = job.files.reduce((sum, f) => sum + f.fileSize, 0);
  const now = new Date().toISOString();

  const db = getDb();
  if (db) {
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

  // Fallback JSON store
  const store = getJsonStore();
  const newJob: PrintJob = {
    id: job.id,
    customer_name: job.customerName || 'Customer',
    customer_phone: job.customerPhone,
    notes: job.notes,
    client_ip: job.clientIp,
    user_agent: job.userAgent,
    status: 'pending',
    total_files: totalFiles,
    total_bytes: totalBytes,
    created_at: now,
    updated_at: now,
    files: job.files.map(f => ({
      id: f.id,
      job_id: job.id,
      original_name: f.originalName,
      stored_filename: f.storedFilename,
      file_size: f.fileSize,
      mime_type: f.mimeType,
      file_extension: f.fileExtension,
      status: 'uploaded',
      created_at: now,
    })),
  };

  store.jobs[job.id] = newJob;
  store.jobFiles[job.id] = newJob.files || [];
  persistJsonStore();
  return newJob;
}

export function getJobById(id: string): PrintJob | null {
  const db = getDb();
  if (db) {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as PrintJob | undefined;
    if (!job) return null;

    const files = db.prepare('SELECT * FROM job_files WHERE job_id = ? ORDER BY created_at ASC').all(id) as JobFile[];
    return { ...job, files };
  }

  // Fallback JSON store
  const store = getJsonStore();
  const job = store.jobs[id];
  if (!job) return null;
  return { ...job, files: store.jobFiles[id] || [] };
}

export function listJobs(options?: {
  status?: JobStatus | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}): { jobs: PrintJob[]; total: number } {
  const db = getDb();
  if (db) {
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

    for (const job of jobs) {
      job.files = db.prepare('SELECT * FROM job_files WHERE job_id = ? ORDER BY created_at ASC').all(job.id) as JobFile[];
    }

    return { jobs, total };
  }

  // Fallback JSON store
  const store = getJsonStore();
  let allJobs = Object.values(store.jobs).map(j => ({
    ...j,
    files: store.jobFiles[j.id] || [],
  }));

  if (options?.status && options.status !== 'all') {
    allJobs = allJobs.filter(j => j.status === options.status);
  }

  if (options?.search && options.search.trim()) {
    const q = options.search.trim().toLowerCase();
    allJobs = allJobs.filter(
      j =>
        j.id.toLowerCase().includes(q) ||
        j.customer_name.toLowerCase().includes(q) ||
        (j.customer_phone && j.customer_phone.toLowerCase().includes(q))
    );
  }

  // Sort descending by created_at
  allJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = allJobs.length;
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  const pagedJobs = allJobs.slice(offset, offset + limit);

  return { jobs: pagedJobs, total };
}

export function updateJobStatus(id: string, status: JobStatus): boolean {
  const db = getDb();
  if (db) {
    const res = db.prepare(`
      UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(status, id);
    return res.changes > 0;
  }

  // Fallback JSON store
  const store = getJsonStore();
  if (store.jobs[id]) {
    store.jobs[id].status = status;
    store.jobs[id].updated_at = new Date().toISOString();
    persistJsonStore();
    return true;
  }
  return false;
}

export function deleteJob(id: string): { success: boolean; files: JobFile[] } {
  const db = getDb();
  if (db) {
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

  // Fallback JSON store
  const store = getJsonStore();
  const files = store.jobFiles[id] || [];
  delete store.jobs[id];
  delete store.jobFiles[id];
  persistJsonStore();
  return { success: true, files };
}

export function deleteJobFile(jobId: string, fileId: string): { success: boolean; file?: JobFile } {
  const db = getDb();
  if (db) {
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

  // Fallback JSON store
  const store = getJsonStore();
  const files = store.jobFiles[jobId] || [];
  const idx = files.findIndex(f => f.id === fileId);
  if (idx === -1) return { success: false };

  const file = files[idx];
  files.splice(idx, 1);
  store.jobFiles[jobId] = files;

  if (store.jobs[jobId]) {
    store.jobs[jobId].total_files = files.length;
    store.jobs[jobId].total_bytes = files.reduce((s, f) => s + f.file_size, 0);
    store.jobs[jobId].updated_at = new Date().toISOString();
  }
  persistJsonStore();
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
  if (db) {
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

  // Fallback JSON store
  const store = getJsonStore();
  const jobs = Object.values(store.jobs);
  const todayStr = new Date().toISOString().split('T')[0];

  return {
    totalJobs: jobs.length,
    pendingJobs: jobs.filter(j => j.status === 'pending').length,
    printedJobs: jobs.filter(j => j.status === 'printed').length,
    todayJobs: jobs.filter(j => j.created_at.startsWith(todayStr)).length,
    totalFiles: jobs.reduce((s, j) => s + (j.total_files || 0), 0),
    totalBytes: jobs.reduce((s, j) => s + (j.total_bytes || 0), 0),
  };
}

export function cleanupExpiredJobs(retentionHours: number): { deletedJobsCount: number; deletedJobIds: string[] } {
  if (retentionHours <= 0) return { deletedJobsCount: 0, deletedJobIds: [] };

  const db = getDb();
  if (db) {
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

  // Fallback JSON store
  const store = getJsonStore();
  const cutoffTime = Date.now() - retentionHours * 3600 * 1000;
  const deletedJobIds: string[] = [];

  for (const [id, job] of Object.entries(store.jobs)) {
    if (new Date(job.created_at).getTime() < cutoffTime) {
      deletedJobIds.push(id);
      delete store.jobs[id];
      delete store.jobFiles[id];
    }
  }

  if (deletedJobIds.length > 0) {
    persistJsonStore();
  }

  return { deletedJobsCount: deletedJobIds.length, deletedJobIds };
}
