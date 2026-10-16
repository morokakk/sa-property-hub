import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import AiApiKeyGuardrailBanner from '../AiApiKeyGuardrailBanner';

describe('AiApiKeyGuardrailBanner Component', () => {
  it('renders missing key notice with Anthropic documentation link when provider is anthropic', () => {
    const html = renderToString(<AiApiKeyGuardrailBanner provider="anthropic" hasApiKey={false} />);

    expect(html).toContain('No AI API Key Configured');
    expect(html).toContain('Anthropic Claude');
    expect(html).toContain('href="https://platform.claude.com/docs/en/get-api-key"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('href="/settings#settings-ai"');
    expect(html).toContain('Anthropic');
  });

  it('renders Google Gemini guidance link when provider is google', () => {
    const html = renderToString(<AiApiKeyGuardrailBanner provider="google" hasApiKey={false} />);

    expect(html).toContain('No AI API Key Configured');
    expect(html).toContain('Google Gemini');
    expect(html).toContain('href="https://aistudio.google.com/app/apikey"');
    expect(html).toContain('Google AI Studio');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('href="/settings#settings-ai"');
  });

  it('renders nothing when hasApiKey is true', () => {
    const html = renderToString(<AiApiKeyGuardrailBanner provider="anthropic" hasApiKey={true} />);
    expect(html).toBe('');
  });
});
