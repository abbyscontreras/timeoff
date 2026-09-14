import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  holiday: { upsert: vi.fn() },
  chargeCode: { upsert: vi.fn(), findMany: vi.fn() },
  user: { findMany: vi.fn() },
  pTOBalance: { upsert: vi.fn() },
  $transaction: vi.fn()
}));

vi.mock('../src/db.js', () => ({ prisma: prismaMock }));

const { importExportRouter } = await import('../src/routes/importExport.js');

function app() {
  const api = express();
  api.use(express.json({ limit: '10mb' }));
  api.use((req, _res, next) => {
    req.tenantId = 'tenant-1';
    next();
  });
  api.use('/api/data', importExportRouter);
  api.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: error.message });
  });
  return api;
}

describe('import/export route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  });

  it('imports charge codes from csv payload', async () => {
    prismaMock.chargeCode.upsert.mockResolvedValue({});
    const csv = 'code_key,display_name,category,is_paid,accrual_impact,active_status\nREG,Regular,WORKED,true,NEUTRAL,true';
    const response = await request(app()).post('/api/data/import').send({
      type: 'charge_codes',
      format: 'csv',
      fileBase64: Buffer.from(csv, 'utf8').toString('base64')
    });

    expect(response.status).toBe(200);
    expect(prismaMock.chargeCode.upsert).toHaveBeenCalledTimes(1);
  });

  it('rejects balance imports with cross-tenant references', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'allowed-user' }]);
    prismaMock.chargeCode.findMany.mockResolvedValue([{ id: 'allowed-code' }]);

    const csv = 'user_id,charge_code_id,earned_ytd,used_ytd,banked_hours,current_balance\nother-user,other-code,1,0,0,1';
    const response = await request(app()).post('/api/data/import').send({
      type: 'balances',
      format: 'csv',
      fileBase64: Buffer.from(csv, 'utf8').toString('base64')
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('cross-tenant');
  });
});
