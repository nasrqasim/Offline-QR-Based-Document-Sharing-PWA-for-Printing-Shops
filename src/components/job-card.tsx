'use client';

import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  Download,
  Printer,
  Eye,
  Trash2,
  Copy,
  Check,
  Clock,
  User,
  Phone,
  MessageSquare,
  Archive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { JobFile, JobStatus, PrintJob } from '@/lib/types';

interface JobCardProps {
  job: PrintJob;
  onPreviewFile: (jobId: string, file: JobFile) => void;
  onPrintFile: (jobId: string, file: JobFile) => void;
  onPrintJob: (job: PrintJob) => void;
  onStatusChange: (jobId: string, newStatus: JobStatus) => void;
  onDeleteJob: (jobId: string) => void;
  onDeleteFile: (jobId: string, fileId: string) => void;
}

export function JobCard({
  job,
  onPreviewFile,
  onPrintFile,
  onPrintJob,
  onStatusChange,
  onDeleteJob,
  onDeleteFile,
}: JobCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(job.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (ext: string) => {
    const e = ext.toLowerCase();
    if (e === 'pdf') return <FileText className="h-4 w-4 text-red-500" />;
    if (['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(e)) return <ImageIcon className="h-4 w-4 text-emerald-500" />;
    if (['xls', 'xlsx', 'csv'].includes(e)) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    if (['ppt', 'pptx'].includes(e)) return <Presentation className="h-4 w-4 text-amber-500" />;
    return <FileText className="h-4 w-4 text-blue-500" />;
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'reviewing':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'printed':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'completed':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const formattedTime = new Date(job.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`rounded-2xl border transition-all duration-200 bg-white ${
      job.status === 'pending'
        ? 'border-amber-300 shadow-sm ring-1 ring-amber-400/20'
        : job.status === 'printed'
        ? 'border-emerald-200 shadow-sm'
        : 'border-slate-200 shadow-sm'
    }`}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex items-center space-x-3">
          {/* Token Code */}
          <button
            onClick={handleCopyId}
            title="Click to copy token number"
            className="group flex items-center space-x-1.5 rounded-xl bg-navy-900 px-3 py-1.5 font-mono text-sm font-black text-white hover:bg-navy-800 shadow-sm transition-colors"
          >
            <span>{job.id}</span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-white" />
            )}
          </button>

          {/* Customer Name */}
          <div className="flex items-center space-x-1.5 text-sm font-bold text-navy-950">
            <User className="h-4 w-4 text-slate-400" />
            <span>{job.customer_name}</span>
          </div>

          {job.customer_phone && (
            <div className="flex items-center space-x-1 text-xs text-slate-500 font-medium">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>{job.customer_phone}</span>
            </div>
          )}
        </div>

        {/* Right side: Time, Status & Main Job Actions */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-xs text-slate-500 mr-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{formattedTime}</span>
          </div>

          {/* Status selector */}
          <select
            value={job.status}
            onChange={(e) => onStatusChange(job.id, e.target.value as JobStatus)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider focus:outline-none ${getStatusBadge(job.status)}`}
          >
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="printed">Printed</option>
            <option value="completed">Completed</option>
          </select>

          {/* Print All Printable Files Button */}
          <button
            onClick={() => onPrintJob(job)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 shadow-sm transition-colors"
            title="Print printable files in this job"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print All</span>
          </button>

          {/* Download Zip */}
          <a
            href={`/api/jobs/${job.id}/zip`}
            className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-navy-950"
            title="Download all files as ZIP"
          >
            <Archive className="h-4 w-4" />
          </a>

          {/* Delete Job */}
          {confirmDelete ? (
            <div className="flex items-center space-x-1 bg-red-50 border border-red-200 rounded-lg p-0.5">
              <button
                onClick={() => onDeleteJob(job.id)}
                className="rounded px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
              >
                Delete?
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded px-1.5 py-1 text-[11px] text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Delete this job"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Toggle Expand */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Customer Note if present */}
      {job.notes && (
        <div className="bg-amber-50/70 border-b border-amber-100 px-4 py-2 flex items-start space-x-2 text-xs text-amber-900">
          <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-amber-600 flex-shrink-0" />
          <span className="font-medium">Customer Note: {job.notes}</span>
        </div>
      )}

      {/* File List */}
      {expanded && (
        <div className="divide-y divide-slate-100 p-2">
          {job.files && job.files.length > 0 ? (
            job.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-xl p-2.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <span className="rounded-lg bg-slate-100 p-2">
                    {getFileIcon(file.file_extension)}
                  </span>
                  <div className="truncate">
                    <p className="truncate font-semibold text-xs text-navy-950" title={file.original_name}>
                      {file.original_name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {file.file_extension.toUpperCase()} • {formatFileSize(file.file_size)}
                    </p>
                  </div>
                </div>

                {/* Per-file action buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onPreviewFile(job.id, file)}
                    className="flex items-center space-x-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 hover:text-navy-950 transition-colors"
                    title="Preview Document"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => onPrintFile(job.id, file)}
                    className="flex items-center space-x-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                    title="Print this file"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>

                  <a
                    href={`/api/jobs/${job.id}/files/${file.id}?download=true`}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title="Download file to PC"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>

                  <button
                    onClick={() => onDeleteFile(job.id, file.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    title="Remove file"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="p-4 text-center text-xs text-slate-400">No files in this job.</p>
          )}
        </div>
      )}

      {/* Footer Summary */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[11px] text-slate-500">
        <span>{job.total_files} {job.total_files === 1 ? 'file' : 'files'} ({formatFileSize(job.total_bytes)})</span>
        <span>IP: {job.client_ip}</span>
      </div>
    </div>
  );
}
