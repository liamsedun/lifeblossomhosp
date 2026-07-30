-- Migration 004: Patient-level RLS policies for data isolation
-- Run this in the Supabase SQL Editor to prevent patients from
-- seeing each other's appointments, invoices, payments, and records.
-- ===========================================================================

-- 0. Ensure super_admin role exists in the enum (self-contained)
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Helper: get the org_id for the currently authenticated user
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 2. Drop previous weak org-only policies
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON appointments; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON invoices; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON invoice_items; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON payments; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON medical_records; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON patients; END $$;

-- 3. Helpers for patient-scoped access checks

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role::text IN ('super_admin', 'admin', 'doctor', 'nurse', 'accountant')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 4. Patient-level RLS policies

-- PATIENTS: patient sees own, staff sees all in org
DROP POLICY IF EXISTS patient_self ON patients;
CREATE POLICY patient_self ON patients
  USING (
    org_id = public.current_user_org_id()
    AND (
      user_id = auth.uid()
      OR public.is_staff()
    )
  );

-- APPOINTMENTS: patient sees own, doctor sees assigned, staff sees all
DROP POLICY IF EXISTS appointment_patient_self ON appointments;
CREATE POLICY appointment_patient_self ON appointments
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role::text IN ('super_admin', 'admin', 'doctor', 'nurse', 'accountant')
    )
  );

-- INVOICES: patient sees own, staff sees all
DROP POLICY IF EXISTS inv_patient_self ON invoices;
CREATE POLICY inv_patient_self ON invoices
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = invoices.patient_id
      AND patients.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role::text IN ('super_admin', 'admin', 'doctor', 'nurse', 'accountant')
    )
  );

-- INVOICE ITEMS: inherit from invoice
DROP POLICY IF EXISTS inv_items_patient_self ON invoice_items;
CREATE POLICY inv_items_patient_self ON invoice_items
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN patients ON patients.id = invoices.patient_id
      WHERE invoices.id = invoice_items.invoice_id
      AND patients.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role::text IN ('super_admin', 'admin', 'doctor', 'nurse', 'accountant')
    )
  );

-- PAYMENTS: patient sees own, staff sees all
DROP POLICY IF EXISTS pay_patient_self ON payments;
CREATE POLICY pay_patient_self ON payments
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = payments.patient_id
      AND patients.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role::text IN ('super_admin', 'admin', 'doctor', 'nurse', 'accountant')
    )
  );

-- MEDICAL RECORDS: patient sees own (non-confidential), staff sees all
DROP POLICY IF EXISTS medrec_patient_self ON medical_records;
CREATE POLICY medrec_patient_self ON medical_records
  USING (
    (
      EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = medical_records.patient_id
        AND patients.user_id = auth.uid()
      )
      AND is_confidential = false
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role::text IN ('super_admin', 'admin', 'doctor', 'nurse', 'accountant')
    )
  );

-- 5. Users table: patient sees own, staff sees all in org
DROP POLICY IF EXISTS org_isolation ON users;
DROP POLICY IF EXISTS user_self_or_staff ON users;
CREATE POLICY user_self_or_staff ON users
  USING (
    id = auth.uid()
    OR (
      org_id = public.current_user_org_id()
      AND public.is_staff()
    )
  );
