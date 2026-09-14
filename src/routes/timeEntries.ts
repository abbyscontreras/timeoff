import { Router } from 'express';
import { prisma } from '../db.js';
import { applyAccrualImpact, computeBalance } from '../services/accrual.js';
import { dailyEntrySchema, ensureNoDuplicateCodes, validateDailyHours } from '../services/timeValidation.js';

export const timeEntryRouter = Router();

timeEntryRouter.post('/daily', async (req, res) => {
  const tenantId = req.tenantId!;
  const payload = dailyEntrySchema.parse(req.body);
  const totalHours = payload.splits.reduce((sum, split) => sum + split.hoursLogged, 0);

  validateDailyHours(totalHours, payload.maxDailyHours);
  ensureNoDuplicateCodes(payload.splits.map((split) => split.chargeCodeId));

  const payPeriod = await prisma.payPeriod.findFirst({ where: { id: payload.payPeriodId, organizationId: tenantId } });
  if (!payPeriod) {
    res.status(404).json({ error: 'Pay period not found' });
    return;
  }

  const user = await prisma.user.findFirst({ where: { id: payload.userId, organizationId: tenantId } });
  if (!user) {
    res.status(404).json({ error: 'User not found for tenant' });
    return;
  }

  if (payload.entryDate < payPeriod.startDate || payload.entryDate > payPeriod.endDate) {
    res.status(400).json({ error: 'Entry date is outside pay period bounds' });
    return;
  }

  const chargeCodes = await prisma.chargeCode.findMany({
    where: { id: { in: payload.splits.map((split) => split.chargeCodeId) }, organizationId: tenantId }
  });
  if (chargeCodes.length !== payload.splits.length) {
    res.status(400).json({ error: 'One or more charge codes are invalid for tenant' });
    return;
  }

  const created = await prisma.$transaction(async (tx) => {
    const entries = await Promise.all(payload.splits.map((split) => tx.timeEntry.create({
      data: {
        userId: payload.userId,
        payPeriodId: payload.payPeriodId,
        entryDate: payload.entryDate,
        chargeCodeId: split.chargeCodeId,
        hoursLogged: split.hoursLogged,
        notes: split.notes
      }
    })));

    for (const split of payload.splits) {
      const code = chargeCodes.find((item) => item.id === split.chargeCodeId);
      if (!code) continue;

      const deltas = applyAccrualImpact(split.hoursLogged, code.accrualImpact);
      await tx.pTOBalance.upsert({
        where: { userId_chargeCodeId: { userId: payload.userId, chargeCodeId: split.chargeCodeId } },
        update: {
          earnedYtd: { increment: deltas.earnedDelta },
          usedYtd: { increment: deltas.usedDelta }
        },
        create: {
          userId: payload.userId,
          chargeCodeId: split.chargeCodeId,
          earnedYtd: deltas.earnedDelta,
          usedYtd: deltas.usedDelta,
          bankedHours: 0,
          adjustments: 0,
          currentBalance: 0
        }
      });

      const updated = await tx.pTOBalance.findUnique({
        where: { userId_chargeCodeId: { userId: payload.userId, chargeCodeId: split.chargeCodeId } }
      });
      if (!updated) continue;

      await tx.pTOBalance.update({
        where: { id: updated.id },
        data: { currentBalance: computeBalance(updated) }
      });
    }

    return entries;
  });

  res.status(201).json(created);
});

const compSchema = dailyEntrySchema.pick({ userId: true }).extend({
  fromChargeCodeId: dailyEntrySchema.shape.splits.element.shape.chargeCodeId,
  toChargeCodeId: dailyEntrySchema.shape.splits.element.shape.chargeCodeId,
  hours: dailyEntrySchema.shape.splits.element.shape.hoursLogged
});

timeEntryRouter.post('/convert-comp-time', async (req, res) => {
  const tenantId = req.tenantId!;
  const payload = compSchema.parse(req.body);

  const user = await prisma.user.findFirst({ where: { id: payload.userId, organizationId: tenantId } });
  if (!user) {
    res.status(404).json({ error: 'User not found for tenant' });
    return;
  }

  const validCodes = await prisma.chargeCode.count({
    where: { organizationId: tenantId, id: { in: [payload.fromChargeCodeId, payload.toChargeCodeId] } }
  });
  if (validCodes !== 2) {
    res.status(400).json({ error: 'Invalid charge code conversion request' });
    return;
  }

  if (payload.fromChargeCodeId === payload.toChargeCodeId) {
    res.status(400).json({ error: 'Source and destination charge codes must be different' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.pTOBalance.upsert({
      where: { userId_chargeCodeId: { userId: payload.userId, chargeCodeId: payload.fromChargeCodeId } },
      update: { usedYtd: { increment: payload.hours } },
      create: { userId: payload.userId, chargeCodeId: payload.fromChargeCodeId, usedYtd: payload.hours, earnedYtd: 0, bankedHours: 0, adjustments: 0, currentBalance: 0 }
    });

    await tx.pTOBalance.upsert({
      where: { userId_chargeCodeId: { userId: payload.userId, chargeCodeId: payload.toChargeCodeId } },
      update: { bankedHours: { increment: payload.hours } },
      create: { userId: payload.userId, chargeCodeId: payload.toChargeCodeId, usedYtd: 0, earnedYtd: 0, bankedHours: payload.hours, adjustments: 0, currentBalance: 0 }
    });

    const [from, to] = await Promise.all([
      tx.pTOBalance.findUnique({ where: { userId_chargeCodeId: { userId: payload.userId, chargeCodeId: payload.fromChargeCodeId } } }),
      tx.pTOBalance.findUnique({ where: { userId_chargeCodeId: { userId: payload.userId, chargeCodeId: payload.toChargeCodeId } } })
    ]);

    if (from) {
      await tx.pTOBalance.update({ where: { id: from.id }, data: { currentBalance: computeBalance(from) } });
    }
    if (to) {
      await tx.pTOBalance.update({ where: { id: to.id }, data: { currentBalance: computeBalance(to) } });
    }
  });

  res.json({ ok: true });
});
