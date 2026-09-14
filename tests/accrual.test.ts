import { describe, expect, it } from 'vitest';
import { AccrualImpact } from '@prisma/client';
import { applyAccrualImpact, computeBalance } from '../src/services/accrual.js';

describe('accrual service', () => {
  it('computes current balance formula', () => {
    const balance = computeBalance({
      initialBalance: 10,
      earnedYtd: 8,
      bankedHours: 4,
      usedYtd: 3,
      adjustments: -1
    });

    expect(balance).toBe(18);
  });

  it('applies adds impact', () => {
    expect(applyAccrualImpact(5, AccrualImpact.ADDS)).toEqual({ earnedDelta: 5, usedDelta: 0 });
  });

  it('applies subtracts impact', () => {
    expect(applyAccrualImpact(5, AccrualImpact.SUBTRACTS)).toEqual({ earnedDelta: 0, usedDelta: 5 });
  });

  it('applies neutral impact', () => {
    expect(applyAccrualImpact(5, AccrualImpact.NEUTRAL)).toEqual({ earnedDelta: 0, usedDelta: 0 });
  });
});
