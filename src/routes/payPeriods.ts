import { PayPeriodStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { generatePayPeriods } from '../services/payPeriod.js';

const generateSchema = z.object({
  payScheduleId: z.string(),
  anchorDate: z.coerce.date().optional(),
  count: z.number().int().min(1).max(52)
});

export const payPeriodRouter = Router();

payPeriodRouter.get('/', async (req, res) => {
  const tenantId = req.tenantId!;
  const periods = await prisma.payPeriod.findMany({ where: { organizationId: tenantId }, orderBy: { startDate: 'asc' } });
  res.json(periods);
});

payPeriodRouter.post('/generate', async (req, res) => {
  const tenantId = req.tenantId!;
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const payload = parsed.data;
  const paySchedule = await prisma.paySchedule.findFirst({
    where: { id: payload.payScheduleId, organizationId: tenantId }
  });
  if (!paySchedule) {
    res.status(404).json({ error: 'Pay schedule not found for tenant' });
    return;
  }

  const generated = generatePayPeriods(paySchedule.cadence, payload.anchorDate ?? paySchedule.anchorDate, payload.count);

  const created = await prisma.$transaction(async (tx) => {
    const items = [];
    for (const period of generated) {
      const item = await tx.payPeriod.upsert({
      where: {
        organizationId_payScheduleId_startDate_endDate: {
          organizationId: tenantId,
          payScheduleId: paySchedule.id,
          startDate: period.startDate,
          endDate: period.endDate
        }
      },
      update: {},
      create: {
        organizationId: tenantId,
        payScheduleId: paySchedule.id,
        startDate: period.startDate,
        endDate: period.endDate,
        status: PayPeriodStatus.DRAFT
      }
      });
      items.push(item);
    }
    return items;
  });

  res.status(201).json(created);
});

payPeriodRouter.get('/:id/summary', async (req, res) => {
  const tenantId = req.tenantId!;
  const payPeriod = await prisma.payPeriod.findFirst({ where: { id: req.params.id, organizationId: tenantId } });

  if (!payPeriod) {
    res.status(404).json({ error: 'Pay period not found' });
    return;
  }

  const grouped = await prisma.timeEntry.groupBy({
    by: ['chargeCodeId'],
    where: { payPeriodId: payPeriod.id },
    _sum: { hoursLogged: true }
  });

  const chargeCodes = await prisma.chargeCode.findMany({
    where: { organizationId: tenantId, id: { in: grouped.map((g) => g.chargeCodeId) } }
  });
  const categoryByCodeId = new Map(chargeCodes.map((code) => [code.id, code.category]));

  const worked = grouped.reduce((sum, g) => {
    const category = categoryByCodeId.get(g.chargeCodeId);
    return category === 'WORKED' ? sum + (g._sum.hoursLogged ?? 0) : sum;
  }, 0);

  const ptoUsed = grouped.reduce((sum, g) => {
    const category = categoryByCodeId.get(g.chargeCodeId);
    return category === 'USED' ? sum + (g._sum.hoursLogged ?? 0) : sum;
  }, 0);

  res.json({
    payPeriod,
    totalWorkedHours: worked,
    totalPtoUsed: ptoUsed,
    overtimeThresholdExceeded: worked > 80,
    status: payPeriod.status
  });
});
