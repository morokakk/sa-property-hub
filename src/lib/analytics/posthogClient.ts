'use client';

import posthog, { type CaptureResult } from 'posthog-js';

/**
 * POPIA Statutory Privacy Scrubber for PostHog Telemetry
 *
 * Strictly enforces:
 * 1. Capability Token Redaction: Scrubs `/statement/<id_or_uuid>` and `/deal-room/<token>` in URLs/pathnames/referrers to `[redacted_token]`.
 * 2. Portal Page Title Redaction: Overwrites `$title` on `/statement/` and `/deal-room/` routes.
 * 3. Autocapture Element Text Redaction: Deletes `$el_text` on `$autocapture` events and strips `$el_text` from `$elements`
 *    while preserving `data-testid` attributes for analytics insights.
 */

const STATEMENT_ROUTE_REGEX = /(\/statement\/)([^/?#]+)/gi;
const DEAL_ROOM_ROUTE_REGEX = /(\/deal-room\/)([^/?#]+)/gi;

const SENSITIVE_PROPERTY_KEYS = new Set([
  'name',
  'tenantName',
  'tenant_name',
  'fullName',
  'full_name',
  'email',
  'tenantEmail',
  'tenant_email',
  'phone',
  'telephone',
  'address',
  'streetAddress',
  'street_address',
  'propertyAddress',
  'property_address',
  'accountNumber',
  'account_number',
  'bankAccount',
  'bank_account',
  'branchCode',
  'branch_code',
  'idNumber',
  'id_number',
  'registrationNumber',
  'registration_number',
  'taxReferenceNumber',
  'tax_reference_number',
  'apiKey',
  'api_key',
  'geminiApiKey',
  'openaiApiKey',
  'anthropicApiKey',
  'purchasePrice',
  'purchase_price',
  'monthlyRent',
  'monthly_rent',
  'arrears',
  'arrearsBalance',
  'cashflow',
  'amount',
  'balance',
  'totalDue',
  'total_due',
]);

export function scrubDealRoomTokenInUrl(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.replace(DEAL_ROOM_ROUTE_REGEX, '$1[redacted_token]');
}

export function scrubStatementTokenInUrl(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value
    .replace(STATEMENT_ROUTE_REGEX, '$1[redacted_token]')
    .replace(DEAL_ROOM_ROUTE_REGEX, '$1[redacted_token]');
}

function isStatementPathname(pathname: unknown, currentUrl: unknown): boolean {
  if (typeof pathname === 'string' && /^\/statement(\/|$)/i.test(pathname.trim())) {
    return true;
  }
  if (typeof currentUrl === 'string' && /\/statement\/[^/?#]+/i.test(currentUrl)) {
    return true;
  }
  return false;
}

function isDealRoomPathname(pathname: unknown, currentUrl: unknown): boolean {
  if (typeof pathname === 'string' && /^\/deal-room(\/|$)/i.test(pathname.trim())) {
    return true;
  }
  if (typeof currentUrl === 'string' && /\/deal-room\/[^/?#]+/i.test(currentUrl)) {
    return true;
  }
  return false;
}

export function posthogBeforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;

  const props = event.properties ? { ...event.properties } : {};

  const isStatementRoute = isStatementPathname(props.$pathname, props.$current_url);
  const isDealRoomRoute = isDealRoomPathname(props.$pathname, props.$current_url);

  // 1. Capability Token Redaction across URL/pathname/referrer properties
  if (typeof props.$current_url === 'string') {
    props.$current_url = scrubStatementTokenInUrl(props.$current_url);
  }
  if (typeof props.$pathname === 'string') {
    props.$pathname = scrubStatementTokenInUrl(props.$pathname);
  }
  if (typeof props.$prev_pageview_pathname === 'string') {
    props.$prev_pageview_pathname = scrubStatementTokenInUrl(props.$prev_pageview_pathname);
  }
  if (typeof props.$referrer === 'string') {
    props.$referrer = scrubStatementTokenInUrl(props.$referrer);
  }

  // 2. Public Portal Page Title Redaction
  if (isStatementRoute) {
    props.$title = 'Tenant Statement Portal (Redacted)';
  } else if (isDealRoomRoute) {
    props.$title = 'Development Deal Room Portal (Redacted)';
  }

  // 3. Autocapture Element Text Redaction (preserve data-testid, strip $el_text)
  if (event.event === '$autocapture' || '$el_text' in props || Array.isArray(props.$elements)) {
    delete props.$el_text;

    if (Array.isArray(props.$elements)) {
      props.$elements = props.$elements.map((el: unknown) => {
        if (el && typeof el === 'object') {
          const sanitizedEl = { ...(el as Record<string, unknown>) };
          delete sanitizedEl.$el_text;
          delete sanitizedEl.text;
          return sanitizedEl;
        }
        return el;
      });
    }
  }

  event.properties = props;
  return event;
}

function isPostHogReady(): boolean {
  const client = posthog as unknown as { __loaded?: boolean };
  return Boolean(client && client.__loaded);
}

export function sanitizeTelemetryProperties(
  properties?: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean | null> {
  if (!properties) return {};
  const clean: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    if (SENSITIVE_PROPERTY_KEYS.has(key)) continue;
    // Guard against accidental sensitive key patterns
    if (/^(tenant|landlord|bank|account|address|email|phone|api_?key|secret|token|password|zar|rent_amount|price)/i.test(key)) {
      continue;
    }
    if (typeof value === 'string') {
      clean[key] = scrubStatementTokenInUrl(value) as string;
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      clean[key] = value;
    }
  }

  return clean;
}

/**
 * Emits a privacy-safe categorical/boolean product telemetry event.
 * No-ops safely when PostHog is uninitialized or running on the server.
 */
export function trackPrivacySafeEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null>
): void {
  try {
    if (!isPostHogReady()) return;
    const sanitized = sanitizeTelemetryProperties(properties);
    posthog.capture(eventName, sanitized);
  } catch {
    // Telemetry must never disrupt application execution
  }
}

/**
 * Emits a structured, zero-PII diagnostic event for runtime / operational errors.
 */
export function captureSanitizedError(
  errorCode: string,
  metadata?: Record<string, string | number | boolean>
): void {
  try {
    if (!isPostHogReady()) return;
    const sanitized = sanitizeTelemetryProperties(metadata);
    posthog.capture('sanitized_diagnostic_error', {
      error_code: errorCode,
      ...sanitized,
    });
  } catch {
    // Telemetry must never disrupt application execution
  }
}

/**
 * Registers the current storage architecture mode ('local_only' | 'cloud_synced')
 * as a PostHog super property so product analytics can distinguish local vs cloud sessions
 * without identifying the user.
 */
export function syncAnalyticsStorageMode(mode: 'local_only' | 'cloud_synced'): void {
  try {
    if (!isPostHogReady()) return;
    posthog.register({ storage_mode: mode });
  } catch {
    // No-op on failure
  }
}

/**
 * Associates telemetry with an anonymous Supabase UUID for retention and funnel analytics.
 * Strictly transmits the raw UUID string with zero PII traits (no email, name, or phone)
 * in accordance with POPIA statutory minimisation.
 */
export function identifyAnalyticsUser(userId: string): void {
  try {
    if (!isPostHogReady() || !userId) return;
    posthog.identify(userId);
  } catch {
    // Telemetry must never disrupt application execution
  }
}

/**
 * Resets the PostHog session and rotates the anonymous device_id immediately on sign-out,
 * fulfilling `/privacy` Section 4.
 */
export function resetAnalyticsSession(): void {
  try {
    if (!isPostHogReady()) return;
    posthog.reset(true);
  } catch {
    // No-op on failure
  }
}
