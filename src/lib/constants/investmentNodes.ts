import { Province, DealStrategy, ComplianceCertificates } from '@/types';

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
