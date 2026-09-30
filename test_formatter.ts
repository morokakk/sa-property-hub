import { formatOpportunityForWhatsApp, formatProposalPitchForWhatsApp } from './src/lib/whatsappFormatter';

const deal = {
  id: '1',
  title: 'Test Deal',
  address: '123 Test St',
  city: 'Test City',
  province: 'Gauteng',
  source: 'Direct Owner',
  openMarketValueZAR: 1000000,
  purchasePrice: 800000,
  builtInEquityZAR: 200000,
  builtInEquityPercent: 20,
  estimatedRehabCost: 50000,
  monthlyRentalEstimate: 10000,
  monthlyLevies: 1000,
  monthlyRatesTaxes: 500,
  annualInsurance: 2000,
  managementFeePercent: 8,
  vacancyRatePercent: 5,
  targetExitPrice: 1200000,
  holdingPeriodMonths: 6,
  loanToValuePercent: 80,
  bondLTV: 80,
  depositZAR: 160000,
  interestRatePercent: 11.75,
  loanTermYears: 20,
  strategy: 'BRRRR',
  costs: { totalAcquisitionCost: 850000 },
  grossYield: 12,
  capRate: 10,
  netRoi: 15,
  monthlyCashFlow: 3000,
  projectedFlipNetProfit: 200000,
  projectedFlipRoi: 25,
  status: 'Screening',
  createdAt: new Date().toISOString(),
  ancillaryIncomes: [
    {
      id: 'a1',
      type: 'cell_tower',
      tenantName: 'MTN',
      monthlyRentZAR: 5000,
      annualEscalationPercent: 8,
      contractStartDate: '2020-01-01',
      contractEndDate: '2030-12-31',
      vatApplicable: true
    }
  ]
} as any;

console.log(formatOpportunityForWhatsApp(deal));
console.log('---');
console.log(formatProposalPitchForWhatsApp({
  deal: { ...deal, monthlyRent: deal.monthlyRentalEstimate, acquisitionCosts: 50000, renovationBudget: 50000 },
  strategy: 'BRRRR',
  capitalRequested: 500000,
  fundingOfferType: 'Fixed Interest',
  offeredRate: 12,
  securityType: 'Bond'
}));
