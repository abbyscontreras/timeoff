import type { ChargeCode, DailyEntryRequest } from '../../../packages/shared/src/api-contract.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function fetchChargeCodes(tenantId: string): Promise<ChargeCode[]> {
  const response = await fetch(`${API_URL}/api/charge-codes`, { headers: { 'x-tenant-id': tenantId } });
  if (!response.ok) throw new Error('Failed to load charge codes');
  return response.json() as Promise<ChargeCode[]>;
}

export async function submitDailyEntry(tenantId: string, payload: DailyEntryRequest): Promise<void> {
  const response = await fetch(`${API_URL}/api/time-entries/daily`, {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to save entry');
  }
}
