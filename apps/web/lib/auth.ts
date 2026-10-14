import jwt from 'jsonwebtoken';

export type UserRole = 'Admin' | 'Manager' | 'Employee';

export type AuthClaims = {
  sub: string;
  organization_id: string;
  role: UserRole;
  email: string;
};

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export function verifyTenantJwt(token: string): AuthClaims {
  const decoded = jwt.verify(token, JWT_SECRET) as AuthClaims;

  if (!decoded.organization_id || !decoded.role || !decoded.sub) {
    throw new Error('Invalid token payload');
  }

  return decoded;
}

export function parseBearerToken(authHeader: string | null): string {
  if (!authHeader) throw new Error('Missing authorization header');
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) throw new Error('Invalid bearer token');
  return token;
}
