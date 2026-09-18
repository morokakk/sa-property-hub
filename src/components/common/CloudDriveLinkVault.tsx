'use client';

import React, { useState, useEffect } from 'react';
import { CloudDriveVault } from '@/types';
import {
  FolderArchive,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  FileCheck,
  Plus,
  Edit2,
  Trash2,
  Cloud,
} from 'lucide-react';

export type CloudProviderType = 'onedrive' | 'sharepoint' | 'gdrive' | 'dropbox' | 'box' | 'icloud' | 'web';

export interface CloudProviderInfo {
  type: CloudProviderType;
  name: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconText: string;
}

export function detectCloudProvider(url?: string): CloudProviderInfo {
  if (!url) {
    return {
      type: 'web',
      name: 'Web Link',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-700',
      badgeBorder: 'border-slate-200',
      iconText: '🌐',
    };
  }

  const clean = url.toLowerCase();
  if (clean.includes('sharepoint.com')) {
    return {
      type: 'sharepoint',
      name: 'SharePoint',
      badgeBg: 'bg-teal-50',
      badgeText: 'text-teal-800',
      badgeBorder: 'border-teal-200',
      iconText: '📊',
    };
  }
  if (clean.includes('onedrive') || clean.includes('1drv.ms') || clean.includes('live.com')) {
    return {
      type: 'onedrive',
      name: 'OneDrive',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-800',
      badgeBorder: 'border-blue-200',
      iconText: '☁️',
    };
  }
  if (clean.includes('drive.google.com') || clean.includes('docs.google.com')) {
    return {
      type: 'gdrive',
      name: 'Google Drive',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-200',
      iconText: '📁',
    };
  }
  if (clean.includes('dropbox.com') || clean.includes('db.tt')) {
    return {
      type: 'dropbox',
      name: 'Dropbox',
      badgeBg: 'bg-indigo-50',
      badgeText: 'text-indigo-800',
      badgeBorder: 'border-indigo-200',
      iconText: '📦',
    };
  }
  if (clean.includes('box.com')) {
    return {
      type: 'box',
      name: 'Box',
      badgeBg: 'bg-sky-50',
      badgeText: 'text-sky-800',
      badgeBorder: 'border-sky-200',
      iconText: '🗳️',
    };
  }
  if (clean.includes('icloud.com')) {
    return {
      type: 'icloud',
      name: 'iCloud',
      badgeBg: 'bg-purple-50',
      badgeText: 'text-purple-800',
      badgeBorder: 'border-purple-200',
      iconText: '☁️',
    };
  }
  return {
    type: 'web',
    name: 'Web Link',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    iconText: '🔗',
  };
}

interface CloudDriveLinkVaultProps {
  vault?: CloudDriveVault;
  onUpdate?: (updated: CloudDriveVault) => void;
  readOnly?: boolean;
}

