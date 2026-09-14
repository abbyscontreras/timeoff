import { AccrualImpact, type PTOBalance } from '@prisma/client';

export type BalanceInput = Pick<PTOBalance, 'earnedYtd' | 'usedYtd' | 'bankedHours' | 'adjustments'> & {
  initialBalance?: number;
};

export function computeBalance(input: BalanceInput): number {
  return (input.initialBalance ?? 0)
    + (input.earnedYtd ?? 0)
    + (input.bankedHours ?? 0)
    - (input.usedYtd ?? 0)
    + (input.adjustments ?? 0);
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
