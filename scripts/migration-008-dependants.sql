-- ============================================================================
-- Migration 008 — Dependants (family accounts)
-- Dependants are stored in the patients table (is_primary_account = false,
-- primary_account_id = family account holder). This makes them behave exactly
-- like patients across every module (medical records, invoices, appointments,
-- prescriptions, doctor/nurse portals) with zero changes to those modules.
--
-- FIX (v2): The original RLS policy queried `patients` from within a policy on
-- `patients` ("EXISTS (SELECT 1 FROM patients p ...)"), which Postgres rejects
-- with: infinite recursion detected in policy for relation "patients".
-- The check now lives in a SECURITY DEFINER function, which bypasses RLS on
-- its internal query and is immune to the recursion detection.
-- ============================================================================

-- 1. Extend patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_primary_account      BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_account_id      UUID REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dependant_relationship  VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_patients_primary_account ON patients (primary_account_id);

-- 2. Backfill: every existing patient is already a primary account (default TRUE),
--    so no data migration is required.

-- 3. Family-check helper. SECURITY DEFINER runs as the table owner, so the inner
--    query is NOT subject to RLS and cannot trigger the recursion guard.
CREATE OR REPLACE FUNCTION public.is_family_primary(pid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = pid AND p.user_id = auth.uid()
  );
$$;

-- 4. RLS — family access policy: a logged-in primary account holder (patient)
--    may read the patient rows of every dependant linked to them.
--    (Dependants themselves have no auth login — access flows through the primary.)
DO $$ BEGIN
  DROP POLICY IF EXISTS dependants_family_read ON patients;
  CREATE POLICY dependants_family_read ON patients
    FOR SELECT
    USING (
      org_id = public.current_org_id()
      AND auth.uid() IS NOT NULL
      AND (
        user_id = auth.uid()
        OR (primary_account_id IS NOT NULL AND public.is_family_primary(primary_account_id))
      )
    );
END $$;
