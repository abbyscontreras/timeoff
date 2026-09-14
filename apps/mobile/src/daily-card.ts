import type { DailyEntryRequest } from '../../../packages/shared/src/api-contract.js';

export async function submitFromMobile(apiUrl: string, tenantId: string, entry: DailyEntryRequest): Promise<boolean> {
  const response = await fetch(`${apiUrl}/api/time-entries/daily`, {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(entry)
  });

  return response.ok;
}
