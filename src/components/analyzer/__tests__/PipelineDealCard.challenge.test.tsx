import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PipelineDealCard } from '../PipelineDealCard';
import { OpportunityDeal } from '@/types';
import { INITIAL_OPPORTUNITIES } from '@/lib/store/initialData';

// Normalizer for React 19 comment tags
const cleanHtml = (html: string): string => html.replace(/<!-- -->/g, '');

let capturedButtonPropsGlobal: ((buttonProps: any) => void) | null = null;

const interceptButton = (type: any, props: any) => {
  if (type === 'button' && props && props.title === 'Promote to Development (/developments)') {
    if (capturedButtonPropsGlobal) {
      capturedButtonPropsGlobal(props);
    }
  }
};

vi.mock('react/jsx-runtime', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    jsx: (type: any, props: any, ...rest: any[]) => {
      interceptButton(type, props);
      return actual.jsx(type, props, ...rest);
    },
    jsxs: (type: any, props: any, ...rest: any[]) => {
      interceptButton(type, props);
      return actual.jsxs(type, props, ...rest);
    },
  };
});

vi.mock('react/jsx-dev-runtime', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    jsxDEV: (type: any, props: any, ...rest: any[]) => {
      interceptButton(type, props);
      return actual.jsxDEV(type, props, ...rest);
    },
  };
});

/**
 * Harness to render PipelineDealCard with isMenuOpen = true under React 19 SSR.
 * Leverages React 19's H dispatcher to intercept the isMenuOpen state and capture button props.
 */
function renderWithMenuOpen(
  element: React.ReactElement,
  onCaptureButton?: (buttonProps: any) => void
): string {
  capturedButtonPropsGlobal = onCaptureButton || null;
  const ReactInternals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

  function MenuOpenWrapper() {
    const H = ReactInternals.H;
    const origUseState = H.useState;
    let callIdx = 0;
    H.useState = (init: any) => {
      callIdx++;
      // First useState call in PipelineDealCard is isMenuOpen
      if (callIdx === 1) {
        return [true, () => {}];
      }
      return origUseState(init);
    };
    return element;
  }

  try {
    return cleanHtml(renderToString(React.createElement(MenuOpenWrapper)));
  } finally {
    capturedButtonPropsGlobal = null;
  }
}

