import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { RentalProperty, TenantVettingScorecard } from '@/types';

const sampleScorecard: TenantVettingScorecard = {
  assessmentDate: '2026-11-20',
  popiaConsentRecorded: true,
  bureauCreditScore: 745,
  verifiedNetMonthlyIncomeZAR: 48_000,
  monthlyCpaDebtCommitmentsZAR: 4_000,
  hasOpenJudgmentsOrDefaults: false,
  unpaidDebitOrderCount: 0,
  rentToIncomePercent: 25,
  totalDebtToIncomePercent: 33.3,
  creditScorePoints: 35,
  rentToIncomePoints: 25,
  debtToIncomePoints: 20,
  adverseHistoryPoints: 10,
  bankingStabilityPoints: 10,
  compositeScore: 100,
  riskGrade: 'Grade A (Low Risk)',
  recommendedDepositMultiplier: 1.0,
  isHardFailure: false,
  isPendingInputs: false,
};

const baseMultiUnitProperty: RentalProperty = {
  id: 'prop-turnover-1',
  title: 'Ferndale Twin Suites',
  address: '12 Main Rd, Ferndale',
  city: 'Randburg',
  propertyType: 'Multi-unit Commercial',
  marketValueZAR: 2_500_000,
  purchasePriceZAR: 2_000_000,
  purchaseDate: '2024-01-01',
  outstandingBondBalanceZAR: 1_500_000,
  bondInterestRatePercent: 11.5,
  monthlyBondPaymentZAR: 16_000,
  monthlyGrossRentZAR: 10_000,
  monthlyLeviesZAR: 2_000,
  monthlyRatesTaxesZAR: 1_200,
  monthlyAgentFeeZAR: 0,
  monthlyMaintenanceReserveZAR: 600,
  status: 'Partially Vacant',
  leases: [
    {
      id: 'lease-vacant-old-token',
      unitName: 'Unit A',
      tenantName: 'Vacant',
      leaseStartDate: '2025-01-01',
      leaseEndDate: '2025-12-31',
      monthlyRentZAR: 12_000,
      depositHeldZAR: 0,
      annualEscalationPercent: 7,
      status: 'Vacant',
      statementToken: 'old-departed-tenant-token',
    },
    {
      id: 'lease-occupied-b',
      unitName: 'Unit B',
      tenantName: 'Sarah Ndlovu',
      leaseStartDate: '2025-02-01',
      leaseEndDate: '2027-01-31',
      monthlyRentZAR: 10_000,
      depositHeldZAR: 10_000,
      annualEscalationPercent: 7,
      status: 'Occupied',
    },
  ],
  archivedLeases: [],
  maintenanceHistory: [],
};

