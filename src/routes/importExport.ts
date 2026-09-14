import { Router } from 'express';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { prisma } from '../db.js';
import { buildPayrollWorkbook, parseWorkbook } from '../services/excel.js';

export const importExportRouter = Router();

const importSchema = z.object({
  type: z.enum(['balances', 'holidays', 'charge_codes']),
  format: z.enum(['csv', 'xlsx']),
  fileBase64: z.string().min(1)
});

importExportRouter.post('/import', async (req, res) => {
  const tenantId = req.tenantId!;
  const payload = importSchema.parse(req.body);
  const buffer = Buffer.from(payload.fileBase64, 'base64');

  let rows: Record<string, unknown>[] = [];
  if (payload.format === 'csv') {
    rows = parse(buffer.toString('utf8'), { columns: true, skip_empty_lines: true }) as Record<string, unknown>[];
  } else {
    rows = await parseWorkbook(buffer);
  }

  if (payload.type === 'holidays') {
    for (const row of rows) {
      await prisma.holiday.create({
        data: {
          organizationId: tenantId,
          name: String(row.name ?? row.Name ?? ''),
          date: new Date(String(row.date ?? row.Date)),
          year: Number(row.year ?? row.Year ?? new Date(String(row.date ?? row.Date)).getFullYear()),
          isFloating: Boolean(row.is_floating ?? row.isFloating ?? false)
        }
      });
    }
  }

  if (payload.type === 'charge_codes') {
    for (const row of rows) {
      await prisma.chargeCode.create({
        data: {
          organizationId: tenantId,
          codeKey: String(row.code_key ?? row.codeKey),
          displayName: String(row.display_name ?? row.displayName),
          category: String(row.category ?? 'WORKED') as 'WORKED' | 'USED' | 'EARNED' | 'ADJUSTMENT',
          isPaid: Boolean(row.is_paid ?? row.isPaid ?? true),
          accrualImpact: String(row.accrual_impact ?? row.accrualImpact ?? 'NEUTRAL') as 'ADDS' | 'SUBTRACTS' | 'NEUTRAL',
          isActive: Boolean(row.active_status ?? row.isActive ?? true)
        }
      });
    }
  }

  if (payload.type === 'balances') {
    for (const row of rows) {
      await prisma.pTOBalance.upsert({
        where: {
          userId_chargeCodeId: {
            userId: String(row.user_id ?? row.userId),
            chargeCodeId: String(row.charge_code_id ?? row.chargeCodeId)
          }
        },
        update: {
          earnedYtd: Number(row.earned_ytd ?? row.earnedYtd ?? 0),
          usedYtd: Number(row.used_ytd ?? row.usedYtd ?? 0),
          bankedHours: Number(row.banked_hours ?? row.bankedHours ?? 0),
          currentBalance: Number(row.current_balance ?? row.currentBalance ?? 0)
        },
        create: {
          userId: String(row.user_id ?? row.userId),
          chargeCodeId: String(row.charge_code_id ?? row.chargeCodeId),
          earnedYtd: Number(row.earned_ytd ?? row.earnedYtd ?? 0),
          usedYtd: Number(row.used_ytd ?? row.usedYtd ?? 0),
          bankedHours: Number(row.banked_hours ?? row.bankedHours ?? 0),
          currentBalance: Number(row.current_balance ?? row.currentBalance ?? 0)
        }
      });
    }
  }

  res.json({ importedRows: rows.length, type: payload.type });
});

importExportRouter.get('/export/pay-period/:payPeriodId', async (req, res) => {
  const tenantId = req.tenantId!;
  const payPeriodId = req.params.payPeriodId;

  const entries = await prisma.timeEntry.findMany({
    where: { payPeriodId, payPeriod: { organizationId: tenantId } },
    include: {
      user: true,
      chargeCode: true,
      payPeriod: true
    }
  });

  const rows = entries.map((entry) => ({
    user: entry.user.name,
    payPeriodStart: entry.payPeriod.startDate.toISOString().slice(0, 10),
    payPeriodEnd: entry.payPeriod.endDate.toISOString().slice(0, 10),
    chargeCode: entry.chargeCode.codeKey,
    hours: entry.hoursLogged
  }));

  const workbook = await buildPayrollWorkbook(rows);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=pay-period-${payPeriodId}.xlsx`);
  res.send(workbook);
});
