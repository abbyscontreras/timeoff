import { z } from 'zod';

export const roleSchema = z.enum(['Admin', 'Manager', 'Employee']);
export const payCadenceSchema = z.enum(['Weekly', 'Bi-weekly', 'Semi-monthly', 'Monthly']);
export const payPeriodStatusSchema = z.enum(['Draft', 'Submitted', 'Approved', 'Locked']);
export const chargeCodeTypeSchema = z.enum(['Earned', 'Used', 'Worked', 'Adjustment']);
export const accrualImpactSchema = z.enum(['adds', 'subtracts', 'neutral']);

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  created_at: z.string()
});

export const userSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: roleSchema,
  pay_schedule_id: z.string().nullable(),
  hire_date: z.string(),
  created_at: z.string()
});

export const timeEntryCreateSchema = z.object({
  user_id: z.string(),
  pay_period_id: z.string(),
  entry_date: z.string(),
  charge_code_id: z.string(),
  hours_logged: z.number().positive(),
  notes: z.string().max(500).optional()
});

export const chargeCodeSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  code_key: z.string(),
  display_name: z.string(),
  type: chargeCodeTypeSchema,
  is_paid: z.boolean(),
  accrual_impact: accrualImpactSchema,
  is_active: z.boolean(),
  color_code: z.string().nullable().optional()
});

export const payPeriodSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  cadence: payCadenceSchema,
  start_date: z.string(),
  end_date: z.string(),
  status: payPeriodStatusSchema
});

export interface PTOBalance {
  id: string;
  organization_id: string;
  user_id: string;
  charge_code_id: string;
  earned_ytd: number;
  used_ytd: number;
  banked_hours: number;
  current_balance: number;
  updated_at: string;
}

export interface Holiday {
  id: string;
  organization_id: string;
  name: string;
  date: string;
  is_floating: boolean;
  year: number;
}

export type Organization = z.infer<typeof organizationSchema>;
export type User = z.infer<typeof userSchema>;
export type ChargeCode = z.infer<typeof chargeCodeSchema>;
export type PayPeriod = z.infer<typeof payPeriodSchema>;
export type TimeEntryCreateInput = z.infer<typeof timeEntryCreateSchema>;
