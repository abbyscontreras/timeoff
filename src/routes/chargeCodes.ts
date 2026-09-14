import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

const createSchema = z.object({
  codeKey: z.string().min(2),
  displayName: z.string().min(2),
  category: z.enum(['EARNED', 'USED', 'WORKED', 'ADJUSTMENT']),
  isPaid: z.boolean(),
  accrualImpact: z.enum(['ADDS', 'SUBTRACTS', 'NEUTRAL']),
  colorCode: z.string().optional(),
  type: z.string().optional(),
  isActive: z.boolean().optional()
});

export const chargeCodeRouter = Router();

chargeCodeRouter.get('/', async (req, res) => {
  const tenantId = req.tenantId!;
  const items = await prisma.chargeCode.findMany({ where: { organizationId: tenantId } });
  res.json(items);
});

chargeCodeRouter.post('/', async (req, res) => {
  const tenantId = req.tenantId!;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const payload = parsed.data;
  const item = await prisma.chargeCode.create({ data: { organizationId: tenantId, ...payload } });
  res.status(201).json(item);
});

chargeCodeRouter.patch('/:id', async (req, res) => {
  const tenantId = req.tenantId!;
  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const payload = parsed.data;
  const existing = await prisma.chargeCode.findFirst({ where: { id: req.params.id, organizationId: tenantId } });
  if (!existing) {
    res.status(404).json({ error: 'Charge code not found' });
    return;
  }
  const item = await prisma.chargeCode.update({ where: { id: existing.id }, data: payload });
  res.json(item);
});
