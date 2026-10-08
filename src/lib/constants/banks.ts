export interface SouthAfricanBankPreset {
  name: string;
  universalBranchCode: string;
}

export const SOUTH_AFRICAN_BANKS: SouthAfricanBankPreset[] = [
  { name: 'First National Bank (FNB)', universalBranchCode: '250655' },
  { name: 'Standard Bank', universalBranchCode: '051001' },
  { name: 'Nedbank', universalBranchCode: '198765' },
  { name: 'ABSA Bank', universalBranchCode: '632005' },
  { name: 'Capitec Bank', universalBranchCode: '470010' },
  { name: 'Investec Bank', universalBranchCode: '580105' },
  { name: 'Discovery Bank', universalBranchCode: '679000' },
  { name: 'TymeBank', universalBranchCode: '678910' },
  { name: 'African Bank', universalBranchCode: '430000' },
  { name: 'Bidvest Bank', universalBranchCode: '462005' },
  { name: 'Sasfin Bank', universalBranchCode: '683000' },
];

export const ACCOUNT_TYPES = [
  'Cheque / Current',
  'Savings',
  'Transmission',
] as const;
