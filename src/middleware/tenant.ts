import type { NextFunction, Request, Response } from 'express';

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.get('x-tenant-id');
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header is required' });
    return;
  }

  req.tenantId = tenantId;
  next();
}
