import os from 'os';
import { NetworkInterfaceInfo, NetworkStatus } from './types';
import { SERVER_PORT } from './config';

export function getNetworkInterfacesList(preferredInterfaceName?: string): NetworkInterfaceInfo[] {
  const nets = os.networkInterfaces();
  const result: NetworkInterfaceInfo[] = [];

  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;

    for (const net of netList) {
      // Filter for IPv4 and non-internal (unless only internal is available)
      if (net.family === 'IPv4') {
        const lowerName = name.toLowerCase();
        let type: NetworkInterfaceInfo['type'] = 'other';

        if (lowerName.includes('wi-fi') || lowerName.includes('wireless') || lowerName.includes('wlan')) {
          type = 'wifi';
        } else if (lowerName.includes('ethernet') || lowerName.includes('eth') || lowerName.includes('local area connection')) {
          type = 'ethernet';
        } else if (lowerName.includes('virtual') || lowerName.includes('vethernet') || lowerName.includes('vmware') || lowerName.includes('loopback')) {
          type = 'virtual';
        }

        // Special check for Windows Mobile Hotspot / Wi-Fi Direct
        if (lowerName.includes('wi-fi direct') || lowerName.includes('hotspot') || net.address.startsWith('192.168.137.')) {
          type = 'hotspot';
        }

        // Exclude Windows APIPA automatic self-assigned IPs (169.254.x.x) from being recommended
        const isApipa = net.address.startsWith('169.254.');
        const isLoopback = net.internal || net.address === '127.0.0.1';

        const port = SERVER_PORT;
        const uploadUrl = `http://${net.address}:${port}/upload`;

        result.push({
          name,
          displayName: formatInterfaceDisplayName(name, type, net.address),
          address: net.address,
          netmask: net.netmask,
          family: net.family,
          mac: net.mac,
          internal: net.internal,
          type,
          isRecommended: false,
          uploadUrl,
        });
      }
    }
  }

  // Determine which is recommended
  // Priority:
  // 1. Preferred interface chosen by owner in settings
  // 2. Windows Mobile Hotspot (192.168.137.x)
  // 3. Active Wi-Fi interface (not 169.254.x.x, not 127.0.0.1)
  // 4. Active Ethernet interface (not 169.254.x.x)
  // 5. Any active private IPv4 address (192.168.x, 10.x, 172.x)
  // 6. 127.0.0.1 fallback
  let recommended = result.find(i => preferredInterfaceName && i.name === preferredInterfaceName && !i.address.startsWith('169.254.'));

  if (!recommended) {
    recommended = result.find(i => i.type === 'hotspot' && !i.address.startsWith('169.254.'));
  }
  if (!recommended) {
    recommended = result.find(i => i.type === 'wifi' && !i.address.startsWith('169.254.') && !i.internal);
  }
  if (!recommended) {
    recommended = result.find(i => i.type === 'ethernet' && !i.address.startsWith('169.254.') && !i.internal);
  }
  if (!recommended) {
    recommended = result.find(i => !i.internal && !i.address.startsWith('169.254.'));
  }
  if (!recommended && result.length > 0) {
    recommended = result[0];
  }

  if (recommended) {
    recommended.isRecommended = true;
  }

  return result;
}

function formatInterfaceDisplayName(name: string, type: string, address: string): string {
  let label = name;
  if (address.startsWith('192.168.137.')) {
    label = `Windows Mobile Hotspot (${name})`;
  } else if (address.startsWith('192.168.43.')) {
    label = `Android Phone Hotspot Subnet (${name})`;
  } else if (address.startsWith('172.20.10.')) {
    label = `iPhone Personal Hotspot Subnet (${name})`;
  } else if (type === 'wifi') {
    label = `Wi-Fi Network (${name})`;
  } else if (type === 'ethernet') {
    label = `Ethernet / Local LAN (${name})`;
  }
  return `${label} - ${address}`;
}

export function getFullNetworkStatus(preferredInterfaceName?: string): NetworkStatus {
  const interfaces = getNetworkInterfacesList(preferredInterfaceName);
  const selected = interfaces.find(i => i.isRecommended) || interfaces[0] || null;

  const hostname = os.hostname();
  const serverPort = SERVER_PORT;

  const isHotspotDetected = interfaces.some(i => i.address.startsWith('192.168.137.') || i.address.startsWith('192.168.43.') || i.address.startsWith('172.20.10.'));
  const hasMultipleNics = interfaces.filter(i => !i.internal && !i.address.startsWith('169.254.')).length >= 2;

  return {
    interfaces,
    selectedInterface: selected,
    serverPort,
    hostname,
    topologies: {
      configA: {
        name: 'Config A: Shared Phone Hotspot',
        title: 'PC and Customers Connected to Same Phone Hotspot',
        description: 'Your mobile phone creates a Wi-Fi hotspot (without mobile data). Both this PC and customers connect their phones to that hotspot.',
        active: interfaces.some(i => i.address.startsWith('192.168.43.') || i.address.startsWith('172.20.10.')),
        instructions: [
          '1. On your phone, turn OFF Mobile Data.',
          '2. Turn ON Personal Hotspot / Portable Wi-Fi Hotspot.',
          '3. Connect this Windows PC to that phone hotspot via Wi-Fi.',
          '4. Tell customers to connect to the same hotspot name (SSID).',
          '5. Verify your PC receives an IP (usually 192.168.43.xxx for Android or 172.20.10.xxx for iPhone).',
          '6. Customers scan the QR code and will reach the upload page directly.',
        ],
      },
      configB: {
        name: 'Config B: Dual Network Interfaces (Hotspot + Shop Internet)',
        title: 'PC Maintains Internet on Adapter 1, Receives Docs on Adapter 2',
        description: 'Your PC stays connected to shop broadband/fiber on one adapter (Ethernet/Wi-Fi Dongle) while Wi-Fi Adapter 2 is connected to the customer hotspot.',
        active: hasMultipleNics,
        instructions: [
          '1. Connect Adapter 1 (e.g. Ethernet cable or primary Wi-Fi) to your shop broadband router for internet.',
          '2. Connect Adapter 2 (e.g. USB Wi-Fi dongle or internal Wi-Fi) to the customer hotspot.',
          '3. Windows automatically routes internet through the primary gateway and local customer traffic through Adapter 2.',
          '4. In Roonjha Print Share settings, select the IP of Adapter 2 for the QR code.',
          '5. The server listens on all interfaces (0.0.0.0), so customer uploads work without interrupting your shop internet.',
        ],
      },
      configC: {
        name: 'Config C: Windows Mobile Hotspot or Dedicated Counter Router (Recommended)',
        title: 'Zero-Phone Setup: Windows PC Acts As The Hotspot Or Use Counter Router',
        description: 'Turn on "Mobile Hotspot" directly inside Windows Settings, or place a cheap offline Wi-Fi router at your counter. No phone required!',
        active: interfaces.some(i => i.address.startsWith('192.168.137.')),
        instructions: [
          'Option C1 (Windows Built-in Hotspot): Open Windows Settings -> Network & Internet -> Mobile Hotspot -> Turn ON. Customers connect to this PC hotspot. PC IP is always 192.168.137.1.',
          'Option C2 (Shop Counter Router): Connect a standard TP-Link or Tenda router at counter. No internet cable needed. Customers connect to shop Wi-Fi.',
          'Benefits: High-speed Wi-Fi 5/6 transfers, zero battery drain on your phone, and works 100% offline all day.',
        ],
      },
    },
  };
}
