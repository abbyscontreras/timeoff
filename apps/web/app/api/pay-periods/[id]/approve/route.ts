import { db } from '@timeoff/db';
import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '../../../../../lib/rbac';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return withTenantAuth(req, ['Manager', 'Admin'], async (_request, ctx) => {
    const { id } = await params;
    const updated = await db.payPeriod.updateMany({
      where: {
        id,
        organizationId: ctx.organizationId
      },
      data: {
        status: 'Approved'
      }
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Pay period not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  });
}