describe('Rental Applicants & Turnover Onboarding Engine', () => {
  beforeEach(() => {
    usePortfolioStore.getState().clearAllData();
  });

  it('supports applicant CRUD actions (add, update, delete)', () => {
    usePortfolioStore.getState().addRental(baseMultiUnitProperty);

    usePortfolioStore.getState().addRentalApplicant('prop-turnover-1', {
      unitName: 'Unit A',
      fullName: 'Thabo Mokoena',
      phone: '082 555 1111',
      monthlyBudgetZAR: 12_500,
      status: 'Viewing',
      source: 'Walk-In',
      notes: 'Viewed Saturday open day',
    });

    let prop = usePortfolioStore.getState().rentals.find((r) => r.id === 'prop-turnover-1')!;
    expect(prop.applicants).toHaveLength(1);
    const appId = prop.applicants![0].id;
    expect(prop.applicants![0].fullName).toBe('Thabo Mokoena');
    expect(prop.applicants![0].createdAt).toBeDefined();

    usePortfolioStore.getState().updateRentalApplicant('prop-turnover-1', appId, {
      status: 'Vetted',
      vettingScorecard: sampleScorecard,
      recommendedDepositZAR: 12_500,
    });

    prop = usePortfolioStore.getState().rentals.find((r) => r.id === 'prop-turnover-1')!;
    expect(prop.applicants![0].status).toBe('Vetted');
    expect(prop.applicants![0].vettingScorecard?.riskGrade).toBe('Grade A (Low Risk)');
    expect(prop.applicants![0].recommendedDepositZAR).toBe(12_500);
    expect(prop.applicants![0].updatedAt).toBeDefined();

    usePortfolioStore.getState().deleteRentalApplicant('prop-turnover-1', appId);
    prop = usePortfolioStore.getState().rentals.find((r) => r.id === 'prop-turnover-1')!;
    expect(prop.applicants).toHaveLength(0);
  });

  it('onboardApplicantToVacantUnit places applicant cleanly without archiving dummy Vacant lease, rotates lease id/token, updates gross rent & reconciles status', () => {
    usePortfolioStore.getState().addRental({
      ...baseMultiUnitProperty,
      applicants: [
        {
          id: 'app-chosen',
          unitName: 'Unit A',
          fullName: 'Lerato Molefe',
          phone: '083 111 2222',
          monthlyBudgetZAR: 13_000,
          status: 'Vetted',
          vettingScorecard: sampleScorecard,
          recommendedDepositZAR: 12_500,
          createdAt: '2026-11-20T09:00:00.000Z',
        },
        {
          id: 'app-competing',
          unitName: 'Unit A',
          fullName: 'Kagiso Sithole',
          phone: '084 333 4444',
          monthlyBudgetZAR: 12_000,
          status: 'Applied',
          createdAt: '2026-11-20T09:10:00.000Z',
        },
        {
          id: 'app-waitlist',
          unitName: 'Any / Waitlist',
          fullName: 'Nomsa Dlamini',
          phone: '082 777 8888',
          monthlyBudgetZAR: 11_000,
          status: 'Viewing',
          createdAt: '2026-11-20T09:20:00.000Z',
        },
      ],
    });

    usePortfolioStore
      .getState()
      .onboardApplicantToVacantUnit('prop-turnover-1', 'lease-vacant-old-token', 'app-chosen', {
        monthlyRentZAR: 12_500,
        depositHeldZAR: 12_500,
        leaseStartDate: '2026-12-01',
        leaseEndDate: '2027-11-30',
        tenantEmail: 'lerato@example.co.za',
        declineCompetingForUnit: true,
      });

    const state = usePortfolioStore.getState();
    const prop = state.rentals.find((r) => r.id === 'prop-turnover-1')!;

    // No dummy Vacant tenant archived
    expect(prop.archivedLeases).toHaveLength(0);

    // Status reconciled from Partially Vacant -> Occupied
    expect(prop.status).toBe('Occupied');

    // Gross rent recomputed from all active non-vacant leases (12,500 + 10,000)
    expect(prop.monthlyGrossRentZAR).toBe(22_500);

    // Target lease replaced with fresh ID and cleared statementToken
    const unitA = prop.leases.find((l) => l.unitName === 'Unit A')!;
    expect(unitA.id).not.toBe('lease-vacant-old-token');
    expect(unitA.statementToken).toBeUndefined();
    expect(unitA.status).toBe('Occupied');
    expect(unitA.tenantName).toBe('Lerato Molefe');
    expect(unitA.tenantPhone).toBe('083 111 2222');
    expect(unitA.tenantEmail).toBe('lerato@example.co.za');
    expect(unitA.monthlyRentZAR).toBe(12_500);
    expect(unitA.depositHeldZAR).toBe(12_500);
    expect(unitA.vettingScorecard?.compositeScore).toBe(100);

    // Placed applicant removed; competing Unit A applicant declined; waitlist preserved
    expect(prop.applicants?.find((a) => a.id === 'app-chosen')).toBeUndefined();
    expect(prop.applicants?.find((a) => a.id === 'app-competing')?.status).toBe('Declined');
    expect(prop.applicants?.find((a) => a.id === 'app-waitlist')?.status).toBe('Viewing');

    // Lease expiry task synced for the new lease
    expect(
      state.tasks.some((t) => t.id === `task-lease-expiry-${unitA.id}`)
    ).toBe(true);
  });

  it('finalizeTenantMoveOut replacement branch preserves vettingScorecard + guarantor, updates monthlyGrossRentZAR, and settles applicants', () => {
    usePortfolioStore.getState().addRental({
      ...baseMultiUnitProperty,
      status: 'Notice Given',
      monthlyGrossRentZAR: 22_000,
      leases: [
        {
          id: 'lease-notice-a',
          unitName: 'Unit A',
          tenantName: 'Outgoing Tenant',
          leaseStartDate: '2025-01-01',
          leaseEndDate: '2026-11-30',
          monthlyRentZAR: 12_000,
          depositHeldZAR: 12_000,
          annualEscalationPercent: 7,
          status: 'Notice Given',
          noticeGivenDate: '2026-10-31',
          vacationDate: '2026-11-30',
        },
        baseMultiUnitProperty.leases[1],
      ],
      applicants: [
        {
          id: 'app-rep-1',
          unitName: 'Unit A',
          fullName: 'Replacement Tenant',
          phone: '082 000 1111',
          monthlyBudgetZAR: 13_500,
          status: 'Vetted',
          vettingScorecard: sampleScorecard,
          createdAt: '2026-11-15T10:00:00.000Z',
        },
        {
          id: 'app-rep-competing',
          unitName: 'Unit A',
          fullName: 'Second Lead',
          phone: '082 000 2222',
          monthlyBudgetZAR: 12_500,
          status: 'Applied',
          createdAt: '2026-11-16T10:00:00.000Z',
        },
      ],
    });

    usePortfolioStore.getState().finalizeTenantMoveOut('prop-turnover-1', 'lease-notice-a', {
      vacationDate: '2026-11-30',
      departureReason: 'Relocating / work transfer',
      action: 'replacement',
      placedApplicantId: 'app-rep-1',
      declineCompetingForUnit: true,
      replacementLease: {
        tenantName: 'Replacement Tenant',
        tenantPhone: '082 000 1111',
        leaseStartDate: '2026-12-01',
        leaseEndDate: '2027-11-30',
        monthlyRentZAR: 13_500,
        depositHeldZAR: 13_500,
        vettingScorecard: sampleScorecard,
        guarantorName: 'Parent Sponsor',
        guarantorContact: '+27 82 999 0000',
      },
    });

    const prop = usePortfolioStore.getState().rentals.find((r) => r.id === 'prop-turnover-1')!;
    expect(prop.status).toBe('Occupied');
    expect(prop.monthlyGrossRentZAR).toBe(23_500);
    expect(prop.archivedLeases).toHaveLength(1);
    expect(prop.archivedLeases![0].tenantName).toBe('Outgoing Tenant');

    const unitA = prop.leases.find((l) => l.unitName === 'Unit A')!;
    expect(unitA.tenantName).toBe('Replacement Tenant');
    expect(unitA.vettingScorecard?.riskGrade).toBe('Grade A (Low Risk)');
    expect(unitA.guarantorName).toBe('Parent Sponsor');
    expect(unitA.guarantorContact).toBe('+27 82 999 0000');

    expect(prop.applicants?.find((a) => a.id === 'app-rep-1')).toBeUndefined();
    expect(prop.applicants?.find((a) => a.id === 'app-rep-competing')?.status).toBe('Declined');
  });
});
