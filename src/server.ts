import cors from 'cors';
import express from 'express';
import { tenantMiddleware } from './middleware/tenant.js';
import { balanceRouter } from './routes/balances.js';
import { chargeCodeRouter } from './routes/chargeCodes.js';
import { holidayRouter } from './routes/holidays.js';
import { importExportRouter } from './routes/importExport.js';
import { payPeriodRouter } from './routes/payPeriods.js';
import { timeEntryRouter } from './routes/timeEntries.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api', tenantMiddleware);
app.use('/api/charge-codes', chargeCodeRouter);
app.use('/api/pay-periods', payPeriodRouter);
app.use('/api/time-entries', timeEntryRouter);
app.use('/api/holidays', holidayRouter);
app.use('/api/data', importExportRouter);
app.use('/api/balances', balanceRouter);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${port}`);
});
