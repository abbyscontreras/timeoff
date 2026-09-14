import { Cadence } from '@prisma/client';

type Period = { startDate: Date; endDate: Date };

function endOfDay(input: Date): Date {
  const d = new Date(input);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function generatePayPeriods(cadence: Cadence, anchorDate: Date, count: number): Period[] {
  const periods: Period[] = [];
  let cursor = new Date(anchorDate);

  for (let i = 0; i < count; i += 1) {
    if (cadence === Cadence.WEEKLY) {
      const startDate = new Date(cursor);
      const endDate = endOfDay(addDays(startDate, 6));
      periods.push({ startDate, endDate });
      cursor = addDays(startDate, 7);
      continue;
    }

    if (cadence === Cadence.BI_WEEKLY) {
      const startDate = new Date(cursor);
      const endDate = endOfDay(addDays(startDate, 13));
      periods.push({ startDate, endDate });
      cursor = addDays(startDate, 14);
      continue;
    }

    if (cadence === Cadence.MONTHLY) {
      const startDate = startOfMonth(cursor);
      const endDate = endOfDay(new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0)));
      periods.push({ startDate, endDate });
      cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1));
      continue;
    }

    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const firstHalfStart = new Date(Date.UTC(year, month, 1));
    const firstHalfEnd = endOfDay(new Date(Date.UTC(year, month, 15)));
    const secondHalfStart = new Date(Date.UTC(year, month, 16));
    const secondHalfEnd = endOfDay(new Date(Date.UTC(year, month + 1, 0)));

    if (cursor.getUTCDate() <= 15) {
      periods.push({ startDate: firstHalfStart, endDate: firstHalfEnd });
      cursor = secondHalfStart;
    } else {
      periods.push({ startDate: secondHalfStart, endDate: secondHalfEnd });
      cursor = new Date(Date.UTC(year, month + 1, 1));
    }
  }

  return periods;
}
