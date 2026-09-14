import { Router } from 'express';
import { prisma } from '../db.js';

export const balanceRouter = Router();

balanceRouter.get('/user/:userId', async (req, res) => {
  const tenantId = req.tenantId!;
  const user = await prisma.user.findFirst({ where: { id: req.params.userId, organizationId: tenantId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const balances = await prisma.pTOBalance.findMany({
    where: { userId: user.id },
    include: { chargeCode: true }
  });

  res.json(balances.map((b) => ({
    id: b.id,
    chargeCode: b.chargeCode.codeKey,
    earnedYtd: b.earnedYtd,
    usedYtd: b.usedYtd,
    bankedHours: b.bankedHours,
    currentBalance: b.currentBalance,
    adjustments: b.adjustments
  })));
});
