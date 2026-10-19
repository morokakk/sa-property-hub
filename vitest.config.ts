import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

// Automatically load .env.local for integration tests
const envLocalPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**', '**/.next/**', '**/.stryker-tmp/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      html2canvas: 'html2canvas-pro',
    },
  },
});
