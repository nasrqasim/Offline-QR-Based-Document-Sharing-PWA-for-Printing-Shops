'use client';

import React, { useState } from 'react';
import { X, Download, Printer, FileText, Image as ImageIcon, FileSpreadsheet, Presentation, AlertCircle } from 'lucide-react';
import { JobFile } from '@/lib/types';

interface FilePreviewModalProps {
  jobId: string;
  file: JobFile;
  onClose: () => void;
  onPrint: (file: JobFile) => void;
}

export function FilePreviewModal({
  jobId,
  file,
  onClose,
  onPrint,
}: FilePreviewModalProps) {
  const [loadError, setLoadError] = useState(false);
  const fileUrl = `/api/jobs/${jobId}/files/${file.id}`;
  const downloadUrl = `/api/jobs/${jobId}/files/${file.id}?download=true`;

  const isPdf = file.file_extension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'].includes(file.file_extension);
  const isText = ['txt', 'csv', 'log'].includes(file.file_extension);
  const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(file.file_extension);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center space-x-3 overflow-hidden">
            <span className="rounded-lg bg-blue-600/30 p-2 text-blue-400">
              {isPdf && <FileText className="h-5 w-5" />}
              {isImage && <ImageIcon className="h-5 w-5" />}
              {isOffice && (file.file_extension.includes('xl') ? <FileSpreadsheet className="h-5 w-5" /> : <Presentation className="h-5 w-5" />)}
              {!isPdf && !isImage && !isOffice && <FileText className="h-5 w-5" />}
            </span>
            <div className="truncate">
              <h3 className="truncate font-semibold text-base" title={file.original_name}>
                {file.original_name}
              </h3>
              <p className="text-xs text-slate-400">
                {file.file_extension.toUpperCase()} • {formatFileSize(file.file_size)} • Job {jobId}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPrint(file)}
              className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm"
              title="Print Document"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>

            <a
              href={downloadUrl}
              className="flex items-center space-x-1.5 rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              title="Download File to PC"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </a>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="relative flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center">
          {/* PDF Viewer */}
          {isPdf && !loadError && (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              className="h-full w-full rounded-lg border border-slate-300 bg-white shadow-inner"
              title={file.original_name}
              onError={() => setLoadError(true)}
            />
          )}

          {/* Image Viewer */}
          {isImage && !loadError && (
            <div className="flex max-h-full max-w-full items-center justify-center p-2">
              <img
                src={fileUrl}
                alt={file.original_name}
                className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-md"
                onError={() => setLoadError(true)}
              />
            </div>
          )}

          {/* Plain Text Viewer */}
          {isText && (
            <iframe
              src={fileUrl}
              className="h-full w-full rounded-lg border border-slate-300 bg-white p-4 font-mono text-xs text-slate-800 shadow-inner"
              title={file.original_name}
            />
          )}

          {/* Office Document Notice */}
          {isOffice && (
            <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg border border-slate-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                {file.file_extension.includes('xl') ? (
                  <FileSpreadsheet className="h-8 w-8" />
                ) : (
                  <FileText className="h-8 w-8" />
                )}
              </div>
              <h4 className="mt-4 text-lg font-bold text-navy-950">
                Microsoft Office Document
              </h4>
              <p className="mt-2 text-sm text-slate-600">
                This <strong>.{file.file_extension.toUpperCase()}</strong> document is safely saved on your Windows PC. For 100% accurate layout and formatting, open directly in Microsoft Word, Excel, or PowerPoint.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <a
                  href={downloadUrl}
                  className="flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Download & Open in Office</span>
                </a>
                <button
                  onClick={() => onPrint(file)}
                  className="flex items-center justify-center space-x-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                >
                  <Printer className="h-4 w-4" />
                  <span>Send to Windows Printer</span>
                </button>
              </div>
            </div>
          )}

          {/* Load Error Fallback */}
          {loadError && (
            <div className="text-center p-6 bg-white rounded-xl shadow border border-red-200 max-w-sm">
              <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
              <p className="mt-2 text-sm font-semibold text-slate-800">Preview not available directly</p>
              <p className="mt-1 text-xs text-slate-500">You can download the original file and view it in Windows.</p>
              <a
                href={downloadUrl}
                className="mt-4 inline-flex items-center space-x-1.5 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800"
              >
                <Download className="h-4 w-4" />
                <span>Download File</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
