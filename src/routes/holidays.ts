import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

const holidaySchema = z.object({
  name: z.string().min(2),
  date: z.coerce.date(),
  isFloating: z.boolean().default(false),
  year: z.number().int().min(2000)
});

export const holidayRouter = Router();

holidayRouter.get('/', async (req, res) => {
  const tenantId = req.tenantId!;
  const holidays = await prisma.holiday.findMany({ where: { organizationId: tenantId }, orderBy: { date: 'asc' } });
  res.json(holidays);
});

holidayRouter.post('/', async (req, res) => {
  const tenantId = req.tenantId!;
  const parsed = holidaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const payload = parsed.data;
  const holiday = await prisma.holiday.create({ data: { organizationId: tenantId, ...payload } });
  res.status(201).json(holiday);
});

holidayRouter.post('/autopopulate', async (req, res) => {
  const tenantId = req.tenantId!;
  const parsed = z.object({ userId: z.string(), payPeriodId: z.string(), holidayChargeCodeId: z.string(), defaultHours: z.number().positive().default(8) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const payload = parsed.data;

  const payPeriod = await prisma.payPeriod.findFirst({ where: { id: payload.payPeriodId, organizationId: tenantId } });
  if (!payPeriod) {
    res.status(404).json({ error: 'Pay period not found' });
    return;
  }

  const [user, chargeCode] = await Promise.all([
    prisma.user.findFirst({ where: { id: payload.userId, organizationId: tenantId }, select: { id: true } }),
    prisma.chargeCode.findFirst({ where: { id: payload.holidayChargeCodeId, organizationId: tenantId }, select: { id: true } })
  ]);
  if (!user || !chargeCode) {
    res.status(400).json({ error: 'User or holiday charge code is invalid for tenant' });
    return;
  }

  const holidays = await prisma.holiday.findMany({
    where: {
      organizationId: tenantId,
      date: { gte: payPeriod.startDate, lte: payPeriod.endDate }
    }
  });

  const existingEntries = await prisma.timeEntry.findMany({
    where: {
      userId: payload.userId,
      payPeriodId: payload.payPeriodId,
      chargeCodeId: payload.holidayChargeCodeId,
      entryDate: { in: holidays.map((h) => h.date) }
    },
    select: { entryDate: true }
  });
  const existingDateSet = new Set(existingEntries.map((entry) => entry.entryDate.toISOString().slice(0, 10)));
  const missingHolidays = holidays.filter((h) => !existingDateSet.has(h.date.toISOString().slice(0, 10)));

  const entries = await prisma.$transaction(async (tx) => {
    const created: unknown[] = [];
    for (const holiday of missingHolidays) {
      const entry = await tx.timeEntry.upsert({
        where: {
          userId_payPeriodId_entryDate_chargeCodeId: {
            userId: payload.userId,
            payPeriodId: payload.payPeriodId,
            entryDate: holiday.date,
            chargeCodeId: payload.holidayChargeCodeId
          }
        },
        update: {},
        create: {
          userId: payload.userId,
          payPeriodId: payload.payPeriodId,
          chargeCodeId: payload.holidayChargeCodeId,
          entryDate: holiday.date,
          hoursLogged: payload.defaultHours,
          notes: `Auto-populated holiday: ${holiday.name}`
        }
      });
      created.push(entry);
    }
    return created;
  });

  res.json(entries);
});
