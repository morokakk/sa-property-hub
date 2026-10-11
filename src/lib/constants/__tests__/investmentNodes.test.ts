import { describe, it, expect } from 'vitest';
import {
  INVESTMENT_REGION_GROUPS,
  ALL_INVESTMENT_NODES,
  findInvestmentNode,
  getNodeComplianceProfile,
} from '../investmentNodes';
import {
  isWesternCapeRegion,
  isGautengRegion,
  isCoastalRegion,
} from '@/components/common/ComplianceChecklist';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { OpportunityDeal } from '@/types';

describe('35 Curated Investment Nodes & Regional Compliance Engine', () => {
  it('contains exactly 5 regions and 35 total investment nodes', () => {
    expect(INVESTMENT_REGION_GROUPS).toHaveLength(5);
    expect(ALL_INVESTMENT_NODES).toHaveLength(35);

    // Group 1: Gauteng JHB (10)
    expect(INVESTMENT_REGION_GROUPS[0].nodes).toHaveLength(10);
    expect(INVESTMENT_REGION_GROUPS[0].title).toContain('Greater Johannesburg');

    // Group 2: Gauteng Tshwane (5)
    expect(INVESTMENT_REGION_GROUPS[1].nodes).toHaveLength(5);
    expect(INVESTMENT_REGION_GROUPS[1].title).toContain('Tshwane / Pretoria');

    // Group 3: Western Cape (10)
    expect(INVESTMENT_REGION_GROUPS[2].nodes).toHaveLength(10);
    expect(INVESTMENT_REGION_GROUPS[2].title).toContain('Western Cape');

    // Group 4: KwaZulu-Natal (5)
    expect(INVESTMENT_REGION_GROUPS[3].nodes).toHaveLength(5);
    expect(INVESTMENT_REGION_GROUPS[3].title).toContain('KwaZulu-Natal');

    // Group 5: Coastal & Emerging (5)
    expect(INVESTMENT_REGION_GROUPS[4].nodes).toHaveLength(5);
    expect(INVESTMENT_REGION_GROUPS[4].title).toContain('Emerging Growth Corridors');
  });

  it('verifies all 35 nodes have non-empty profiles, provinces, and compliance zones', () => {
    ALL_INVESTMENT_NODES.forEach((node) => {
      expect(node.id).toBeTruthy();
      expect(node.name).toBeTruthy();
      expect(node.primaryInvestmentProfile).toBeTruthy();
      expect(node.province).toBeTruthy();
      expect(['inland', 'coastal', 'western_cape']).toContain(node.complianceZone);
      expect(node.recommendedStrategies.length).toBeGreaterThan(0);
      expect(node.complianceNotes).toBeTruthy();
    });
  });

  it('correctly maps Polokwane to Limpopo province and Bloemfontein to Free State', () => {
    const polokwane = findInvestmentNode('Polokwane (Bendor & Central)');
    expect(polokwane).toBeDefined();
    expect(polokwane?.province).toBe('Limpopo');
    expect(polokwane?.complianceZone).toBe('inland');

    const bloemfontein = findInvestmentNode('Bloemfontein (Universitas & Willows)');
    expect(bloemfontein).toBeDefined();
    expect(bloemfontein?.province).toBe('Free State');
    expect(bloemfontein?.complianceZone).toBe('inland');
  });

  it('correctly maps George & Mossel Bay to Western Cape with western_cape compliance zone', () => {
    const george = findInvestmentNode('George & Mossel Bay (Garden Route)');
    expect(george).toBeDefined();
    expect(george?.province).toBe('Western Cape');
    expect(george?.complianceZone).toBe('western_cape');
  });

  it('finds legacy city aliases cleanly', () => {
    expect(findInvestmentNode('Johannesburg')?.name).toBe('Johannesburg CBD & Maboneng');
    expect(findInvestmentNode('Cape Town')?.name).toBe('Cape Town CBD & Foreshore');
    expect(findInvestmentNode('Pretoria')?.name).toBe('Pretoria Central & Sunnyside');
    expect(findInvestmentNode('Durban')?.name).toBe('Durban Central & South Beach');
    expect(findInvestmentNode('Gqeberha')?.name).toBe('Gqeberha (PE — Summerstrand & Central)');
    expect(findInvestmentNode('Stellenbosch')?.name).toBe('Stellenbosch');
  });

  describe('Automated Compliance Defaults (Western Cape vs. Coastal vs. Inland)', () => {
    it('generates mandatory Plumbing and Beetle certificates for Western Cape nodes', () => {
      const cpt = getNodeComplianceProfile('Cape Town CBD & Foreshore', 'Western Cape');
      expect(cpt.zone).toBe('western_cape');
      expect(cpt.defaultCertificates.plumbing?.status).toBe('Pending Inspection');
      expect(cpt.defaultCertificates.beetle?.status).toBe('Pending Inspection');
      expect(cpt.defaultCertificates.electrical?.status).toBe('Pending Inspection');
      expect(cpt.badgeLabel).toContain('Western Cape Compliance');

      // Stellenbosch in Western Cape
      const st = getNodeComplianceProfile('Stellenbosch');
      expect(st.zone).toBe('western_cape');
      expect(st.defaultCertificates.plumbing?.status).toBe('Pending Inspection');
      expect(st.defaultCertificates.beetle?.status).toBe('Pending Inspection');
    });

    it('generates Coastal Beetle and standard electrical for KZN / Eastern Cape coastal nodes', () => {
      const durban = getNodeComplianceProfile('Durban Central & South Beach', 'KwaZulu-Natal');
      expect(durban.zone).toBe('coastal');
      expect(durban.defaultCertificates.beetle?.status).toBe('Pending Inspection');
      expect(durban.defaultCertificates.plumbing?.status).toBe('Not Applicable');
      expect(durban.defaultCertificates.electrical?.status).toBe('Pending Inspection');
      expect(durban.badgeLabel).toContain('Coastal Compliance');

      const pe = getNodeComplianceProfile('Gqeberha (PE — Summerstrand & Central)', 'Eastern Cape');
      expect(pe.zone).toBe('coastal');
      expect(pe.defaultCertificates.beetle?.status).toBe('Pending Inspection');
      expect(pe.defaultCertificates.plumbing?.status).toBe('Not Applicable');
    });

    it('generates Inland compliance with Not Applicable plumbing and beetle for Gauteng / Limpopo / Free State', () => {
      const jhb = getNodeComplianceProfile('Rosebank & Parkhurst', 'Gauteng');
      expect(jhb.zone).toBe('inland');
      expect(jhb.defaultCertificates.plumbing?.status).toBe('Not Applicable');
      expect(jhb.defaultCertificates.beetle?.status).toBe('Not Applicable');
      expect(jhb.defaultCertificates.electrical?.status).toBe('Pending Inspection');
      expect(jhb.badgeLabel).toContain('Inland Compliance');

      const polokwane = getNodeComplianceProfile('Polokwane (Bendor & Central)', 'Limpopo');
      expect(polokwane.zone).toBe('inland');
      expect(polokwane.defaultCertificates.plumbing?.status).toBe('Not Applicable');
      expect(polokwane.defaultCertificates.beetle?.status).toBe('Not Applicable');
    });
  });

  describe('ComplianceChecklist Region Classifiers', () => {
    it('correctly classifies Western Cape, Gauteng, and Coastal regions', () => {
      expect(isWesternCapeRegion('Cape Town CBD & Foreshore')).toBe(true);
      expect(isWesternCapeRegion('Stellenbosch')).toBe(true);
      expect(isWesternCapeRegion('George & Mossel Bay (Garden Route)')).toBe(true);
      expect(isWesternCapeRegion('Rosebank & Parkhurst')).toBe(false);

      expect(isGautengRegion('Rosebank & Parkhurst')).toBe(true);
      expect(isGautengRegion('Pretoria East (Menlyn, Garsfontein, Faerie Glen)')).toBe(true);
      expect(isGautengRegion('Cape Town CBD & Foreshore')).toBe(false);

      expect(isCoastalRegion('Durban Central & South Beach')).toBe(true);
      expect(isCoastalRegion('Ballito & Salt Rock (North Coast)')).toBe(true);
      expect(isCoastalRegion('Gqeberha (PE — Summerstrand & Central)')).toBe(true);
      expect(isCoastalRegion('Rosebank & Parkhurst')).toBe(false);
    });
  });

  describe('Opportunity Promotion CoC Automation', () => {
    it('initializes Western Cape CoCs when promoting a Western Cape deal to Flip', () => {
      const store = usePortfolioStore.getState();
      const mockWcDeal: OpportunityDeal = {
        id: 'opp-wc-test',
        title: 'Camps Bay Flip Opportunity',
        address: '15 Victoria Rd, Camps Bay',
        city: 'Atlantic Seaboard (Sea Point & Green Point)',
        province: 'Western Cape',
        source: 'Private Agent',
        openMarketValueZAR: 4_500_000,
        purchasePrice: 3_800_000,
        builtInEquityZAR: 700_000,
        builtInEquityPercent: 15.5,
        estimatedRehabCost: 350_000,
        monthlyRentalEstimate: 28_000,
        monthlyLevies: 0,
        monthlyRatesTaxes: 2_500,
        annualInsurance: 8_000,
        managementFeePercent: 8,
        vacancyRatePercent: 5,
        targetExitPrice: 5_200_000,
        holdingPeriodMonths: 6,
        loanToValuePercent: 80,
        bondLTV: 80,
        depositZAR: 760_000,
        interestRatePercent: 11.75,
        loanTermYears: 20,
        costs: {
          purchasePrice: 3_800_000,
          transferDuty: 200_000,
          conveyancingFee: 45_000,
          bondRegistrationFee: 40_000,
          deedsOfficeFee: 2_500,
          ficaSundries: 10_000,
          totalAcquisitionCost: 4_097_500,
        },
        grossYield: 8.8,
        capRate: 7.2,
        netRoi: 12.5,
        monthlyCashFlow: 3_500,
        projectedFlipNetProfit: 550_000,
        projectedFlipRoi: 18.2,
        status: 'Due Diligence',
        createdAt: '2026-10-11',
      };

      store.addOpportunity(mockWcDeal);
      store.promoteOpportunityToFlip('opp-wc-test');

      const promotedFlip = usePortfolioStore.getState().flips.find((f) => f.title.includes('Camps Bay'));
      expect(promotedFlip).toBeDefined();
      expect(promotedFlip?.province).toBe('Western Cape');
      expect(promotedFlip?.cocChecklist?.plumbing?.status).toBe('Pending Inspection');
      expect(promotedFlip?.cocChecklist?.beetle?.status).toBe('Pending Inspection');
      expect(promotedFlip?.cocChecklist?.electrical?.status).toBe('Pending Inspection');
    });

    it('initializes Inland CoCs (Not Applicable plumbing/beetle) when promoting a Gauteng deal to Rental', () => {
      const store = usePortfolioStore.getState();
      const mockGautengDeal: OpportunityDeal = {
        id: 'opp-gt-test',
        title: 'Maboneng Micro-Let Unit',
        address: '28 Fox St, Maboneng',
        city: 'Johannesburg CBD & Maboneng',
        province: 'Gauteng',
        source: 'High-Street Auction',
        openMarketValueZAR: 650_000,
        purchasePrice: 480_000,
        builtInEquityZAR: 170_000,
        builtInEquityPercent: 26.1,
        estimatedRehabCost: 40_000,
        monthlyRentalEstimate: 6_200,
        monthlyLevies: 850,
        monthlyRatesTaxes: 450,
        annualInsurance: 0,
        managementFeePercent: 8,
        vacancyRatePercent: 6,
        targetExitPrice: 700_000,
        holdingPeriodMonths: 6,
        loanToValuePercent: 0,
        bondLTV: 0,
        depositZAR: 480_000,
        interestRatePercent: 11.75,
        loanTermYears: 20,
        costs: {
          purchasePrice: 480_000,
          transferDuty: 0,
          conveyancingFee: 18_000,
          bondRegistrationFee: 0,
          deedsOfficeFee: 1_200,
          ficaSundries: 3_000,
          totalAcquisitionCost: 502_200,
        },
        grossYield: 15.5,
        capRate: 11.8,
        netRoi: 14.2,
        monthlyCashFlow: 3_900,
        projectedFlipNetProfit: 120_000,
        projectedFlipRoi: 22.1,
        status: 'Due Diligence',
        createdAt: '2026-10-11',
      };

      store.addOpportunity(mockGautengDeal);
      store.promoteOpportunityToRental('opp-gt-test');

      const promotedRental = usePortfolioStore.getState().rentals.find((r) => r.id.startsWith('rental-'));
      expect(promotedRental).toBeDefined();
      expect(promotedRental?.province).toBe('Gauteng');
      expect(promotedRental?.cocChecklist?.plumbing?.status).toBe('Not Applicable');
      expect(promotedRental?.cocChecklist?.beetle?.status).toBe('Not Applicable');
      expect(promotedRental?.cocChecklist?.electrical?.status).toBe('Pending Inspection');
    });
  });
});
