import type { NextFunction, Response } from 'express';

export function tenantMiddleware(req: Express.Request, res: Response, next: NextFunction): void {
  const tenantId = req.header('x-tenant-id');
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header is required' });
    return;
  }

  req.tenantId = tenantId;
  next();
}
