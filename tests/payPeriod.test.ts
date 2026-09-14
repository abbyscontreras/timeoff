import { describe, expect, it } from 'vitest';
import { Cadence } from '@prisma/client';
import { generatePayPeriods } from '../src/services/payPeriod.js';

describe('pay period generator', () => {
  it('generates bi-weekly ranges', () => {
    const periods = generatePayPeriods(Cadence.BI_WEEKLY, new Date('2026-01-01T00:00:00.000Z'), 2);
    expect(periods).toHaveLength(2);
    expect(periods[0].startDate.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(periods[0].endDate.toISOString().slice(0, 10)).toBe('2026-01-14');
    expect(periods[1].startDate.toISOString().slice(0, 10)).toBe('2026-01-15');
  });

  it('generates semi-monthly ranges', () => {
    const periods = generatePayPeriods(Cadence.SEMI_MONTHLY, new Date('2026-02-01T00:00:00.000Z'), 2);
    expect(periods[0].startDate.toISOString().slice(0, 10)).toBe('2026-02-01');
    expect(periods[0].endDate.toISOString().slice(0, 10)).toBe('2026-02-15');
    expect(periods[1].startDate.toISOString().slice(0, 10)).toBe('2026-02-16');
    expect(periods[1].endDate.toISOString().slice(0, 10)).toBe('2026-02-28');
  });
});
