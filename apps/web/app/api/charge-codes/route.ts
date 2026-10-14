import { db } from '@timeoff/db';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withTenantAuth } from '../../../lib/rbac';

const createChargeCodeSchema = z.object({
  code_key: z.string().min(2),
  display_name: z.string().min(2),
  type: z.enum(['Earned', 'Used', 'Worked', 'Adjustment']),
  is_paid: z.boolean(),
  accrual_impact: z.enum(['adds', 'subtracts', 'neutral']),
  is_active: z.boolean().default(true),
  color_code: z.string().optional()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withTenantAuth(req, ['Admin'], async (_request, ctx) => {
    const payload = createChargeCodeSchema.parse(await req.json());

    const chargeCode = await db.chargeCode.create({
      data: {
        organizationId: ctx.organizationId,
        codeKey: payload.code_key,
        displayName: payload.display_name,
        type: payload.type,
        isPaid: payload.is_paid,
        accrualImpact: payload.accrual_impact,
        isActive: payload.is_active,
        colorCode: payload.color_code
      }
    });

    return NextResponse.json(chargeCode, { status: 201 });
  });
}
