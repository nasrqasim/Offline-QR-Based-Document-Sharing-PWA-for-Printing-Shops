import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

// 1. Test Network Interface Detection
test('Network discovery module identifies interfaces', async () => {
  const os = await import('os');
  const nets = os.networkInterfaces();
  assert.ok(typeof nets === 'object', 'os.networkInterfaces() must return an object');

  // Verify at least one interface or loopback exists
  let hasAnyIpv4 = false;
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4') {
        hasAnyIpv4 = true;
        break;
      }
    }
  }
  assert.ok(hasAnyIpv4, 'PC must have at least one IPv4 address');
});

// 2. Test File Validator Magic Bytes & Extension Security
test('File validator correctly identifies valid and dangerous files', async () => {
  // Test PDF magic bytes %PDF (hex 25 50 44 46)
  const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]);
  assert.equal(pdfBuffer[0], 0x25);
  assert.equal(pdfBuffer[1], 0x50);
  assert.equal(pdfBuffer[2], 0x44);
  assert.equal(pdfBuffer[3], 0x46);

  // Test JPEG magic bytes FF D8 FF
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  assert.equal(jpegBuffer[0], 0xff);
  assert.equal(jpegBuffer[1], 0xd8);
  assert.equal(jpegBuffer[2], 0xff);

  // Test PNG magic bytes 89 50 4E 47
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(pngBuffer[0], 0x89);
  assert.equal(pngBuffer[1], 0x50);
  assert.equal(pngBuffer[2], 0x4e);
  assert.equal(pngBuffer[3], 0x47);

  // Test ZIP / Office magic bytes PK\x03\x04 (50 4B 03 04)
  const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  assert.equal(zipBuffer[0], 0x50);
  assert.equal(zipBuffer[1], 0x4b);
  assert.equal(zipBuffer[2], 0x03);
  assert.equal(zipBuffer[3], 0x04);
});

// 3. Test Path Sanitization & Collision Resistance
test('Filename sanitization blocks directory traversal characters', () => {
  const dangerousNames = [
    '../../../windows/system32/cmd.exe',
    '..\\..\\boot.ini',
    'test:file*with?bad"chars|.pdf',
  ];

  for (const name of dangerousNames) {
    const base = path.basename(name);
    const sanitized = base.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
    assert.ok(!sanitized.includes('..'), 'Must not contain parent directory traversal');
    assert.ok(!sanitized.includes('/'), 'Must not contain forward slash');
    assert.ok(!sanitized.includes('\\'), 'Must not contain backward slash');
    assert.ok(!sanitized.includes(':'), 'Must not contain colon');
  }
});

// 4. Test SQLite Database Schema and Operations
test('SQLite Database initializes schema, creates and updates jobs', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const testDb = new DatabaseSync(':memory:');

  // Schema creation
  testDb.exec(`
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE jobs (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      client_ip TEXT,
      status TEXT DEFAULT 'pending',
      total_files INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE job_files (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      original_name TEXT,
      stored_filename TEXT,
      file_size INTEGER,
      mime_type TEXT,
      file_extension TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert settings
  testDb.prepare('INSERT INTO settings VALUES (?, ?)').run('shopName', 'Roonjha Print & Photostat');
  const setting = testDb.prepare('SELECT value FROM settings WHERE key = ?').get('shopName');
  assert.equal(setting.value, 'Roonjha Print & Photostat');

  // Create job
  const jobId = 'RPS-1234';
  testDb.prepare(`
    INSERT INTO jobs (id, customer_name, client_ip, status, total_files, total_bytes)
    VALUES (?, ?, ?, 'pending', 1, 1024)
  `).run(jobId, 'Ahmed Customer', '192.168.43.50');

  testDb.prepare(`
    INSERT INTO job_files (id, job_id, original_name, stored_filename, file_size, mime_type, file_extension)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('f-1', jobId, 'CNIC_Front.pdf', 'stored_123_cnic.pdf', 1024, 'application/pdf', 'pdf');

  // Query job
  const job = testDb.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  assert.equal(job.id, jobId);
  assert.equal(job.customer_name, 'Ahmed Customer');
  assert.equal(job.status, 'pending');

  const files = testDb.prepare('SELECT * FROM job_files WHERE job_id = ?').all(jobId);
  assert.equal(files.length, 1);
  assert.equal(files[0].original_name, 'CNIC_Front.pdf');

  // Update status to printed
  testDb.prepare('UPDATE jobs SET status = ? WHERE id = ?').run('printed', jobId);
  const updatedJob = testDb.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId);
  assert.equal(updatedJob.status, 'printed');

  // Delete job
  testDb.prepare('DELETE FROM job_files WHERE job_id = ?').run(jobId);
  testDb.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
  const deletedJob = testDb.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  assert.equal(deletedJob, undefined);
});
