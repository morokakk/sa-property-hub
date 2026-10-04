import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  GET_STARTED_STAGES,
  GO_LIVE_STEP,
  GUIDE_ROUTES,
  getAllGuideStepIds,
  parseGuideHref,
  countCompletedGuideSteps,
} from '../getStartedContent';

const APP_DIR = path.resolve(__dirname, '../../../app');

function pageSourceFor(route: string): string {
  const rel = route === '/' ? 'page.tsx' : path.join(route.replace(/^\//, ''), 'page.tsx');
  return fs.readFileSync(path.join(APP_DIR, rel), 'utf8');
}

const allFeatures = GET_STARTED_STAGES.flatMap((s) => s.modules.flatMap((m) => m.features));

describe('Get Started content integrity', () => {
  it('orders the journey 0 → 5 with Settings as Step 0 Foundation', () => {
    expect(GET_STARTED_STAGES.map((s) => s.stepNumber)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(GET_STARTED_STAGES.map((s) => s.phase)).toEqual(['Foundation', 'Find', 'Fund', 'Execute', 'Pitch', 'Monitor']);
    expect(GET_STARTED_STAGES[0].modules.map((m) => m.route)).toEqual(['/settings']);
    expect(GET_STARTED_STAGES[1].modules.map((m) => m.route)).toEqual(['/analyzer']);
    expect(GET_STARTED_STAGES[2].modules.map((m) => m.route)).toEqual(['/funding']);
    expect(GET_STARTED_STAGES[3].modules.map((m) => m.route)).toEqual(['/flips', '/rentals']);
    expect(GET_STARTED_STAGES[4].modules.map((m) => m.route)).toEqual(['/proposal']);
    expect(GET_STARTED_STAGES[5].modules.map((m) => m.route)).toEqual(['/', '/tasks']);
  });

  it('splits Settings into Entity & Branding, Finance Defaults and Buy Box, each stating what it powers', () => {
    const settings = GET_STARTED_STAGES[0].modules[0];
    expect(settings.features.map((f) => f.title)).toEqual([
      '0a · Entity & Branding',
      '0b · Finance Defaults',
      '0c · Buy Box Hurdles',
    ]);
    settings.features.forEach((f) => expect(f.powers && f.powers.length).toBeTruthy());
    const finance = settings.features[1];
    const financeText = [finance.summary, ...finance.howTo].join(' ');
    expect(financeText).toContain('10.75%');
    expect(financeText).toContain('31%');
    expect(financeText).toMatch(/VAT-Exempt/);
    expect(financeText).toMatch(/commission/i);
  });

  it('gives every module a one-line purpose and 3–4 key features', () => {
    for (const stage of GET_STARTED_STAGES) {
      for (const mod of stage.modules) {
        expect(mod.purpose.trim().length).toBeGreaterThan(10);
        expect(mod.purpose).not.toContain('\n');
        expect(mod.features.length).toBeGreaterThanOrEqual(3);
        expect(mod.features.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it('gives every feature exactly 3 non-empty How-to steps, an SA Pro Tip and a deep link', () => {
    for (const f of allFeatures) {
      expect(f.howTo).toHaveLength(3);
      f.howTo.forEach((step) => expect(step.trim().length).toBeGreaterThan(5));
      expect(f.proTip.trim().length).toBeGreaterThan(20);
      expect(f.href.startsWith('/')).toBe(true);
      expect(f.ctaLabel.trim().length).toBeGreaterThan(0);
    }
    expect(GO_LIVE_STEP.howTo).toHaveLength(3);
  });

  it('uses globally unique, non-empty checklist IDs', () => {
    const ids = getAllGuideStepIds();
    expect(ids.length).toBe(allFeatures.length + 1);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^[a-z0-9-]+$/));
    expect(ids[ids.length - 1]).toBe(GO_LIVE_STEP.id);
  });

  it('only deep links to real routes, and every #anchor exists as an id on the target page', () => {
    const allHrefs = [
      ...allFeatures.map((f) => f.href),
      ...GET_STARTED_STAGES.flatMap((s) => s.modules.map((m) => m.route)),
    ];
    for (const href of allHrefs) {
      const { path: route, anchor } = parseGuideHref(href);
      expect(GUIDE_ROUTES, `unknown route in ${href}`).toContain(route);
      const source = pageSourceFor(route);
      if (anchor) {
        expect(source.includes(`id="${anchor}"`), `missing id="${anchor}" on ${route}`).toBe(true);
      }
    }
  });

  it('anchor ids are unique within each target page source', () => {
    const anchorsByRoute = new Map<string, Set<string>>();
    for (const f of allFeatures) {
      const { path: route, anchor } = parseGuideHref(f.href);
      if (!anchor) continue;
      if (!anchorsByRoute.has(route)) anchorsByRoute.set(route, new Set());
      anchorsByRoute.get(route)!.add(anchor);
    }
    for (const [route, anchors] of anchorsByRoute) {
      const source = pageSourceFor(route);
      for (const anchor of anchors) {
        expect(source.split(`id="${anchor}"`).length - 1, `${anchor} on ${route}`).toBe(1);
      }
    }
  });

  it('encourages demo-data practice and explains Clear Demo as the final Go Live step', () => {
    expect(GO_LIVE_STEP.title).toMatch(/Go Live/);
    expect(GO_LIVE_STEP.howTo.join(' ')).toMatch(/Clear Demo/);
  });
});

describe('guide helpers', () => {
  it('parseGuideHref splits path and anchor', () => {
    expect(parseGuideHref('/settings#settings-finance')).toEqual({ path: '/settings', anchor: 'settings-finance' });
    expect(parseGuideHref('/tasks')).toEqual({ path: '/tasks', anchor: null });
    expect(parseGuideHref('/#dashboard-kpis')).toEqual({ path: '/', anchor: 'dashboard-kpis' });
    expect(parseGuideHref('/flips#')).toEqual({ path: '/flips', anchor: null });
  });

  it('countCompletedGuideSteps ignores unknown/stale IDs and duplicates', () => {
    const [first, second] = getAllGuideStepIds();
    expect(countCompletedGuideSteps([])).toBe(0);
    expect(countCompletedGuideSteps([first, 'removed-old-step', first])).toBe(1);
    expect(countCompletedGuideSteps([first, second])).toBe(2);
    expect(countCompletedGuideSteps(getAllGuideStepIds())).toBe(getAllGuideStepIds().length);
  });
});
