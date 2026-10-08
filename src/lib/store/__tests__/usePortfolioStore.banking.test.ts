import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { SOUTH_AFRICAN_BANKS } from '@/lib/constants/banks';

describe('usePortfolioStore Investor Banking Details', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('initializes investorProfile with default SA banking details', () => {
    const profile = usePortfolioStore.getState().investorProfile;
    expect(profile.bankName).toBe('First National Bank (FNB)');
    expect(profile.accountHolder).toBe('L&M Property Investments (Pty) Ltd');
    expect(profile.accountNumber).toBe('62891044321');
    expect(profile.branchCode).toBe('250655');
    expect(profile.accountType).toBe('Cheque / Current');
    expect(profile.swiftCode).toBe('FIRNZAJJ');
    expect(profile.remittanceInstructions).toContain('POP');
  });

  it('updates banking details using updateInvestorProfile', () => {
    usePortfolioStore.getState().updateInvestorProfile({
      bankName: 'Standard Bank',
      accountHolder: 'Apex Holdings Pty Ltd',
      accountNumber: '00123456789',
      branchCode: '051001',
      accountType: 'Current',
      swiftCode: 'SBZAJJ',
      remittanceInstructions: 'Reference unit number strictly on all EFT remittances.',
    });

    const profile = usePortfolioStore.getState().investorProfile;
    expect(profile.bankName).toBe('Standard Bank');
    expect(profile.accountHolder).toBe('Apex Holdings Pty Ltd');
    expect(profile.accountNumber).toBe('00123456789');
    expect(profile.branchCode).toBe('051001');
    expect(profile.accountType).toBe('Current');
    expect(profile.swiftCode).toBe('SBZAJJ');
    expect(profile.remittanceInstructions).toBe('Reference unit number strictly on all EFT remittances.');
  });

  it('preserves non-banking profile fields when updating banking details', () => {
    const initialEntityName = usePortfolioStore.getState().investorProfile.entityName;
    const initialEmail = usePortfolioStore.getState().investorProfile.email;

    usePortfolioStore.getState().updateInvestorProfile({
      accountNumber: '99887766554',
      branchCode: '198765',
      bankName: 'Nedbank',
    });

    const profile = usePortfolioStore.getState().investorProfile;
    expect(profile.entityName).toBe(initialEntityName);
    expect(profile.email).toBe(initialEmail);
    expect(profile.accountNumber).toBe('99887766554');
    expect(profile.branchCode).toBe('198765');
    expect(profile.bankName).toBe('Nedbank');
  });

  it('matches universal branch codes defined in SOUTH_AFRICAN_BANKS', () => {
    const fnb = SOUTH_AFRICAN_BANKS.find((b) => b.name === 'First National Bank (FNB)');
    expect(fnb?.universalBranchCode).toBe('250655');

    const sbsa = SOUTH_AFRICAN_BANKS.find((b) => b.name === 'Standard Bank');
    expect(sbsa?.universalBranchCode).toBe('051001');

    const nedbank = SOUTH_AFRICAN_BANKS.find((b) => b.name === 'Nedbank');
    expect(nedbank?.universalBranchCode).toBe('198765');

    const absa = SOUTH_AFRICAN_BANKS.find((b) => b.name === 'ABSA Bank');
    expect(absa?.universalBranchCode).toBe('632005');

    const capitec = SOUTH_AFRICAN_BANKS.find((b) => b.name === 'Capitec Bank');
    expect(capitec?.universalBranchCode).toBe('470010');

    const investec = SOUTH_AFRICAN_BANKS.find((b) => b.name === 'Investec Bank');
    expect(investec?.universalBranchCode).toBe('580105');
  });
});
