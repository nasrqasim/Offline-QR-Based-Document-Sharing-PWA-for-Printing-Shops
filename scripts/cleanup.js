const path = require('path');
const fs = require('fs');

console.log('Running Roonjha Print Share Job Retention Cleanup...');

try {
  const sqlite = require('node:sqlite');
  const dbPath = path.resolve(__dirname, '..', 'data', 'roonjha_print.db');

  if (!fs.existsSync(dbPath)) {
    console.log('No database found at', dbPath);
    process.exit(0);
  }

  const db = new sqlite.DatabaseSync(dbPath);
  const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'jobRetentionHours'").get();
  const retentionHours = settingRow ? Number(settingRow.value) : 24;

  if (retentionHours <= 0) {
    console.log('Auto-cleanup is disabled (retention set to 0).');
    process.exit(0);
  }

  console.log(`Cleaning jobs older than ${retentionHours} hours...`);
  const cutoffSql = `datetime('now', '-${retentionHours} hours')`;
  const expiredJobs = db.prepare(`SELECT id FROM jobs WHERE created_at < ${cutoffSql}`).all();

  console.log(`Found ${expiredJobs.length} expired jobs.`);

  const uploadsDir = path.resolve(__dirname, '..', 'uploads', 'jobs');

  for (const job of expiredJobs) {
    const jobDir = path.join(uploadsDir, job.id);
    if (fs.existsSync(jobDir)) {
      try {
        fs.rmSync(jobDir, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to delete files for job ${job.id}:`, err.message);
      }
    }
    db.prepare('DELETE FROM job_files WHERE job_id = ?').run(job.id);
    db.prepare('DELETE FROM jobs WHERE id = ?').run(job.id);
  }

  console.log('Cleanup finished successfully.');
} catch (err) {
  console.error('Error running cleanup:', err);
}
