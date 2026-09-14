import { z } from 'zod';

export const dailyEntrySchema = z.object({
  userId: z.string().min(1),
  payPeriodId: z.string().min(1),
  entryDate: z.coerce.date(),
  maxDailyHours: z.number().positive().max(24).default(24),
  splits: z.array(z.object({
    chargeCodeId: z.string().min(1),
    hoursLogged: z.number().positive(),
    notes: z.string().max(500).optional()
  })).min(1)
});

export function validateDailyHours(totalHours: number, maxDailyHours: number): void {
  if (totalHours > maxDailyHours) {
    throw new Error(`Maximum daily hours exceeded: ${totalHours} > ${maxDailyHours}`);
  }
}

export function ensureNoDuplicateCodes(chargeCodeIds: string[]): void {
  const unique = new Set(chargeCodeIds);
  if (unique.size !== chargeCodeIds.length) {
    throw new Error('Duplicate charge code splits are not allowed for the same day');
  }
}
