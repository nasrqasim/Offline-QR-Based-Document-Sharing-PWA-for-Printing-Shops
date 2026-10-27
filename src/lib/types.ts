export type JobStatus = 'pending' | 'reviewing' | 'printed' | 'completed';

export interface JobFile {
  id: string;
  job_id: string;
  original_name: string;
  stored_filename: string;
  file_size: number;
  mime_type: string;
  file_extension: string;
  status: 'uploaded' | 'error';
  created_at: string;
}

export interface PrintJob {
  id: string;
  customer_name: string;
  customer_phone?: string;
  notes?: string;
  client_ip: string;
  user_agent?: string;
  status: JobStatus;
  total_files: number;
  total_bytes: number;
  created_at: string;
  updated_at: string;
  files?: JobFile[];
}

export interface NetworkInterfaceInfo {
  name: string;
  displayName: string;
  address: string;
  netmask: string;
  family: 'IPv4' | 'IPv6';
  mac: string;
  internal: boolean;
  type: 'wifi' | 'ethernet' | 'hotspot' | 'virtual' | 'other';
  isRecommended: boolean;
  uploadUrl: string;
}

export interface NetworkStatus {
  interfaces: NetworkInterfaceInfo[];
  selectedInterface: NetworkInterfaceInfo | null;
  serverPort: number;
  hostname: string;
  topologies: {
    configA: {
      name: string;
      title: string;
      description: string;
      active: boolean;
      instructions: string[];
    };
    configB: {
      name: string;
      title: string;
      description: string;
      active: boolean;
      instructions: string[];
    };
    configC: {
      name: string;
      title: string;
      description: string;
      active: boolean;
      instructions: string[];
    };
  };
}

export interface ShopSettings {
  shopName: string;
  shopContact: string;
  shopOperator: string;
  ownerPin: string;
  welcomeMessage: string;
  hotspotInstructions: string;
  maxFileSizeMb: number;
  maxJobSizeMb: number;
  maxFilesPerJob: number;
  jobRetentionHours: number;
  allowedExtensions: string[];
  preferredNetworkInterface: string;
  defaultPaperSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  defaultColorMode: 'bw' | 'color';
}
