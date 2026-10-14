import { db } from '@timeoff/db';
import { timeEntryCreateSchema } from '@timeoff/shared-types';
import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '../../../lib/rbac';

const ALLOWED_SUBMITTER_ROLES = ['Employee', 'Manager', 'Admin'] as const;

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withTenantAuth(req, [...ALLOWED_SUBMITTER_ROLES], async (_req, ctx) => {
    const payload = timeEntryCreateSchema.parse(await req.json());

    const entry = await db.timeEntry.create({
      data: {
        organizationId: ctx.organizationId,
        userId: payload.user_id,
        payPeriodId: payload.pay_period_id,
        entryDate: new Date(payload.entry_date),
        chargeCodeId: payload.charge_code_id,
        hoursLogged: payload.hours_logged,
        notes: payload.notes
      }
    });

    return NextResponse.json(entry, { status: 201 });
  });
}
