import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import FeedbackModal from '../FeedbackModal';

vi.mock('next/navigation', () => ({
  usePathname: () => '/rentals',
}));

describe('FeedbackModal Component Rendering', () => {
  it('returns null when isOpen is false', () => {
    const html = renderToString(
      <FeedbackModal isOpen={false} onClose={() => {}} />
    );
    expect(html).toBe('');
  });

  it('renders modal dialog and responsive container when isOpen is true', () => {
    const html = renderToString(
      <FeedbackModal isOpen={true} onClose={() => {}} />
    );

    // Accessibility and container attributes
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('data-testid="feedback-modal-container"');

    // Title and branding
    expect(html).toContain('Feedback &amp; Ideas');
    expect(html).toContain('Help improve South African property investing workflows.');

    // 4 standard categories
    expect(html).toContain('Bug / Issue');
    expect(html).toContain('Feature Request');
    expect(html).toContain('SA Tax / Math');
    expect(html).toContain('General UX');

    // Controls
    expect(html).toContain('data-testid="feedback-message-textarea"');
    expect(html).toContain('data-testid="feedback-submit-button"');
    expect(html).toContain('data-testid="feedback-whatsapp-button"');

    // Diagnostics indicator
    expect(html).toContain('Auto Diagnostics Attached');
    expect(html).toContain('POPIA Safe');
  });

  it('pre-selects current module route from pathname', () => {
    const html = renderToString(
      <FeedbackModal isOpen={true} onClose={() => {}} />
    );
    expect(html).toContain('Rental Portfolio (/rentals)');
  });

  it('respects initialCategory and initialModuleRoute overrides', () => {
    const html = renderToString(
      <FeedbackModal
        isOpen={true}
        onClose={() => {}}
        initialCategory="data_math"
        initialModuleRoute="/flips"
      />
    );
    expect(html).toContain('Buy-and-Flip BoQ (/flips)');
    // Active category card receives highlighted style
    expect(html).toContain('bg-emerald-950/60');
  });
});