describe('Milestone 4 Challenger: PipelineDealCard Adversarial Stress Tests', () => {
  const baseOpportunity: OpportunityDeal = {
    ...INITIAL_OPPORTUNITIES[0],
    id: 'opp-adv-dev-1',
    title: 'Bryanston 8-Unit Subdivision Opportunity',
    address: '45 Bryanston Drive',
    city: 'Johannesburg',
    province: 'Gauteng',
    status: 'Due Diligence',
    strategy: 'Flip',
    propertyType: 'Freehold House',
  };

  const createProps = (overrides?: Partial<any>) => ({
    deal: baseOpportunity,
    displayDeal: baseOpportunity,
    selected: false,
    onToggleSelect: vi.fn(),
    onEdit: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onAdvanceStage: vi.fn(),
    onPass: vi.fn(),
    onReactivate: vi.fn(),
    onPromoteToFlip: vi.fn(),
    onPromoteToRental: vi.fn(),
    onPromoteToDevelopment: vi.fn(),
    investorProfile: { defaultPrimeRatePercent: 11.75, minDscr: 1.2 },
    copiedDealId: null,
    onCopyWhatsApp: vi.fn(),
    ...overrides,
  });

  // =========================================================================
  // SUB-SUITE 1: Status Badge Rendering
  // =========================================================================
  describe('Status Badge Rendering for Promoted to Development', () => {
    it('renders exact Promoted to Development badge with amber styling', () => {
      const devDeal: OpportunityDeal = {
        ...baseOpportunity,
        status: 'Promoted to Development',
      };
      const props = createProps({ deal: devDeal, displayDeal: devDeal });
      const html = cleanHtml(renderToString(<PipelineDealCard {...props} />));

      expect(html).toContain('Promoted to Development');
      expect(html).toContain('bg-amber-100 text-amber-800 border-amber-300');
    });

    it('renders distinct badges for standard statuses without regression', () => {
      const statuses: Array<{ status: OpportunityDeal['status']; expectedClass: string }> = [
        { status: 'Screening', expectedClass: 'bg-sky-100 text-sky-800 border-sky-300' },
        { status: 'Offer Submitted', expectedClass: 'bg-amber-100 text-amber-800 border-amber-300' },
        { status: 'Due Diligence', expectedClass: 'bg-violet-100 text-violet-800 border-violet-300' },
        { status: 'Passed', expectedClass: 'bg-rose-100 text-rose-800 border-rose-300' },
        { status: 'Promoted to Flip', expectedClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
        { status: 'Promoted to Rental', expectedClass: 'bg-teal-100 text-teal-800 border-teal-300' },
      ];

      for (const { status, expectedClass } of statuses) {
        const deal: OpportunityDeal = { ...baseOpportunity, status };
        const props = createProps({ deal, displayDeal: deal });
        const html = cleanHtml(renderToString(<PipelineDealCard {...props} />));
        expect(html).toContain(status);
        expect(html).toContain(expectedClass);
      }
    });
  });

  // =========================================================================
  // SUB-SUITE 2: Overflow Menu & Confirmation Dialog Execution
  // =========================================================================
  describe('Promotion Menu Action & Confirmation Callback Contract', () => {
    it('renders Promote to Development menu item when isMenuOpen is true', () => {
      const onPromote = vi.fn();
      const props = createProps({ onPromoteToDevelopment: onPromote });
      const html = renderWithMenuOpen(<PipelineDealCard {...props} />);

      expect(html).toContain('title="Promote to Development (/developments)"');
      expect(html).toContain('Promote to Development');
      expect(html).toContain('text-amber-800 hover:bg-amber-50');
    });

    it('executes confirmation dialog on click and triggers onPromoteToDevelopment when confirmed (true)', () => {
      let capturedButtonProps: any = null;
      const onPromote = vi.fn();
      const props = createProps({ onPromoteToDevelopment: onPromote });

      renderWithMenuOpen(<PipelineDealCard {...props} />, (btn) => {
        capturedButtonProps = btn;
      });

      expect(capturedButtonProps).not.toBeNull();
      expect(typeof capturedButtonProps.onClick).toBe('function');

      // Mock window.confirm returning true
      const confirmSpy = vi.fn().mockReturnValue(true);
      (globalThis as any).confirm = confirmSpy;

      // Simulate user clicking "Promote to Development"
      capturedButtonProps.onClick();

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(confirmSpy).toHaveBeenCalledWith(
        `Promote "${baseOpportunity.title}" to Developments Project (/developments)?`
      );
      expect(onPromote).toHaveBeenCalledTimes(1);
      expect(onPromote).toHaveBeenCalledWith(baseOpportunity.id);
    });

    it('does NOT trigger onPromoteToDevelopment when confirmation dialog is cancelled (false)', () => {
      let capturedButtonProps: any = null;
      const onPromote = vi.fn();
      const props = createProps({ onPromoteToDevelopment: onPromote });

      renderWithMenuOpen(<PipelineDealCard {...props} />, (btn) => {
        capturedButtonProps = btn;
      });

      expect(capturedButtonProps).not.toBeNull();

      // Mock window.confirm returning false (user pressed Cancel)
      const confirmSpy = vi.fn().mockReturnValue(false);
      (globalThis as any).confirm = confirmSpy;

      capturedButtonProps.onClick();

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(onPromote).not.toHaveBeenCalled();
    });

    it('omits Promote to Development option if deal status is "Passed"', () => {
      let capturedButtonProps: any = null;
      const passedDeal: OpportunityDeal = {
        ...baseOpportunity,
        status: 'Passed',
        passReason: 'Yield Too Low',
      };
      const onPromote = vi.fn();
      const props = createProps({ deal: passedDeal, displayDeal: passedDeal, onPromoteToDevelopment: onPromote });
      const html = renderWithMenuOpen(<PipelineDealCard {...props} />, (btn) => {
        capturedButtonProps = btn;
      });

      expect(html).not.toContain('title="Promote to Development (/developments)"');
      expect(html).not.toContain('Promote to Development');
      expect(capturedButtonProps).toBeNull();
    });

    it('omits Promote to Development option if onPromoteToDevelopment prop is undefined', () => {
      let capturedButtonProps: any = null;
      const props = createProps({ onPromoteToDevelopment: undefined });
      const html = renderWithMenuOpen(<PipelineDealCard {...props} />, (btn) => {
        capturedButtonProps = btn;
      });

      expect(html).not.toContain('title="Promote to Development (/developments)"');
      expect(capturedButtonProps).toBeNull();
    });
  });
});
