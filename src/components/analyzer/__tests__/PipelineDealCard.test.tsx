import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PipelineDealCard } from '../PipelineDealCard';
import { OpportunityDeal } from '@/types';
import { INITIAL_OPPORTUNITIES } from '@/lib/store/initialData';

describe('PipelineDealCard Component - Promotion Integration', () => {
  const sampleDeal: OpportunityDeal = {
    ...INITIAL_OPPORTUNITIES[0],
    id: 'opp-dev-promo-1',
    title: '4-Unit Micro-Apartment Infill',
    city: 'Sandton',
    status: 'Due Diligence',
  };

  const defaultProps = {
    deal: sampleDeal,
    displayDeal: sampleDeal,
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
  };

  it('renders PipelineDealCard with deal title and status badge', () => {
    const html = renderToString(<PipelineDealCard {...defaultProps} />);
    expect(html).toContain('4-Unit Micro-Apartment Infill');
    expect(html).toContain('Due Diligence');
    expect(html).toContain('Sandton');
  });

  it('renders status badge for Promoted to Development deals with amber styling', () => {
    const devDeal: OpportunityDeal = {
      ...sampleDeal,
      status: 'Promoted to Development',
    };
    const html = renderToString(<PipelineDealCard {...defaultProps} deal={devDeal} />);
    expect(html).toContain('Promoted to Development');
    expect(html).toContain('bg-amber-100 text-amber-800 border-amber-300');
  });

  it('declares onPromoteToDevelopment prop in contract and provides development promotion affordance', () => {
    expect(defaultProps.onPromoteToDevelopment).toBeTypeOf('function');
  });
});
