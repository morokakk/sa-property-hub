import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePortfolioStore, sanitizeCompletedGuideSteps } from '../usePortfolioStore';

describe('Get Started checklist (completedGuideSteps)', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
    usePortfolioStore.getState().resetGuideProgress();
  });

  it('starts empty', () => {
    expect(usePortfolioStore.getState().completedGuideSteps).toEqual([]);
  });

  it('toggles a step on and off', () => {
    const { toggleGuideStep } = usePortfolioStore.getState();
    toggleGuideStep('settings-entity-branding');
    expect(usePortfolioStore.getState().completedGuideSteps).toEqual(['settings-entity-branding']);
    toggleGuideStep('settings-entity-branding');
    expect(usePortfolioStore.getState().completedGuideSteps).toEqual([]);
  });

  it('keeps other steps when toggling one, without duplicates', () => {
    const { toggleGuideStep } = usePortfolioStore.getState();
    toggleGuideStep('a');
    toggleGuideStep('b');
    toggleGuideStep('c');
    toggleGuideStep('b');
    expect(usePortfolioStore.getState().completedGuideSteps).toEqual(['a', 'c']);
    toggleGuideStep('b');
    expect(usePortfolioStore.getState().completedGuideSteps).toEqual(['a', 'c', 'b']);
  });

  it('ignores blank IDs', () => {
    const { toggleGuideStep } = usePortfolioStore.getState();
    toggleGuideStep('');
    toggleGuideStep('   ');
    expect(usePortfolioStore.getState().completedGuideSteps).toEqual([]);
  });

  it('resetGuideProgress clears every step', () => {
    const { toggleGuideStep, resetGuideProgress } = usePortfolioStore.getState();
    toggleGuideStep('a');
    toggleGuideStep('b');
    resetGuideProgress();
    expect(usePortfolioStore.getState().completedGuideSteps).toEqual([]);
  });

  it('survives Clear Demo, Reset Demo, JSON import and cloud hydration (progress is user-level, not portfolio data)', () => {
    const s = usePortfolioStore.getState();
    s.toggleGuideStep('go-live-clear-demo');
    s.clearAllData();
    expect(usePortfolioStore.getState().completedGuideSteps).toEqual(['go-live-clear-demo']);
    usePortfolioStore.getState().resetToDemoData();
    expect(usePortfolioStore.getState().completedGuideSteps).toEqual(['go-live-clear-demo']);
    usePortfolioStore.getState().importPortfolioJSON(JSON.stringify({ rentals: [] }));
    expect(usePortfolioStore.getState().completedGuideSteps).toEqual(['go-live-clear-demo']);
    usePortfolioStore.getState().hydrateFromCloudState({ rentals: [] } as never);
    expect(usePortfolioStore.getState().completedGuideSteps).toEqual(['go-live-clear-demo']);
  });

  it('does not change portfolio data when toggled', () => {
    const before = usePortfolioStore.getState();
    const snapshot = {
      rentals: before.rentals,
      flips: before.flips,
      opportunities: before.opportunities,
      tasks: before.tasks,
      investorProfile: before.investorProfile,
    };
    before.toggleGuideStep('analyzer-compare');
    const after = usePortfolioStore.getState();
    expect(after.rentals).toBe(snapshot.rentals);
    expect(after.flips).toBe(snapshot.flips);
    expect(after.opportunities).toBe(snapshot.opportunities);
    expect(after.tasks).toBe(snapshot.tasks);
    expect(after.investorProfile).toBe(snapshot.investorProfile);
  });
});

describe('sanitizeCompletedGuideSteps (persisted-state guard)', () => {
  it('returns [] for non-arrays', () => {
    expect(sanitizeCompletedGuideSteps(undefined)).toEqual([]);
    expect(sanitizeCompletedGuideSteps(null)).toEqual([]);
    expect(sanitizeCompletedGuideSteps('settings')).toEqual([]);
    expect(sanitizeCompletedGuideSteps({ 0: 'a' })).toEqual([]);
  });

  it('drops non-strings and blanks, and de-duplicates while preserving order', () => {
    expect(sanitizeCompletedGuideSteps(['a', 1, null, '', '  ', 'b', 'a', { id: 'c' }])).toEqual(['a', 'b']);
  });

  describe('real localStorage round-trip', () => {
    const KEY = 'sa_property_portfolio_hub_v1';
    let mem: Map<string, string>;

    beforeEach(() => {
      vi.resetModules();
      mem = new Map<string, string>();
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => void mem.set(k, v),
        removeItem: (k: string) => void mem.delete(k),
        clear: () => mem.clear(),
        key: () => null,
        length: 0,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetModules();
    });

    it('sanitizes corrupted persisted steps on rehydrate and persists toggles', async () => {
      mem.set(KEY, JSON.stringify({ state: { completedGuideSteps: ['settings-buy-box', 7, 'settings-buy-box', ''] }, version: 0 }));
      const mod = await import('../usePortfolioStore');
      expect(mod.usePortfolioStore.getState().completedGuideSteps).toEqual(['settings-buy-box']);

      mod.usePortfolioStore.getState().toggleGuideStep('analyzer-compare');
      const saved = JSON.parse(mem.get(KEY)!);
      expect(saved.state.completedGuideSteps).toEqual(['settings-buy-box', 'analyzer-compare']);
    });

    it('defaults to [] for legacy persisted state that predates the checklist', async () => {
      mem.set(KEY, JSON.stringify({ state: { liquidCapitalReserve: 123 }, version: 0 }));
      const mod = await import('../usePortfolioStore');
      expect(mod.usePortfolioStore.getState().completedGuideSteps).toEqual([]);
      expect(mod.usePortfolioStore.getState().liquidCapitalReserve).toBe(123);
    });

    it('defaults to [] when the persisted value is not an array', async () => {
      mem.set(KEY, JSON.stringify({ state: { completedGuideSteps: 'corrupt' }, version: 0 }));
      const mod = await import('../usePortfolioStore');
      expect(mod.usePortfolioStore.getState().completedGuideSteps).toEqual([]);
    });
  });
});
