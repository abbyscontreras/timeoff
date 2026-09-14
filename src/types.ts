import type { Request } from 'express';

export type TenantRequest = Request & { tenantId: string };
