'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Building,
  Mail,
  Phone,
  Search,
  PlusCircle,
  Trash2,
  Edit3,
  RotateCcw,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { MunicipalContact } from '@/types';

interface MunicipalDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact?: (contact: MunicipalContact) => void;
}

export default function MunicipalDirectoryModal({
  isOpen,
  onClose,
  onSelectContact,
}: MunicipalDirectoryModalProps) {
  const directory = usePortfolioStore((state) => state.municipalDirectory);
  const addMunicipalContact = usePortfolioStore((state) => state.addMunicipalContact);
  const updateMunicipalContact = usePortfolioStore((state) => state.updateMunicipalContact);
  const deleteMunicipalContact = usePortfolioStore((state) => state.deleteMunicipalContact);
  const resetMunicipalDirectory = usePortfolioStore((state) => state.resetMunicipalDirectory);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [email, setEmail] = useState('');
  const [escalationEmail, setEscalationEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setShortCode('');
    setEmail('');
    setEscalationEmail('');
    setPhone('');
    setWebsite('');
    setNotes('');
    setFormError(null);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleStartEdit = (contact: MunicipalContact) => {
    setEditingId(contact.id);
    setIsAdding(true);
    setName(contact.municipalityName);
    setShortCode(contact.shortCode);
    setEmail(contact.revenueEmail);
    setEscalationEmail(contact.escalationEmail || '');
    setPhone(contact.phone || '');
    setWebsite(contact.website || '');
    setNotes(contact.notes || '');
    setFormError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please enter a municipality name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid municipal revenue email address.');
      return;
    }

    if (editingId) {
      updateMunicipalContact(editingId, {
        municipalityName: name.trim(),
        shortCode: shortCode.trim() || name.substring(0, 3).toUpperCase(),
        revenueEmail: email.trim(),
        escalationEmail: escalationEmail.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addMunicipalContact({
        municipalityName: name.trim(),
        shortCode: shortCode.trim() || name.substring(0, 3).toUpperCase(),
        revenueEmail: email.trim(),
        escalationEmail: escalationEmail.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    resetForm();
  };

  const handleDelete = (id: string, muniName: string) => {
    if (confirm(`Remove "${muniName}" from your municipal directory?`)) {
      deleteMunicipalContact(id);
    }
  };

  const filteredContacts = directory.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.municipalityName.toLowerCase().includes(q) ||
      c.shortCode.toLowerCase().includes(q) ||
      c.revenueEmail.toLowerCase().includes(q) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  Central Municipal Directory
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {directory.length} Authorities
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                Official revenue department billing dispute emails & customer care contacts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Controls: Search, Add, Reset */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search municipality by name, email, or code..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset municipal contacts to standard pre-seeded list?')) {
                    resetMunicipalDirectory();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Reset to default standard directory"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>

              {!isAdding && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAdding(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Authority</span>
                </button>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Add / Edit Form */}
          {isAdding && (
            <form
              onSubmit={handleSave}
              className="p-4 bg-amber-50/50 border border-amber-300 rounded-xl space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-600" />
                  <span>{editingId ? 'Edit Municipal Contact' : 'Add New Municipal Authority'}</span>
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    Municipality Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Buffalo City Metropolitan Municipality"
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    Short Code / Acronym
                  </label>
                  <input
                    type="text"
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value)}
                    placeholder="e.g. BCM"
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-slate-900 uppercase font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    Primary Revenue Dispute Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. revenue@buffalocity.gov.za"
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-slate-900 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    Escalation / Rates Email
                  </label>
                  <input
                    type="email"
                    value={escalationEmail}
                    onChange={(e) => setEscalationEmail(e.target.value)}
                    placeholder="e.g. billingqueries@buffalocity.gov.za"
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-slate-900 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    Call Centre / Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 086 111 3000"
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    Website / Portal URL
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  Department Routing Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Regional billing desk for East London & King William's Town"
                  className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Update Contact' : 'Save Authority'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Directory Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-2xs space-y-2 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">
                        {contact.municipalityName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[9px] bg-slate-100 text-slate-700 border border-slate-200">
                        {contact.shortCode}
                      </span>
                      {contact.isCustom && (
                        <span className="px-1.5 py-0.2 rounded font-bold text-[9px] bg-amber-50 text-amber-800 border border-amber-200">
                          Custom
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onSelectContact && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectContact(contact);
                          onClose();
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer"
                        title="Use this authority for dispute"
                      >
                        Select
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(contact)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                      title="Edit contact details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {contact.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDelete(contact.id, contact.municipalityName)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete authority"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Email line */}
                <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px] truncate">
                  <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <a
                    href={`mailto:${contact.revenueEmail}`}
                    className="hover:underline text-cyan-800 font-semibold truncate"
                  >
                    {contact.revenueEmail}
                  </a>
                </div>

                {/* Secondary email & phone */}
                <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                  {contact.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.website && (
                    <a
                      href={contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-slate-500 hover:text-slate-800"
                    >
                      <span>Portal</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {/* Notes */}
                {contact.notes && (
                  <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 italic truncate" title={contact.notes}>
                    {contact.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Pre-seeded with major SA municipal revenue departments
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
