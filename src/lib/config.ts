import { ShopSettings } from './types';

export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: process.env.SHOP_NAME || 'Roonjha Print & Photostat Center',
  shopContact: process.env.SHOP_CONTACT || '0315291486',
  shopOperator: process.env.SHOP_OPERATOR || 'Roonjha Developers',
  ownerPin: process.env.OWNER_PIN || '1234',
  welcomeMessage: 'Send your documents quickly to the counter printer without internet.',
  hotspotInstructions: 'Connect your phone to the shop Wi-Fi / Hotspot, then scan the QR code to upload your files.',
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 100,
  maxJobSizeMb: Number(process.env.MAX_JOB_SIZE_MB) || 300,
  maxFilesPerJob: Number(process.env.MAX_FILES_PER_JOB) || 20,
  jobRetentionHours: Number(process.env.JOB_RETENTION_HOURS) || 24,
  allowedExtensions: [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'jpg',
    'jpeg',
    'png',
    'heic',
    'txt',
  ],
  preferredNetworkInterface: '',
  defaultPaperSize: 'A4',
  defaultColorMode: 'bw',
};

export const SERVER_PORT = Number(process.env.PORT) || 3000;
export const SERVER_HOST = process.env.HOST || '0.0.0.0';
export const STORAGE_DIR = process.env.STORAGE_DIR || './uploads';
export const DB_PATH = process.env.DB_PATH || './data/roonjha_print.db';
