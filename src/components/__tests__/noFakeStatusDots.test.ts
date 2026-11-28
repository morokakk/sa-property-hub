import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../..');

function collectNonTestSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      results.push(...collectNonTestSourceFiles(fullPath));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf-8');
}

describe('De-AI Decorative Dot & Fake-Live Pulse Guardrail', () => {
  it('bans animate-ping, animate-pulse, and colored neon glow shadows across non-test src/ files', () => {
    const files = collectNonTestSourceFiles(SRC_ROOT);
    const forbiddenPatterns: Array<{ name: string; regex: RegExp }> = [
      { name: 'animate-ping', regex: /\banimate-ping\b/ },
      { name: 'animate-pulse', regex: /\banimate-pulse\b/ },
      {
        name: 'colored neon shadow glow',
        regex: /\bshadow-(emerald|green|amber|blue|sky|rose|red|indigo|violet|purple)\b/,
      },
      { name: 'custom 0_0 neon box-shadow', regex: /shadow-\[0_0/ },
    ];

    const violations: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const rel = path.relative(SRC_ROOT, file).replace(/\\/g, '/');
      for (const { name, regex } of forbiddenPatterns) {
        if (regex.test(content)) {
          violations.push(`${rel}: matched ${name}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps cleaned components free of removed decorative dots while preserving intentional static indicators', () => {
    const getStarted = readSrc('app/get-started/page.tsx');
    expect(getStarted).not.toContain('w-2 h-2 rounded-full');

    const analyzer = readSrc('app/analyzer/page.tsx');
    expect(analyzer).not.toContain('w-1.5 h-1.5 rounded-full bg-emerald-400');

    const proposal = readSrc('app/proposal/page.tsx');
    expect(proposal).not.toContain('w-1.5 h-1.5 rounded-full bg-emerald-500');

    const settings = readSrc('app/settings/page.tsx');
    expect(settings).toContain('w-2 h-2 rounded-full bg-amber-400 ml-0.5');
    expect(settings).toContain('<span className="text-xs font-semibold text-slate-200">Unsaved Changes</span>');

    const rentalCardHeader = readSrc('components/rentals/RentalCardHeader.tsx');
    expect(rentalCardHeader).toContain('<AlertCircle className="w-3.5 h-3.5 text-rose-600" />');

    const pdfModal = readSrc('components/rentals/UnifiedPdfVerificationModal.tsx');
    expect(pdfModal).toContain('<Loader2 className="w-4 h-4 animate-spin text-purple-600" />');
    expect(pdfModal).toContain('w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0');
  });
});
