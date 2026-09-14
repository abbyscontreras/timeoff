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
  const payload = holidaySchema.parse(req.body);
  const holiday = await prisma.holiday.create({ data: { organizationId: tenantId, ...payload } });
  res.status(201).json(holiday);
});

holidayRouter.post('/autopopulate', async (req, res) => {
  const tenantId = req.tenantId!;
  const payload = z.object({ userId: z.string(), payPeriodId: z.string(), holidayChargeCodeId: z.string(), defaultHours: z.number().positive().default(8) }).parse(req.body);

  const payPeriod = await prisma.payPeriod.findFirst({ where: { id: payload.payPeriodId, organizationId: tenantId } });
  if (!payPeriod) {
    res.status(404).json({ error: 'Pay period not found' });
    return;
  }

  const holidays = await prisma.holiday.findMany({
    where: {
      organizationId: tenantId,
      date: { gte: payPeriod.startDate, lte: payPeriod.endDate }
    }
  });

  const entries = await prisma.$transaction(holidays.map((h) => prisma.timeEntry.create({
    data: {
      userId: payload.userId,
      payPeriodId: payload.payPeriodId,
      chargeCodeId: payload.holidayChargeCodeId,
      entryDate: h.date,
      hoursLogged: payload.defaultHours,
      notes: `Auto-populated holiday: ${h.name}`
    }
  })));

  res.json(entries);
});
