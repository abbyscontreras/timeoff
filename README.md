# Timeoff (Node.js Implementation)

Multi-tenant Time & PTO tracking backend in Node.js/TypeScript with:
- tenant-scoped charge code management
- configurable pay period generation
- daily split time-entry submission with validation
- accrual/usage/banked dual-ledger balances
- holiday configuration and auto-population
- CSV/XLSX import and payroll XLSX export

## Quick start

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

## Tenant header

All `/api/*` endpoints require:

`x-tenant-id: <organization-id>`

## Core endpoints

- `GET/POST/PATCH /api/charge-codes`
- `GET /api/pay-periods`
- `POST /api/pay-periods/generate`
- `GET /api/pay-periods/:id/summary`
- `POST /api/time-entries/daily`
- `POST /api/time-entries/convert-comp-time`
- `GET /api/balances/user/:userId`
- `GET/POST /api/holidays`
- `POST /api/holidays/autopopulate`
- `POST /api/data/import`
- `GET /api/data/export/pay-period/:payPeriodId`

## Testing

```bash
npm run lint
npm test
npm run build
```
