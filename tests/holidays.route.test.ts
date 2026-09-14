import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  payPeriod: { findFirst: vi.fn() },
  user: { findFirst: vi.fn() },
  chargeCode: { findFirst: vi.fn() },
  holiday: { findMany: vi.fn() },
  timeEntry: { findMany: vi.fn(), upsert: vi.fn() },
  $transaction: vi.fn()
}));

vi.mock('../src/db.js', () => ({ prisma: prismaMock }));

const { holidayRouter } = await import('../src/routes/holidays.js');

function app() {
  const api = express();
  api.use(express.json());
  api.use((req, _res, next) => {
    req.tenantId = 'tenant-1';
    next();
  });
  api.use('/api/holidays', holidayRouter);
  api.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: error.message });
  });
  return api;
}

describe('holiday autopopulate route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates entries only for missing holiday dates', async () => {
    prismaMock.payPeriod.findFirst.mockResolvedValue({
      id: 'pp1',
      organizationId: 'tenant-1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31')
    });
    prismaMock.user.findFirst.mockResolvedValue({ id: 'u1' });
    prismaMock.chargeCode.findFirst.mockResolvedValue({ id: 'cc1' });
    const h1 = { name: 'A', date: new Date('2026-01-01') };
    const h2 = { name: 'B', date: new Date('2026-01-02') };
    prismaMock.holiday.findMany.mockResolvedValue([h1, h2]);
    prismaMock.timeEntry.findMany.mockResolvedValue([{ entryDate: new Date('2026-01-01') }]);
    prismaMock.timeEntry.upsert.mockImplementation(async ({ create }: { create: unknown }) => create);
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock as unknown as typeof prismaMock));

    const response = await request(app()).post('/api/holidays/autopopulate').send({
      userId: 'u1',
      payPeriodId: 'pp1',
      holidayChargeCodeId: 'cc1',
      defaultHours: 8
    });

    expect(response.status).toBe(200);
    expect(prismaMock.timeEntry.upsert).toHaveBeenCalledTimes(1);
  });
});
