'use client';

import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  X,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  Phone,
  FileCheck,
  CheckCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { NetworkInterfaceInfo } from '@/lib/types';

interface ShopWallQrPosterProps {
  uploadUrl: string;
  selectedInterface: NetworkInterfaceInfo | null;
  shopName: string;
  shopContact: string;
  onClose: () => void;
}

export function ShopWallQrPoster({
  uploadUrl,
  selectedInterface,
  shopName: initialShopName,
  shopContact: initialShopContact,
  onClose,
}: ShopWallQrPosterProps) {
  // Customization fields for the wall poster
  const [shopTitle, setShopTitle] = useState(initialShopName);
  const [contactNumber, setContactNumber] = useState(initialShopContact);
  const [wifiSsid, setWifiSsid] = useState('Shop Wi-Fi / Hotspot');
  const [wifiPassword, setWifiPassword] = useState('No Password (Open Hotspot)');
  const [customRates, setCustomRates] = useState('Photostat • Color Print • Document Lamination • Urgent Photos');
  const [posterTheme, setPosterTheme] = useState<'navy' | 'dark' | 'minimal'>('navy');
  const [showEditControls, setShowEditControls] = useState(false);
  const [copied, setCopied] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none my-auto">
        {/* Top Control Bar - Hidden during printing */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-navy-950 px-6 py-3.5 text-white print:hidden gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-xl bg-blue-600 p-2">
              <Printer className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Shop Wall QR Poster</h2>
              <p className="text-xs text-blue-300">Ready to print & laminate for shop wall / counter</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowEditControls(!showEditControls)}
              className="flex items-center space-x-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{showEditControls ? 'Hide Customizer' : 'Edit Poster Text'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print Wall Poster</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Live Poster Customizer Drawer - Hidden in print */}
        {showEditControls && (
          <div className="border-b border-slate-200 bg-slate-50 p-4 print:hidden space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Shop Name</label>
                <input
                  type="text"
                  value={shopTitle}
                  onChange={(e) => setShopTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">WhatsApp / Contact Phone</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Shop Wi-Fi Name (SSID)</label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Wi-Fi Password Notice</label>
                <input
                  type="text"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Shop Services / Rates Badge</label>
              <input
                type="text"
                value={customRates}
                onChange={(e) => setCustomRates(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Printable Poster Canvas */}
        <div ref={posterRef} className="p-6 sm:p-8 print:p-4 print:m-0 bg-white">
          <div className="border-[6px] border-navy-950 rounded-[32px] p-6 sm:p-8 bg-slate-50 print:bg-white text-center relative overflow-hidden">
            {/* Top Badge */}
            <div className="inline-flex items-center space-x-1.5 rounded-full bg-blue-600 px-4 py-1 text-xs font-black uppercase tracking-widest text-white shadow-sm mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Instant Offline Mobile Printing</span>
            </div>

            {/* Shop Header */}
            <h1 className="text-3xl sm:text-4xl font-black text-navy-950 tracking-tight leading-tight">
              {shopTitle}
            </h1>

            {/* Urdu Main Title */}
            <h2 className="mt-2 text-xl sm:text-2xl font-black text-blue-700" dir="rtl">
              اپنے موبائل سے کاغذات براہ راست پرنٹر کو بھیجیں
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-bold text-slate-600">
              Scan & Print Documents Instantly • No WhatsApp / Bluetooth Hassle
            </p>

            {/* Wi-Fi Hotspot Connection Box */}
            <div className="mt-5 rounded-2xl bg-blue-50 border-2 border-blue-200 p-3.5 text-left flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <div className="rounded-xl bg-blue-600 p-2 text-white shadow-sm">
                  <Wifi className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                    Step 1: Connect your phone to Shop Wi-Fi
                  </p>
                  <p className="text-sm font-black text-navy-950">
                    Network: <span className="underline decoration-blue-500 underline-offset-2">{wifiSsid}</span>
                  </p>
                  <p className="text-xs font-semibold text-slate-600">
                    Password: <span className="text-blue-900 font-bold">{wifiPassword}</span>
                  </p>
                </div>
              </div>

              <div className="text-right text-xs font-bold text-blue-800" dir="rtl">
                پہلے موبائل کو دکان کے وائی فائی سے جوڑیں
              </div>
            </div>

            {/* GIANT HIGH-CONTRAST QR CODE (Center Stage for Wall Scanning) */}
            <div className="my-6 flex flex-col items-center justify-center">
              <div className="relative rounded-3xl border-[6px] border-navy-950 bg-white p-5 shadow-xl inline-block">
                <QRCodeSVG
                  value={uploadUrl}
                  size={260}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Direct Address display */}
              <div className="mt-4 inline-flex items-center space-x-2 rounded-xl bg-navy-900 px-4 py-1.5 font-mono text-sm font-bold text-white shadow">
                <span>{uploadUrl}</span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Or type this URL into Google Chrome or Safari browser
              </p>
            </div>

            {/* 4 Steps Instructions Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left my-4">
              <div className="rounded-2xl bg-white border-2 border-slate-200 p-3 shadow-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-950 font-black text-xs text-white mb-1.5">
                  1
                </div>
                <h4 className="font-bold text-xs text-navy-950">Connect Wi-Fi</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Mobile Data بند کر کے شاپ وائی فائی سے کنیکٹ کریں</p>
              </div>

              <div className="rounded-2xl bg-white border-2 border-slate-200 p-3 shadow-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-950 font-black text-xs text-white mb-1.5">
                  2
                </div>
                <h4 className="font-bold text-xs text-navy-950">Scan QR Code</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">اپنے موبائل کیمرے سے اوپر دیا گیا کوڈ اسکین کریں</p>
              </div>

              <div className="rounded-2xl bg-white border-2 border-slate-200 p-3 shadow-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-950 font-black text-xs text-white mb-1.5">
                  3
                </div>
                <h4 className="font-bold text-xs text-navy-950">Select Files</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">PDF، شناختی کارڈ، یا تصویر منتخب کر کے Send دبائیں</p>
              </div>

              <div className="rounded-2xl bg-white border-2 border-slate-200 p-3 shadow-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-950 font-black text-xs text-white mb-1.5">
                  4
                </div>
                <h4 className="font-bold text-xs text-navy-950">Show Token</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">اسکرین پر آنے والا ٹوکن نمبر دکاندار کو بتائیں</p>
              </div>
            </div>

            {/* Custom Services Banner */}
            {customRates && (
              <div className="my-3 rounded-xl bg-slate-200/80 px-4 py-2 text-xs font-bold text-slate-800">
                {customRates}
              </div>
            )}

            {/* Poster Footer: Developer Credit & Shopkeeper Phone */}
            <div className="mt-4 border-t-2 border-slate-200 pt-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center space-x-1.5 font-bold text-navy-950">
                <Phone className="h-4 w-4 text-blue-600" />
                <span>Shop Helpline / WhatsApp: {contactNumber}</span>
              </div>
              <div>
                <p className="font-semibold text-slate-500">
                  Software by <strong className="text-navy-950">Roonjha Developers</strong> : 0315291486
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions - Hidden in print */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 print:hidden">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 hover:text-navy-950"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Customer URL Copied!' : 'Copy Customer URL'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <a
              href={uploadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <span>Test Customer Page</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print Poster Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
