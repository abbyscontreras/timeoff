import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { timeEntryRouter } from '../src/routes/timeEntries.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.tenantId = 'default-org';
    next();
  });
  app.use('/api/time-entries', timeEntryRouter);
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: error.message });
  });
  return app;
}

describe('time entry route validation', () => {
  it('returns 400 for malformed request body', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/time-entries/daily')
      .send({ userId: 'u1' });

    expect(response.status).toBe(400);
  });

  it('rejects daily entries that exceed max daily hours', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/time-entries/daily')
      .send({
        userId: 'u1',
        payPeriodId: 'p1',
        entryDate: '2026-01-01',
        maxDailyHours: 8,
        splits: [{ chargeCodeId: 'c1', hoursLogged: 9 }]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Maximum daily hours exceeded');
  });

  it('rejects duplicate charge code splits for a day', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/time-entries/daily')
      .send({
        userId: 'u1',
        payPeriodId: 'p1',
        entryDate: '2026-01-01',
        maxDailyHours: 24,
        splits: [
          { chargeCodeId: 'c1', hoursLogged: 2 },
          { chargeCodeId: 'c1', hoursLogged: 2 }
        ]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Duplicate charge code splits');
  });
});
