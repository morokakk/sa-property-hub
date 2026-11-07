import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';

let mockIsMenuOpen = false;
let capturedPromoteButtonProps: any = null;
let callIndex = 0;

// Mock react's useState to selectively open isMenuOpen when mockIsMenuOpen is true
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initial: any) => {
      // isMenuOpen is the first useState hook in PipelineDealCard
      if (mockIsMenuOpen && initial === false) {
        callIndex++;
        if (callIndex === 1) {
          return [true, vi.fn()];
        }
      }
      return actual.useState(initial);
    },
  };
});

const interceptButton = (type: any, props: any) => {
  if (type === 'button' && props?.title === 'Promote to Development (/developments)') {
    capturedPromoteButtonProps = props;
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

import { PipelineDealCard } from '../PipelineDealCard';
import { OpportunityDeal } from '@/types';
import { INITIAL_OPPORTUNITIES } from '@/lib/store/initialData';

describe('Adversarial & Edge State Suite: PipelineDealCard Promotion & Badges', () => {
  const baseOpportunity: OpportunityDeal = {
    ...INITIAL_OPPORTUNITIES[0],
    id: 'opp-adv-promo-1',
    title: 'Rosebank 4-Unit Cluster Land',
    city: 'Rosebank',
    province: 'Gauteng',
    status: 'Due Diligence',
  };

  const createProps = (overrides?: Partial<OpportunityDeal>, onPromoteDev?: (id: string) => void) => {
    const deal: OpportunityDeal = { ...baseOpportunity, ...overrides };
    return {
      deal,
      displayDeal: deal,
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
      onPromoteToDevelopment: onPromoteDev,
      investorProfile: { defaultPrimeRatePercent: 11.75, minDscr: 1.2 },
      copiedDealId: null,
      onCopyWhatsApp: vi.fn(),
    };
  };

  beforeEach(() => {
    callIndex = 0;
    mockIsMenuOpen = false;
    capturedPromoteButtonProps = null;
    vi.clearAllMocks();
  });

  // =========================================================================
  // EDGE CASE 4.1: Status Badge Rendering
  // =========================================================================
  describe('Edge Case 4.1: Status Badge Rendering Matrix', () => {
    it('renders "Promoted to Development" with amber styling (bg-amber-100 text-amber-800 border-amber-300)', () => {
      const props = createProps({ status: 'Promoted to Development' });
      const html = renderToString(<PipelineDealCard {...props} />);

      expect(html).toContain('Promoted to Development');
      expect(html).toContain('bg-amber-100 text-amber-800 border-amber-300');
    });

    it('renders all canonical pipeline status badges with correct distinct color classes', () => {
      const statusColorMap: { status: OpportunityDeal['status']; expectedClass: string }[] = [
        { status: 'Screening', expectedClass: 'bg-sky-100 text-sky-800 border-sky-300' },
        { status: 'Offer Submitted', expectedClass: 'bg-amber-100 text-amber-800 border-amber-300' },
        { status: 'Due Diligence', expectedClass: 'bg-violet-100 text-violet-800 border-violet-300' },
        { status: 'Passed', expectedClass: 'bg-rose-100 text-rose-800 border-rose-300' },
        { status: 'Promoted to Flip', expectedClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
        { status: 'Promoted to Development', expectedClass: 'bg-amber-100 text-amber-800 border-amber-300' },
      ];

      statusColorMap.forEach(({ status, expectedClass }) => {
        const props = createProps({ status });
        const html = renderToString(<PipelineDealCard {...props} />);
        expect(html).toContain(status);
        expect(html).toContain(expectedClass);
      });
    });
  });

  // =========================================================================
  // EDGE CASE 4.2: Overflow Menu Action Visibility
  // =========================================================================
  describe('Edge Case 4.2: Promote to Development Action Visibility in Overflow Menu', () => {
    it('renders "Promote to Development (/developments)" in overflow menu when callback provided and status != Passed', () => {
      mockIsMenuOpen = true;
      const onPromote = vi.fn();
      const props = createProps({ status: 'Due Diligence' }, onPromote);

      const html = renderToString(<PipelineDealCard {...props} />);
      expect(html).toContain('Promote to Development');
      expect(html).toContain('title="Promote to Development (/developments)"');
      expect(html).toContain('text-amber-800');
    });

    it('hides "Promote to Development" action when deal.status === "Passed"', () => {
      mockIsMenuOpen = true;
      const onPromote = vi.fn();
      const props = createProps({ status: 'Passed', passReason: 'Yield Too Low' }, onPromote);

      const html = renderToString(<PipelineDealCard {...props} />);
      expect(html).not.toContain('title="Promote to Development (/developments)"');
      expect(capturedPromoteButtonProps).toBeNull();
    });

    it('hides "Promote to Development" action when onPromoteToDevelopment is undefined', () => {
      mockIsMenuOpen = true;
      const props = createProps({ status: 'Due Diligence' }, undefined);

      const html = renderToString(<PipelineDealCard {...props} />);
      expect(html).not.toContain('title="Promote to Development (/developments)"');
      expect(capturedPromoteButtonProps).toBeNull();
    });
  });

  // =========================================================================
  // EDGE CASE 4.3: Confirmation Dialog & Promotion Callback Execution
  // =========================================================================
  describe('Edge Case 4.3: Confirmation Dialog & Callback Execution', () => {
    it('executes onPromoteToDevelopment with deal.id when user confirms dialog', () => {
      mockIsMenuOpen = true;
      const onPromote = vi.fn();
      const props = createProps({ status: 'Due Diligence', title: 'Sandton Infill Erf 401' }, onPromote);

      renderToString(<PipelineDealCard {...props} />);

      expect(capturedPromoteButtonProps).toBeDefined();
      expect(capturedPromoteButtonProps?.onClick).toBeTypeOf('function');

      const confirmMock = vi.fn().mockReturnValue(true);
      globalThis.confirm = confirmMock;

      // Click button
      capturedPromoteButtonProps.onClick();

      // Verify confirm prompt formatting
      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(confirmMock).toHaveBeenCalledWith(
        'Promote "Sandton Infill Erf 401" to Developments Project (/developments)?'
      );

      // Verify callback executed with deal.id
      expect(onPromote).toHaveBeenCalledTimes(1);
      expect(onPromote).toHaveBeenCalledWith(props.deal.id);
    });

    it('cancels promotion without calling onPromoteToDevelopment when user rejects dialog', () => {
      mockIsMenuOpen = true;
      const onPromote = vi.fn();
      const props = createProps({ status: 'Due Diligence', title: 'Sandton Infill Erf 401' }, onPromote);

      renderToString(<PipelineDealCard {...props} />);

      const confirmMock = vi.fn().mockReturnValue(false); // User clicks "Cancel"
      globalThis.confirm = confirmMock;

      // Click button
      capturedPromoteButtonProps.onClick();

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(onPromote).not.toHaveBeenCalled();
    });

    it('preserves deal promotion workflow when deal is already marked "Promoted to Development"', () => {
      const props = createProps({ status: 'Promoted to Development' }, vi.fn());
      const html = renderToString(<PipelineDealCard {...props} />);

      // Must display Promoted to Development badge
      expect(html).toContain('Promoted to Development');
      expect(html).toContain('bg-amber-100 text-amber-800 border-amber-300');

      // Card does not crash or throw
      expect(html).toContain(props.deal.title);
    });
  });
});
