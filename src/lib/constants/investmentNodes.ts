import { Province, DealStrategy, ComplianceCertificates } from '@/types';

export interface NodeMarketBenchmarks {
  grossYieldRangePercent: [number, number];
  typicalVacancyPercent: number;
  typicalCapitalGrowthPercent: number;
  pricePerSqmRangeZAR: [number, number];
  typicalMonthlyRatesPercentOfVal: number;
}

export interface NodeBenchmarkAuditItem {
  metric: 'grossYield' | 'vacancyRate' | 'capitalGrowth' | 'pricePerSqm' | 'monthlyRates';
  label: string;
  status: 'optimistic' | 'conservative' | 'aligned';
  message: string;
  benchmarkLabel: string;
}

export interface NodeBenchmarkAuditResult {
  node: InvestmentNode;
  items: NodeBenchmarkAuditItem[];
  optimisticCount: number;
  alignedStrategy: boolean;
}

export interface InvestmentNode {
  id: string;
  name: string;
  regionGroup: string;
  regionGroupId: string;
  province: Province;
  complianceZone: 'inland' | 'coastal' | 'western_cape';
  primaryInvestmentProfile: string;
  recommendedStrategies: DealStrategy[];
  complianceNotes: string;
  benchmarks: NodeMarketBenchmarks;
}

export interface InvestmentRegionGroup {
  id: string;
  title: string;
  nodes: InvestmentNode[];
}

