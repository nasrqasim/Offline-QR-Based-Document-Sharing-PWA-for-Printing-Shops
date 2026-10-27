import path from 'path';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  detectedMime?: string;
  sanitizedFilename: string;
  extension: string;
}

// Dangerous executable extensions strictly forbidden
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'com', 'scr', 'vbs', 'vbe', 'js', 'jse', 
  'wsf', 'wsh', 'ps1', 'ps1xml', 'ps2', 'psc1', 'msc', 'msi', 'msp', 
  'reg', 'hta', 'cpl', 'jar', 'pif', 'lnk', 'dll', 'sys', 'iso', 'img',
  'php', 'asp', 'aspx', 'jsp', 'cgi', 'pl', 'py'
]);

/**
 * Checks file magic bytes (file signature) for common formats
 */
export function validateFileMagicBytes(buffer: Buffer, declaredExtension: string): { matches: boolean; detectedMime: string } {
  if (buffer.length < 4) {
    return { matches: false, detectedMime: 'application/octet-stream' };
  }

  const ext = declaredExtension.toLowerCase().replace(/^\./, '');

  // PDF signature: %PDF (hex 25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { matches: ext === 'pdf', detectedMime: 'application/pdf' };
  }

  // JPEG signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { matches: ext === 'jpg' || ext === 'jpeg', detectedMime: 'image/jpeg' };
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { matches: ext === 'png', detectedMime: 'image/png' };
  }

  // ZIP / DOCX / XLSX / PPTX signature: PK\x03\x04 (hex 50 4B 03 04)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    const isOffice = ['docx', 'xlsx', 'pptx', 'zip'].includes(ext);
    let mime = 'application/zip';
    if (ext === 'docx') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (ext === 'xlsx') mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (ext === 'pptx') mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    return { matches: isOffice, detectedMime: mime };
  }

  // Legacy MS Office OLE compound document (DOC, XLS, PPT): D0 CF 11 E0 A1 B1 1A E1
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    const isLegacyOffice = ['doc', 'xls', 'ppt'].includes(ext);
    let mime = 'application/msword';
    if (ext === 'xls') mime = 'application/vnd.ms-excel';
    if (ext === 'ppt') mime = 'application/vnd.ms-powerpoint';
    return { matches: isLegacyOffice, detectedMime: mime };
  }

  // Plain text (UTF-8 / ASCII) validation: check printable characters
  if (['txt', 'csv', 'rtf'].includes(ext)) {
    // Check if first 512 bytes are mostly valid text (no null bytes or excessive control chars)
    let isText = true;
    const checkLen = Math.min(buffer.length, 512);
    for (let i = 0; i < checkLen; i++) {
      const b = buffer[i];
      if (b === 0) { // null byte indicates binary
        isText = false;
        break;
      }
    }
    return { matches: isText, detectedMime: 'text/plain' };
  }

  // HEIC / HEIF image format: contains ftypheic or ftypmif1
  if (buffer.length >= 12) {
    const brand = buffer.toString('ascii', 4, 12);
    if (brand.includes('ftyp') || ext === 'heic' || ext === 'heif') {
      return { matches: ext === 'heic' || ext === 'heif', detectedMime: 'image/heic' };
    }
  }

  return { matches: false, detectedMime: 'application/octet-stream' };
}

export function sanitizeFileName(originalName: string): string {
  // Extract basename without directory path to prevent path traversal
  const base = path.basename(originalName);
  // Replace illegal filename characters in Windows: \ / : * ? " < > | and control chars
  const sanitized = base
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized || `file_${Date.now()}`;
}

export function validateUploadFile(
  fileName: string,
  buffer: Buffer,
  allowedExtensions: string[],
  maxFileSizeMb: number
): FileValidationResult {
  const sanitizedName = sanitizeFileName(fileName);
  const ext = path.extname(sanitizedName).toLowerCase().replace(/^\./, '');

  if (!ext) {
    return {
      isValid: false,
      error: 'File does not have an extension. Please select valid document files.',
      sanitizedFilename: sanitizedName,
      extension: '',
    };
  }

  // Check blocked executables
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `Files with .${ext} extension are executable and strictly forbidden for shop security.`,
      sanitizedFilename: sanitizedName,
      extension: ext,
    };
  }

  // Check allowed extensions configured by shop
  const normalizedAllowed = allowedExtensions.map(e => e.toLowerCase().replace(/^\./, ''));
  if (!normalizedAllowed.includes(ext)) {
    return {
      isValid: false,
      error: `File type .${ext} is not allowed. Allowed types: ${normalizedAllowed.join(', ')}`,
      sanitizedFilename: sanitizedName,
      extension: ext,
    };
  }

  // Check file size
  const maxBytes = maxFileSizeMb * 1024 * 1024;
  if (buffer.length > maxBytes) {
    return {
      isValid: false,
      error: `File size exceeds the shop limit of ${maxFileSizeMb} MB.`,
      sanitizedFilename: sanitizedName,
      extension: ext,
    };
  }

  // Verify magic bytes
  const magicCheck = validateFileMagicBytes(buffer, ext);
  // Note: If magic bytes don't match, we check if it is a known office format with slight variations,
  // or allow if it's text/unknown but safe extension
  let detectedMime = magicCheck.detectedMime;
  if (!magicCheck.matches && ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
    return {
      isValid: false,
      error: `File content does not match the .${ext} format. Possible corrupt or disguised file.`,
      sanitizedFilename: sanitizedName,
      extension: ext,
    };
  }

  return {
    isValid: true,
    detectedMime,
    sanitizedFilename: sanitizedName,
    extension: ext,
  };
}
