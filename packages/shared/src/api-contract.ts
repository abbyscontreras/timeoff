export type PayPeriodStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED';

export type ChargeCode = {
  id: string;
  codeKey: string;
  displayName: string;
  category: 'EARNED' | 'USED' | 'WORKED' | 'ADJUSTMENT';
  isPaid: boolean;
  accrualImpact: 'ADDS' | 'SUBTRACTS' | 'NEUTRAL';
  isActive: boolean;
};

export type DailySplit = {
  chargeCodeId: string;
  hoursLogged: number;
  notes?: string;
};

export type DailyEntryRequest = {
  userId: string;
  payPeriodId: string;
  entryDate: string;
  maxDailyHours?: number;
  splits: DailySplit[];
};
