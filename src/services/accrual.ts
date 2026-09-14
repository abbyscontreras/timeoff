import { AccrualImpact, type PTOBalance } from '@prisma/client';

export type BalanceInput = Pick<PTOBalance, 'earnedYtd' | 'usedYtd' | 'bankedHours' | 'adjustments'> & {
  initialBalance?: number;
};

export function computeBalance(input: BalanceInput): number {
  return (input.initialBalance ?? 0) + input.earnedYtd + input.bankedHours - input.usedYtd + input.adjustments;
}

export function applyAccrualImpact(hours: number, impact: AccrualImpact): { earnedDelta: number; usedDelta: number } {
  if (impact === AccrualImpact.ADDS) {
    return { earnedDelta: hours, usedDelta: 0 };
  }

  if (impact === AccrualImpact.SUBTRACTS) {
    return { earnedDelta: 0, usedDelta: hours };
  }

  return { earnedDelta: 0, usedDelta: 0 };
}
