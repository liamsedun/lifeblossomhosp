-- ============================================================================
-- LIFE BLOSSOM HOSPITAL — ROW LEVEL SECURITY POLICIES
-- Production-ready RBAC: patient / admin / doctor / nurse / accountant
-- Run this in Supabase Dashboard SQL Editor after the main schema.
-- Idempotent: safe to re-run.
-- ============================================================================

-- ########################################################################
-- 1. HELPER FUNCTIONS (used by all policies)
-- ########################################################################

-- Get the current user's role from public.users (joined to auth.users via auth.uid())
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Get the current user's org_id
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$;

-- Check if the current user has one of the given roles
CREATE OR REPLACE FUNCTION public.has_role(required_roles user_role[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT public.current_user_role() = ANY(required_roles);
$$;

-- ########################################################################
-- 2. DROP EXISTING POLICIES (idempotent)
-- ########################################################################

DO $$ DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN (
      'organizations','users','patients','staff','appointments',
      'medical_records','prescriptions','prescription_items',
      'invoices','invoice_items','payments','notifications','audit_logs'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ########################################################################
-- 3. ORGANIZATIONS — only visible to users belonging to that org
-- ########################################################################

CREATE POLICY org_self ON organizations
  FOR SELECT
  USING (id = public.current_user_org_id());

-- ########################################################################
-- 4. USERS — users see own record; staff see all in their org
-- ########################################################################

CREATE POLICY user_self ON users
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY user_staff_read ON users
  FOR SELECT
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['admin','doctor','nurse','accountant']::user_role[])
  );

-- Service role may INSERT (registration), but anon never does through RLS
CREATE POLICY user_staff_insert ON users
  FOR INSERT
  WITH CHECK (
    -- Allow inserts where the id matches the auth user (self-register via service role helper)
    -- or by any authenticated user with admin role
    id = auth.uid()
    OR public.has_role(ARRAY['admin']::user_role[])
  );

CREATE POLICY user_staff_update ON users
  FOR UPDATE
  USING (id = auth.uid() OR public.has_role(ARRAY['admin']::user_role[]))
  WITH CHECK (id = auth.uid() OR public.has_role(ARRAY['admin']::user_role[]));

-- ########################################################################
-- 5. PATIENTS
--    Patient: own record only
--    Staff (admin/doctor/nurse/accountant): all in org
-- ########################################################################

CREATE POLICY patient_self ON patients
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY patient_staff_all ON patients
  FOR ALL
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['admin','doctor','nurse','accountant']::user_role[])
  );

-- ########################################################################
-- 6. STAFF
--    Staff: own record only
--    Admin: all in org
--    Doctor/nurse/accountant: all in org (read-only access)
-- ########################################################################

CREATE POLICY staff_self ON staff
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY staff_admin_all ON staff
  FOR ALL
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['admin']::user_role[])
  );

CREATE POLICY staff_read ON staff
  FOR SELECT
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['doctor','nurse','accountant']::user_role[])
  );

-- ########################################################################
-- 7. APPOINTMENTS
--    Patient: own appointments (via patients.user_id)
--    Doctor: assigned appointments
--    Admin/nurse: all in org
--    Accountant: read-only (for billing context)
-- ########################################################################

CREATE POLICY appointment_patient_self ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY appointment_patient_self_insert ON appointments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY appointment_patient_self_update ON appointments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY appointment_doctor_assigned ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.id = appointments.doctor_id
    )
  );

CREATE POLICY appointment_doctor_update ON appointments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.id = appointments.doctor_id
    )
  );

CREATE POLICY appointment_staff_all ON appointments
  FOR SELECT
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['admin','nurse']::user_role[])
  );

CREATE POLICY appointment_staff_insert_update ON appointments
  FOR INSERT OR UPDATE
  WITH CHECK (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['admin','nurse']::user_role[])
  );

CREATE POLICY appointment_accountant_read ON appointments
  FOR SELECT
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['accountant']::user_role[])
  );

-- ########################################################################
-- 8. MEDICAL RECORDS
--    Patient: own non-confidential records (read-only)
--    Doctor/nurse: all in org (full access — create/read/update)
--    Admin: all in org (read-only — clinical separation)
-- ########################################################################

