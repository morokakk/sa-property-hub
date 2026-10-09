import { useState, useMemo, useCallback } from 'react';
import { FlipProject } from '@/types';
import { formatFlipForWhatsApp } from '@/lib/whatsappFormatter';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export interface UseFlipSelectionReturn {
  viewTab: 'active' | 'archive';
  setViewTab: (tab: 'active' | 'archive') => void;
  selectedFlipId: string;
  setSelectedFlipId: (id: string) => void;
  activeFlip: FlipProject | null;
  activeFlips: FlipProject[];
  completedFlips: FlipProject[];
  copiedWhatsApp: boolean;
  copyWhatsAppSummary: () => void;
  shareViaWhatsAppUrl: string;
}

export function useFlipSelection(flipsProp?: FlipProject[]): UseFlipSelectionReturn {
  const storeFlips = usePortfolioStore((state) => state.flips);
  const flips = flipsProp ?? storeFlips;

  const [viewTab, setViewTab] = useState<'active' | 'archive'>('active');

  const activeFlips = useMemo(() => {
    return flips.filter((f) => f.status !== 'Completed');
  }, [flips]);

  const completedFlips = useMemo(() => {
    return flips.filter((f) => f.status === 'Completed');
  }, [flips]);

  const [selectedFlipIdState, setSelectedFlipId] = useState<string>('');

  // Resolved selected flip id: if user selected an id and it exists, keep it; otherwise default to first active flip
  const selectedFlipId = useMemo(() => {
    if (selectedFlipIdState && activeFlips.some((f) => f.id === selectedFlipIdState)) {
      return selectedFlipIdState;
    }
    return activeFlips[0]?.id || flips[0]?.id || '';
  }, [selectedFlipIdState, activeFlips, flips]);

  const activeFlip = useMemo(() => {
    return activeFlips.find((f) => f.id === selectedFlipId) || activeFlips[0] || null;
  }, [activeFlips, selectedFlipId]);

  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const investorProfile = usePortfolioStore((state) => state.investorProfile);

  const copyWhatsAppSummary = useCallback(() => {
    if (!activeFlip) return;
    const text = formatFlipForWhatsApp(activeFlip, investorProfile);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  }, [activeFlip, investorProfile]);

  const shareViaWhatsAppUrl = useMemo(() => {
    if (!activeFlip) return '#';
    return `https://wa.me/?text=${encodeURIComponent(formatFlipForWhatsApp(activeFlip, investorProfile))}`;
  }, [activeFlip, investorProfile]);

  return {
    viewTab,
    setViewTab,
    selectedFlipId,
    setSelectedFlipId,
    activeFlip,
    activeFlips,
    completedFlips,
    copiedWhatsApp,
    copyWhatsAppSummary,
    shareViaWhatsAppUrl,
  };
}
