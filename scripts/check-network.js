const os = require('os');

console.log('====================================================');
console.log('  Roonjha Print Share - Network Interfaces Scanner  ');
console.log('  software by Roonjha Developers : 0315291486       ');
console.log('====================================================\n');

const nets = os.networkInterfaces();
const results = [];

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4') {
      const isLoopback = net.internal || net.address === '127.0.0.1';
      const isApipa = net.address.startsWith('169.254.');
      let type = 'LAN / Ethernet';
      if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wireless')) type = 'Wi-Fi Adapter';
      if (net.address.startsWith('192.168.137.')) type = 'Windows Mobile Hotspot';
      if (net.address.startsWith('192.168.43.')) type = 'Android Phone Hotspot Subnet';
      if (net.address.startsWith('172.20.10.')) type = 'iPhone Personal Hotspot Subnet';

      results.push({
        name,
        type,
        address: net.address,
        isLoopback,
        isApipa,
        url: `http://${net.address}:3000/upload`,
      });
    }
  }
}

console.log('Detected IPv4 Interfaces on this PC:\n');
let recommended = null;

results.forEach((r, idx) => {
  const isGood = !r.isLoopback && !r.isApipa;
  if (isGood && !recommended) recommended = r;

  console.log(`[${idx + 1}] Adapter: ${r.name} (${r.type})`);
  console.log(`    IP Address  : ${r.address}`);
  console.log(`    Customer URL: ${r.url}`);
  if (r.isApipa) console.log(`    Note        : Windows auto-assigned APIPA (No network cable/hotspot connected)`);
  if (r.isLoopback) console.log(`    Note        : Local loopback (PC only)`);
  console.log('');
});

console.log('----------------------------------------------------');
if (recommended) {
  console.log(`>> RECOMMENDED CUSTOMER UPLOAD ADDRESS:`);
  console.log(`   ${recommended.url}`);
  console.log(`   (Tell customers to connect to this adapter's Wi-Fi)\n`);
} else {
  console.log('>> No external Wi-Fi or Ethernet adapter detected.');
  console.log('   Please connect this PC to your phone hotspot or turn on Windows Mobile Hotspot.\n');
}
console.log('====================================================');
