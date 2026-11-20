import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  RentalApplicantsModal,
  evaluateBudgetMatch,
  countOpenUnitsWithinBudget,
} from '../modals/RentalApplicantsModal';
import { TenantVettingDrawer } from '../modals/TenantVettingDrawer';
import RentalCard from '../RentalCard';
import { RentalProperty } from '@/types';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

const makeProperty = (overrides: Partial<RentalProperty> = {}): RentalProperty => ({
  id: 'prop-ui-1',
  title: 'Morningside Courtyard',
  address: '22 West Rd',
  city: 'Sandton',
  propertyType: 'Sectional Title Apartment',
  marketValueZAR: 1_800_000,
  purchasePriceZAR: 1_500_000,
  purchaseDate: '2024-01-01',
  outstandingBondBalanceZAR: 1_000_000,
  bondInterestRatePercent: 11.5,
  monthlyBondPaymentZAR: 10_500,
  monthlyGrossRentZAR: 15_000,
  monthlyLeviesZAR: 2_000,
  monthlyRatesTaxesZAR: 1_200,
  monthlyAgentFeeZAR: 0,
  monthlyMaintenanceReserveZAR: 600,
  status: 'Vacant',
  leases: [
    {
      id: 'lease-u1',
      unitName: 'Unit 1',
      tenantName: 'Vacant',
      leaseStartDate: '2025-01-01',
      leaseEndDate: '2025-12-31',
      monthlyRentZAR: 8_000,
      depositHeldZAR: 0,
      annualEscalationPercent: 7,
      status: 'Vacant',
    },
    {
      id: 'lease-u2',
      unitName: 'Unit 2',
      tenantName: 'Notice Tenant',
      leaseStartDate: '2025-01-01',
      leaseEndDate: '2026-12-31',
      monthlyRentZAR: 10_000,
      depositHeldZAR: 10_000,
      annualEscalationPercent: 7,
      status: 'Notice Given',
      vacationDate: '2026-11-30',
      noticeReason: 'Relocating',
    },
  ],
  applicants: [
    {
      id: 'app-ui-1',
      unitName: 'Unit 1',
      fullName: 'Thabo Mokoena',
      phone: '082 555 1234',
      monthlyBudgetZAR: 8_200,
      status: 'Viewing',
      source: 'Walk-In',
      createdAt: '2026-11-20T09:00:00Z',
    },
    {
      id: 'app-ui-2',
      unitName: 'Unit 2',
      fullName: 'Sarah Khumalo',
      phone: '083 444 9876',
      monthlyBudgetZAR: 9_800,
      status: 'Vetted',
      source: 'WhatsApp',
      recommendedDepositZAR: 10_000,
      createdAt: '2026-11-20T09:30:00Z',
    },
  ],
  maintenanceHistory: [],
  ...overrides,
});

const baseCardCallbacks = {
  forecastView: 'wealth-only' as const,
  onForecastViewChange: vi.fn(),
  onOpenEdit: vi.fn(),
  onOpenExit: vi.fn(),
  onOpenRefinance: vi.fn(),
  onOpenAuditHistory: vi.fn(),
  onOpenMaintenance: vi.fn(),
  onOpenMeterModal: vi.fn(),
  onOpenStatementModal: vi.fn(),
  onOpenPmtCalculator: vi.fn(),
  onOpenNoticeModal: vi.fn(),
  onOpenApplicantsModal: vi.fn(),
  onOpenLogPayment: vi.fn(),
  onOpenEditPayment: vi.fn(),
  onOpenWriteOff: vi.fn(),
  onUpdateOpeningBalance: vi.fn(),
  onDeletePayment: vi.fn(),
  onDeleteWriteOff: vi.fn(),
  onMarkMonthPaid: vi.fn(),
  onShowToast: vi.fn(),
  onDeleteProperty: vi.fn(),
  onUpdateProperty: vi.fn(),
};

