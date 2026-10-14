# @timeoff/web

Next.js App Router dashboard foundation with API routes and multi-tenant JWT/RBAC middleware.

## Security behavior

- JWT claims must include `organization_id` and `role`
- Data writes are organization scoped via `organization_id`
- RBAC roles:
  - Admin: manage charge codes and holidays
  - Manager: approve pay periods
  - Employee: submit daily time entries
