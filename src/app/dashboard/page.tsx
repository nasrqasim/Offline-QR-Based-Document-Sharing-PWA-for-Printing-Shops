'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Printer,
  QrCode,
  Wifi,
  HardDrive,
  RefreshCw,
  Search,
  Filter,
  Sliders,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
  Volume2,
  VolumeX,
  ExternalLink,
  Trash,
} from 'lucide-react';
import { JobFile, JobStatus, NetworkStatus, PrintJob, ShopSettings } from '@/lib/types';
import { JobCard } from '@/components/job-card';
import { FilePreviewModal } from '@/components/file-preview-modal';
import { PrintDialogModal } from '@/components/print-dialog-modal';
import { CounterQrPoster } from '@/components/counter-qr-poster';
import { NetworkDiagnostics } from '@/components/network-diagnostics';
import { SettingsModal } from '@/components/settings-modal';

export default function DashboardPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    pendingJobs: 0,
    printedJobs: 0,
    todayJobs: 0,
    totalFiles: 0,
    totalBytes: 0,
  });
  const [disk, setDisk] = useState({
    freeMb: 0,
    totalMb: 0,
    isLowSpace: false,
  });

  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals state
  const [showQrPoster, setShowQrPoster] = useState(false);
  const [showNetworkDiagnostics, setShowNetworkDiagnostics] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Preview & Print modals
  const [previewData, setPreviewData] = useState<{ jobId: string; file: JobFile } | null>(null);
  const [printDialogData, setPrintDialogData] = useState<{ jobId: string; files: JobFile[]; selectedFile?: JobFile | null } | null>(null);

  // Audio synthesizer chime for incoming uploads (Web Audio API - 100% offline)
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Play a friendly two-tone shop chime: 587Hz (D5) -> 880Hz (A5)
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio autoplay policy might require user gesture
    }
  }, [soundEnabled]);

  // Fetch jobs list
  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        if (data.stats) setStats(data.stats);
        if (data.disk) setDisk(data.disk);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  }, [statusFilter, searchQuery]);

  // Fetch settings & network info
  const fetchInitialData = useCallback(async () => {
    try {
      const [settingsRes, netRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/network/interfaces'),
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings(s);
      }

      if (netRes.ok) {
        const n = await netRes.json();
        setNetworkStatus(n);
      }
    } catch (err) {
      console.error('Failed to load initial settings/network:', err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Connect to SSE for instant live incoming jobs
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('job_created', (e) => {
        playNotificationSound();
        fetchJobs();
      });

      eventSource.addEventListener('job_updated', () => {
        fetchJobs();
      });

      eventSource.addEventListener('job_deleted', () => {
        fetchJobs();
      });

      eventSource.onerror = () => {
        // SSE disconnected, activate 5-second polling fallback
        if (!fallbackInterval) {
          fallbackInterval = setInterval(fetchJobs, 5000);
        }
      };
    } catch {
      fallbackInterval = setInterval(fetchJobs, 5000);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [fetchJobs, playNotificationSound]);

  // Job status change handler
  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: newStatus } : j)));
      }
    } catch (err) {
      console.error('Failed to update job status:', err);
    }
  };

  // Job deletion
  const handleDeleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
        fetchJobs();
      }
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  };

  // Single file deletion
  const handleDeleteFile = async (jobId: string, fileId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchJobs();
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  // Save settings handler
  const handleSaveSettings = async (updated: Partial<ShopSettings>, currentPin: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updated, currentPin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        fetchInitialData();
        return { success: true };
      }
      return { error: data.error || 'Failed to save settings' };
    } catch (err: any) {
      return { error: err.message || 'Error saving settings' };
    }
  };

  // Interface selection
  const handleSelectInterface = async (name: string) => {
    if (!settings) return;
    await handleSaveSettings({ preferredNetworkInterface: name }, settings.ownerPin);
  };

  const uploadUrl = networkStatus?.selectedInterface?.uploadUrl || `http://127.0.0.1:3000/upload`;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-navy-950 text-white shadow-md border-b border-navy-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Shop Title */}
          <div className="flex items-center space-x-3">
            <div className="rounded-xl bg-blue-600 p-2 shadow-md">
              <Printer className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-black text-lg text-white tracking-tight">
                  {settings?.shopName || 'Roonjha Print Share'}
                </h1>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Receiver Online</span>
                </span>
              </div>
              <p className="text-[11px] text-blue-300">
                Listening: <span className="font-mono text-white">{networkStatus?.selectedInterface?.address || '127.0.0.1'}:3000</span>
              </p>
            </div>
          </div>

          {/* Action Hub */}
          <div className="flex items-center space-x-2">
            {/* Show Counter QR Poster Button */}
            <button
              onClick={() => setShowQrPoster(true)}
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-sm transition-colors"
            >
              <QrCode className="h-4 w-4" />
              <span>Counter QR Poster</span>
            </button>

            {/* Network Diagnostics */}
            <button
              onClick={() => setShowNetworkDiagnostics(true)}
              className="flex items-center space-x-1.5 rounded-xl bg-navy-850 border border-navy-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-navy-800 hover:text-white transition-colors"
              title="Inspect Network Adapters & Topologies"
            >
              <Wifi className="h-4 w-4 text-blue-400" />
              <span className="hidden md:inline">Network Hub</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`rounded-xl p-2 transition-colors ${
                soundEnabled ? 'bg-navy-850 text-blue-400 hover:bg-navy-800' : 'bg-navy-850 text-slate-500 hover:bg-navy-800'
              }`}
              title={soundEnabled ? 'Chime Enabled' : 'Chime Muted'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="rounded-xl bg-navy-850 border border-navy-800 p-2 text-slate-300 hover:bg-navy-800 hover:text-white transition-colors"
              title="Shop Settings"
            >
              <Sliders className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Print</span>
            <p className="mt-1 text-2xl font-black text-amber-600">{stats.pendingJobs}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting counter review</p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Jobs</span>
            <p className="mt-1 text-2xl font-black text-navy-950">{stats.todayJobs}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{stats.totalFiles} documents received</p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Data Received</span>
            <p className="mt-1 text-2xl font-black text-blue-600">{formatFileSize(stats.totalBytes)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{stats.totalJobs} total jobs lifetime</p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">PC Storage</span>
            <p className="mt-1 text-2xl font-black text-emerald-600">
              {disk.freeMb > 1024 ? `${(disk.freeMb / 1024).toFixed(1)} GB` : `${disk.freeMb} MB`} free
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Drive safe & available</p>
          </div>
        </div>

        {/* Search, Filter & Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Job Token (e.g. RPS-4821) or Customer Name..."
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto">
            {(['all', 'pending', 'reviewing', 'printed', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-navy-950 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}

            <button
              onClick={fetchJobs}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 ml-1"
              title="Refresh jobs"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onPreviewFile={(jobId, file) => setPreviewData({ jobId, file })}
                onPrintFile={(jobId, file) => setPrintDialogData({ jobId, files: [file], selectedFile: file })}
                onPrintJob={(j) => setPrintDialogData({ jobId: j.id, files: j.files || [] })}
                onStatusChange={handleStatusChange}
                onDeleteJob={handleDeleteJob}
                onDeleteFile={handleDeleteFile}
              />
            ))
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-base text-navy-950">No incoming documents yet</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Customers can connect their phones to your shop Wi-Fi / Hotspot and scan the counter QR code to send documents here instantly.
              </p>
              <button
                onClick={() => setShowQrPoster(true)}
                className="mt-5 inline-flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-sm transition-colors"
              >
                <QrCode className="h-4 w-4" />
                <span>Show Counter QR Code</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer Attribution */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>
            Roonjha Print Share • <strong className="text-navy-950">software by Roonjha Developers : {settings?.shopContact || '0315291486'}</strong>
          </p>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>Local SQLite Database</span>
            <span>•</span>
            <span>Zero Cloud Dependency</span>
            <span>•</span>
            <span>Fast Offline PWA</span>
          </div>
        </div>
      </footer>

      {/* Counter QR Poster Modal */}
      {showQrPoster && (
        <CounterQrPoster
          uploadUrl={uploadUrl}
          selectedInterface={networkStatus?.selectedInterface || null}
          shopName={settings?.shopName || 'Roonjha Print & Photostat Center'}
          shopContact={settings?.shopContact || '0315291486'}
          onClose={() => setShowQrPoster(false)}
        />
      )}

      {/* Network Diagnostics Modal */}
      {showNetworkDiagnostics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <NetworkDiagnostics
              status={networkStatus}
              onSelectInterface={handleSelectInterface}
              onRefresh={fetchInitialData}
              onClose={() => setShowNetworkDiagnostics(false)}
            />
            <div className="bg-slate-50 border-t border-slate-200 p-4 text-right">
              <button
                onClick={() => setShowNetworkDiagnostics(false)}
                className="rounded-xl bg-navy-900 px-4 py-2 text-xs font-bold text-white hover:bg-navy-800"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && settings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* File Preview Modal */}
      {previewData && (
        <FilePreviewModal
          jobId={previewData.jobId}
          file={previewData.file}
          onClose={() => setPreviewData(null)}
          onPrint={(file) => {
            setPreviewData(null);
            setPrintDialogData({ jobId: previewData.jobId, files: [file], selectedFile: file });
          }}
        />
      )}

      {/* Print Setup Modal */}
      {printDialogData && (
        <PrintDialogModal
          jobId={printDialogData.jobId}
          files={printDialogData.files}
          selectedFile={printDialogData.selectedFile}
          onClose={() => setPrintDialogData(null)}
          onPrintSuccess={() => {
            handleStatusChange(printDialogData.jobId, 'printed');
          }}
        />
      )}
    </div>
  );
}