describe('RentalApplicantsModal, TenantVettingDrawer & RentalCard Turnover UI', () => {
  beforeEach(() => {
    usePortfolioStore.setState({ rentals: [makeProperty()] });
  });

  it('evaluates budget match tiers and open-unit counts accurately', () => {
    expect(evaluateBudgetMatch(10_000, 10_000)).toEqual({
      tier: 'match',
      label: 'Matches Rent',
    });
    expect(evaluateBudgetMatch(9_200, 10_000)).toEqual({
      tier: 'close',
      label: 'Within 10%',
    });
    expect(evaluateBudgetMatch(8_500, 10_000)).toEqual({
      tier: 'below',
      label: 'Below Rent',
    });

    const leases = makeProperty().leases;
    expect(countOpenUnitsWithinBudget(7_500, leases)).toBe(0);
    expect(countOpenUnitsWithinBudget(8_500, leases)).toBe(1);
    expect(countOpenUnitsWithinBudget(10_500, leases)).toBe(2);
  });

  it('renders RentalApplicantsModal with quick capture, filter pills, and contextual promotion actions', () => {
    const prop = makeProperty();
    const html = renderToString(
      <RentalApplicantsModal
        isOpen={true}
        property={prop}
        onClose={vi.fn()}
        onHandOffToNoticeModal={vi.fn()}
      />
    ).replace(/<!-- -->/g, '');

    expect(html).toContain('Open-Day Applicants &amp; Waitlist (2)');
    expect(html).toContain('Open-Day Quick Capture');
    expect(html).toContain('All (2)');
    expect(html).toContain('Viewing (1)');
    expect(html).toContain('Vetted (1)');
    expect(html).toContain('Thabo Mokoena');
    expect(html).toContain('Matches Rent');
    expect(html).toContain('Request Docs');
    expect(html).toContain('Place Tenant');
    expect(html).toContain('Sarah Khumalo');
    expect(html).toContain('Send Approval');
    expect(html).toContain('Assign as Replacement');
  });

  it('supports TenantVettingDrawer with defaultExpanded and optional onApplyDeposit', () => {
    const htmlWithoutApply = renderToString(
      <TenantVettingDrawer
        monthlyRentZAR={10_000}
        onUpdateScorecard={vi.fn()}
        defaultExpanded={true}
      />
    );

    expect(htmlWithoutApply).toContain('Mandatory POPIA Consent');
    expect(htmlWithoutApply).not.toContain('Apply Recommended Deposit');

    const htmlWithApply = renderToString(
      <TenantVettingDrawer
        monthlyRentZAR={10_000}
        onUpdateScorecard={vi.fn()}
        onApplyDeposit={vi.fn()}
        defaultExpanded={true}
      />
    );
    expect(htmlWithApply).toContain('Apply Recommended Deposit');
  });

  it('renders contextual turnover & applicant banners on RentalCard across all 4 states without a 5th tab', () => {
    // 1. Notice Given
    const noticeHtml = renderToString(
      <RentalCard
        property={makeProperty({ status: 'Notice Given' })}
        {...baseCardCallbacks}
      />
    ).replace(/<!-- -->/g, '');
    expect(noticeHtml).toContain('Applicants (2)');
    expect(noticeHtml).toContain('Move-Out');

    // 2. Vacant / Partially Vacant (no notice) with 0 applicants -> + Log Lead
    const vacantHtml = renderToString(
      <RentalCard
        property={makeProperty({
          status: 'Partially Vacant',
          applicants: [],
          leases: [
            { ...makeProperty().leases[0], status: 'Vacant' },
            { ...makeProperty().leases[1], status: 'Occupied' },
          ],
        })}
        {...baseCardCallbacks}
      />
    ).replace(/<!-- -->/g, '');
    expect(vacantHtml).toContain('1 of 2 Units Vacant');
    expect(vacantHtml).toContain('+ Log Lead');

    // 3. Occupied with waitlist leads
    const waitlistHtml = renderToString(
      <RentalCard
        property={makeProperty({
          status: 'Occupied',
          leases: [
            { ...makeProperty().leases[0], status: 'Occupied', tenantName: 'A' },
            { ...makeProperty().leases[1], status: 'Occupied', tenantName: 'B' },
          ],
        })}
        {...baseCardCallbacks}
      />
    ).replace(/<!-- -->/g, '');
    expect(waitlistHtml).toContain('2 Waitlist Leads');

    // 4. Occupied with 0 leads -> completely hidden banner
    const cleanOccupiedHtml = renderToString(
      <RentalCard
        property={makeProperty({
          status: 'Occupied',
          applicants: [],
          leases: [
            { ...makeProperty().leases[0], status: 'Occupied', tenantName: 'A' },
            { ...makeProperty().leases[1], status: 'Occupied', tenantName: 'B' },
          ],
        })}
        {...baseCardCallbacks}
      />
    ).replace(/<!-- -->/g, '');
    expect(cleanOccupiedHtml).not.toContain('Waitlist Lead');
    expect(cleanOccupiedHtml).not.toContain('+ Log Lead');
    expect(cleanOccupiedHtml).not.toContain('Vacant Unit');
  });
});
