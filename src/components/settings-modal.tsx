'use client';

import React, { useState } from 'react';
import { X, Save, Lock, Shield, HardDrive, Printer, Sliders } from 'lucide-react';
import { ShopSettings } from '@/lib/types';

interface SettingsModalProps {
  settings: ShopSettings;
  onSave: (updated: Partial<ShopSettings>, pin: string) => Promise<{ success?: boolean; error?: string }>;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'shop' | 'limits' | 'print' | 'security'>('shop');
  const [shopName, setShopName] = useState(settings.shopName);
  const [shopContact, setShopContact] = useState(settings.shopContact);
  const [shopOperator, setShopOperator] = useState(settings.shopOperator);
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcomeMessage);
  const [hotspotInstructions, setHotspotInstructions] = useState(settings.hotspotInstructions);

  const [maxFileSizeMb, setMaxFileSizeMb] = useState(settings.maxFileSizeMb);
  const [maxJobSizeMb, setMaxJobSizeMb] = useState(settings.maxJobSizeMb);
  const [maxFilesPerJob, setMaxFilesPerJob] = useState(settings.maxFilesPerJob);
  const [jobRetentionHours, setJobRetentionHours] = useState(settings.jobRetentionHours);
  const [allowedExtensions, setAllowedExtensions] = useState<string[]>(settings.allowedExtensions);

  const [defaultPaperSize, setDefaultPaperSize] = useState(settings.defaultPaperSize);
  const [defaultColorMode, setDefaultColorMode] = useState(settings.defaultColorMode);

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const availableExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'heic', 'txt', 'csv'];

  const toggleExtension = (ext: string) => {
    if (allowedExtensions.includes(ext)) {
      setAllowedExtensions(allowedExtensions.filter(e => e !== ext));
    } else {
      setAllowedExtensions([...allowedExtensions, ext]);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload: Partial<ShopSettings> = {
      shopName,
      shopContact,
      shopOperator,
      welcomeMessage,
      hotspotInstructions,
      maxFileSizeMb: Number(maxFileSizeMb),
      maxJobSizeMb: Number(maxJobSizeMb),
      maxFilesPerJob: Number(maxFilesPerJob),
      jobRetentionHours: Number(jobRetentionHours),
      allowedExtensions,
      defaultPaperSize,
      defaultColorMode,
      ...(newPin ? { ownerPin: newPin } : {}),
    };

    const res = await onSave(payload, currentPin);
    setSaving(false);

    if (res.error) {
      setMessage({ text: res.error, type: 'error' });
    } else {
      setMessage({ text: 'Settings updated successfully!', type: 'success' });
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-4 text-white">
          <div className="flex items-center space-x-2.5">
            <Sliders className="h-5 w-5 text-blue-400" />
            <div>
              <h3 className="font-semibold text-base">Shop Settings & Configuration</h3>
              <p className="text-xs text-slate-300">Roonjha Print Share • Software by Roonjha Developers : 0315291486</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-navy-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
              activeTab === 'shop'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Shop Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('limits')}
            className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
              activeTab === 'limits'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            File & Storage Limits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('print')}
            className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
              activeTab === 'print'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Default Print Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Security & Owner PIN
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`px-6 py-2.5 text-xs font-bold ${
            message.type === 'success' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
          }`}>
            {message.text}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSaveAll} className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'shop' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Printing Shop Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-950 mb-1">Contact / WhatsApp Phone</label>
                  <input
                    type="text"
                    value={shopContact}
                    onChange={e => setShopContact(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-950 mb-1">Operator / Developer Credit</label>
                  <input
                    type="text"
                    value={shopOperator}
                    onChange={e => setShopOperator(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Customer Welcome Message</label>
                <textarea
                  value={welcomeMessage}
                  onChange={e => setWelcomeMessage(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Customer Hotspot / Wi-Fi Guidance</label>
                <textarea
                  value={hotspotInstructions}
                  onChange={e => setHotspotInstructions(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'limits' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-950 mb-1">Max Per File (MB)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={maxFileSizeMb}
                    onChange={e => setMaxFileSizeMb(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-950 mb-1">Max Per Job (MB)</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={maxJobSizeMb}
                    onChange={e => setMaxJobSizeMb(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-950 mb-1">Max Files / Job</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxFilesPerJob}
                    onChange={e => setMaxFilesPerJob(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">
                  Job Auto-Deletion Retention (Hours)
                </label>
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={jobRetentionHours}
                  onChange={e => setJobRetentionHours(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Set to 0 to disable automatic cleanup. Default is 24 hours to keep the shop PC storage clean.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-2">Allowed File Formats</label>
                <div className="grid grid-cols-4 gap-2">
                  {availableExtensions.map(ext => (
                    <label
                      key={ext}
                      className={`flex items-center space-x-2 rounded-lg border p-2 text-xs font-semibold cursor-pointer transition-colors ${
                        allowedExtensions.includes(ext)
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={allowedExtensions.includes(ext)}
                        onChange={() => toggleExtension(ext)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>.{ext.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'print' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Default Counter Paper Size</label>
                <select
                  value={defaultPaperSize}
                  onChange={e => setDefaultPaperSize(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none font-medium"
                >
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="Letter">Letter (8.5 × 11 in)</option>
                  <option value="Legal">Legal (8.5 × 14 in)</option>
                  <option value="A3">A3 (297 × 420 mm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Default Color Profile</label>
                <select
                  value={defaultColorMode}
                  onChange={e => setDefaultColorMode(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none font-medium"
                >
                  <option value="bw">Black & White (Monochrome)</option>
                  <option value="color">Full Color</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900">
                <div className="flex items-center space-x-2 font-bold mb-1">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <span>Owner Authentication & Privacy</span>
                </div>
                Customer documents (CNIC, academic records, invoices) are strictly stored locally on your PC. An Owner PIN prevents unauthorized visitors from modifying settings.
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">
                  Current Owner PIN (Required to save changes)
                </label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value)}
                  placeholder="Enter current PIN (default: 1234)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">
                  Change Owner PIN (Optional)
                </label>
                <input
                  type="password"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  placeholder="Leave blank to keep existing PIN"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          )}

          {/* Footer Save Button */}
          <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
