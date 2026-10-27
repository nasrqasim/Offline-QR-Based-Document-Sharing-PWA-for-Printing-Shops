'use client';

import React, { useState } from 'react';
import { X, Printer, Settings, Check } from 'lucide-react';
import { JobFile } from '@/lib/types';

interface PrintDialogModalProps {
  jobId: string;
  files: JobFile[];
  selectedFile?: JobFile | null;
  onClose: () => void;
  onPrintSuccess?: () => void;
}

export function PrintDialogModal({
  jobId,
  files,
  selectedFile,
  onClose,
  onPrintSuccess,
}: PrintDialogModalProps) {
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter' | 'Legal'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [copies, setCopies] = useState(1);
  const [pageRange, setPageRange] = useState('all');
  const [customRange, setCustomRange] = useState('');
  const [scaling, setScaling] = useState<'fit' | 'actual'>('fit');
  const [isPrinting, setIsPrinting] = useState(false);

  // If selectedFile is provided, print only that one. Otherwise print all printable files.
  const targetFiles = selectedFile ? [selectedFile] : files.filter(f => ['pdf', 'jpg', 'jpeg', 'png', 'txt'].includes(f.file_extension));

  const handleExecutePrint = () => {
    setIsPrinting(true);

    if (targetFiles.length === 1 && targetFiles[0].file_extension === 'pdf') {
      // Print single PDF using hidden iframe
      const printUrl = `/api/jobs/${jobId}/files/${targetFiles[0].id}`;
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = printUrl;

      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          if (onPrintSuccess) onPrintSuccess();
        } catch {
          window.open(printUrl, '_blank')?.print();
        } finally {
          setIsPrinting(false);
          onClose();
        }
      };
    } else {
      // For images or multi-file printing: open styled print window
      const printWin = window.open('', '_blank', 'width=900,height=700');
      if (!printWin) {
        alert('Please allow popups to open the print dialog.');
        setIsPrinting(false);
        return;
      }

      const styles = `
        <style>
          @page {
            size: ${paperSize} ${orientation};
            margin: ${scaling === 'fit' ? '10mm' : '0'};
          }
          body {
            font-family: system-ui, sans-serif;
            margin: 0;
            padding: 0;
            ${colorMode === 'bw' ? 'filter: grayscale(100%);' : ''}
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .printable-image {
            width: 100%;
            height: 100%;
            max-height: 98vh;
            object-fit: ${scaling === 'fit' ? 'contain' : 'none'};
            display: block;
            margin: auto;
          }
          .printable-text {
            font-family: monospace;
            font-size: 11pt;
            white-space: pre-wrap;
            padding: 20px;
          }
        </style>
      `;

      let bodyContent = '';
      for (let i = 0; i < targetFiles.length; i++) {
        const file = targetFiles[i];
        const fileUrl = `/api/jobs/${jobId}/files/${file.id}`;
        const isLast = i === targetFiles.length - 1;

        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(file.file_extension)) {
          bodyContent += `
            <div class="${!isLast ? 'page-break' : ''}" style="height: 100vh; display: flex; align-items: center; justify-content: center;">
              <img src="${fileUrl}" class="printable-image" />
            </div>
          `;
        } else if (file.file_extension === 'pdf') {
          bodyContent += `
            <div class="${!isLast ? 'page-break' : ''}">
              <iframe src="${fileUrl}" style="width: 100%; height: 100vh; border: none;"></iframe>
            </div>
          `;
        }
      }

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print - Job ${jobId}</title>
            ${styles}
          </head>
          <body>
            ${bodyContent}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
      setIsPrinting(false);
      if (onPrintSuccess) onPrintSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-4 text-white">
          <div className="flex items-center space-x-2.5">
            <Printer className="h-5 w-5 text-blue-400" />
            <div>
              <h3 className="font-semibold text-base">Print Setup & Options</h3>
              <p className="text-xs text-slate-300">
                Job {jobId} • {targetFiles.length} {targetFiles.length === 1 ? 'file' : 'files'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-navy-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target File Info */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Printing Document(s)</p>
            <p className="text-sm font-bold text-navy-950 mt-0.5 truncate">
              {selectedFile ? selectedFile.original_name : `All ${targetFiles.length} Printable Documents`}
            </p>
          </div>

          {/* Paper Size & Orientation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Paper Size</label>
              <select
                value={paperSize}
                onChange={e => setPaperSize(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="A4">A4 (Standard 210 × 297 mm)</option>
                <option value="Letter">Letter (8.5 × 11 in)</option>
                <option value="Legal">Legal (8.5 × 14 in)</option>
                <option value="A3">A3 (Large 297 × 420 mm)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Orientation</label>
              <div className="flex rounded-lg border border-slate-300 p-1 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`flex-1 rounded py-1.5 text-xs font-semibold transition-colors ${
                    orientation === 'portrait' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`flex-1 rounded py-1.5 text-xs font-semibold transition-colors ${
                    orientation === 'landscape' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  Landscape
                </button>
              </div>
            </div>
          </div>

          {/* Color Mode & Copies */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Color Mode</label>
              <div className="flex rounded-lg border border-slate-300 p-1 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setColorMode('bw')}
                  className={`flex-1 rounded py-1.5 text-xs font-semibold transition-colors ${
                    colorMode === 'bw' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  B & W
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('color')}
                  className={`flex-1 rounded py-1.5 text-xs font-semibold transition-colors ${
                    colorMode === 'color' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  Color
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Copies</label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-200"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={copies}
                  onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center rounded-lg border border-slate-300 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setCopies(copies + 1)}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-200"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Scale / Fit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Page Scaling</label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center space-x-2 rounded-lg border p-2.5 cursor-pointer text-xs font-medium ${scaling === 'fit' ? 'border-blue-600 bg-blue-50/50 text-blue-950 font-bold' : 'border-slate-200 text-slate-700'}`}>
                <input
                  type="radio"
                  name="scaling"
                  checked={scaling === 'fit'}
                  onChange={() => setScaling('fit')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Fit to Page (Recommended)</span>
              </label>

              <label className={`flex items-center space-x-2 rounded-lg border p-2.5 cursor-pointer text-xs font-medium ${scaling === 'actual' ? 'border-blue-600 bg-blue-50/50 text-blue-950 font-bold' : 'border-slate-200 text-slate-700'}`}>
                <input
                  type="radio"
                  name="scaling"
                  checked={scaling === 'actual'}
                  onChange={() => setScaling('actual')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Actual Size (100%)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecutePrint}
            disabled={isPrinting || targetFiles.length === 0}
            className="flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-md disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            <span>{isPrinting ? 'Preparing Print...' : 'Open Print Dialog'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