export const INVESTMENT_REGION_GROUPS: InvestmentRegionGroup[] = [
  {
    id: 'gauteng_jhb',
    title: '1. Gauteng — Greater Johannesburg & East/West Rand',
    nodes: [
      {
        id: 'jhb_cbd_maboneng',
        name: 'Johannesburg CBD & Maboneng',
        regionGroup: 'Gauteng — Greater Johannesburg & East/West Rand',
        regionGroupId: 'gauteng_jhb',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'High-density multi-let, student housing, micro-apartments.',
        recommendedStrategies: ['Rental', 'BRRRR'],
        complianceNotes: 'Inland: Standard OHS Electrical, Gas & Electric Fence. Section 118 municipal rates clearance required.',
        benchmarks: {
          grossYieldRangePercent: [11.5, 16.0],
          typicalVacancyPercent: 8.0,
          typicalCapitalGrowthPercent: 3.0,
          pricePerSqmRangeZAR: [6500, 12500],
          typicalMonthlyRatesPercentOfVal: 0.065,
        },
      },
      {
        id: 'braamfontein',
        name: 'Braamfontein',
        regionGroup: 'Gauteng — Greater Johannesburg & East/West Rand',
        regionGroupId: 'gauteng_jhb',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'Dedicated student accommodation (Wits/UJ student commune yields).',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical & Gas. Student fire/safety regulations apply.',
        benchmarks: {
          grossYieldRangePercent: [10.5, 14.5],
          typicalVacancyPercent: 7.0,
          typicalCapitalGrowthPercent: 4.0,
          pricePerSqmRangeZAR: [11000, 18500],
          typicalMonthlyRatesPercentOfVal: 0.065,
        },
      },
      {
        id: 'rosebank_parkhurst',
        name: 'Rosebank & Parkhurst',
        regionGroup: 'Gauteng — Greater Johannesburg & East/West Rand',
        regionGroupId: 'gauteng_jhb',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'High-end flips, young professional corporate rentals.',
        recommendedStrategies: ['Flip', 'Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical, Electric Fence & Gas CoCs.',
        benchmarks: {
          grossYieldRangePercent: [7.5, 10.0],
          typicalVacancyPercent: 4.5,
          typicalCapitalGrowthPercent: 6.0,
          pricePerSqmRangeZAR: [22000, 36000],
          typicalMonthlyRatesPercentOfVal: 0.075,
        },
      },
      {
        id: 'sandton_bryanston',
        name: 'Sandton & Bryanston',
        regionGroup: 'Gauteng — Greater Johannesburg & East/West Rand',
        regionGroupId: 'gauteng_jhb',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'Executive rentals, high-end townhouse flips, sectional title buy-to-lets.',
        recommendedStrategies: ['Flip', 'Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical, Electric Fence & Gas. Sectional title body corporate AGM review.',
        benchmarks: {
          grossYieldRangePercent: [7.5, 10.2],
          typicalVacancyPercent: 5.0,
          typicalCapitalGrowthPercent: 5.5,
          pricePerSqmRangeZAR: [19000, 34000],
          typicalMonthlyRatesPercentOfVal: 0.075,
        },
      },
      {
        id: 'fourways_lonehill',
        name: 'Fourways & Lonehill',
        regionGroup: 'Gauteng — Greater Johannesburg & East/West Rand',
        regionGroupId: 'gauteng_jhb',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'Young family rentals, sectional schemes, consistent tenant demand.',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical & Gas. Secure complex conduct rules apply.',
        benchmarks: {
          grossYieldRangePercent: [8.5, 11.0],
          typicalVacancyPercent: 5.0,
          typicalCapitalGrowthPercent: 5.0,
          pricePerSqmRangeZAR: [13500, 21000],
          typicalMonthlyRatesPercentOfVal: 0.068,
        },
      },
      {
        id: 'randburg_ferndale_blairgowrie',
        name: 'Randburg (Ferndale & Blairgowrie)',
        regionGroup: 'Gauteng — Greater Johannesburg & East/West Rand',
        regionGroupId: 'gauteng_jhb',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'Prime buy-and-flip node, large erfs suitable for cottage/multi-let conversions.',
        recommendedStrategies: ['Flip', 'BRRRR'],
        complianceNotes: 'Inland: Standard OHS Electrical, Electric Fence & Surveyor-General (SG) approved plans for cottage additions.',
        benchmarks: {
          grossYieldRangePercent: [9.5, 13.0],
          typicalVacancyPercent: 5.0,
          typicalCapitalGrowthPercent: 5.0,
          pricePerSqmRangeZAR: [11000, 18000],
          typicalMonthlyRatesPercentOfVal: 0.065,
        },
      },
      {
        id: 'midrand_waterfall_noordwyk',
        name: 'Midrand (Waterfall & Noordwyk)',
        regionGroup: 'Gauteng — Greater Johannesburg & East/West Rand',
        regionGroupId: 'gauteng_jhb',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'Off-plan sectional titles, logistics corridor worker rentals.',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical & Gas CoC. NHBRC warranty on newer sectional schemes.',
        benchmarks: {
          grossYieldRangePercent: [9.0, 11.8],
          typicalVacancyPercent: 5.5,
          typicalCapitalGrowthPercent: 5.2,
          pricePerSqmRangeZAR: [12500, 22000],
          typicalMonthlyRatesPercentOfVal: 0.065,
        },
      },
      {
        id: 'roodepoort_florida_weltevreden',
        name: 'Roodepoort (Florida & Weltevreden Park)',
        regionGroup: 'Gauteng — Greater Johannesburg & East/West Rand',
        regionGroupId: 'gauteng_jhb',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'Affordable entry, high rental yields, cash-flow flips.',
        recommendedStrategies: ['Flip', 'Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical & Gas. Check municipal debt on older sectional blocks.',
        benchmarks: {
          grossYieldRangePercent: [9.8, 13.0],
          typicalVacancyPercent: 6.0,
          typicalCapitalGrowthPercent: 4.5,
          pricePerSqmRangeZAR: [9500, 15500],
          typicalMonthlyRatesPercentOfVal: 0.062,
        },
      },
      {
        id: 'bedfordview_edenvale',
        name: 'Bedfordview & Edenvale',
        regionGroup: 'Gauteng — Greater Johannesburg & East/West Rand',
        regionGroupId: 'gauteng_jhb',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'Established suburban flips, secure cluster developments.',
        recommendedStrategies: ['Flip', 'Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical, Electric Fence & Gas CoCs.',
        benchmarks: {
          grossYieldRangePercent: [8.5, 11.2],
          typicalVacancyPercent: 5.0,
          typicalCapitalGrowthPercent: 5.2,
          pricePerSqmRangeZAR: [12500, 21000],
          typicalMonthlyRatesPercentOfVal: 0.068,
        },
      },
      {
        id: 'kempton_boksburg',
        name: 'Kempton Park & Boksburg',
        regionGroup: 'Gauteng — Greater Johannesburg & East/West Rand',
        regionGroupId: 'gauteng_jhb',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'Airport logistics worker housing, affordable multi-unit rentals.',
        recommendedStrategies: ['Rental', 'BRRRR'],
        complianceNotes: 'Inland: Standard OHS Electrical & Gas CoC. Ekurhuleni municipal rates clearance.',
        benchmarks: {
          grossYieldRangePercent: [10.0, 13.5],
          typicalVacancyPercent: 5.5,
          typicalCapitalGrowthPercent: 4.5,
          pricePerSqmRangeZAR: [9000, 15000],
          typicalMonthlyRatesPercentOfVal: 0.065,
        },
      },
    ],
  },
  {
    id: 'gauteng_tshwane',
    title: '2. Gauteng — City of Tshwane / Pretoria',
    nodes: [
      {
        id: 'pretoria_central_sunnyside',
        name: 'Pretoria Central & Sunnyside',
        regionGroup: 'Gauteng — City of Tshwane / Pretoria',
        regionGroupId: 'gauteng_tshwane',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'High-density student and government worker multi-lets.',
        recommendedStrategies: ['Rental', 'BRRRR'],
        complianceNotes: 'Inland: Standard OHS Electrical & Gas CoC. Tshwane municipal utility sub-metering check.',
        benchmarks: {
          grossYieldRangePercent: [11.0, 15.5],
          typicalVacancyPercent: 7.5,
          typicalCapitalGrowthPercent: 3.5,
          pricePerSqmRangeZAR: [7000, 12500],
          typicalMonthlyRatesPercentOfVal: 0.065,
        },
      },
      {
        id: 'hatfield_brooklyn',
        name: 'Hatfield & Brooklyn',
        regionGroup: 'Gauteng — City of Tshwane / Pretoria',
        regionGroupId: 'gauteng_tshwane',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'High-yield student communes (TUKS / UP feeder node).',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical & Gas. UP accreditation compliance & student commune zoning.',
        benchmarks: {
          grossYieldRangePercent: [9.5, 13.5],
          typicalVacancyPercent: 5.5,
          typicalCapitalGrowthPercent: 5.5,
          pricePerSqmRangeZAR: [14500, 24000],
          typicalMonthlyRatesPercentOfVal: 0.070,
        },
      },
      {
        id: 'pretoria_east',
        name: 'Pretoria East (Menlyn, Garsfontein, Faerie Glen)',
        regionGroup: 'Gauteng — City of Tshwane / Pretoria',
        regionGroupId: 'gauteng_tshwane',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'High capital growth, flips, modern security estate rentals.',
        recommendedStrategies: ['Flip', 'Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical, Electric Fence & Gas CoCs.',
        benchmarks: {
          grossYieldRangePercent: [8.0, 10.8],
          typicalVacancyPercent: 4.5,
          typicalCapitalGrowthPercent: 6.0,
          pricePerSqmRangeZAR: [15000, 26000],
          typicalMonthlyRatesPercentOfVal: 0.070,
        },
      },
      {
        id: 'centurion',
        name: 'Centurion (Die Hoewes & Clubview)',
        regionGroup: 'Gauteng — City of Tshwane / Pretoria',
        regionGroupId: 'gauteng_tshwane',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'Gautrain commuter belt, mid-tier sectional title rentals.',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical & Gas. Dolomite stability certificates where applicable.',
        benchmarks: {
          grossYieldRangePercent: [9.0, 11.8],
          typicalVacancyPercent: 5.0,
          typicalCapitalGrowthPercent: 5.0,
          pricePerSqmRangeZAR: [11500, 18500],
          typicalMonthlyRatesPercentOfVal: 0.065,
        },
      },
      {
        id: 'akasia_pretoria_north',
        name: 'Akasia & Pretoria North',
        regionGroup: 'Gauteng — City of Tshwane / Pretoria',
        regionGroupId: 'gauteng_tshwane',
        province: 'Gauteng',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'Affordable residential flips, high-demand starter family lets.',
        recommendedStrategies: ['Flip', 'Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical & Gas CoCs.',
        benchmarks: {
          grossYieldRangePercent: [9.8, 12.8],
          typicalVacancyPercent: 5.5,
          typicalCapitalGrowthPercent: 4.8,
          pricePerSqmRangeZAR: [8500, 14500],
          typicalMonthlyRatesPercentOfVal: 0.062,
        },
      },
    ],
  },
  {
    id: 'western_cape',
    title: '3. Western Cape — Cape Metro & Winelands',
    nodes: [
      {
        id: 'cpt_cbd_foreshore',
        name: 'Cape Town CBD & Foreshore',
        regionGroup: 'Western Cape — Cape Metro & Winelands',
        regionGroupId: 'western_cape',
        province: 'Western Cape',
        complianceZone: 'western_cape',
        primaryInvestmentProfile: 'Short-term/Airbnb lets, sectional title studio rentals.',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Western Cape Mandate: City of Cape Town Plumbing By-Law & Beetle Clearance certificates mandatory.',
        benchmarks: {
          grossYieldRangePercent: [7.5, 11.5],
          typicalVacancyPercent: 5.0,
          typicalCapitalGrowthPercent: 7.5,
          pricePerSqmRangeZAR: [32000, 55000],
          typicalMonthlyRatesPercentOfVal: 0.055,
        },
      },
      {
        id: 'atlantic_seaboard',
        name: 'Atlantic Seaboard (Sea Point & Green Point)',
        regionGroup: 'Western Cape — Cape Metro & Winelands',
        regionGroupId: 'western_cape',
        province: 'Western Cape',
        complianceZone: 'western_cape',
        primaryInvestmentProfile: 'Luxury flips, high-liquidity capital growth.',
        recommendedStrategies: ['Flip', 'Rental'],
        complianceNotes: 'Western Cape Mandate: City of Cape Town Plumbing By-Law & Beetle Clearance certificates mandatory.',
        benchmarks: {
          grossYieldRangePercent: [6.0, 9.0],
          typicalVacancyPercent: 4.0,
          typicalCapitalGrowthPercent: 8.5,
          pricePerSqmRangeZAR: [42000, 75000],
          typicalMonthlyRatesPercentOfVal: 0.055,
        },
      },
      {
        id: 'city_bowl',
        name: 'City Bowl (Gardens, Tamboerskloof, Woodstock)',
        regionGroup: 'Western Cape — Cape Metro & Winelands',
        regionGroupId: 'western_cape',
        province: 'Western Cape',
        complianceZone: 'western_cape',
        primaryInvestmentProfile: 'Urban flips, tech worker multi-lets.',
        recommendedStrategies: ['Flip', 'Rental', 'BRRRR'],
        complianceNotes: 'Western Cape Mandate: City of Cape Town Plumbing By-Law & Beetle Clearance certificates mandatory.',
        benchmarks: {
          grossYieldRangePercent: [7.2, 10.5],
          typicalVacancyPercent: 4.0,
          typicalCapitalGrowthPercent: 7.8,
          pricePerSqmRangeZAR: [28000, 48000],
          typicalMonthlyRatesPercentOfVal: 0.055,
        },
      },
      {
        id: 'southern_suburbs',
        name: 'Southern Suburbs (Claremont, Rondebosch, Kenilworth)',
        regionGroup: 'Western Cape — Cape Metro & Winelands',
        regionGroupId: 'western_cape',
        province: 'Western Cape',
        complianceZone: 'western_cape',
        primaryInvestmentProfile: 'UCT student accommodation, high-demand stable rentals.',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Western Cape Mandate: City of Cape Town Plumbing By-Law & Beetle Clearance certificates mandatory.',
        benchmarks: {
          grossYieldRangePercent: [7.5, 10.5],
          typicalVacancyPercent: 3.5,
          typicalCapitalGrowthPercent: 7.2,
          pricePerSqmRangeZAR: [24000, 40000],
          typicalMonthlyRatesPercentOfVal: 0.055,
        },
      },
      {
        id: 'blouberg_table_view',
        name: 'Blouberg & Table View',
        regionGroup: 'Western Cape — Cape Metro & Winelands',
        regionGroupId: 'western_cape',
        province: 'Western Cape',
        complianceZone: 'western_cape',
        primaryInvestmentProfile: 'Coastal lifestyle rentals, holiday letting, buy-and-hold townhouses.',
        recommendedStrategies: ['Rental', 'Flip'],
        complianceNotes: 'Western Cape Mandate: City of Cape Town Plumbing By-Law & Beetle Clearance certificates mandatory.',
        benchmarks: {
          grossYieldRangePercent: [7.8, 10.8],
          typicalVacancyPercent: 4.5,
          typicalCapitalGrowthPercent: 6.8,
          pricePerSqmRangeZAR: [18000, 32000],
          typicalMonthlyRatesPercentOfVal: 0.055,
        },
      },
      {
        id: 'northern_suburbs',
        name: 'Northern Suburbs (Bellville, Durbanville, Parow)',
        regionGroup: 'Western Cape — Cape Metro & Winelands',
        regionGroupId: 'western_cape',
        province: 'Western Cape',
        complianceZone: 'western_cape',
        primaryInvestmentProfile: 'Flips, UWC/CPUT student lets, solid gross yields.',
        recommendedStrategies: ['Flip', 'Rental'],
        complianceNotes: 'Western Cape Mandate: City of Cape Town Plumbing By-Law & Beetle Clearance certificates mandatory.',
        benchmarks: {
          grossYieldRangePercent: [8.8, 12.0],
          typicalVacancyPercent: 4.5,
          typicalCapitalGrowthPercent: 6.2,
          pricePerSqmRangeZAR: [13500, 23000],
          typicalMonthlyRatesPercentOfVal: 0.055,
        },
      },
      {
        id: 'milnerton_century_city',
        name: 'Milnerton & Century City',
        regionGroup: 'Western Cape — Cape Metro & Winelands',
        regionGroupId: 'western_cape',
        province: 'Western Cape',
        complianceZone: 'western_cape',
        primaryInvestmentProfile: 'Secure precinct rentals, corporate tenants.',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Western Cape Mandate: City of Cape Town Plumbing By-Law & Beetle Clearance certificates mandatory.',
        benchmarks: {
          grossYieldRangePercent: [7.8, 10.2],
          typicalVacancyPercent: 4.0,
          typicalCapitalGrowthPercent: 6.8,
          pricePerSqmRangeZAR: [22000, 36000],
          typicalMonthlyRatesPercentOfVal: 0.055,
        },
      },
      {
        id: 'stellenbosch',
        name: 'Stellenbosch',
        regionGroup: 'Western Cape — Cape Metro & Winelands',
        regionGroupId: 'western_cape',
        province: 'Western Cape',
        complianceZone: 'western_cape',
        primaryInvestmentProfile: 'Premium student co-living, resilient capital appreciation.',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Western Cape Mandate: Stellenbosch Municipal Water & Coastal Beetle Clearance certificates mandatory.',
        benchmarks: {
          grossYieldRangePercent: [7.2, 10.5],
          typicalVacancyPercent: 3.0,
          typicalCapitalGrowthPercent: 8.0,
          pricePerSqmRangeZAR: [28000, 48000],
          typicalMonthlyRatesPercentOfVal: 0.052,
        },
      },
      {
        id: 'somerset_west_strand',
        name: 'Somerset West & Strand',
        regionGroup: 'Western Cape — Cape Metro & Winelands',
        regionGroupId: 'western_cape',
        province: 'Western Cape',
        complianceZone: 'western_cape',
        primaryInvestmentProfile: 'Semigration family housing, retirement and buy-to-let flips.',
        recommendedStrategies: ['Flip', 'Rental'],
        complianceNotes: 'Western Cape Mandate: City of Cape Town Plumbing By-Law & Coastal Beetle Clearance certificates mandatory.',
        benchmarks: {
          grossYieldRangePercent: [7.8, 10.5],
          typicalVacancyPercent: 4.5,
          typicalCapitalGrowthPercent: 7.0,
          pricePerSqmRangeZAR: [17000, 30000],
          typicalMonthlyRatesPercentOfVal: 0.055,
        },
      },
      {
        id: 'paarl_wellington',
        name: 'Paarl & Wellington',
        regionGroup: 'Western Cape — Cape Metro & Winelands',
        regionGroupId: 'western_cape',
        province: 'Western Cape',
        complianceZone: 'western_cape',
        primaryInvestmentProfile: 'School-feeder family properties, semigration development corridor.',
        recommendedStrategies: ['Rental', 'Flip'],
        complianceNotes: 'Western Cape Mandate: Drakenstein Municipal Water & Coastal Beetle Clearance certificates required.',
        benchmarks: {
          grossYieldRangePercent: [7.8, 10.6],
          typicalVacancyPercent: 4.5,
          typicalCapitalGrowthPercent: 7.2,
          pricePerSqmRangeZAR: [16000, 29000],
          typicalMonthlyRatesPercentOfVal: 0.055,
        },
      },
    ],
  },
  {
    id: 'kzn',
    title: '4. KwaZulu-Natal — eThekwini Metro & North Coast',
    nodes: [
      {
        id: 'durban_central_south_beach',
        name: 'Durban Central & South Beach',
        regionGroup: 'KwaZulu-Natal — eThekwini Metro & North Coast',
        regionGroupId: 'kzn',
        province: 'KwaZulu-Natal',
        complianceZone: 'coastal',
        primaryInvestmentProfile: 'High-yield micro-units, student accommodation, auction turnarounds.',
        recommendedStrategies: ['Rental', 'BRRRR', 'Flip'],
        complianceNotes: 'Coastal Mandate: Coastal Woodborer Beetle clearance strongly recommended. eThekwini rates clearance required.',
        benchmarks: {
          grossYieldRangePercent: [11.5, 16.0],
          typicalVacancyPercent: 8.0,
          typicalCapitalGrowthPercent: 3.5,
          pricePerSqmRangeZAR: [6500, 12000],
          typicalMonthlyRatesPercentOfVal: 0.075,
        },
      },
      {
        id: 'morningside_berea',
        name: 'Morningside & Berea',
        regionGroup: 'KwaZulu-Natal — eThekwini Metro & North Coast',
        regionGroupId: 'kzn',
        province: 'KwaZulu-Natal',
        complianceZone: 'coastal',
        primaryInvestmentProfile: 'Victorian freehold flips, student commune conversions.',
        recommendedStrategies: ['Flip', 'BRRRR'],
        complianceNotes: 'Coastal Mandate: Coastal Beetle clearance on older timber structures. Standard electrical & gas CoCs.',
        benchmarks: {
          grossYieldRangePercent: [9.0, 12.5],
          typicalVacancyPercent: 5.5,
          typicalCapitalGrowthPercent: 4.8,
          pricePerSqmRangeZAR: [11500, 19500],
          typicalMonthlyRatesPercentOfVal: 0.075,
        },
      },
      {
        id: 'umhlanga_gateway',
        name: 'Umhlanga & Gateway',
        regionGroup: 'KwaZulu-Natal — eThekwini Metro & North Coast',
        regionGroupId: 'kzn',
        province: 'KwaZulu-Natal',
        complianceZone: 'coastal',
        primaryInvestmentProfile: 'High-end corporate rentals, prime commercial and sectional nodes.',
        recommendedStrategies: ['Rental', 'Flip'],
        complianceNotes: 'Coastal Mandate: Coastal Beetle clearance customary; standard OHS Electrical & Gas CoCs.',
        benchmarks: {
          grossYieldRangePercent: [7.8, 10.5],
          typicalVacancyPercent: 5.0,
          typicalCapitalGrowthPercent: 6.2,
          pricePerSqmRangeZAR: [22000, 38000],
          typicalMonthlyRatesPercentOfVal: 0.072,
        },
      },
      {
        id: 'ballito_salt_rock',
        name: 'Ballito & Salt Rock (North Coast)',
        regionGroup: 'KwaZulu-Natal — eThekwini Metro & North Coast',
        regionGroupId: 'kzn',
        province: 'KwaZulu-Natal',
        complianceZone: 'coastal',
        primaryInvestmentProfile: 'Rapidly growing semigration node, gated estate flips.',
        recommendedStrategies: ['Flip', 'Rental'],
        complianceNotes: 'Coastal Mandate: Coastal Beetle clearance; estate architectural/fence compliance.',
        benchmarks: {
          grossYieldRangePercent: [7.8, 10.5],
          typicalVacancyPercent: 4.5,
          typicalCapitalGrowthPercent: 7.2,
          pricePerSqmRangeZAR: [20000, 35000],
          typicalMonthlyRatesPercentOfVal: 0.068,
        },
      },
      {
        id: 'pinetown_westville',
        name: 'Pinetown & Westville',
        regionGroup: 'KwaZulu-Natal — eThekwini Metro & North Coast',
        regionGroupId: 'kzn',
        province: 'KwaZulu-Natal',
        complianceZone: 'coastal',
        primaryInvestmentProfile: 'Affordable light-industrial worker housing, student commune hubs.',
        recommendedStrategies: ['Rental', 'BRRRR'],
        complianceNotes: 'Coastal Mandate: Coastal Beetle clearance; eThekwini municipal clearance and electrical CoC.',
        benchmarks: {
          grossYieldRangePercent: [9.8, 13.2],
          typicalVacancyPercent: 6.0,
          typicalCapitalGrowthPercent: 4.5,
          pricePerSqmRangeZAR: [9500, 16000],
          typicalMonthlyRatesPercentOfVal: 0.075,
        },
      },
    ],
  },
  {
    id: 'coastal_emerging',
    title: '5. Coastal & Emerging Growth Corridors',
    nodes: [
      {
        id: 'gqeberha_summerstrand_central',
        name: 'Gqeberha (PE — Summerstrand & Central)',
        regionGroup: 'Coastal & Emerging Growth Corridors',
        regionGroupId: 'coastal_emerging',
        province: 'Eastern Cape',
        complianceZone: 'coastal',
        primaryInvestmentProfile: 'Affordable coastal multi-lets, NMU student accommodation.',
        recommendedStrategies: ['Rental', 'BRRRR'],
        complianceNotes: 'Coastal Mandate: Coastal Beetle Clearance customary; Nelson Mandela Bay municipal rates clearance.',
        benchmarks: {
          grossYieldRangePercent: [9.8, 13.5],
          typicalVacancyPercent: 5.5,
          typicalCapitalGrowthPercent: 5.0,
          pricePerSqmRangeZAR: [9500, 17500],
          typicalMonthlyRatesPercentOfVal: 0.070,
        },
      },
      {
        id: 'east_london_beacon_bay_vincent',
        name: 'East London (Beacon Bay & Vincent)',
        regionGroup: 'Coastal & Emerging Growth Corridors',
        regionGroupId: 'coastal_emerging',
        province: 'Eastern Cape',
        complianceZone: 'coastal',
        primaryInvestmentProfile: 'High gross yields, municipal and automotive worker rentals.',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Coastal Mandate: Coastal Beetle Clearance customary; Buffalo City municipal clearance.',
        benchmarks: {
          grossYieldRangePercent: [9.5, 12.8],
          typicalVacancyPercent: 5.5,
          typicalCapitalGrowthPercent: 4.8,
          pricePerSqmRangeZAR: [10000, 17500],
          typicalMonthlyRatesPercentOfVal: 0.070,
        },
      },
      {
        id: 'bloemfontein_universitas_willows',
        name: 'Bloemfontein (Universitas & Willows)',
        regionGroup: 'Coastal & Emerging Growth Corridors',
        regionGroupId: 'coastal_emerging',
        province: 'Free State',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'UFS student communes, strong medical node rentals.',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical, Electric Fence & Gas CoCs. Mangaung municipal clearance.',
        benchmarks: {
          grossYieldRangePercent: [10.0, 13.8],
          typicalVacancyPercent: 5.5,
          typicalCapitalGrowthPercent: 4.5,
          pricePerSqmRangeZAR: [9000, 16000],
          typicalMonthlyRatesPercentOfVal: 0.068,
        },
      },
      {
        id: 'george_mossel_bay',
        name: 'George & Mossel Bay (Garden Route)',
        regionGroup: 'Coastal & Emerging Growth Corridors',
        regionGroupId: 'coastal_emerging',
        province: 'Western Cape',
        complianceZone: 'western_cape',
        primaryInvestmentProfile: 'Top-tier semigration market, estate flips, lifestyle rentals.',
        recommendedStrategies: ['Flip', 'Rental'],
        complianceNotes: 'Western Cape Mandate: Garden Route Municipal Water & Coastal Beetle Clearance certificates required.',
        benchmarks: {
          grossYieldRangePercent: [7.2, 10.0],
          typicalVacancyPercent: 4.0,
          typicalCapitalGrowthPercent: 7.8,
          pricePerSqmRangeZAR: [18500, 32000],
          typicalMonthlyRatesPercentOfVal: 0.055,
        },
      },
      {
        id: 'polokwane_bendor_central',
        name: 'Polokwane (Bendor & Central)',
        regionGroup: 'Coastal & Emerging Growth Corridors',
        regionGroupId: 'coastal_emerging',
        province: 'Limpopo',
        complianceZone: 'inland',
        primaryInvestmentProfile: 'High gross rental yields, provincial commercial hub demand.',
        recommendedStrategies: ['Rental'],
        complianceNotes: 'Inland: Standard OHS Electrical, Electric Fence & Gas CoCs. Polokwane municipal rates clearance.',
        benchmarks: {
          grossYieldRangePercent: [9.5, 13.0],
          typicalVacancyPercent: 5.0,
          typicalCapitalGrowthPercent: 5.2,
          pricePerSqmRangeZAR: [10000, 17500],
          typicalMonthlyRatesPercentOfVal: 0.065,
        },
      },
    ],
  },
];

// Flat array of all 35 nodes
export const ALL_INVESTMENT_NODES: InvestmentNode[] = INVESTMENT_REGION_GROUPS.flatMap((g) => g.nodes);

/**
 * Finds an InvestmentNode matching an exact name or legacy city string
 */
export function findInvestmentNode(nameOrCity?: string): InvestmentNode | undefined {
  if (!nameOrCity) return undefined;
  const target = nameOrCity.trim().toLowerCase();

  // 1. Exact or starts-with match
  const exact = ALL_INVESTMENT_NODES.find(
    (n) => n.name.toLowerCase() === target || n.id.toLowerCase() === target
  );
  if (exact) return exact;

  // 2. Direct metro aliases for legacy/default city names
  if (target === 'johannesburg' || target === 'jhb' || target === 'joburg') {
    return ALL_INVESTMENT_NODES.find((n) => n.id === 'jhb_cbd_maboneng');
  }
  if (target === 'cape town' || target === 'cpt') {
    return ALL_INVESTMENT_NODES.find((n) => n.id === 'cpt_cbd_foreshore');
  }
  if (target === 'durban' || target === 'ethekwini') {
    return ALL_INVESTMENT_NODES.find((n) => n.id === 'durban_central_south_beach');
  }
  if (target === 'pretoria' || target === 'tshwane') {
    return ALL_INVESTMENT_NODES.find((n) => n.id === 'pretoria_central_sunnyside');
  }
  if (target === 'gqeberha' || target === 'port elizabeth' || target === 'pe') {
    return ALL_INVESTMENT_NODES.find((n) => n.id === 'gqeberha_summerstrand_central');
  }
  if (target === 'stellenbosch') {
    return ALL_INVESTMENT_NODES.find((n) => n.id === 'stellenbosch');
  }
  if (target === 'polokwane') {
    return ALL_INVESTMENT_NODES.find((n) => n.id === 'polokwane_bendor_central');
  }
  if (target === 'bloemfontein') {
    return ALL_INVESTMENT_NODES.find((n) => n.id === 'bloemfontein_universitas_willows');
  }

  // 3. Suburb / keyword inclusion
  const partial = ALL_INVESTMENT_NODES.find((n) => {
    const nLower = n.name.toLowerCase();
    return nLower.includes(target) || target.includes(nLower);
  });
  if (partial) return partial;

  return undefined;
}

/**
 * Evaluates user underwriting inputs against the selected SA Investment Node's quantitative benchmarks.
 * Enforces Guardrail: evaluates grossYield, vacancyRate, annualCapitalGrowth, and monthlyRates unconditionally,
 * and ONLY triggers the pricePerSqmRangeZAR outlier badge when purchasePricePerSqm > 0.
 */
export function evaluateNodeBenchmarks(
  nodeOrCity: InvestmentNode | string | undefined,
  inputs: {
    strategy?: DealStrategy;
    purchasePrice?: number;
    openMarketValue?: number;
    grossYield?: number;
    vacancyRatePercent?: number;
    annualCapitalGrowthPercent?: number;
    monthlyRatesZAR?: number;
    purchasePricePerSqm?: number;
  }
): NodeBenchmarkAuditResult | null {
  const node = typeof nodeOrCity === 'string' ? findInvestmentNode(nodeOrCity) : nodeOrCity;
  if (!node || !node.benchmarks) return null;

  const {
    grossYieldRangePercent: [minYield, maxYield],
    typicalVacancyPercent,
    typicalCapitalGrowthPercent,
    pricePerSqmRangeZAR: [minSqm, maxSqm],
    typicalMonthlyRatesPercentOfVal,
  } = node.benchmarks;

  const items: NodeBenchmarkAuditItem[] = [];

  // 1. Gross Yield Check (Unconditional when grossYield is provided)
  if (typeof inputs.grossYield === 'number' && inputs.grossYield > 0) {
    const gy = Number(inputs.grossYield.toFixed(1));
    if (gy > maxYield + 1.0) {
      items.push({
        metric: 'grossYield',
        label: 'Gross Yield',
        status: 'optimistic',
        message: `${gy}% exceeds ${node.name} typical ceiling (${minYield}–${maxYield}%)`,
        benchmarkLabel: `${minYield}–${maxYield}%`,
      });
    } else if (gy < minYield - 1.0) {
      items.push({
        metric: 'grossYield',
        label: 'Gross Yield',
        status: 'conservative',
        message: `${gy}% is below ${node.name} typical range (${minYield}–${maxYield}%)`,
        benchmarkLabel: `${minYield}–${maxYield}%`,
      });
    } else {
      items.push({
        metric: 'grossYield',
        label: 'Gross Yield',
        status: 'aligned',
        message: `${gy}% aligns with ${node.name} range (${minYield}–${maxYield}%)`,
        benchmarkLabel: `${minYield}–${maxYield}%`,
      });
    }
  }

  // 2. Vacancy Rate Check (Unconditional)
  if (typeof inputs.vacancyRatePercent === 'number') {
    const vac = Number(inputs.vacancyRatePercent.toFixed(1));
    if (vac < typicalVacancyPercent - 1.5) {
      items.push({
        metric: 'vacancyRate',
        label: 'Vacancy Buffer',
        status: 'optimistic',
        message: `${vac}% is optimistic vs. ${node.name} norm (${typicalVacancyPercent}%)`,
        benchmarkLabel: `${typicalVacancyPercent}%`,
      });
    } else if (vac > typicalVacancyPercent + 2.5) {
      items.push({
        metric: 'vacancyRate',
        label: 'Vacancy Buffer',
        status: 'conservative',
        message: `${vac}% is conservative vs. ${node.name} norm (${typicalVacancyPercent}%)`,
        benchmarkLabel: `${typicalVacancyPercent}%`,
      });
    } else {
      items.push({
        metric: 'vacancyRate',
        label: 'Vacancy Buffer',
        status: 'aligned',
        message: `${vac}% matches ${node.name} norm (${typicalVacancyPercent}%)`,
        benchmarkLabel: `${typicalVacancyPercent}%`,
      });
    }
  }

  // 3. Capital Growth Check (Unconditional)
  if (typeof inputs.annualCapitalGrowthPercent === 'number') {
    const cg = Number(inputs.annualCapitalGrowthPercent.toFixed(1));
    if (cg > typicalCapitalGrowthPercent + 1.5) {
      items.push({
        metric: 'capitalGrowth',
        label: 'Capital Growth',
        status: 'optimistic',
        message: `${cg}% p.a. is aggressive vs. ${node.name} norm (${typicalCapitalGrowthPercent}% p.a.)`,
        benchmarkLabel: `${typicalCapitalGrowthPercent}% p.a.`,
      });
    } else if (cg < typicalCapitalGrowthPercent - 1.5) {
      items.push({
        metric: 'capitalGrowth',
        label: 'Capital Growth',
        status: 'conservative',
        message: `${cg}% p.a. is conservative vs. ${node.name} norm (${typicalCapitalGrowthPercent}% p.a.)`,
        benchmarkLabel: `${typicalCapitalGrowthPercent}% p.a.`,
      });
    } else {
      items.push({
        metric: 'capitalGrowth',
        label: 'Capital Growth',
        status: 'aligned',
        message: `${cg}% p.a. aligns with ${node.name} norm (${typicalCapitalGrowthPercent}% p.a.)`,
        benchmarkLabel: `${typicalCapitalGrowthPercent}% p.a.`,
      });
    }
  }

  // 4. Municipal Rates Check (Unconditional when valuation/price > 0)
  const valBasis = (inputs.openMarketValue && inputs.openMarketValue > 0)
    ? inputs.openMarketValue
    : (inputs.purchasePrice || 0);
  if (valBasis > 0 && typeof inputs.monthlyRatesZAR === 'number') {
    const expectedRates = Math.round(valBasis * (typicalMonthlyRatesPercentOfVal / 100));
    const actualRates = Math.round(inputs.monthlyRatesZAR);
    if (expectedRates > 0 && actualRates < expectedRates * 0.55) {
      items.push({
        metric: 'monthlyRates',
        label: 'Municipal Rates',
        status: 'optimistic',
        message: `R${actualRates.toLocaleString('en-ZA')}/m is low vs. ~R${expectedRates.toLocaleString('en-ZA')}/m node estimate`,
        benchmarkLabel: `~R${expectedRates.toLocaleString('en-ZA')}/m`,
      });
    } else {
      items.push({
        metric: 'monthlyRates',
        label: 'Municipal Rates',
        status: 'aligned',
        message: `R${actualRates.toLocaleString('en-ZA')}/m aligns with ~R${expectedRates.toLocaleString('en-ZA')}/m node estimate`,
        benchmarkLabel: `~R${expectedRates.toLocaleString('en-ZA')}/m`,
      });
    }
  }

  // 5. Price per m² Check — STRICT GUARDRAIL: Only trigger when purchasePricePerSqm > 0
  if (typeof inputs.purchasePricePerSqm === 'number' && inputs.purchasePricePerSqm > 0) {
    const sqmPrice = Math.round(inputs.purchasePricePerSqm);
    const rangeLabel = `R${minSqm.toLocaleString('en-ZA')}–R${maxSqm.toLocaleString('en-ZA')}/m²`;
    if (sqmPrice > maxSqm * 1.1) {
      items.push({
        metric: 'pricePerSqm',
        label: 'Bid Rate / m²',
        status: 'optimistic',
        message: `R${sqmPrice.toLocaleString('en-ZA')}/m² is above ${node.name} ceiling (${rangeLabel})`,
        benchmarkLabel: rangeLabel,
      });
    } else if (sqmPrice < minSqm * 0.9) {
      items.push({
        metric: 'pricePerSqm',
        label: 'Bid Rate / m²',
        status: 'conservative',
        message: `R${sqmPrice.toLocaleString('en-ZA')}/m² is a deep discount below ${node.name} range (${rangeLabel})`,
        benchmarkLabel: rangeLabel,
      });
    } else {
      items.push({
        metric: 'pricePerSqm',
        label: 'Bid Rate / m²',
        status: 'aligned',
        message: `R${sqmPrice.toLocaleString('en-ZA')}/m² is within ${node.name} benchmark (${rangeLabel})`,
        benchmarkLabel: rangeLabel,
      });
    }
  }

  const optimisticCount = items.filter((i) => i.status === 'optimistic').length;
  const alignedStrategy = inputs.strategy
    ? node.recommendedStrategies.includes(inputs.strategy)
    : true;

  return {
    node,
    items,
    optimisticCount,
    alignedStrategy,
  };
}

/**
 * Derives compliance defaults and advisory information for any city/region & province
 */
export function getNodeComplianceProfile(city?: string, province?: string): {
  zone: 'western_cape' | 'coastal' | 'inland';
  badgeLabel: string;
  badgeTone: 'emerald' | 'cyan' | 'blue';
  notes: string;
  defaultCertificates: ComplianceCertificates;
} {
  const node = findInvestmentNode(city);
  const prov = province || node?.province;

  let zone: 'western_cape' | 'coastal' | 'inland' = 'inland';

  if (node) {
    zone = node.complianceZone;
  } else if (prov === 'Western Cape' || (city && (city.toLowerCase().includes('cape') || city.toLowerCase().includes('stellenbosch')))) {
    zone = 'western_cape';
  } else if (
    prov === 'KwaZulu-Natal' ||
    prov === 'Eastern Cape' ||
    (city && (city.toLowerCase().includes('durban') || city.toLowerCase().includes('ballito') || city.toLowerCase().includes('gqeberha')))
  ) {
    zone = 'coastal';
  }

  if (zone === 'western_cape') {
    return {
      zone: 'western_cape',
      badgeLabel: 'Western Cape Compliance: Plumbing By-Law & Beetle Required',
      badgeTone: 'cyan',
      notes: node?.complianceNotes || 'Western Cape Mandate: City of Cape Town / Municipal Plumbing By-Law and Beetle Clearance certificates mandatory.',
      defaultCertificates: {
        electrical: { type: 'Electrical', status: 'Pending Inspection' },
        plumbing: { type: 'Plumbing (Cape Town)', status: 'Pending Inspection' },
        beetle: { type: 'Beetle', status: 'Pending Inspection' },
        gas: { type: 'Gas', status: 'Not Applicable' },
        electricFence: { type: 'Electric Fence', status: 'Not Applicable' },
        approvedPlansSG: { type: 'Approved SG Plans', status: 'Pending Inspection' },
      },
    };
  }

  if (zone === 'coastal') {
    return {
      zone: 'coastal',
      badgeLabel: 'Coastal Compliance: Coastal Beetle Clearance Recommended',
      badgeTone: 'blue',
      notes: node?.complianceNotes || 'Coastal Mandate: Coastal Woodborer Beetle clearance customary. Standard OHS Electrical & Gas CoCs.',
      defaultCertificates: {
        electrical: { type: 'Electrical', status: 'Pending Inspection' },
        beetle: { type: 'Beetle', status: 'Pending Inspection' },
        gas: { type: 'Gas', status: 'Not Applicable' },
        electricFence: { type: 'Electric Fence', status: 'Not Applicable' },
        approvedPlansSG: { type: 'Approved SG Plans', status: 'Pending Inspection' },
        plumbing: { type: 'Plumbing (Cape Town)', status: 'Not Applicable' },
      },
    };
  }

  return {
    zone: 'inland',
    badgeLabel: 'Inland Compliance: Standard OHS & Municipal Clearance',
    badgeTone: 'emerald',
    notes: node?.complianceNotes || 'Inland Standard: Electrical CoC, Electric Fence & Gas. No coastal plumbing or beetle clearance prerequisites.',
    defaultCertificates: {
      electrical: { type: 'Electrical', status: 'Pending Inspection' },
      electricFence: { type: 'Electric Fence', status: 'Not Applicable' },
      gas: { type: 'Gas', status: 'Not Applicable' },
      approvedPlansSG: { type: 'Approved SG Plans', status: 'Pending Inspection' },
      plumbing: { type: 'Plumbing (Cape Town)', status: 'Not Applicable' },
      beetle: { type: 'Beetle', status: 'Not Applicable' },
    },
  };
}
