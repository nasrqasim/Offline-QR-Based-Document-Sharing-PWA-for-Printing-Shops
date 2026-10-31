'use client';

import React, { useState } from 'react';
import { Download, Monitor, Smartphone, Share, PlusSquare, X, Check, ArrowRight } from 'lucide-react';
import { usePwaInstall } from '@/lib/use-pwa-install';

interface PwaInstallButtonProps {
  variant?: 'button' | 'banner' | 'pill';
  label?: string;
  className?: string;
}

export function PwaInstallButton({
  variant = 'button',
  label,
  className = '',
}: PwaInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, isDesktop, promptInstall } = usePwaInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  // If already installed, don't show prompt banner or show disabled pill
  if (isInstalled && variant === 'banner') {
    return null;
  }

  const handleInstallClick = async () => {
    const outcome = await promptInstall();
    if (outcome === 'ios') {
      setShowIOSGuide(true);
    }
  };

  const buttonText =
    label ||
    (isInstalled
      ? 'App Installed ✓'
      : isDesktop
      ? 'Install Desktop App'
      : 'Install App on Phone');

  return (
    <>
      {/* 1. COMPACT BUTTON / NAVBAR PILL */}
      {(variant === 'button' || variant === 'pill') && (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={isInstalled}
          className={`flex items-center space-x-1.5 rounded-xl font-bold transition-all shadow-sm ${
            isInstalled
              ? 'bg-slate-800 text-slate-400 cursor-default opacity-80 px-3 py-1.5 text-xs'
              : variant === 'pill'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 px-3 py-1.5 text-xs'
              : 'bg-blue-600 text-white hover:bg-blue-500 px-3.5 py-2 text-xs'
          } ${className}`}
          title={isDesktop ? 'Install as standalone Windows PC app' : 'Install as mobile app'}
        >
          {isInstalled ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : isDesktop ? (
            <Monitor className="h-4 w-4 text-blue-200" />
          ) : (
            <Smartphone className="h-4 w-4 text-blue-200" />
          )}
          <span>{buttonText}</span>
        </button>
      )}

      {/* 2. PROMINENT PROMO BANNER (Mobile / Home Page) */}
      {variant === 'banner' && !dismissedBanner && (
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/80 via-navy-900 to-indigo-950 p-4 border border-blue-500/30 shadow-lg text-white ${className}`}>
          <button
            onClick={() => setDismissedBanner(true)}
            className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start space-x-3 pr-6">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              {isDesktop ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
            </div>

            <div>
              <h4 className="font-bold text-sm text-white">
                {isDesktop ? 'Install Roonjha Print on Windows PC' : 'Install App on Your Phone'}
              </h4>
              <p className="mt-0.5 text-xs text-slate-300">
                {isDesktop
                  ? 'Run in a dedicated standalone window with instant printer access and zero browser clutter.'
                  : 'Add to your home screen for 1-tap document sending whenever you visit our shop!'}
              </p>

              <button
                type="button"
                onClick={handleInstallClick}
                className="mt-3 inline-flex items-center space-x-2 rounded-xl bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-400 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isDesktop ? 'Install Desktop App' : 'Add to Home Screen'}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. IOS SAFARI "ADD TO HOME SCREEN" MODAL GUIDE */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 text-white shadow-2xl">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400 mb-4">
              <Smartphone className="h-6 w-6" />
            </div>

            <h3 className="font-bold text-lg text-white">Install on iPhone / iPad</h3>
            <p className="mt-1 text-xs text-slate-300">
              Follow these 3 quick steps in Apple Safari to install Roonjha Print Share on your iPhone home screen:
            </p>

            <div className="mt-4 space-y-3 rounded-xl bg-slate-800 p-3.5 text-xs border border-slate-700">
              <div className="flex items-center space-x-2.5">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-[11px]">
                  1
                </span>
                <p className="text-slate-200">
                  Tap the <strong className="text-white">Share button</strong> <Share className="inline h-3.5 w-3.5 mx-1 text-blue-400" /> at the bottom of Safari.
                </p>
              </div>

              <div className="flex items-center space-x-2.5">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-[11px]">
                  2
                </span>
                <p className="text-slate-200">
                  Scroll down the menu and tap <strong className="text-white">Add to Home Screen</strong> <PlusSquare className="inline h-3.5 w-3.5 mx-1 text-blue-400" />.
                </p>
              </div>

              <div className="flex items-center space-x-2.5">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-[11px]">
                  3
                </span>
                <p className="text-slate-200">
                  Tap <strong className="text-white">Add</strong> in the top-right corner. Done!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-colors"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
