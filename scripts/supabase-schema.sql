-- ============================================================================
-- LIFE BLOSSOM HOSPITAL — Production Database Schema
-- Target: Supabase PostgreSQL
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- ============================================================================
-- Multi-tenant hospital management system supporting:
--   patient, admin, doctor, nurse, accountant roles
-- Modules: Patients, Staff, Appointments, Medical Records,
--          Prescriptions, Billing, Payments, Notifications,
--          Expenses, Other Income, Audit Logs, Push Subscriptions
-- ============================================================================

-- ###########################################################################
-- 1. ENUMS
-- ###########################################################################

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('patient', 'admin', 'doctor', 'nurse', 'accountant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_type AS ENUM ('in_person', 'video_call');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE record_type AS ENUM ('diagnosis', 'lab_result', 'prescription', 'surgery_report', 'vaccination', 'imaging');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prescription_status AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE medication_route AS ENUM ('oral', 'iv', 'intramuscular', 'topical', 'sublingual', 'inhalation', 'rectal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'partially_paid', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'insurance', 'mobile_money');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('appointment_reminder', 'payment_due', 'lab_result', 'prescription_refill', 'general');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'view', 'login', 'logout');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ###########################################################################
-- 2. TABLES
-- ###########################################################################

-- ---------------------------------------------------------------------------
-- 2.1 ORGANIZATIONS (multi-tenant root)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  logo_url    TEXT,
  settings    JSONB DEFAULT '{}'::jsonb,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.2 USERS (unified login - role discriminator)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(30),
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_org_email UNIQUE (org_id, email)
);

-- ---------------------------------------------------------------------------
-- 2.3 PATIENTS (extends users where role = 'patient')
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  patient_number          VARCHAR(50) NOT NULL,
  date_of_birth           DATE,
  gender                  VARCHAR(10),
  marital_status          VARCHAR(20) NOT NULL DEFAULT 'single',
  blood_group             VARCHAR(5),
  genotype                VARCHAR(10),
  medical_plan            VARCHAR(20) NOT NULL DEFAULT 'individual',
  height_cm               NUMERIC(5,1),
  weight_kg               NUMERIC(5,1),
  allergies               TEXT,
  chronic_conditions      TEXT,
  address                 TEXT,
  city                    VARCHAR(100),
  state                   VARCHAR(100),
  emergency_contact_name  VARCHAR(200),
  emergency_contact_phone VARCHAR(30),
  emergency_contact_rel   VARCHAR(50),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_patients_org_number UNIQUE (org_id, patient_number)
);

-- ---------------------------------------------------------------------------
-- 2.4 STAFF (extends users where role is doctor/nurse/admin/accountant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  staff_number    VARCHAR(50) NOT NULL,
  department      VARCHAR(100),
  specialization  VARCHAR(200),
  license_number  VARCHAR(100),
  years_of_exp    INTEGER,
  qualification   TEXT,
  employment_type VARCHAR(50) DEFAULT 'full_time',
  base_salary     NUMERIC(12,2),
  is_available    BOOLEAN DEFAULT true,
  available_from  TIME,
  available_until TIME,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_staff_org_number UNIQUE (org_id, staff_number)
);

-- ---------------------------------------------------------------------------
-- 2.5 APPOINTMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id         UUID REFERENCES staff(id) ON DELETE SET NULL,
  appointment_date  DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME,
  type              appointment_type DEFAULT 'in_person',
  status            appointment_status DEFAULT 'scheduled',
  reason            TEXT,
  notes             TEXT,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.6 MEDICAL RECORDS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID REFERENCES staff(id) ON DELETE SET NULL,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  record_type     record_type NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  diagnosis       TEXT,
  treatment       TEXT,
  notes           TEXT,
  attachments     TEXT[],
  is_confidential BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.7 PRESCRIPTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID REFERENCES staff(id) ON DELETE SET NULL,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  diagnosis       TEXT,
  notes           TEXT,
  status          prescription_status DEFAULT 'active',
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.8 PRESCRIPTION ITEMS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescription_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id   UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name   VARCHAR(255) NOT NULL,
  dosage            VARCHAR(100) NOT NULL,
  frequency         VARCHAR(100) NOT NULL,
  route             medication_route DEFAULT 'oral',
  duration          VARCHAR(100),
  quantity          INTEGER,
  refills           INTEGER DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.9 INVOICES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  invoice_number  VARCHAR(50) NOT NULL,
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  status          invoice_status DEFAULT 'draft',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(12,2) DEFAULT 0,
  attending_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_invoices_org_number UNIQUE (org_id, invoice_number)
);

