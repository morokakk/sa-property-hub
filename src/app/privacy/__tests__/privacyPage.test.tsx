import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import PrivacyNoticePage from '../page';

describe('Official POPIA Privacy Policy (/privacy) & Legal Footers', () => {
  it('renders legal constants, hero header, POC financial disclaimer banner, and 4 privacy pillars', () => {
    const html = renderToString(<PrivacyNoticePage />);

    // Top-level legal constants
    expect(html).toContain('Moremela Properties (Pty) Ltd');
    expect(html).toContain('2026/838397/07');
    expect(html).toContain('https://www.moremelaproperties.co.za');
    expect(html).toContain('morokakk@outlook.com');
    expect(html).toContain('October 26, 2026');

    // Hero Header & Action Bar
    expect(html).toContain('POPIA &amp; Statutory Compliance Framework');
    expect(html).toContain('Privacy Notice &amp; Legal Disclaimers');
    expect(html).toContain('Back to Workspace');
    expect(html).toContain('Print / Save PDF');

    // POC Pilot & FAIS / SARS Financial Calculation Disclaimer Banner
    expect(html).toContain('data-testid="poc-legal-disclaimer"');
    expect(html).toContain('Proof of Concept (POC) Pilot &amp; Financial / Statutory Estimate Disclaimer');
    expect(html).toContain('FAIS');
    expect(html).toContain('Section 13sex');
    expect(html).toContain('Legal Practice Council (LPC)');
    expect(html).toContain('Section 118');
    expect(html).toContain('Inclining Block Tariff (IBT)');
    expect(html).toContain('PIE Act');

    // 4 Privacy Pillars
    expect(html).toContain('Local-First by Default');
    expect(html).toContain('sa_property_portfolio_hub_v1');
    expect(html).toContain('Zero Cloud Storage of AI Keys');
    expect(html).toContain('POPIA Operator Safeguards');
    expect(html).toContain('RLS Database Isolation');
    expect(html).toContain('auth.uid() = user_id');
  });

  it('renders all 12 consolidated POPIA privacy notice sections and Section 72 cross-border disclosure', () => {
    const html = renderToString(<PrivacyNoticePage />);

    expect(html).toContain('1. What Information Do We Collect?');
    expect(html).toContain('1A. Local-First Storage vs. Opt-In Cloud Synchronization');
    expect(html).toContain('1B. Personal Information You Disclose to Us');
    expect(html).toContain('1C. Bring Your Own Key (BYOK) AI Credentials');
    expect(html).toContain('1D. No Platform Payment Processing or Card Storage');
    expect(html).not.toContain('paystack');
    expect(html).not.toContain('Paystack');
    expect(html).toContain('1E. Data Processing Roles (POPIA Compliance');
    expect(html).toContain('Responsible Party');
    expect(html).toContain('Operator');
    expect(html).toContain('1F. Product Analytics, Telemetry &amp; Masked Session Diagnostics (PostHog)');
    expect(html).toContain('maskAllInputs: true');

    expect(html).toContain('2. How Do We Process Your Information?');
    expect(html).toContain('3. When and With Whom Do We Share Your Personal Information?');
    expect(html).toContain('Vercel');
    expect(html).toContain('Supabase (eu-central-1)');
    expect(html).toContain('Resend');
    expect(html).toContain('Anthropic (Claude API)');
    expect(html).toContain('Google (Gemini API)');
    expect(html).toContain('PostHog (EU Cloud — eu.i.posthog.com)');

    expect(html).toContain('4. Do We Use Cookies and Local Storage Technologies?');
    expect(html).toContain('5. How Long Do We Keep Your Information?');
    expect(html).toContain('6. How Do We Keep Your Information Safe?');
    expect(html).toContain('noindex, nofollow');
    expect(html).toContain('%PDF-');
    expect(html).toContain('7. Do We Collect Information From Minors?');
    expect(html).toContain('8. What Are Your Privacy Rights &amp; Account Termination');
    expect(html).toContain('9. Controls for Do-Not-Track Features');
    expect(html).toContain('10. Specific Privacy Rights &amp; Cross-Border Transfers');
    expect(html).toContain('POPIA Section 72 Cross-Border Transfer Disclosure');
    expect(html).toContain('Frankfurt, Germany');
    expect(html).toContain('https://inforegulator.org.za');
    expect(html).toContain('enquiries@inforegulator.org.za');
    expect(html).toContain('POPIAComplaints@inforegulator.org.za');
    expect(html).toContain('11. Do We Make Updates to This Notice?');
    expect(html).toContain('12. How Can You Contact Us About This Notice?');
    expect(html).toContain('Gauteng, Republic of South Africa');
  });

  it('wires legal attribution and /privacy links into Sidebar, Settings, and TenantStatementViewer', () => {
    const sidebarSource = fs.readFileSync(
      path.resolve(__dirname, '../../../components/navigation/Sidebar.tsx'),
      'utf-8'
    );
    expect(sidebarSource).toContain('Moremela Properties (Pty) Ltd (2026/838397/07) • POC Estimates Only');
    expect(sidebarSource).toContain('data-testid="sidebar-privacy-link"');
    expect(sidebarSource).toContain('Privacy, POPIA &amp; Legal Disclaimer');
    expect(sidebarSource).toContain('href="/privacy"');

    const settingsSource = fs.readFileSync(
      path.resolve(__dirname, '../../settings/page.tsx'),
      'utf-8'
    );
    expect(settingsSource).toContain('href="/privacy"');
    expect(settingsSource).toContain('Privacy &amp; POPIA Policy');

    const viewerSource = fs.readFileSync(
      path.resolve(__dirname, '../../../components/statements/TenantStatementViewer.tsx'),
      'utf-8'
    );
    expect(viewerSource).toContain('Moremela Properties (Pty) Ltd');
    expect(viewerSource).toContain('(2026/838397/07) as POPIA Operator');
    expect(viewerSource).toContain('href="/privacy"');
    expect(viewerSource).toContain('Privacy Notice');
  });
});
