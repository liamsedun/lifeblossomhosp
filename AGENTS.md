<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Work State (Jul 2026)

### Completed
- **Patient View dialog** — Fixed `getAge()` calculation (year-based, NaN/null guard), gender capitalization, full address (address + city + state), phone as `tel:` link, email as `mailto:` link in `src/app/admin/patients/page.tsx`
- **Billing page crash** — Switched `GET /api/invoices` and `GET /api/invoices/[id]` SELECT queries to `createServiceClient()` to bypass RLS on cross-table joins (patients, invoice_items, payments)
- **Bulk RLS fix** — Switched 20+ API routes to `createServiceClient()` for all INSERT/UPDATE/DELETE across patients, invoices, payments, prescriptions, appointments, medical-records, notifications, expenses, other-income, admin/users, staff, landing/doctors
- **Dashboard revenue** — Combined Medical Services (paid invoices) + Other Income; added stacked bar chart, pie chart, dual line chart
- **Landing Page Doctors** — Fixed Save with service client; photo upload with preview in Add/Edit dialogs
- **Staff column rename** — `available` → `is_available` via migration
- **Patient Edit/Delete/Schedule** — All wired to real API
- **Build**: `npx next build` passes with 0 errors

### Active
- (none)

### Blocked
- (none)
