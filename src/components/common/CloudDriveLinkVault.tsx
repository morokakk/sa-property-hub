'use client';

import React, { useState } from 'react';
import { CloudDriveVault } from '@/types';
import {
  FolderArchive,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  FileCheck,
  Plus,
  Edit2,
  Check,
  Globe,
} from 'lucide-react';

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

  const slots: Array<{
    key: keyof CloudDriveVault;
    label: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      key: 'masterFolderUrl',
      label: 'Cloud Drive Deal Folder',
      sub: 'Google Drive / Dropbox Folder',
      icon: FolderArchive,
    },
    {
      key: 'otpDocumentUrl',
      label: 'Offer to Purchase (OTP)',
      sub: 'Signed Agreement PDF',
      icon: FileCheck,
    },
    {
      key: 'ratesBillUrl',
      label: 'Municipal Rates & Levies',
      sub: 'City Council & BC Statement',
      icon: FileSpreadsheet,
    },
    {
      key: 'titleDeedUrl',
      label: 'Title Deed & Plans',
      sub: 'Deeds Office / SG Diagram',
      icon: FileText,
    },
  ];

  const handleSaveUrl = (key: keyof CloudDriveVault) => {
    let cleanUrl = urlInput.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const updated = {
      ...links,
      [key]: cleanUrl || undefined,
    };
    setLinks(updated);
    if (onUpdate) onUpdate(updated);
    setEditingKey(null);
    setUrlInput('');
  };

  return (
    <div className="bg-slate-50/90 rounded-xl border border-slate-200/80 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <FolderArchive className="w-4 h-4 text-indigo-600" />
          <span>Cloud Drive Document Vault</span>
        </div>
        <span className="text-[10px] text-slate-400">Zero-Storage URL Links</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {slots.map(({ key, label, sub, icon: Icon }) => {
          const hasUrl = Boolean(links[key]);
          const currentUrl = links[key];
          const isEditing = editingKey === key;

          return (
            <div
              key={key}
              className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                hasUrl
                  ? 'bg-white border-indigo-200 shadow-2xs'
                  : 'bg-slate-100/60 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${hasUrl ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="font-bold text-[11px] text-slate-800 truncate">{label}</span>
                </div>
                <p className="text-[9px] text-slate-500 truncate mb-2">{sub}</p>
              </div>

              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full text-[10px] px-2 py-1 border rounded border-indigo-300 focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingKey(null)}
                      className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveUrl(key)}
                      className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded hover:bg-indigo-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : hasUrl ? (
                <div className="flex items-center justify-between gap-1 mt-1 pt-1.5 border-t border-slate-100">
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    <span>Open Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKey(key);
                        setUrlInput(currentUrl || '');
                      }}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                      title="Edit URL"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
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
                    className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded py-1 bg-white hover:bg-slate-50 transition-colors"
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
