import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { renderToString } from 'react-dom/server';
import Sidebar from '../Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/rentals',
}));

describe('Sidebar Feedback Engine Triggers', () => {
  it('wires Feedback & Ideas triggers into both Desktop sidebar and Mobile drawer source code', () => {
    const sidebarSource = fs.readFileSync(
      path.resolve(__dirname, '../Sidebar.tsx'),
      'utf-8'
    );

    // Desktop trigger button
    expect(sidebarSource).toContain('data-testid="sidebar-feedback-trigger"');
    expect(sidebarSource).toContain('Feedback &amp; Ideas');

    // Mobile drawer trigger button
    expect(sidebarSource).toContain('data-testid="sidebar-mobile-feedback-trigger"');

    // Modal mount
    expect(sidebarSource).toContain('<FeedbackModal');
    expect(sidebarSource).toContain('isOpen={isFeedbackModalOpen}');
    expect(sidebarSource).toContain('onClose={() => setIsFeedbackModalOpen(false)}');

    // Existing privacy & POPIA links remain 100% intact
    expect(sidebarSource).toContain('data-testid="sidebar-privacy-link"');
    expect(sidebarSource).toContain('data-testid="sidebar-mobile-privacy-link"');
    expect(sidebarSource).toContain('Moremela Properties (Pty) Ltd • POC Estimates Only');

    // Removed decorative SARS Tax Engine widget must stay absent
    for (const staleText of ['SARS Tax Engine', 'v2025/26', 'LPC sliding', 'Legal Practice Council', 'ZAR']) {
      expect(sidebarSource).not.toContain(staleText);
    }
  });

  it('renders the Desktop feedback trigger button without the removed SARS Tax Engine widget', () => {
    const html = renderToString(<Sidebar />);

    expect(html).toContain('data-testid="sidebar-feedback-trigger"');
    expect(html).toContain('Feedback &amp; Ideas');
    for (const staleText of ['SARS Tax Engine', 'v2025/26', 'LPC sliding', 'Legal Practice Council', 'ZAR']) {
      expect(html).not.toContain(staleText);
    }
  });
});
