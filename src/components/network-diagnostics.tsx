'use client';

import React, { useState } from 'react';
import { Wifi, Server, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Cpu, Activity, Info } from 'lucide-react';
import { NetworkInterfaceInfo, NetworkStatus } from '@/lib/types';

interface NetworkDiagnosticsProps {
  status: NetworkStatus | null;
  onSelectInterface: (interfaceName: string) => void;
  onRefresh: () => void;
  onClose?: () => void;
}

export function NetworkDiagnostics({
  status,
  onSelectInterface,
  onRefresh,
  onClose,
}: NetworkDiagnosticsProps) {
  const [activeTab, setActiveTab] = useState<'interfaces' | 'topologies' | 'firewall'>('interfaces');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const runConnectivityTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/network/ping');
      const data = await res.json();
      if (res.ok) {
        setTestResult(`Success! Local receiver responded in ${data.uptime}s uptime. Host: ${data.hostname}`);
      } else {
        setTestResult(`Failed: ${data.error || 'Unknown response'}`);
      }
    } catch (err: any) {
      setTestResult(`Connection error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-900 p-4 text-white sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2.5">
          <Activity className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="font-bold text-base">Network & Diagnostics Hub</h3>
            <p className="text-xs text-slate-400">
              Host: <span className="font-mono text-slate-200">{status?.hostname || 'Windows PC'}</span> • Port: {status?.serverPort || 3000}
            </p>
          </div>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={runConnectivityTest}
            disabled={testing}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Loopback Ping'}</span>
          </button>
          <button
            onClick={onRefresh}
            className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:text-white"
            title="Refresh Network Interfaces"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-4">
        <button
          onClick={() => setActiveTab('interfaces')}
          className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
            activeTab === 'interfaces'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Network Adapters ({status?.interfaces.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('topologies')}
          className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
            activeTab === 'topologies'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Network Topologies (Configs A, B, C)
        </button>
        <button
          onClick={() => setActiveTab('firewall')}
          className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
            activeTab === 'firewall'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Windows Firewall & Routing
        </button>
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div className={`p-3 text-xs font-medium border-b ${
          testResult.startsWith('Success') ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          {testResult}
        </div>
      )}

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'interfaces' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Select the network interface your customers connect to. The QR code and customer upload page will use this IP address.
            </p>

            <div className="space-y-2">
              {status?.interfaces.map((iface) => {
                const isSelected = status.selectedInterface?.address === iface.address;
                const isApipa = iface.address.startsWith('169.254.');
                const isLoopback = iface.internal || iface.address === '127.0.0.1';

                return (
                  <div
                    key={`${iface.name}-${iface.address}`}
                    onClick={() => !isApipa && onSelectInterface(iface.name)}
                    className={`flex items-center justify-between rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : isApipa
                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`rounded-lg p-2 ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {iface.type === 'wifi' || iface.type === 'hotspot' ? (
                          <Wifi className="h-5 w-5" />
                        ) : (
                          <Server className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-navy-950">{iface.displayName}</span>
                          {iface.isRecommended && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                              Recommended
                            </span>
                          )}
                          {isApipa && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              No Subnet (APIPA)
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center space-x-3 text-xs text-slate-500">
                          <span>IP: <strong className="font-mono text-slate-800">{iface.address}</strong></span>
                          <span>Mask: <strong className="font-mono text-slate-800">{iface.netmask}</strong></span>
                          <span>MAC: <strong className="font-mono text-slate-800">{iface.mac || 'N/A'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {isSelected ? (
                        <span className="inline-flex items-center space-x-1 text-xs font-bold text-blue-700">
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          <span>Active in QR</span>
                        </span>
                      ) : !isApipa ? (
                        <button
                          type="button"
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Use this IP
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'topologies' && (
          <div className="space-y-4">
            {/* Config A */}
            <div className={`rounded-xl border p-4 ${status?.topologies.configA.active ? 'border-green-300 bg-green-50/40' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Configuration A</span>
                {status?.topologies.configA.active && (
                  <span className="rounded-full bg-green-200 px-2.5 py-0.5 text-[10px] font-bold text-green-900">
                    Detected Active
                  </span>
                )}
              </div>
              <h4 className="mt-1 font-bold text-navy-950 text-sm">{status?.topologies.configA.title}</h4>
              <p className="mt-1 text-xs text-slate-600">{status?.topologies.configA.description}</p>
              <div className="mt-3 rounded-lg bg-white p-3 border border-slate-200 text-xs space-y-1 text-slate-700 font-medium">
                {status?.topologies.configA.instructions.map((ins, i) => (
                  <div key={i}>{ins}</div>
                ))}
              </div>
            </div>

            {/* Config B */}
            <div className={`rounded-xl border p-4 ${status?.topologies.configB.active ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Configuration B</span>
                {status?.topologies.configB.active && (
                  <span className="rounded-full bg-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-900">
                    Multiple Interfaces Available
                  </span>
                )}
              </div>
              <h4 className="mt-1 font-bold text-navy-950 text-sm">{status?.topologies.configB.title}</h4>
              <p className="mt-1 text-xs text-slate-600">{status?.topologies.configB.description}</p>
              <div className="mt-3 rounded-lg bg-white p-3 border border-slate-200 text-xs space-y-1 text-slate-700 font-medium">
                {status?.topologies.configB.instructions.map((ins, i) => (
                  <div key={i}>{ins}</div>
                ))}
              </div>
            </div>

            {/* Config C */}
            <div className={`rounded-xl border p-4 ${status?.topologies.configC.active ? 'border-purple-300 bg-purple-50/40' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Configuration C (Recommended)</span>
                {status?.topologies.configC.active && (
                  <span className="rounded-full bg-purple-200 px-2.5 py-0.5 text-[10px] font-bold text-purple-900">
                    Windows Hotspot Active
                  </span>
                )}
              </div>
              <h4 className="mt-1 font-bold text-navy-950 text-sm">{status?.topologies.configC.title}</h4>
              <p className="mt-1 text-xs text-slate-600">{status?.topologies.configC.description}</p>
              <div className="mt-3 rounded-lg bg-white p-3 border border-slate-200 text-xs space-y-1 text-slate-700 font-medium">
                {status?.topologies.configC.instructions.map((ins, i) => (
                  <div key={i}>{ins}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'firewall' && (
          <div className="space-y-3 text-xs text-slate-700">
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5">
              <h4 className="font-bold text-navy-950 text-sm flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span>Windows Defender Firewall Requirements</span>
              </h4>
              <p className="mt-1 text-slate-600">
                When customers scan the QR code from their mobile, Windows Firewall must allow inbound traffic on TCP Port <strong>{status?.serverPort || 3000}</strong> over Private networks.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-900 p-3 text-white font-mono text-[11px] overflow-x-auto">
              <p className="text-slate-400"># Run setup-firewall.bat in administrator PowerShell:</p>
              <p className="text-green-400 mt-1">netsh advfirewall firewall add rule name="Roonjha Print Share" dir=in action=allow protocol=TCP localport=3000 profile=private</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 bg-white">
              <h5 className="font-bold text-slate-900">Why customer phone might say "Site cannot be reached":</h5>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600">
                <li>Customer is on mobile data instead of the shop Wi-Fi / Hotspot.</li>
                <li>Customer phone joined a different Wi-Fi network than the PC.</li>
                <li>Windows Firewall blocked port 3000. Run <code>setup-firewall.bat</code>.</li>
                <li>AP Isolation is enabled on the router or phone hotspot (toggle off in hotspot settings).</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
