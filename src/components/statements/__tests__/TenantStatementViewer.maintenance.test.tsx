import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import TenantStatementViewer from '../TenantStatementViewer';
import { PublicTenantStatementPayload } from '@/types/tenantStatement';
import { formatTenantMaintenanceRequestForWhatsApp } from '@/lib/whatsappFormatter';
import { normalizeWhatsAppPhone } from '@/lib/calculations/inspections';

describe('TenantStatementViewer Maintenance WhatsApp Reporting', () => {
  const mockStatementData: PublicTenantStatementPayload = {
    lease: {
      id: 'lease-maint-01',
      unitName: 'Unit 3A',
      tenantName: 'Sipho Zulu',
      leaseStartDate: '2026-01-01',
      leaseEndDate: '2026-12-31',
      monthlyRentZAR: 12500,
      depositHeldZAR: 25000,
    },
    property: {
      id: 'prop-maint-01',
      title: 'Morningside Heights',
      address: '45 Rivonia Road',
      city: 'Sandton',
    },
    landlord: {
      entity_name: 'Apex Property Holdings',
      contact_number: '082 123 4567',
      email: 'landlord@apexholdings.co.za',
    },
    utility_statements: [],
  };

  it('renders the "Report Maintenance Issue via WhatsApp" action button', () => {
    const html = renderToString(<TenantStatementViewer statementData={mockStatementData} />);

    expect(html).toContain('data-testid="report-maintenance-whatsapp-btn"');
    expect(html).toContain('Report Maintenance Issue via WhatsApp');
  });

  it('generates a strictly emoji-free maintenance request text matching formatTenantMaintenanceRequestForWhatsApp', () => {
    const message = formatTenantMaintenanceRequestForWhatsApp({
      propertyTitle: mockStatementData.property.title,
      unitName: mockStatementData.lease.unitName,
      tenantName: mockStatementData.lease.tenantName,
    });

    expect(message).toContain('*MAINTENANCE REQUEST*');
    expect(message).toContain('Property: Morningside Heights');
    expect(message).toContain('Unit: Unit 3A');
    expect(message).toContain('Tenant: Sipho Zulu');
    expect(message).toContain('• Category (Plumbing / Electrical / Appliance / Structural / General Wear):');
    expect(message).toContain('• Description of the issue:');
    expect(message).toContain('• Urgency (Emergency / Urgent / Routine):');

    // Unicode emoji ban regex check
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
    expect(message).not.toMatch(emojiRegex);
  });

  it('normalizes landlord contact number and builds valid wa.me URL query', () => {
    const normalizedPhone = normalizeWhatsAppPhone(mockStatementData.landlord.contact_number || undefined);
    expect(normalizedPhone).toBe('27821234567');

    const message = formatTenantMaintenanceRequestForWhatsApp({
      propertyTitle: mockStatementData.property.title,
      unitName: mockStatementData.lease.unitName,
      tenantName: mockStatementData.lease.tenantName,
    });

    const targetUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
    expect(targetUrl).toContain('https://wa.me/27821234567?text=');
    expect(targetUrl).toContain(encodeURIComponent('*MAINTENANCE REQUEST*'));
  });

  it('generates fully populated emoji-free WhatsApp text when tenant completes intake fields', () => {
    const message = formatTenantMaintenanceRequestForWhatsApp({
      propertyTitle: mockStatementData.property.title,
      unitName: mockStatementData.lease.unitName,
      tenantName: mockStatementData.lease.tenantName,
      category: 'Plumbing',
      description: 'Geyser thermostat burst leaking through bathroom ceiling',
      urgency: 'Emergency',
      preferredAccess: 'Immediate / anytime today',
    });

    expect(message).toContain('*MAINTENANCE REQUEST*');
    expect(message).toContain('• Property: Morningside Heights');
    expect(message).toContain('• Unit: Unit 3A');
    expect(message).toContain('• Tenant: Sipho Zulu');
    expect(message).toContain('*ISSUE DETAILS*');
    expect(message).toContain('• Category: Plumbing');
    expect(message).toContain('• Urgency: Emergency');
    expect(message).toContain('• Description: Geyser thermostat burst leaking through bathroom ceiling');
    expect(message).toContain('• Preferred Access Window: Immediate / anytime today');

    // Emoji-free check
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
    expect(message).not.toMatch(emojiRegex);
  });

  it('formats ticket reference in header and body when ticketRef is provided', () => {
    const message = formatTenantMaintenanceRequestForWhatsApp({
      propertyTitle: mockStatementData.property.title,
      unitName: mockStatementData.lease.unitName,
      tenantName: mockStatementData.lease.tenantName,
      category: 'Electrical',
      description: 'Main tripping repeatedly when stove turned on',
      urgency: 'Urgent',
      ticketRef: 'WO-8842',
    });

    expect(message).toContain('*MAINTENANCE REQUEST [#WO-8842]*');
    expect(message).toContain('• Ticket Reference: #WO-8842 (Logged in System)');
    expect(message).toContain('• Category: Electrical');

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
    expect(message).not.toMatch(emojiRegex);
  });
});
