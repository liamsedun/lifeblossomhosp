<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## What this project is

Life Blossom — a standalone single-hospital management web app (Next.js, one Supabase project, one Netlify site). It is NOT the SkyCare SaaS.

**IMPORTANT: Life Blossom is an INDEPENDENT project.** SkyCare (`C:\Users\Admin\Downloads\skycare--saas-hosp`) is a SEPARATE multi-tenant SaaS with its own git repo (`liamsedun/skycare`), its own Supabase project (`pvakwxeusbxesdealuuc`), its own env files and its own deployments. The two projects must NEVER be mixed: same-named files exist in both, but they are different codebases with different databases and deployments. All work in this workspace is Life Blossom-only; never read from, write to, or reference the SkyCare folder as part of Life Blossom work.

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

## Security & Audit Architecture (migration-013)

### Layered audit model (who logs what)
- **DB triggers (safety net)**: `public.log_audit()` AFTER INSERT/UPDATE/DELETE on medical_records, dependants (patients rows with primary_account_id), ppointments, invoices, payments, patients. Fires ONLY when `auth.uid()` is set (RLS-scoped writes). Captures role, org, and a JSONB column diff in changes. Skipped for service-role writes to avoid orphaned rows (`auth.uid()` is NULL).
- **API layer (authoritative)**: `src/lib/audit.ts` `logAudit()` / `logView()` / `flagSecurityEvent()` / `logAuth()` � writes via the service client with full user/IP/user-agent/org context. Used for all service-client CRUD (dependants, appointments, invoices, payments/declare, payments/cancel, patients) and ALL VIEW (read) tracking (medical-records list, invoice detail, appointment detail, dependant view, own patient profile).
- **Never double-log**: a write is logged by the trigger XOR the API layer, determined by which client wrote it (RLS client ? trigger; service client ? API).

### audit_logs / security_events
- udit_logs: append-only. RLS = SELECT-only for admin/super_admin (policy `audit_admin_read` replaces the old `audit_admin_all` which allowed admin UPDATE/DELETE � tamper risk). Columns: org_id, user_id, role, action (enum), entity_type, entity_id, changes JSONB, description, ip_address, user_agent.
- security_events: anomaly store. RLS = SELECT for admin/super_admin on own org OR org_id IS NULL (global failed-login events carry no org). Writes only via service client / definer triggers.
- Anomaly rules: >8 VIEWs of same entity by same user in 5 min ? apid_view (high); >=5 failed logins for identifier+IP in 15 min ? login locked (HTTP 429) + ailed_login events.
- Deployment: run `scripts/migration-013-security-audit.sql` in the Supabase SQL editor (idempotent).

### Admin UI
- `/admin/audit-logs` (super_admin/admin only): tabs for Audit Logs + Security Events, filters (table/action/role/user/event type/severity/date), pagination, expandable column-diff view, CSV export. APIs: `GET /api/audit-logs` (filters: entity_type, entity_id, user_id, role, action, from, to), `GET /api/security-events` (event_type, severity, user_id, from, to).
- Idle auto-logout: `src/components/ui/IdleLogout.tsx` in admin + patient layouts, 15 min inactivity ? `POST /api/auth/logout` (writes logout audit entry) ? redirect /login.

### Deferred: field-level encryption (documented design)
Sensitive clinical fields (medical_records.diagnosis/notes, patients.blood_group/genotype/allergies) are currently protected by RLS (patient reads own record only; staff read org-wide) + audit logging. Application-layer AES-256-GCM was deliberately NOT implemented now. When adopted:
1. Add env `FIELD_ENCRYPTION_KEY` (64-hex random; rotate via key-id prefix `v1:` on ciphertext).
2. Encrypt in the API write layer (service client) just before insert; decrypt in read paths (medical-records GET, patients GET) � all reads already flow through API routes, so no client-side change.
3. Migration adds `*_enc` columns; backfill script decrypts during cutover; plaintext columns dropped.
4. Trade-offs accepted: no SQL LIKE search on encrypted fields; triggers log ciphertext diffs (add decryption in log_audit via key lookup if plaintext diffs needed).
