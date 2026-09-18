/**
 * Format numbers as South African Rand (ZAR)
 * e.g., formatZAR(1500000) => "R 1,500,000"
 */
export function formatZAR(
  amount: number | undefined | null,
  options?: { includeDecimals?: boolean; compact?: boolean }
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'R 0';
  }

  if (options?.compact) {
    if (Math.abs(amount) >= 1_000_000) {
      return `R ${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `R ${(amount / 1_000).toFixed(0)}k`;
    }
  }

  const formatted = new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: options?.includeDecimals ? 2 : 0,
    maximumFractionDigits: options?.includeDecimals ? 2 : 0,
  }).format(amount);

  return `R ${formatted}`;
}

export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0%';
  }
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
