# Timeoff Monorepo Foundation

This repository now includes a Turborepo-style multi-platform foundation for a multi-tenant Time & PTO Tracking Application.

## Monorepo Layout

- `/apps/web` — Next.js (App Router) dashboard and API route foundation
- `/apps/mobile` — Expo React Native mobile foundation
- `/packages/db` — Prisma schema/client package, migration/seed runners
- `/packages/shared-types` — shared TypeScript interfaces and Zod schemas
- `/src` — existing Express prototype (kept for backward compatibility)

## Root Workspace Commands

- `npm run dev:turbo`
- `npm run build:turbo`
- `npm run lint:turbo`
- `npm run test:turbo`

## Multi-Tenant Data Model (packages/db)

Implemented with `organization_id` scoping and foreign-key relations across:

- organizations
- users
- pay_periods
- charge_codes
- time_entries
- pto_balances
- holidays

Additional support model:

- pay_schedules

## Auth and RBAC Foundation (apps/web)

JWT middleware validates tenant claims and role:

- required claim: `organization_id`
- roles: `Admin`, `Manager`, `Employee`

Role routing policy implemented in API route scaffolds:

- Admins: charge code management routes
- Managers/Admins: pay period approval routes
- Employees/Managers/Admins: daily time entry submit routes

## Seed Data (packages/db/prisma/seed.ts)

Seed script includes:

- default charge codes: Regular Worked, PTO, Sick Leave, Banked Comp Time
- sample holiday calendar

## Package-Level DB Commands

From `packages/db`:

- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:deploy`
- `npm run db:seed`
