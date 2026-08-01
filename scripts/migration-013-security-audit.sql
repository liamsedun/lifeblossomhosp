-- ============================================================================
-- MIGRATION 013: High-security audit logging
-- Adds:
--   1. audit_logs columns: role, description (denormalized for filtering)
--   2. security_events table (anomaly detection)
--   3. log_audit() trigger function (DB-level auto-logging)
--   4. AFTER INSERT/UPDATE/DELETE triggers on sensitive tables:
--        medical_records, appointments, invoices, payments, patients
--      (dependant changes live in the patients table and are exposed as
--      entity 'dependants' by the log_audit() function itself)
--   5. RLS for security_events (admin/super_admin read-only, append-only)
--   6. audit_logs RLS hardened: SELECT-only for admin/super_admin (prevents
--      tampering — inserts happen only via triggers/service role)
-- Run this in the Supabase SQL editor. Idempotent: safe to re-run.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. HELPER FUNCTIONS (self-contained — do not assume database/rls_policies.sql
--    was run first; CREATE OR REPLACE is idempotent)
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. audit_logs: add role + description columns (IF NOT EXISTS)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS role VARCHAR(20);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description TEXT;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. SECURITY EVENTS TABLE (anomaly detection)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type  VARCHAR(50)  NOT NULL,
  severity    VARCHAR(10)  NOT NULL DEFAULT 'warning', -- info | warning | high | critical
  description TEXT         NOT NULL,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_org_created ON security_events (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events (org_id, event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events (user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. log_audit() TRIGGER FUNCTION
--    SECURITY DEFINER so it bypasses RLS (audit_logs is append-only).
--    Guards against recursion: never triggers on audit_logs/security_events.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org       UUID;
  v_role      TEXT;
  v_changes   JSONB;
  v_desc      TEXT;
  v_entity    TEXT;
BEGIN
  IF TG_TABLE_NAME IN ('audit_logs', 'security_events') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Skip service-role / anon writes (auth.uid() IS NULL): the app's API layer
  -- logs those with full user/IP/user-agent context via logAudit().
  -- This prevents duplicate or orphaned (org_id NULL) audit rows.
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_org := public.current_user_org_id();
  SELECT role::text INTO v_role FROM public.users WHERE id = auth.uid();

  -- Dependant changes live in the patients table; expose them as entity 'dependants'
  v_entity := TG_TABLE_NAME;
  IF TG_TABLE_NAME = 'patients' AND COALESCE(NEW.primary_account_id, OLD.primary_account_id) IS NOT NULL THEN
    v_entity := 'dependants';
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_changes := to_jsonb(NEW);
    v_desc := TG_TABLE_NAME || ' created';
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(k, (to_jsonb(NEW)) -> k)
      INTO v_changes
      FROM jsonb_object_keys(to_jsonb(OLD)) k
      WHERE COALESCE((to_jsonb(OLD)) -> k, 'null'::jsonb)
            IS DISTINCT FROM COALESCE((to_jsonb(NEW)) -> k, 'null'::jsonb);
    v_desc := TG_TABLE_NAME || ' updated';
  ELSE
    v_changes := jsonb_build_object('deleted_record', to_jsonb(OLD));
    v_desc := TG_TABLE_NAME || ' deleted';
  END IF;

  INSERT INTO public.audit_logs (
    org_id, user_id, role, action, entity_type, entity_id,
    changes, description, ip_address, user_agent
  )
  VALUES (
    v_org,
    auth.uid(),
    v_role,
    lower(TG_OP)::audit_action,
    v_entity,
    COALESCE(NEW.id, OLD.id),
    v_changes,
    v_desc,
    NULL,
    NULL
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. TRIGGERS ON SENSITIVE TABLES
-- ────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS audit_medical_records ON medical_records;
CREATE TRIGGER audit_medical_records
  AFTER INSERT OR UPDATE OR DELETE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

DROP TRIGGER IF EXISTS audit_appointments ON appointments;
CREATE TRIGGER audit_appointments
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

DROP TRIGGER IF EXISTS audit_invoices ON invoices;
CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

DROP TRIGGER IF EXISTS audit_patients ON patients;
CREATE TRIGGER audit_patients
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. RLS: SECURITY EVENTS
--    Append-only: no INSERT/UPDATE/DELETE policies — only triggers and the
--    service role (server-side API layer) may write. Admin/super_admin read.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS security_events_admin_read ON security_events;
  CREATE POLICY security_events_admin_read ON security_events
    FOR SELECT
    USING (
      (
        org_id = public.current_user_org_id()
        AND public.current_user_role()::text IN ('admin', 'super_admin')
      )
      OR org_id IS NULL
    );
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. RLS: HARDEN audit_logs (append-only)
--    Existing audit_admin_all allowed admin UPDATE/DELETE (tampering risk).
--    Replace with SELECT-only. Writes happen via triggers (definer) and the
--    server-side service role only.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS audit_admin_all ON audit_logs;
DO $$ BEGIN
  DROP POLICY IF EXISTS audit_admin_read ON audit_logs;
  CREATE POLICY audit_admin_read ON audit_logs
    FOR SELECT
    USING (
      org_id = public.current_user_org_id()
      AND public.current_user_role()::text IN ('admin', 'super_admin')
    );
END $$;

-- ============================================================================
-- END OF MIGRATION 013
-- ============================================================================
