import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { DealSource } from '@/types';

describe('usePortfolioStore Analyzer Draft & Distressed Costs', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('initializes analyzerDraft with default source, zero auction outlays, and default vacancy/mgmt rates', () => {
    const draft = usePortfolioStore.getState().analyzerDraft;
    expect(draft.source).toBe('High-Street Auction');
    expect(draft.auctioneerCommission).toBe(0);
    expect(draft.municipalArrears).toBe(0);
    expect(draft.vacancyRatePercent).toBe(6.0);
    expect(draft.managementFeePercent).toBe(8.0);
  });

  it('updates analyzerDraft with custom vacancy and management fee rates', () => {
    usePortfolioStore.getState().updateAnalyzerDraft({
      vacancyRatePercent: 10.0,
      managementFeePercent: 12.0,
    });
    const draft = usePortfolioStore.getState().analyzerDraft;
    expect(draft.vacancyRatePercent).toBe(10.0);
    expect(draft.managementFeePercent).toBe(12.0);
  });

  it('updates analyzerDraft with distressed fees and source', () => {
    usePortfolioStore.getState().updateAnalyzerDraft({
      source: 'Distressed Sale / Repo',
      auctioneerCommission: 201250,
      municipalArrears: 45000,
    });

    const draft = usePortfolioStore.getState().analyzerDraft;
    expect(draft.source).toBe('Distressed Sale / Repo');
    expect(draft.auctioneerCommission).toBe(201250);
    expect(draft.municipalArrears).toBe(45000);
  });

  it('correctly resets auctioneerCommission and municipalArrears when transitioning to retail source', () => {
    // 1. Setup distressed state with costs
    usePortfolioStore.getState().updateAnalyzerDraft({
      source: 'High-Street Auction',
      auctioneerCommission: 150000,
      municipalArrears: 30000,
    });

    let draft = usePortfolioStore.getState().analyzerDraft;
    expect(draft.auctioneerCommission).toBe(150000);
    expect(draft.municipalArrears).toBe(30000);

    // 2. Perform reset side-effect when switching to retail
    const newSource: DealSource = 'Private Agent';
    usePortfolioStore.getState().updateAnalyzerDraft({
      source: newSource,
      auctioneerCommission: 0,
      municipalArrears: 0,
    });

    draft = usePortfolioStore.getState().analyzerDraft;
    expect(draft.source).toBe('Private Agent');
    expect(draft.auctioneerCommission).toBe(0);
    expect(draft.municipalArrears).toBe(0);
  });
});