-- ---------------------------------------------------------------------------
-- 2.10 INVOICE ITEMS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description   VARCHAR(500) NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL,
  vat_percent   NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price   NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.11 PAYMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  payment_method  payment_method NOT NULL,
  status          payment_status DEFAULT 'pending',
  transaction_ref VARCHAR(255),
  payment_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.12 NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  title           VARCHAR(255) NOT NULL,
  message         TEXT,
  reference_type  VARCHAR(50),
  reference_id    UUID,
  is_read         BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.13 EXPENSES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  category      VARCHAR(50) NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  expense_date  DATE NOT NULL,
  payment_method VARCHAR(20) DEFAULT 'cash',
  vendor        TEXT,
  notes         TEXT,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.14 OTHER INCOME
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS other_income (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  category      VARCHAR(50) NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  income_date   DATE NOT NULL,
  payment_method VARCHAR(20) DEFAULT 'cash',
  source        TEXT,
  notes         TEXT,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.15 DOCTOR'S CLINICAL VISIT NOTES (restricted to doctors/nurses)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctor_notes (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id                UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id                 UUID REFERENCES staff(id) ON DELETE SET NULL,
  appointment_id            UUID REFERENCES appointments(id) ON DELETE SET NULL,
  visit_date                DATE NOT NULL DEFAULT CURRENT_DATE,
  vitals                    JSONB DEFAULT '{}'::jsonb,
  tests_procedures          JSONB DEFAULT '{}'::jsonb,
  clinical_findings         TEXT,
  diagnosis                 JSONB DEFAULT '{}'::jsonb,
  medications               JSONB DEFAULT '[]'::jsonb,
  treatment_recommendations TEXT,
  next_visit_date           DATE,
  next_visit_reason         TEXT,
  is_confidential           BOOLEAN DEFAULT true,
  created_by                UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.16 LANDING PAGE DOCTORS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS landing_doctors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  specialty     VARCHAR(255) NOT NULL,
  available     BOOLEAN DEFAULT true,
  availability  TEXT DEFAULT '',
  image_url     TEXT,
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.17 AUDIT LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  action        audit_action NOT NULL,
  entity_type   VARCHAR(50) NOT NULL,
  entity_id     UUID,
  changes       JSONB,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.16 PUSH SUBSCRIPTIONS (web push notifications)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint          TEXT NOT NULL UNIQUE,
  subscription_json JSONB NOT NULL,
  device_name       VARCHAR(255),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.20 Internal Mail
CREATE TABLE IF NOT EXISTS internal_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject         VARCHAR(500) NOT NULL,
  body            TEXT NOT NULL,
  is_broadcast    BOOLEAN DEFAULT false,
  broadcast_scope VARCHAR(10) DEFAULT 'staff' CHECK (broadcast_scope IN ('staff', 'all')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internal_message_recipients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    UUID NOT NULL REFERENCES internal_messages(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read       BOOLEAN DEFAULT false,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_msg_recipient UNIQUE (message_id, recipient_id)
);

-- ###########################################################################
-- 3. INDEXES
-- ###########################################################################

CREATE INDEX IF NOT EXISTS idx_users_org ON users (org_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (org_id, role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_patients_org ON patients (org_id);
CREATE INDEX IF NOT EXISTS idx_patients_user ON patients (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_org ON staff (org_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_dept ON staff (org_id, department);
CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments (org_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (org_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (org_id, status);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON medical_records (org_id, record_type);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions (org_id, status);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items (prescription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices (patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (org_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (org_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments (patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (org_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (org_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON expenses (org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (org_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (org_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_other_income_org ON other_income (org_id);
CREATE INDEX IF NOT EXISTS idx_other_income_category ON other_income (org_id, category);
CREATE INDEX IF NOT EXISTS idx_other_income_date ON other_income (org_id, income_date);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_org ON doctor_notes (org_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_patient ON doctor_notes (patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_doctor ON doctor_notes (doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_visit ON doctor_notes (org_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_created ON doctor_notes (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_doctors_org ON landing_doctors (org_id);
CREATE INDEX IF NOT EXISTS idx_landing_doctors_active ON landing_doctors (org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_landing_doctors_sort ON landing_doctors (org_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_internal_messages_org ON internal_messages (org_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_sender ON internal_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_created ON internal_messages (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_recipients_message ON internal_message_recipients (message_id);
CREATE INDEX IF NOT EXISTS idx_msg_recipients_recipient ON internal_message_recipients (recipient_id);
CREATE INDEX IF NOT EXISTS idx_msg_recipients_unread ON internal_message_recipients (recipient_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);

-- ###########################################################################
-- 4. UPDATED-AT TRIGGER (applied to all tables with updated_at)
-- ###########################################################################

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_medical_records_updated_at BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_prescriptions_updated_at BEFORE UPDATE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_prescription_items_updated_at BEFORE UPDATE ON prescription_items
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_doctor_notes_updated_at BEFORE UPDATE ON doctor_notes
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_landing_doctors_updated_at BEFORE UPDATE ON landing_doctors
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ###########################################################################
-- 5. ROW-LEVEL SECURITY
-- ###########################################################################

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_message_recipients ENABLE ROW LEVEL SECURITY;

-- Helper function: returns the current org_id from a session variable
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('app.current_org_id', true)::UUID,
    'a0000000-0000-0000-0000-000000000001'::UUID
  );
$$ LANGUAGE SQL STABLE;

-- Drop existing policies before recreating (idempotent)
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON organizations; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON users; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON patients; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON staff; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON appointments; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON medical_records; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON prescriptions; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON prescription_items; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON invoices; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON invoice_items; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON payments; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON notifications; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON audit_logs; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON expenses; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON landing_doctors; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON doctor_notes; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON other_income; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON internal_messages; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON internal_message_recipients; END $$;

-- Organisation-isolation policies
CREATE POLICY org_isolation ON organizations
  USING (id = public.current_org_id());

CREATE POLICY org_isolation ON users
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON patients
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON staff
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON appointments
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON medical_records
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON prescriptions
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON prescription_items
  USING (true);  -- scoped via parent prescription RLS

CREATE POLICY org_isolation ON invoices
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON invoice_items
  USING (true);  -- scoped via parent invoice RLS

CREATE POLICY org_isolation ON payments
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON notifications
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON audit_logs
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON expenses
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON doctor_notes
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON landing_doctors
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON other_income
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON internal_messages
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON internal_message_recipients
  USING (true);

-- ###########################################################################
-- 6. SEED DATA
-- ###########################################################################

INSERT INTO organizations (id, name, slug, settings)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Life Blossom Care & Cure Hospital',
  'life-blossom',
  '{"timezone": "Africa/Lagos", "currency": "NGN"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Default users (password_hash = bcrypt of "password123")
INSERT INTO users (id, org_id, email, password_hash, role, first_name, last_name, phone)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'admin@lifeblossom.com', '$2b$10$NtvHOO1sUKGAAivIQOByg.CXVyUk0ylO7daMW1kxNT80VMqXcH5c.', 'admin', 'Rebecca', 'Adams', '+234 801 234 5678'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'doctor@lifeblossom.com', '$2b$10$NtvHOO1sUKGAAivIQOByg.CXVyUk0ylO7daMW1kxNT80VMqXcH5c.', 'doctor', 'Sarah', 'Johnson', '+234 802 345 6789'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'nurse@lifeblossom.com', '$2b$10$NtvHOO1sUKGAAivIQOByg.CXVyUk0ylO7daMW1kxNT80VMqXcH5c.', 'nurse', 'Grace', 'Okafor', '+234 803 456 7890'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'patient@lifeblossom.com', '$2b$10$NtvHOO1sUKGAAivIQOByg.CXVyUk0ylO7daMW1kxNT80VMqXcH5c.', 'patient', 'Chidi', 'Eze', '+234 804 567 8901'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'accountant@lifeblossom.com', '$2b$10$NtvHOO1sUKGAAivIQOByg.CXVyUk0ylO7daMW1kxNT80VMqXcH5c.', 'accountant', 'Folake', 'Adeyemi', '+234 805 678 9012')
ON CONFLICT (id) DO NOTHING;

INSERT INTO patients (id, org_id, user_id, patient_number, date_of_birth, gender, blood_group, city, state, emergency_contact_name, emergency_contact_phone)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000004',
  'PT-2025-0001', '1992-07-15', 'Male', 'O+', 'Lagos', 'Lagos', 'Ada Eze', '+234 806 789 0123'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO staff (id, org_id, user_id, staff_number, department, specialization, license_number, years_of_exp, qualification)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'STF-2025-0001', 'Cardiology', 'Cardiologist', 'MD/2025/001', 12, 'MBBS, FWACP'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000003', 'STF-2025-0002', 'Nursing', 'Registered Nurse', 'RN/2025/001', 8, 'BNSc, RN')
ON CONFLICT (id) DO NOTHING;

INSERT INTO appointments (id, org_id, patient_id, doctor_id, appointment_date, start_time, end_time, type, status, reason)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   CURRENT_DATE + 1, '09:00', '09:30', 'in_person', 'scheduled', 'Routine cardiac checkup'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', NULL,
   CURRENT_DATE + 2, '14:00', '15:00', 'video_call', 'scheduled', 'Follow-up consultation'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 7, '10:00', '10:45', 'in_person', 'completed', 'Annual physical examination')
ON CONFLICT (id) DO NOTHING;

INSERT INTO medical_records (id, org_id, patient_id, doctor_id, appointment_id, record_type, title, diagnosis, treatment, notes)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000003',
  'diagnosis', 'Annual Physical - Healthy',
  'Patient is in good health. Blood pressure: 120/80, Heart rate: 72 bpm. No abnormalities detected.',
  'Continue regular exercise and balanced diet. Schedule follow-up in 12 months.',
  'Patient reported occasional mild headaches. Recommended stress management.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescriptions (id, org_id, patient_id, doctor_id, appointment_id, diagnosis, notes, status, issued_date, expiry_date)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000003',
  'Mild hypertension', 'Take with food', 'active', CURRENT_DATE - 7, CURRENT_DATE + 180
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, medication_name, dosage, frequency, route, duration, quantity, refills)
VALUES
  ('ff000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Lisinopril', '10mg', 'Once daily', 'oral', '30 days', 30, 3),
  ('ff000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Aspirin', '81mg', 'Once daily', 'oral', '30 days', 30, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (id, org_id, patient_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount, notes)
VALUES (
  'ff000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'INV-2025-0001', CURRENT_DATE - 7, CURRENT_DATE + 23, 'paid', 45000.00, 4500.00, 49500.00, 49500.00,
  'Annual physical examination + prescription'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price)
VALUES
  ('ff000000-0000-0000-0000-000000000011', 'ff000000-0000-0000-0000-000000000001',
   'Consultation Fee', 1, 25000.00, 25000.00),
  ('ff000000-0000-0000-0000-000000000012', 'ff000000-0000-0000-0000-000000000001',
   'ECG Test', 1, 15000.00, 15000.00),
  ('ff000000-0000-0000-0000-000000000013', 'ff000000-0000-0000-0000-000000000001',
   'Lab Test - Blood Panel', 1, 5000.00, 5000.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, org_id, invoice_id, patient_id, amount, payment_method, status, transaction_ref, notes)
VALUES (
  'ff000000-0000-0000-0000-000000000021',
  'a0000000-0000-0000-0000-000000000001',
  'ff000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  49500.00, 'card', 'completed', 'TXN-REF-001', 'Full payment - MasterCard'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, org_id, user_id, type, title, message, reference_type, reference_id)
VALUES
  ('ff000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000004', 'appointment_reminder',
   'Upcoming Appointment', 'You have an appointment tomorrow at 09:00 AM with Dr. Sarah Johnson.',
   'appointment', 'e0000000-0000-0000-0000-000000000001'),
  ('ff000000-0000-0000-0000-000000000032', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000004', 'payment_due',
   'Payment Confirmed', 'Your payment of NGN 49,500.00 has been received. Thank you!',
   'payment', 'ff000000-0000-0000-0000-000000000021')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DONE
-- ============================================================================
