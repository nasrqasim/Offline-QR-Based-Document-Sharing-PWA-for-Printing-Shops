'use client';

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Copy, Check, ExternalLink, X, Wifi } from 'lucide-react';
import { NetworkInterfaceInfo } from '@/lib/types';

interface CounterQrPosterProps {
  uploadUrl: string;
  selectedInterface: NetworkInterfaceInfo | null;
  shopName: string;
  shopContact: string;
  onClose: () => void;
}

export function CounterQrPoster({
  uploadUrl,
  selectedInterface,
  shopName,
  shopContact,
  onClose,
}: CounterQrPosterProps) {
  const [copied, setCopied] = React.useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(uploadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none">
        {/* Header - Hidden in print */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-4 text-white print:hidden">
          <div className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-blue-400" />
            <h2 className="font-semibold text-lg">Shop Counter QR Code & Poster</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print Poster</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-navy-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Poster Content */}
        <div ref={posterRef} className="p-8 text-center print:p-6 print:m-0">
          <div className="border-4 border-navy-900 rounded-3xl p-6 bg-slate-50 print:bg-white">
            {/* Shop Header */}
            <div className="mb-4">
              <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                Instant Offline Printing
              </span>
              <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
                {shopName}
              </h1>
              <p className="text-sm font-semibold text-slate-600 mt-1">
                Scan & Send Documents From Your Mobile (No Internet Needed)
              </p>
              <p className="text-xs text-blue-700 font-medium mt-0.5" dir="rtl">
                بغیر انٹرنیٹ کے اپنے موبائل سے کاغذات براہ راست پرنٹر کو بھیجیں
              </p>
            </div>

            {/* Network Instruction Banner */}
            <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-3 text-left">
              <div className="flex items-center space-x-2 text-blue-900 font-medium text-sm">
                <Wifi className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>
                  Connect your phone to: <strong className="text-blue-950 underline">{selectedInterface?.displayName || 'Shop Wi-Fi'}</strong>
                </span>
              </div>
              <p className="text-xs text-blue-800 mt-1" dir="rtl">
                پہلے اپنے موبائل کو دوکان کے وائی فائی یا ہاٹ اسپاٹ سے کنیکٹ کریں
              </p>
            </div>

            {/* QR Code Container */}
            <div className="my-4 flex flex-col items-center justify-center">
              <div className="rounded-2xl border-4 border-navy-900 bg-white p-4 shadow-md inline-block">
                <QRCodeSVG
                  value={uploadUrl}
                  size={240}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="mt-3 font-mono text-sm font-bold text-navy-900 bg-slate-200 px-3 py-1 rounded-md">
                {uploadUrl}
              </p>
            </div>

            {/* 4 Step Instructions */}
            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                  1
                </span>
                <p className="mt-1 text-xs font-semibold text-slate-800">Connect to Shop Wi-Fi</p>
                <p className="text-[11px] text-slate-500" dir="rtl">ہاٹ اسپاٹ سے جڑیں</p>
              </div>

              <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                  2
                </span>
                <p className="mt-1 text-xs font-semibold text-slate-800">Scan QR Code</p>
                <p className="text-[11px] text-slate-500" dir="rtl">کیو آر کوڈ اسکین کریں</p>
              </div>

              <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                  3
                </span>
                <p className="mt-1 text-xs font-semibold text-slate-800">Select & Send Files</p>
                <p className="text-[11px] text-slate-500" dir="rtl">کاغذات منتخب کر کے بھیجیں</p>
              </div>

              <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                  4
                </span>
                <p className="mt-1 text-xs font-semibold text-slate-800">Tell Token to Operator</p>
                <p className="text-[11px] text-slate-500" dir="rtl">ٹوکن نمبر دکاندار کو دیں</p>
              </div>
            </div>

            {/* Developer Attribution Footer */}
            <div className="mt-6 border-t border-slate-200 pt-3 text-center">
              <p className="text-xs font-semibold text-slate-500">
                Software by <strong className="text-navy-900">Roonjha Developers</strong> : {shopContact}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions - Hidden in print */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 print:hidden">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 hover:text-navy-900"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'URL Copied!' : 'Copy Customer URL'}</span>
          </button>

          <a
            href={uploadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-xs font-medium text-blue-600 hover:underline"
          >
            <span>Open Customer Page</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