export default function CloudDriveLinkVault({
  vault = {},
  onUpdate,
  readOnly = false,
}: CloudDriveLinkVaultProps) {
  const [links, setLinks] = useState<CloudDriveVault>(vault);
  const [editingKey, setEditingKey] = useState<keyof CloudDriveVault | null>(null);
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    setLinks(vault || {});
  }, [vault]);

  const slots: Array<{
    key: keyof CloudDriveVault;
    label: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      key: 'masterFolderUrl',
      label: 'Cloud Deal Folder',
      sub: 'OneDrive, GDrive, Dropbox, or custom folder',
      icon: FolderArchive,
    },
    {
      key: 'otpDocumentUrl',
      label: 'Offer to Purchase (OTP)',
      sub: 'Signed Agreement PDF / Scan Link',
      icon: FileCheck,
    },
    {
      key: 'ratesBillUrl',
      label: 'Municipal Rates & Levies',
      sub: 'City Council & BC Statement Link',
      icon: FileSpreadsheet,
    },
    {
      key: 'titleDeedUrl',
      label: 'Title Deed & Plans',
      sub: 'Deeds Office / SG Diagram Link',
      icon: FileText,
    },
  ];

  const handleSaveUrl = (key: keyof CloudDriveVault) => {
    let cleanUrl = urlInput.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const updated: CloudDriveVault = {
      ...links,
      [key]: cleanUrl || undefined,
    };
    setLinks(updated);
    if (onUpdate) onUpdate(updated);
    setEditingKey(null);
    setUrlInput('');
  };

  const handleRemoveUrl = (key: keyof CloudDriveVault) => {
    const updated: CloudDriveVault = {
      ...links,
      [key]: undefined,
    };
    setLinks(updated);
    if (onUpdate) onUpdate(updated);
  };

  const activeProvider = urlInput ? detectCloudProvider(urlInput) : null;

  return (
    <div className="bg-slate-50/90 rounded-xl border border-slate-200/80 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Cloud className="w-4 h-4 text-indigo-600" />
          <span>Cloud & Web Document Vault</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="font-semibold text-slate-600">Zero-Storage URL Links</span>
          <span>•</span>
          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-medium">
            OneDrive • GDrive • Dropbox • Web
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {slots.map(({ key, label, sub, icon: Icon }) => {
          const hasUrl = Boolean(links[key]);
          const currentUrl = links[key];
          const isEditing = editingKey === key;
          const provider = hasUrl ? detectCloudProvider(currentUrl) : null;

          return (
            <div
              key={key}
              className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                hasUrl
                  ? 'bg-white border-slate-300/80 shadow-2xs'
                  : 'bg-slate-100/60 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${hasUrl ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-[11px] text-slate-800 truncate" title={label}>
                      {label}
                    </span>
                  </div>
                  {provider && (
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${provider.badgeBg} ${provider.badgeText} ${provider.badgeBorder}`}
                      title={`Stored on ${provider.name}`}
                    >
                      <span>{provider.iconText}</span>
                      <span>{provider.name}</span>
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-slate-500 truncate mb-2">{sub}</p>
              </div>

              {isEditing ? (
                <div className="space-y-1.5 pt-1 border-t border-indigo-100">
                  <div className="flex items-center justify-between gap-1 text-[9px]">
                    <span className="text-slate-400 font-medium">Preset Template:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setUrlInput('https://1drv.ms/f/s!')}
                        className="px-1 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 cursor-pointer"
                        title="Paste OneDrive share link"
                      >
                        OneDrive
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrlInput('https://drive.google.com/drive/folders/')}
                        className="px-1 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 cursor-pointer"
                        title="Paste Google Drive share link"
                      >
                        GDrive
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrlInput('https://www.dropbox.com/scl/fo/')}
                        className="px-1 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 cursor-pointer"
                        title="Paste Dropbox share link"
                      >
                        Dropbox
                      </button>
                    </div>
                  </div>

                  <input
                    type="url"
                    placeholder="https://1drv.ms/... or https://drive.google.com/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveUrl(key);
                      } else if (e.key === 'Escape') {
                        setEditingKey(null);
                      }
                    }}
                    autoFocus
                    className="w-full text-[10px] px-2 py-1 border rounded border-indigo-300 focus:ring-1 focus:ring-indigo-500 bg-white"
                  />

                  {activeProvider && (
                    <div className="flex items-center justify-between text-[9px] text-slate-500">
                      <span>Detected: <strong>{activeProvider.name}</strong></span>
                      <span className="text-slate-400">Enter to save</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingKey(null)}
                      className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveUrl(key)}
                      className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-0.5 rounded cursor-pointer"
                    >
                      Save Link
                    </button>
                  </div>
                </div>
              ) : hasUrl ? (
                <div className="flex items-center justify-between gap-1 mt-1 pt-1.5 border-t border-slate-100">
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline truncate"
                    title={`Open ${label} (${provider?.name || 'Link'})`}
                  >
                    <span>Open Link</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>

                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKey(key);
                          setUrlInput(currentUrl || '');
                        }}
                        className="text-slate-400 hover:text-indigo-600 p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit URL"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove link for "${label}"?`)) {
                            handleRemoveUrl(key);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Clear / Remove Link"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                !readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKey(key);
                      setUrlInput('');
                    }}
                    className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded py-1 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Attach Link</span>
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
