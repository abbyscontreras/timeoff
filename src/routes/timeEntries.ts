import { Router } from 'express';
import { prisma } from '../db.js';
import { applyAccrualImpact } from '../services/accrual.js';
import { dailyEntrySchema, ensureNoDuplicateCodes, validateDailyHours } from '../services/timeValidation.js';

export const timeEntryRouter = Router();

timeEntryRouter.post('/daily', async (req, res) => {
  const tenantId = req.tenantId!;
  const parsed = dailyEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const payload = parsed.data;

  try {
    const totalHours = payload.splits.reduce((sum, split) => sum + split.hoursLogged, 0);
    validateDailyHours(totalHours, payload.maxDailyHours);
    ensureNoDuplicateCodes(payload.splits.map((split) => split.chargeCodeId));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
    return;
  }

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
  const uniqueChargeCodeIds = new Set(payload.splits.map((split) => split.chargeCodeId));
  if (chargeCodes.length !== uniqueChargeCodeIds.size) {
    res.status(400).json({ error: 'One or more charge codes are invalid for tenant' });
    return;
  }
  const chargeCodeById = new Map(chargeCodes.map((code) => [code.id, code]));

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
      const code = chargeCodeById.get(split.chargeCodeId);
      if (!code) continue;

      const deltas = applyAccrualImpact(split.hoursLogged, code.accrualImpact);
      const delta = deltas.earnedDelta - deltas.usedDelta;
      await tx.pTOBalance.upsert({
        where: { userId_chargeCodeId: { userId: payload.userId, chargeCodeId: split.chargeCodeId } },
        update: {
          earnedYtd: { increment: deltas.earnedDelta },
          usedYtd: { increment: deltas.usedDelta },
          currentBalance: { increment: delta }
        },
        create: {
          userId: payload.userId,
          chargeCodeId: split.chargeCodeId,
          earnedYtd: deltas.earnedDelta,
          usedYtd: deltas.usedDelta,
          bankedHours: 0,
          adjustments: 0,
          currentBalance: delta
        }
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
  const parsed = compSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const payload = parsed.data;

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

  try {
    await prisma.$transaction(async (tx) => {
      const fromBalance = await tx.pTOBalance.findUnique({
        where: { userId_chargeCodeId: { userId: payload.userId, chargeCodeId: payload.fromChargeCodeId } }
      });
      if (!fromBalance || fromBalance.currentBalance < payload.hours) {
        throw new Error('Insufficient source balance for comp-time conversion');
      }

      await tx.pTOBalance.update({
        where: { id: fromBalance.id },
        data: {
          usedYtd: { increment: payload.hours },
          currentBalance: { decrement: payload.hours }
        }
      });

      const toBalance = await tx.pTOBalance.findUnique({
        where: { userId_chargeCodeId: { userId: payload.userId, chargeCodeId: payload.toChargeCodeId } }
      });

      if (!toBalance) {
        await tx.pTOBalance.create({
          data: {
            userId: payload.userId,
            chargeCodeId: payload.toChargeCodeId,
            usedYtd: 0,
            earnedYtd: 0,
            bankedHours: payload.hours,
            adjustments: 0,
            currentBalance: payload.hours
          }
        });
        return;
      }

      await tx.pTOBalance.update({
        where: { id: toBalance.id },
        data: {
          bankedHours: { increment: payload.hours },
          currentBalance: { increment: payload.hours }
        }
      });
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
    return;
  }

  res.json({ ok: true });
});
