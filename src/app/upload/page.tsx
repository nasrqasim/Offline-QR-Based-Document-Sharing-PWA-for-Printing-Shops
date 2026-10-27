'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Wifi,
  Smartphone,
  ShieldCheck,
  Send,
  Plus,
} from 'lucide-react';
import { PrintJob } from '@/lib/types';

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  extension: string;
}

export default function CustomerUploadPage() {
  const [shopName, setShopName] = useState('Roonjha Print & Photostat Center');
  const [shopContact, setShopContact] = useState('0315291486');
  const [welcomeMessage, setWelcomeMessage] = useState('Send your documents quickly to the counter printer without internet.');
  const [hotspotInstructions, setHotspotInstructions] = useState('Connect your phone to the shop Wi-Fi / Hotspot, then select your files.');
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(100);
  const [maxFilesPerJob, setMaxFilesPerJob] = useState(20);
  const [allowedExtensions, setAllowedExtensions] = useState<string[]>([
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'heic', 'txt'
  ]);

  // Connectivity state
  const [isOnlineWithPc, setIsOnlineWithPc] = useState<boolean | null>(null);
  const [checkingPing, setCheckingPing] = useState(true);

  // Upload Form state
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [xhrInstance, setXhrInstance] = useState<XMLHttpRequest | null>(null);

  // Success state
  const [completedJob, setCompletedJob] = useState<PrintJob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check connectivity to the PC server on load
  const verifyPcReachability = async () => {
    setCheckingPing(true);
    try {
      const res = await fetch('/api/network/ping', { cache: 'no-store' });
      if (res.ok) {
        setIsOnlineWithPc(true);
      } else {
        setIsOnlineWithPc(false);
      }
    } catch {
      setIsOnlineWithPc(false);
    } finally {
      setCheckingPing(false);
    }
  };

  useEffect(() => {
    verifyPcReachability();

    // Fetch shop settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.shopName) setShopName(data.shopName);
        if (data.shopContact) setShopContact(data.shopContact);
        if (data.welcomeMessage) setWelcomeMessage(data.welcomeMessage);
        if (data.hotspotInstructions) setHotspotInstructions(data.hotspotInstructions);
        if (data.maxFileSizeMb) setMaxFileSizeMb(data.maxFileSizeMb);
        if (data.maxFilesPerJob) setMaxFilesPerJob(data.maxFilesPerJob);
        if (data.allowedExtensions) setAllowedExtensions(data.allowedExtensions);
      })
      .catch(() => {});
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (ext: string) => {
    const e = ext.toLowerCase();
    if (e === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
    if (['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(e)) return <ImageIcon className="h-5 w-5 text-emerald-500" />;
    if (['xls', 'xlsx', 'csv'].includes(e)) return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    if (['ppt', 'pptx'].includes(e)) return <Presentation className="h-5 w-5 text-amber-500" />;
    return <FileText className="h-5 w-5 text-blue-500" />;
  };

  const handleFilesChosen = (fileList: FileList | null) => {
    if (!fileList) return;
    setUploadError(null);

    const newFiles: QueuedFile[] = [];
    let rejectedCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      // Check extension
      if (!allowedExtensions.includes(ext)) {
        rejectedCount++;
        continue;
      }

      // Check max file size
      if (file.size > maxFileSizeMb * 1024 * 1024) {
        rejectedCount++;
        continue;
      }

      newFiles.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        file,
        name: file.name,
        size: file.size,
        extension: ext,
      });
    }

    if (rejectedCount > 0) {
      setUploadError(`${rejectedCount} file(s) skipped (unsupported format or size exceeds ${maxFileSizeMb} MB).`);
    }

    setSelectedFiles(prev => {
      const combined = [...prev, ...newFiles];
      if (combined.length > maxFilesPerJob) {
        setUploadError(`Maximum ${maxFilesPerJob} files allowed per upload.`);
        return combined.slice(0, maxFilesPerJob);
      }
      return combined;
    });
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleCancelUpload = () => {
    if (xhrInstance) {
      xhrInstance.abort();
      setIsUploading(false);
      setUploadProgress(0);
      setUploadError('Upload was cancelled.');
    }
  };

  const handleSubmitUpload = () => {
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one document to send.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append('customerName', customerName.trim() || 'Counter Customer');
    if (notes.trim()) formData.append('notes', notes.trim());

    for (const item of selectedFiles) {
      formData.append('files', item.file);
    }

    const xhr = new XMLHttpRequest();
    setXhrInstance(xhr);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.success) {
          setCompletedJob(res.job);
          setSelectedFiles([]);
        } else {
          setUploadError(res.error || 'Server error while receiving files. Please retry.');
        }
      } catch {
        setUploadError('Unexpected server response. Please ask the shopkeeper.');
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadError('Network connection interrupted. Please ensure your phone is still connected to the shop Wi-Fi / Hotspot.');
    };

    xhr.open('POST', '/api/jobs');
    xhr.send(formData);
  };

  const resetForNewUpload = () => {
    setCompletedJob(null);
    setSelectedFiles([]);
    setUploadProgress(0);
    setUploadError(null);
    setCustomerName('');
    setNotes('');
  };

  const totalBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-xl bg-blue-600 p-2 shadow-md">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-base sm:text-lg text-white leading-tight">
                {shopName}
              </h1>
              <p className="text-[11px] text-blue-300">
                Local Mobile Document Uploader (Zero Internet)
              </p>
            </div>
          </div>

          {/* Reachability Badge */}
          <div className="flex items-center">
            {checkingPing ? (
              <span className="flex items-center space-x-1 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Checking...</span>
              </span>
            ) : isOnlineWithPc ? (
              <span className="flex items-center space-x-1 rounded-full bg-emerald-950 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected to Shop PC</span>
              </span>
            ) : (
              <button
                onClick={verifyPcReachability}
                className="flex items-center space-x-1 rounded-full bg-red-950 border border-red-500/40 px-2.5 py-1 text-[11px] font-bold text-red-400"
              >
                <AlertTriangle className="h-3 w-3" />
                <span>Offline • Tap to Retry</span>
              </button>
            )}
          </div>
        </div>

        {/* Hotspot / Connection Warning Banner if offline */}
        {isOnlineWithPc === false && (
          <div className="mt-3 rounded-2xl bg-red-500/10 border border-red-500/30 p-3.5 text-xs text-red-200">
            <p className="font-bold flex items-center space-x-1.5 text-red-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Shop PC is Unreachable</span>
            </p>
            <p className="mt-1 text-slate-300 text-[11px]">
              Please check your phone's Wi-Fi settings:
            </p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px] text-slate-300">
              <li>Turn OFF Mobile Data / 4G (so your phone uses the local Wi-Fi route).</li>
              <li>Ensure your Wi-Fi is connected to the shop network or shopkeeper's hotspot.</li>
            </ul>
            <button
              onClick={verifyPcReachability}
              className="mt-2.5 inline-flex items-center space-x-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-center">
        {/* SUCCESS CONFIRMATION VIEW */}
        {completedJob ? (
          <div className="rounded-3xl bg-slate-800/90 border border-slate-700 p-6 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-4 ring-8 ring-emerald-500/10">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Documents Received Successfully
            </span>

            <h2 className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Your Job Reference Number
            </h2>

            {/* Giant Job Reference Token */}
            <div className="my-3 inline-block rounded-2xl bg-navy-950 border-2 border-blue-500/40 px-6 py-3 font-mono text-3xl font-black text-white shadow-inner tracking-wider">
              {completedJob.id}
            </div>

            <p className="text-sm font-semibold text-white px-2">
              Please inform the shop operator of your token number: <strong className="text-blue-400">{completedJob.id}</strong>
            </p>

            <p className="mt-1 text-xs text-blue-300 font-medium" dir="rtl">
              یہ ٹوکن نمبر دکاندار کو بتائیں تاکہ وہ آپ کے کاغذات پرنٹ کر سکیں
            </p>

            {/* Uploaded Files summary */}
            <div className="mt-5 rounded-2xl bg-slate-850 p-4 text-left border border-slate-700/60 max-h-48 overflow-y-auto divide-y divide-slate-750">
              <p className="text-xs font-bold text-slate-400 mb-2">
                Received Documents ({completedJob.total_files})
              </p>
              {completedJob.files?.map(f => (
                <div key={f.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    {getFileIcon(f.file_extension)}
                    <span className="truncate text-slate-200 font-medium">{f.original_name}</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-mono whitespace-nowrap">
                    {formatFileSize(f.file_size)}
                  </span>
                </div>
              ))}
            </div>

            {/* Reset Button */}
            <button
              onClick={resetForNewUpload}
              className="mt-6 w-full flex items-center justify-center space-x-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Send More Documents</span>
            </button>
          </div>
        ) : (
          /* UPLOAD FORM VIEW */
          <div className="space-y-4">
            {/* Urdu / English instructions banner */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/20 p-3.5 text-xs text-blue-200">
              <p className="font-semibold">{welcomeMessage}</p>
              <p className="text-[11px] text-blue-300 mt-0.5" dir="rtl">
                اپنے موبائل سے پی ڈی ایف یا تصویر منتخب کر کے دکاندار کو بھیجیں
              </p>
            </div>

            {/* Drag & Drop File Picker Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesChosen(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-3xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-blue-400 bg-blue-900/30 scale-[1.01]'
                  : 'border-slate-700 bg-slate-800/60 hover:border-blue-500 hover:bg-slate-800'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.heic,.txt"
                className="hidden"
                onChange={(e) => handleFilesChosen(e.target.files)}
              />

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-3">
                <Upload className="h-7 w-7" />
              </div>

              <h3 className="font-bold text-base text-white">
                Select Documents to Print
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tap to pick PDF, Word, Excel, Photos, or IDs
              </p>

              <div className="mt-3 inline-flex items-center space-x-1.5 rounded-full bg-slate-700/60 px-3 py-1 text-[11px] font-semibold text-blue-300">
                <span>PDF • JPG • PNG • DOCX • XLS</span>
              </div>
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400" />
                <span className="font-medium">{uploadError}</span>
              </div>
            )}

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="rounded-2xl bg-slate-850 border border-slate-750 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">
                    Selected Files ({selectedFiles.length}/{maxFilesPerJob})
                  </span>
                  <span className="text-slate-400 font-mono">
                    Total: {formatFileSize(totalBytes)}
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {selectedFiles.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-slate-800 p-2.5 border border-slate-700/50"
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden pr-2">
                        {getFileIcon(item.extension)}
                        <div className="truncate">
                          <p className="truncate text-xs font-semibold text-slate-200">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatFileSize(item.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(item.id);
                        }}
                        disabled={isUploading}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-red-400 disabled:opacity-40"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Optional Customer Name & Note */}
                <div className="space-y-2 pt-2 border-t border-slate-750">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your Name (Optional)"
                    disabled={isUploading}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Printing instructions (e.g. 2 copies, color, both sides)"
                    disabled={isUploading}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Upload Progress Bar if active */}
                {isUploading && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                      <span>Sending documents to shop PC...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-200 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit / Cancel Buttons */}
                <div className="flex items-center space-x-2 pt-2">
                  {isUploading ? (
                    <button
                      type="button"
                      onClick={handleCancelUpload}
                      className="w-full rounded-xl bg-red-600/80 py-3 text-xs font-bold text-white hover:bg-red-500 transition-colors"
                    >
                      Cancel Upload
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitUpload}
                      disabled={isOnlineWithPc === false}
                      className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      <span>Send to Printer ({selectedFiles.length} files)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-6 border-t border-slate-800 pt-3 text-center text-[11px] text-slate-500">
        <p>
          Roonjha Print Share • software by <strong className="text-slate-300">Roonjha Developers</strong> : {shopContact}
        </p>
      </footer>
    </main>
  );
}
