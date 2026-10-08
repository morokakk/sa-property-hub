import { describe, it, expect } from 'vitest';
import { calculateRemainingLeaseTerm } from '../arrears';

describe('calculateRemainingLeaseTerm', () => {
  it('returns "Expired (Month-to-Month)" if leaseEndDate is undefined, null, or empty', () => {
    expect(calculateRemainingLeaseTerm('2026-04', undefined)).toBe('Expired (Month-to-Month)');
    expect(calculateRemainingLeaseTerm('2026-04', '')).toBe('Expired (Month-to-Month)');
  });

  it('returns "Expired (Month-to-Month)" if lease has already ended prior to billing period start', () => {
    expect(calculateRemainingLeaseTerm('2026-05', '2026-04-30')).toBe('Expired (Month-to-Month)');
    expect(calculateRemainingLeaseTerm('2026-05-01', '2026-03-31')).toBe('Expired (Month-to-Month)');
  });

  it('calculates exact full calendar months from YYYY-MM billing period to month end', () => {
    // 2026-04 to 2026-07-31: April, May, June, July = 4 calendar months
    expect(calculateRemainingLeaseTerm('2026-04', '2026-07-31')).toBe('4 Months');
  });

  it('calculates single calendar month correctly ("1 Month")', () => {
    // 2026-04 to 2026-04-30: 1 calendar month
    expect(calculateRemainingLeaseTerm('2026-04', '2026-04-30')).toBe('1 Month');
  });

  it('calculates days correctly when remaining time is less than 30 days', () => {
    // From 2026-04-01 to 2026-04-29 = 28 days
    expect(calculateRemainingLeaseTerm('2026-04-01', '2026-04-29')).toBe('28 Days');
    // 1 day
    expect(calculateRemainingLeaseTerm('2026-04-01', '2026-04-02')).toBe('1 Day');
  });

  it('calculates compound months and days correctly', () => {
    // From 2026-04-01 to 2026-05-13 = 1 Month 12 Days
    expect(calculateRemainingLeaseTerm('2026-04-01', '2026-05-13')).toBe('1 Month 12 Days');
    // From 2026-04-01 to 2026-06-02 = 2 Months 1 Day
    expect(calculateRemainingLeaseTerm('2026-04-01', '2026-06-02')).toBe('2 Months 1 Day');
  });

  it('handles "Month YYYY" formatted billing periods', () => {
    expect(calculateRemainingLeaseTerm('April 2026', '2026-07-31')).toBe('4 Months');
  });

  it('handles South African date formats (DD/MM/YYYY and DD-MM-YYYY)', () => {
    // 2026-04-01 to 31/12/2026: 9 months
    expect(calculateRemainingLeaseTerm('2026-04-01', '31/12/2026')).toBe('9 Months');
    expect(calculateRemainingLeaseTerm('2026-04-01', '31-12-2026')).toBe('9 Months');
    // Mid-month
    expect(calculateRemainingLeaseTerm('2026-04-01', '15/05/2026')).toBe('1 Month 14 Days');
  });

  it('handles mid-month lease expiry during active billing period', () => {
    // Billing period 2026-05 (starts 2026-05-01) with lease ending 2026-05-15
    expect(calculateRemainingLeaseTerm('2026-05', '2026-05-15')).toBe('14 Days');
  });

  it('returns "Expired (Month-to-Month)" for unparseable or completely invalid dates', () => {
    expect(calculateRemainingLeaseTerm('2026-05', 'not-a-valid-date')).toBe('Expired (Month-to-Month)');
    expect(calculateRemainingLeaseTerm('2026-05', 'null')).toBe('Expired (Month-to-Month)');
  });
});
