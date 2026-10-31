import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  submitFeedback,
  collectClientDiagnostics,
  formatFeedbackForWhatsApp,
  buildFeedbackWhatsAppUrl,
  FeedbackSubmissionPayload,
} from '../submitFeedback';
import { supabase } from '@/lib/supabaseClient';
import { sendFeedbackEmail } from '@/app/actions/sendFeedbackEmail';

vi.mock('@/lib/supabaseClient', () => {
  const insertMock = vi.fn();
  return {
    supabase: {
      from: vi.fn(() => ({
        insert: insertMock,
      })),
      auth: {
        getSession: vi.fn(),
      },
    },
  };
});

vi.mock('@/app/actions/sendFeedbackEmail', () => ({
  sendFeedbackEmail: vi.fn(),
}));

describe('submitFeedback Service & Formatter', () => {
  const originalEnv = process.env;
  let mockInsert: ReturnType<typeof vi.fn>;
  let storage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    storage = {};

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        storage[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        storage = {};
      }),
    });

    vi.stubGlobal('window', {
      innerWidth: 1280,
      innerHeight: 800,
    });

    const fromMock = vi.mocked(supabase.from);
    mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    fromMock.mockReturnValue({ insert: mockInsert } as any);

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);

    vi.mocked(sendFeedbackEmail).mockResolvedValue({
      success: true,
      messageId: 'msg_test_123',
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  const samplePayload: FeedbackSubmissionPayload = {
    category: 'data_math',
    moduleRoute: '/rentals',
    message: 'Municipal rates calculation is missing indigent rebate support.',
    contactOptional: 'investor@moremela.co.za',
    diagnostics: {
      viewport: '1280x800 (Desktop)',
      storageMode: 'Local-First (Browser)',
      demoStatus: 'Demo Dataset Loaded',
      timestamp: '2026-10-31T12:00:00.000Z',
    },
  };

  describe('1. 3-Layer Resilience Dispatch', () => {
    it('persists feedback to localStorage fallback log', async () => {
      const result = await submitFeedback(samplePayload);

      expect(result.success).toBe(true);
      expect(result.savedLocally).toBe(true);
      expect(result.entryId).toBeTruthy();

      const stored = localStorage.getItem('sa_prop_hub_feedback_log');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe(result.entryId);
      expect(parsed[0].category).toBe('data_math');
      expect(parsed[0].message).toBe(samplePayload.message);
    });

    it('caps localStorage log at 50 entries to prevent memory bloat', async () => {
      const dummyEntries = Array.from({ length: 55 }, (_, i) => ({
        id: `dummy-${i}`,
        message: `msg ${i}`,
      }));
      localStorage.setItem('sa_prop_hub_feedback_log', JSON.stringify(dummyEntries));

      await submitFeedback(samplePayload);

      const stored = JSON.parse(localStorage.getItem('sa_prop_hub_feedback_log')!);
      expect(stored).toHaveLength(50);
      expect(stored[0].message).toBe(samplePayload.message);
    });

    it('inserts record into Supabase user_feedback table with active session user_id', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            user: { id: 'auth-user-abc' },
          } as any,
        },
        error: null,
      });

      const result = await submitFeedback(samplePayload);

      expect(result.savedToSupabase).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'auth-user-abc',
          category: 'data_math',
          module_route: '/rentals',
          message: samplePayload.message,
          contact_optional: 'investor@moremela.co.za',
        })
      );
    });

    it('survives Supabase downtime or network failure without throwing', async () => {
      mockInsert.mockRejectedValueOnce(new Error('Supabase network offline'));

      const result = await submitFeedback(samplePayload);

      expect(result.savedToSupabase).toBe(false);
      expect(result.savedLocally).toBe(true);
      expect(result.emailDispatched).toBe(true);
      expect(result.success).toBe(true);
    });

    it('dispatches email via sendFeedbackEmail server action', async () => {
      const result = await submitFeedback(samplePayload);

      expect(result.emailDispatched).toBe(true);
      expect(sendFeedbackEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'data_math',
          moduleRoute: '/rentals',
          message: samplePayload.message,
        })
      );
    });

    it('survives email failure without failing the entire submission', async () => {
      vi.mocked(sendFeedbackEmail).mockResolvedValueOnce({
        success: false,
        skipped: true,
        error: 'No API key',
      });

      const result = await submitFeedback(samplePayload);

      expect(result.emailDispatched).toBe(false);
      expect(result.savedLocally).toBe(true);
      expect(result.savedToSupabase).toBe(true);
      expect(result.success).toBe(true);
    });

    it('generates a valid RFC 4122 v4 UUID when crypto.randomUUID is undefined', async () => {
      // Emulate older browser or non-secure context where crypto.randomUUID is absent
      const originalCrypto = globalThis.crypto;
      // @ts-expect-error mutating global crypto for test
      delete globalThis.crypto;

      try {
        const result = await submitFeedback(samplePayload);
        expect(result.entryId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      } finally {
        globalThis.crypto = originalCrypto;
      }
    });

    it('returns failure with descriptive error when all 3 layers fail', async () => {
      // Layer 1 fail: localStorage throws
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(),
        setItem: vi.fn(() => {
          throw new Error('QuotaExceededError');
        }),
      });

      // Layer 2 fail: Supabase throws
      mockInsert.mockRejectedValueOnce(new Error('Supabase network unreachable'));

      // Layer 3 fail: Resend email fails
      vi.mocked(sendFeedbackEmail).mockResolvedValueOnce({
        success: false,
        error: 'Network connectivity failure',
      });

      const result = await submitFeedback(samplePayload);

      expect(result.success).toBe(false);
      expect(result.savedLocally).toBe(false);
      expect(result.savedToSupabase).toBe(false);
      expect(result.emailDispatched).toBe(false);
      expect(result.error).toContain('Failed to record feedback');
    });
  });

  describe('2. Diagnostics Collection', () => {
    it('collects viewport, storage mode, and demo status in browser environment', () => {
      const diag = collectClientDiagnostics();

      expect(diag.viewport).toBe('1280x800 (Desktop)');
      expect(diag.storageMode).toBe('Local-First (Browser)');
      expect(diag.demoStatus).toBeDefined();
      expect(diag.timestamp).toBeDefined();
    });

    it('detects cloud sync storage mode when localStorage flag is set', () => {
      localStorage.setItem('cloud_sync_completed', 'true');
      const diag = collectClientDiagnostics();
      expect(diag.storageMode).toBe('Cloud Synced (Supabase)');
    });
  });

  describe('3. WhatsApp Formatting & URL Builder', () => {
    it('formats clean structured WhatsApp message', () => {
      const formatted = formatFeedbackForWhatsApp(samplePayload);

      expect(formatted).toContain('*SA PROP HUB — USER FEEDBACK*');
      expect(formatted).toContain('📌 *Category:* SA Tax / Municipal Math');
      expect(formatted).toContain('📍 *Module:* /rentals');
      expect(formatted).toContain('Municipal rates calculation is missing indigent rebate support.');
      expect(formatted).toContain('investor@moremela.co.za');
      expect(formatted).toContain('⚙️ *Diagnostics:* 1280x800 (Desktop) | Local-First (Browser) | Demo Dataset Loaded');
    });

    it('builds universal WhatsApp link when founder number is unconfigured', () => {
      delete process.env.NEXT_PUBLIC_FOUNDER_WHATSAPP;
      const url = buildFeedbackWhatsAppUrl(samplePayload);

      expect(url.startsWith('https://wa.me/?text=')).toBe(true);
      expect(url).toContain(encodeURIComponent('SA PROP HUB — USER FEEDBACK'));
    });

    it('normalizes local South African number (082...) to international E.164 digits', () => {
      process.env.NEXT_PUBLIC_FOUNDER_WHATSAPP = '082 123 4567';
      const url = buildFeedbackWhatsAppUrl(samplePayload);

      expect(url.startsWith('https://wa.me/27821234567?text=')).toBe(true);
    });

    it('normalizes +27 international number to clean digits', () => {
      process.env.NEXT_PUBLIC_FOUNDER_WHATSAPP = '+27 83 999 1234';
      const url = buildFeedbackWhatsAppUrl(samplePayload);

      expect(url.startsWith('https://wa.me/27839991234?text=')).toBe(true);
    });

    it('normalizes numbers with parentheses and country code format +27 (0)82 123 4567', () => {
      process.env.NEXT_PUBLIC_FOUNDER_WHATSAPP = '+27 (0)82 123 4567';
      const url = buildFeedbackWhatsAppUrl(samplePayload);

      expect(url.startsWith('https://wa.me/27821234567?text=')).toBe(true);
    });

    it('normalizes numbers with parentheses format +27 (82) 123-4567', () => {
      process.env.NEXT_PUBLIC_FOUNDER_WHATSAPP = '+27 (82) 123-4567';
      const url = buildFeedbackWhatsAppUrl(samplePayload);

      expect(url.startsWith('https://wa.me/27821234567?text=')).toBe(true);
    });
  });
});