CREATE POLICY medrec_patient_self ON medical_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medical_records.patient_id
      AND patients.user_id = auth.uid()
    )
    AND medical_records.is_confidential = false
  );

CREATE POLICY medrec_clinical_all ON medical_records
  FOR ALL
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['doctor','nurse']::user_role[])
  );

CREATE POLICY medrec_admin_read ON medical_records
  FOR SELECT
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['admin']::user_role[])
  );

-- ########################################################################
-- 9. PRESCRIPTIONS / PRESCRIPTION_ITEMS
--    Patient: own prescriptions (read-only)
--    Doctor: own prescriptions (create/read/update)
--    Admin/nurse: all in org (read-only)
-- ########################################################################

CREATE POLICY rx_patient_self ON prescriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = prescriptions.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY rx_doctor_own ON prescriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.id = prescriptions.doctor_id
    )
  );

CREATE POLICY rx_staff_read ON prescriptions
  FOR SELECT
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['admin','nurse']::user_role[])
  );

-- Cascade: prescription_items inherit from prescription access
CREATE POLICY rx_items_patient ON prescription_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prescriptions
      JOIN patients ON patients.id = prescriptions.patient_id
      WHERE prescriptions.id = prescription_items.prescription_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY rx_items_doctor ON prescription_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM prescriptions
      JOIN staff ON staff.id = prescriptions.doctor_id
      WHERE prescriptions.id = prescription_items.prescription_id
      AND staff.user_id = auth.uid()
    )
  );

CREATE POLICY rx_items_staff_read ON prescription_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prescriptions
      JOIN users ON users.org_id = prescriptions.org_id
      WHERE prescriptions.id = prescription_items.prescription_id
      AND users.id = auth.uid()
      AND users.role IN ('admin','nurse')
    )
  );

-- ########################################################################
-- 10. INVOICES / INVOICE_ITEMS
--     Patient: own invoices (read-only)
--     Admin/accountant: all in org (full access)
--     Doctor/nurse: read-only (for reference)
-- ########################################################################

CREATE POLICY inv_patient_self ON invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = invoices.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY inv_billing_all ON invoices
  FOR ALL
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['admin','accountant']::user_role[])
  );

CREATE POLICY inv_clinical_read ON invoices
  FOR SELECT
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['doctor','nurse']::user_role[])
  );

-- Invoice items follow invoice access
CREATE POLICY inv_items_patient ON invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN patients ON patients.id = invoices.patient_id
      WHERE invoices.id = invoice_items.invoice_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY inv_items_billing ON invoice_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.org_id = public.current_user_org_id()
      AND public.has_role(ARRAY['admin','accountant']::user_role[])
    )
  );

CREATE POLICY inv_items_clinical_read ON invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.org_id = public.current_user_org_id()
      AND public.has_role(ARRAY['doctor','nurse']::user_role[])
    )
  );

-- ########################################################################
-- 11. PAYMENTS
--     Patient: own payments (read-only)
--     Admin/accountant: all in org (full access)
--     Doctor/nurse: read-only
-- ########################################################################

CREATE POLICY pay_patient_self ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = payments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY pay_billing_all ON payments
  FOR ALL
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['admin','accountant']::user_role[])
  );

CREATE POLICY pay_clinical_read ON payments
  FOR SELECT
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['doctor','nurse']::user_role[])
  );

-- ########################################################################
-- 12. NOTIFICATIONS
--     Users see their own notifications
--     Admin sees all in org
-- ########################################################################

CREATE POLICY notif_self ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notif_admin_all ON notifications
  FOR ALL
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['admin']::user_role[])
  );

-- ########################################################################
-- 13. AUDIT LOGS
--     Admin only — full access within org
-- ########################################################################

CREATE POLICY audit_admin_all ON audit_logs
  FOR ALL
  USING (
    org_id = public.current_user_org_id()
    AND public.has_role(ARRAY['admin']::user_role[])
  );

-- ########################################################################
-- 14. SET DEFAULT ORG CONTEXT FOR SESSION-BASED QUERIES
-- ########################################################################

-- When a user logs in via Supabase Auth, set the app context so
-- triggers and policies can access the org_id without a join
CREATE OR REPLACE FUNCTION public.set_session_org()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Note: this runs as the authenticated user via RLS
  -- The org_id is read from the user's profile row
  PERFORM public.current_user_org_id();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
