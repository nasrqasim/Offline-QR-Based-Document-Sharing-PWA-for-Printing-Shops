'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Printer, Smartphone, ShieldCheck, Wifi, ArrowRight, Sparkles } from 'lucide-react';
import { PwaInstallButton } from '@/components/pwa-install-button';

export default function HomePage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // If mobile user agent, redirect straight to customer upload page
    const userAgent = navigator.userAgent || '';
    if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
      setIsMobile(true);
      router.replace('/upload');
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-navy-950 via-navy-900 to-slate-900 text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 border-b border-navy-800">
        <div className="flex items-center space-x-3">
          <div className="rounded-xl bg-blue-600 p-2.5 shadow-lg shadow-blue-500/20">
            <Printer className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">Roonjha Print Share</h1>
            <p className="text-xs text-blue-300">Offline QR Document Sharing PWA</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <PwaInstallButton variant="pill" />
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-navy-800/80 px-3 py-1.5 rounded-full border border-navy-700">
            <Wifi className="h-3.5 w-3.5 text-green-400" />
            <span>Local & Cloud</span>
          </div>
        </div>
      </header>

      {/* Main Choice Hub */}
      <div className="max-w-4xl mx-auto w-full my-auto py-12">
        <div className="text-center mb-10">
          <span className="inline-block rounded-full bg-blue-500/10 border border-blue-500/20 px-3.5 py-1 text-xs font-semibold text-blue-400 mb-3">
            Pakistan Print Shop Edition
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Fast, Zero-Internet Document Printing
          </h2>
          <p className="mt-3 text-slate-300 max-w-xl mx-auto text-sm sm:text-base">
            Select your role below. Customers can upload documents from their phones; shopkeepers manage and print from the desktop dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Customer Upload Card */}
          <Link
            href="/upload"
            className="group relative rounded-2xl bg-gradient-to-b from-slate-800 to-slate-850 p-6 border border-slate-700 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                Customer Upload Page
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400">
                Send PDFs, Word, Excel, and photos directly from your phone over the counter Wi-Fi hotspot. No internet needed.
              </p>
            </div>

            <div className="mt-6 flex items-center space-x-2 text-xs font-bold text-blue-400">
              <span>Open Mobile Uploader</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Shopkeeper Dashboard Card */}
          <Link
            href="/dashboard"
            className="group relative rounded-2xl bg-gradient-to-b from-slate-800 to-slate-850 p-6 border border-slate-700 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <Printer className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                Shopkeeper PC Dashboard
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400">
                Live document receiver, counter QR poster, instant PDF preview, multi-copy printer controls, and network diagnostics.
              </p>
            </div>

            <div className="mt-6 flex items-center space-x-2 text-xs font-bold text-emerald-400">
              <span>Open PC Dashboard</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Footer Attribution */}
      <footer className="max-w-5xl mx-auto w-full py-6 border-t border-navy-800 text-center text-xs text-slate-500">
        <p>
          Roonjha Print Share • <strong className="text-slate-300">software by Roonjha Developers : 0315291486</strong>
        </p>
      </footer>
    </main>
  );
}
