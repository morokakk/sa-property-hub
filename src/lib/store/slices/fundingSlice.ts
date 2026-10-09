import { StateCreator } from 'zustand';
import { FundingSource } from '@/types';
import { RootStoreState, FundingSlice } from '../types';
import { INITIAL_FUNDING } from '../initialData';

export const createFundingSlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  FundingSlice
> = (set) => ({
  funding: INITIAL_FUNDING,

  addFunding: (source) =>
    set((state) => ({ funding: [source, ...state.funding] })),

  updateFunding: (id, updates) =>
    set((state) => ({
      funding: state.funding.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),

  deleteFunding: (id) =>
    set((state) => ({
      funding: state.funding.filter((f) => f.id !== id),
    })),

  syncFundingWithDealDelay: (fundingId, delayDays, reason) =>
    set((state) => ({
      funding: state.funding.map((f) => {
        if (f.id !== fundingId) return f;
        const originalMaturity = f.originalMaturityDate || f.maturityDate;
        const currentDelay = f.delayExtensionDays || 0;
        const newTotalDelay = currentDelay + delayDays;

        const baseDate = new Date(originalMaturity);
        baseDate.setDate(baseDate.getDate() + newTotalDelay);
        const newMaturityStr = baseDate.toISOString().split('T')[0];

        const newNotes = f.delayNotes
          ? `${f.delayNotes}; +${delayDays}d: ${reason}`
          : `+${delayDays}d: ${reason}`;

        return {
          ...f,
          originalMaturityDate: originalMaturity,
          maturityDate: newMaturityStr,
          delayExtensionDays: newTotalDelay,
          delayNotes: newNotes,
        };
      }),
    })),
});
