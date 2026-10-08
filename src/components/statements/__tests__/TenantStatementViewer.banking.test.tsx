import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import TenantStatementViewer from '../TenantStatementViewer';
import { PublicTenantStatementPayload } from '@/types/tenantStatement';

describe('TenantStatementViewer EFT Banking Details Component Rendering', () => {
  const basePayload: PublicTenantStatementPayload = {
    lease: {
      id: 'lease-test-1',
      unitName: 'Unit 4B',
      tenantName: 'Thabo Mokoena',
      leaseStartDate: '2026-01-01',
      leaseEndDate: '2026-12-31',
      monthlyRentZAR: 15000,
      depositHeldZAR: 30000,
    },
    property: {
      id: 'prop-test-1',
      title: 'Sandhurst Executive Suite',
      address: '100 Rivonia Road',
      city: 'Johannesburg',
    },
    landlord: {
      entity_name: 'Apex Properties Ltd',
      contact_number: '+27 11 000 0000',
      email: 'accounts@apex.co.za',
    },
    utility_statements: [],
  };

  it('renders structured EFT banking details card and copy button when account_number is present', () => {
    const payloadWithBank: PublicTenantStatementPayload = {
      ...basePayload,
      landlord: {
        ...basePayload.landlord,
        bank_name: 'First National Bank (FNB)',
        account_holder: 'Apex Properties Ltd',
        account_number: '62891044321',
        account_type: 'Cheque / Current',
        branch_code: '250655',
        swift_code: 'FIRNZAJJ',
        remittance_instructions: 'Strictly EFT payments with tenant reference.',
      },
    };

    const html = renderToString(<TenantStatementViewer statementData={payloadWithBank} />);

    expect(html).toContain('Electronic Funds Transfer (EFT) Banking Details');
    expect(html).toContain('data-testid="statement-banking-details"');
    expect(html).toContain('data-testid="copy-bank-account-btn"');
    expect(html).toContain('print-hidden-element');
    expect(html).toContain('First National Bank (FNB)');
    expect(html).toContain('Apex Properties Ltd');
    expect(html).toContain('62891044321');
    expect(html).toContain('250655');
    expect(html).toContain('Cheque / Current');
    expect(html).toContain('FIRNZAJJ');
    expect(html).toContain('Strictly EFT payments with tenant reference.');
  });

  it('gracefully omits banking details card and copy button when account_number is omitted', () => {
    const payloadWithoutBank: PublicTenantStatementPayload = {
      ...basePayload,
      landlord: {
        ...basePayload.landlord,
        account_number: undefined,
      },
    };

    const html = renderToString(<TenantStatementViewer statementData={payloadWithoutBank} />);

    expect(html).toContain('Remittance');
    expect(html).not.toContain('data-testid="statement-banking-details"');
    expect(html).not.toContain('data-testid="copy-bank-account-btn"');
    expect(html).toContain('Payment Due Date:');
    expect(html).toContain('Payment Reference:');
    expect(html).toContain('accounts@apex.co.za');
  });
});
