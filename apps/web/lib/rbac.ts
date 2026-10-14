import { NextRequest, NextResponse } from 'next/server';
import { parseBearerToken, verifyTenantJwt, type UserRole } from './auth';

export type ScopedContext = {
  userId: string;
  organizationId: string;
  role: UserRole;
  email: string;
};

export async function withTenantAuth(
  req: NextRequest,
  allowedRoles: UserRole[],
  handler: (req: NextRequest, ctx: ScopedContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = parseBearerToken(req.headers.get('authorization'));
    const claims = verifyTenantJwt(token);

    if (!allowedRoles.includes(claims.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return await handler(req, {
      userId: claims.sub,
      organizationId: claims.organization_id,
      role: claims.role,
      email: claims.email
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }
}
