-- ============================================================================
-- LIFE BLOSSOM HOSPITAL — PRODUCTION DATABASE SCHEMA
-- PostgreSQL + Supabase
-- ============================================================================
-- Multi-tenant hospital management system supporting:
--   patient, admin, doctor, nurse, accountant
-- Modules: Patients, Staff, Appointments, Medical Records,
--          Prescriptions, Billing, Payments, Notifications, Audit Logs
-- ============================================================================

-- ############################################################################
-- 1. ENUMS
-- ############################################################################

CREATE TYPE user_role AS ENUM ('patient', 'admin', 'doctor', 'nurse', 'accountant');

CREATE TYPE appointment_status AS ENUM (
  'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
);

CREATE TYPE appointment_type AS ENUM ('in_person', 'video_call');

CREATE TYPE record_type AS ENUM (
  'diagnosis', 'lab_result', 'prescription', 'surgery_report', 'vaccination', 'imaging'
);

CREATE TYPE prescription_status AS ENUM ('active', 'completed', 'cancelled');

CREATE TYPE medication_route AS ENUM ('oral', 'iv', 'intramuscular', 'topical', 'sublingual', 'inhalation', 'rectal');

CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'partially_paid', 'cancelled', 'refunded');

CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'insurance', 'mobile_money');

CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TYPE notification_type AS ENUM (
  'appointment_reminder', 'payment_due', 'lab_result', 'prescription_refill', 'general'
);

CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'view', 'login', 'logout');

-- ############################################################################
-- 2. TABLES
-- ############################################################################

-- ---------------------------------------------------------------------------
-- 2.1 ORGANIZATIONS (multi-tenant root)
-- ---------------------------------------------------------------------------
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  logo_url    TEXT,
  settings    JSONB DEFAULT '{}'::jsonb,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations (slug);

-- ---------------------------------------------------------------------------
-- 2.2 USERS (unified login — role discriminator)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
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

CREATE INDEX idx_users_org    ON users (org_id);
CREATE INDEX idx_users_role   ON users (org_id, role);
CREATE INDEX idx_users_email  ON users (email);

-- ---------------------------------------------------------------------------
-- 2.3 PATIENTS (extends users WHERE role = 'patient')
-- ---------------------------------------------------------------------------
CREATE TABLE patients (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_number           VARCHAR(30) NOT NULL,  -- display ID e.g. PT-0001
  date_of_birth            DATE,
  gender                   VARCHAR(10),
  blood_group              VARCHAR(5),
  address                  TEXT,
  city                     VARCHAR(100),
  state                    VARCHAR(100),
  emergency_contact_name   VARCHAR(200),
  emergency_contact_phone  VARCHAR(30),
  insurance_provider       VARCHAR(100),
  insurance_number         VARCHAR(100),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_patients_user UNIQUE (user_id),
  CONSTRAINT uq_patients_number_org UNIQUE (org_id, patient_number)
);

CREATE INDEX idx_patients_org  ON patients (org_id);
CREATE INDEX idx_patients_name ON patients (org_id, last_name, first_name);

-- ---------------------------------------------------------------------------
-- 2.4 STAFF (extends users WHERE role IN ('doctor','nurse','admin','accountant'))
-- ---------------------------------------------------------------------------
CREATE TABLE staff (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_number      VARCHAR(30) NOT NULL,  -- display ID e.g. STF-0001
  specialization    VARCHAR(200),           -- e.g. Cardiology, Pediatrics (for doctors)
  license_number    VARCHAR(100),
  department        VARCHAR(100),
  is_available      BOOLEAN DEFAULT true,
  available_from    TIME,
  available_until   TIME,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_staff_user UNIQUE (user_id),
  CONSTRAINT uq_staff_number_org UNIQUE (org_id, staff_number)
);

CREATE INDEX idx_staff_org          ON staff (org_id);
CREATE INDEX idx_staff_department   ON staff (org_id, department);
CREATE INDEX idx_staff_availability ON staff (org_id, is_available) WHERE is_available = true;

-- ---------------------------------------------------------------------------
-- 2.5 APPOINTMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  staff_id          UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  appointment_date  DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  status            appointment_status NOT NULL DEFAULT 'scheduled',
  type              appointment_type NOT NULL DEFAULT 'in_person',
  reason            TEXT,
  notes             TEXT,
  cancellation_reason TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_appointment_time CHECK (end_time > start_time)
);

CREATE INDEX idx_appointments_org       ON appointments (org_id);
CREATE INDEX idx_appointments_patient   ON appointments (org_id, patient_id);
CREATE INDEX idx_appointments_staff     ON appointments (org_id, staff_id);
CREATE INDEX idx_appointments_date      ON appointments (org_id, appointment_date);
CREATE INDEX idx_appointments_status    ON appointments (org_id, status);
CREATE INDEX idx_appointments_date_range ON appointments (org_id, appointment_date, start_time);

-- ---------------------------------------------------------------------------
-- 2.6 MEDICAL RECORDS
-- ---------------------------------------------------------------------------
CREATE TABLE medical_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  record_type     record_type NOT NULL,
  title           VARCHAR(300) NOT NULL,
  description     TEXT,
  diagnosis       TEXT,
  notes           TEXT,
  attachments     JSONB DEFAULT '[]'::jsonb,  -- [{name, url, type}]
  is_confidential BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medical_records_org     ON medical_records (org_id);
CREATE INDEX idx_medical_records_patient ON medical_records (org_id, patient_id);
CREATE INDEX idx_medical_records_type    ON medical_records (org_id, patient_id, record_type);
CREATE INDEX idx_medical_records_date    ON medical_records (org_id, created_at DESC);
CREATE INDEX idx_medical_records_appt    ON medical_records (appointment_id);

-- ---------------------------------------------------------------------------
-- 2.7 PRESCRIPTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE prescriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  diagnosis       TEXT,
  notes           TEXT,
  status          prescription_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prescriptions_org     ON prescriptions (org_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions (org_id, patient_id);
CREATE INDEX idx_prescriptions_doctor  ON prescriptions (org_id, doctor_id);
CREATE INDEX idx_prescriptions_status  ON prescriptions (org_id, status);

-- ---------------------------------------------------------------------------
-- 2.8 PRESCRIPTION ITEMS
-- ---------------------------------------------------------------------------
CREATE TABLE prescription_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id   UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name   VARCHAR(200) NOT NULL,
  dosage            VARCHAR(100) NOT NULL,        -- e.g. "500mg"
  frequency         VARCHAR(100) NOT NULL,         -- e.g. "3 times daily"
  duration          VARCHAR(100),                  -- e.g. "7 days"
  route             medication_route DEFAULT 'oral',
  quantity          INTEGER,
  refills_remaining INTEGER DEFAULT 0,
  instructions      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prescription_items_prescription ON prescription_items (prescription_id);

-- ---------------------------------------------------------------------------
-- 2.9 INVOICES
-- ---------------------------------------------------------------------------
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  invoice_number  VARCHAR(30) NOT NULL,
  subtotal        BIGINT NOT NULL,    -- stored in kobo (smallest unit)
  tax             BIGINT NOT NULL DEFAULT 0,
  total           BIGINT NOT NULL,    -- subtotal + tax
  status          invoice_status NOT NULL DEFAULT 'draft',
  due_date        DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_invoice_number_org UNIQUE (org_id, invoice_number)
);

CREATE INDEX idx_invoices_org     ON invoices (org_id);
CREATE INDEX idx_invoices_patient ON invoices (org_id, patient_id);
CREATE INDEX idx_invoices_status  ON invoices (org_id, status);
CREATE INDEX idx_invoices_date    ON invoices (org_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2.10 INVOICE LINE ITEMS
-- ---------------------------------------------------------------------------
CREATE TABLE invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(400) NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  BIGINT NOT NULL,   -- kobo
  total       BIGINT NOT NULL,   -- quantity * unit_price
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_invoice_item_qty CHECK (quantity > 0)
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);

-- ---------------------------------------------------------------------------
-- 2.11 PAYMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  amount            BIGINT NOT NULL,          -- kobo
  payment_method    payment_method NOT NULL,
  reference_number  VARCHAR(200),
  status            payment_status NOT NULL DEFAULT 'pending',
  payment_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_org      ON payments (org_id);
CREATE INDEX idx_payments_invoice  ON payments (org_id, invoice_id);
CREATE INDEX idx_payments_patient  ON payments (org_id, patient_id);
CREATE INDEX idx_payments_status   ON payments (org_id, status);
CREATE INDEX idx_payments_date     ON payments (org_id, payment_date DESC);

-- ---------------------------------------------------------------------------
-- 2.12 NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(300) NOT NULL,
  message     TEXT,
  is_read     BOOLEAN DEFAULT false,
  link        TEXT,              -- deep link for the app
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user   ON notifications (org_id, user_id, is_read)
  WHERE is_read = false;
CREATE INDEX idx_notifications_sent   ON notifications (org_id, user_id, sent_at DESC);

-- ---------------------------------------------------------------------------
-- 2.13 AUDIT LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      audit_action NOT NULL,
  entity_type VARCHAR(100) NOT NULL,   -- 'appointment', 'invoice', 'patient', etc.
  entity_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_org    ON audit_logs (org_id);
CREATE INDEX idx_audit_logs_user   ON audit_logs (org_id, user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs (org_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (org_id, action);
CREATE INDEX idx_audit_logs_time   ON audit_logs (org_id, created_at DESC);

-- ############################################################################
-- 3. UPDATED_AT TRIGGERS (auto-maintain timestamps)
-- ############################################################################

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_medical_records_updated_at
  BEFORE UPDATE ON medical_records FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_prescriptions_updated_at
  BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_prescription_items_updated_at
  BEFORE UPDATE ON prescription_items FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ############################################################################
-- 4. RELATIONSHIPS SUMMARY
-- ############################################################################
--
-- organizations ──┬── users          (org_id)
--                  ├── patients       (org_id)
--                  ├── staff          (org_id)
--                  ├── appointments   (org_id)
--                  ├── medical_records (org_id)
--                  ├── prescriptions  (org_id)
--                  ├── invoices       (org_id)
--                  ├── payments       (org_id)
--                  ├── notifications  (org_id)
--                  └── audit_logs     (org_id)
--
-- users ─────┬── patients       (user_id)  — 1:1, role='patient'
--            ├── staff          (user_id)  — 1:1, role in ('doctor','nurse','admin','accountant')
--            └── notifications  (user_id)
--
-- patients ──┬── appointments   (patient_id)
--            ├── medical_records (patient_id)
--            ├── prescriptions  (patient_id)
--            ├── invoices       (patient_id)
--            └── payments       (patient_id)
--
-- staff ─────┬── appointments   (staff_id)
--            ├── medical_records (staff_id)
--            └── prescriptions  (doctor_id)
--
-- appointments ──┬── medical_records (appointment_id) — nullable
--                ├── prescriptions   (appointment_id) — nullable
--                └── invoices        (appointment_id) — nullable
--
-- invoices ──┬── invoice_items  (invoice_id)
--            └── payments       (invoice_id)
--
-- prescriptions ── prescription_items (prescription_id)

-- ############################################################################
-- 5. INDEXING STRATEGY
-- ############################################################################
--
-- Principle: all queries are scoped to org_id first (multi-tenant).
-- Every table has idx_{table}_org for org-scoped listing.
--
-- Foreign-key indexes:
--   - Every FK column has an index for JOIN performance.
--
-- Selective / partial indexes:
--   - idx_staff_availability: only active staff (frequent "find available doctor" query)
--   - idx_notifications_user: only unread notifications (badge count query)
--
-- Composite indexes for common query patterns:
--   - idx_appointments_date_range: (org_id, appointment_date, start_time)
--     → covers "find appointments on date X ordered by time"
--   - idx_medical_records_type: (org_id, patient_id, record_type)
--     → "get all lab results for patient Y"
--   - idx_payments_date: (org_id, payment_date DESC)
--     → "recent payments on org dashboard"
--   - idx_audit_logs_entity: (org_id, entity_type, entity_id)
--     → "show audit trail for a specific record"
--
-- Monotonic columns (created_at DESC) use DESC indexes for
-- "latest-first" ordering without explicit sort.
--
-- Unique constraints prevent duplicates:
--   - uq_users_org_email: one email per org
--   - uq_patients_number_org: patient number unique within org
--   - uq_staff_number_org: staff number unique within org
--   - uq_invoice_number_org: invoice number unique within org

-- ############################################################################
-- 6. SAMPLE SEED DATA
-- ############################################################################

-- 6a. Organization
INSERT INTO organizations (id, name, slug, settings)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Life Blossom Care & Cure Hospital',
  'life-blossom',
  '{"timezone": "Africa/Lagos", "currency": "NGN"}'::jsonb
);

-- 6b. Users (password_hash = bcrypt for "Password123!")
INSERT INTO users (id, org_id, email, password_hash, role, first_name, last_name, phone)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'admin@lifeblossom.com', '$2a$10$dummyhash', 'admin', 'Rebecca', 'Adams', '+234 801 234 5678'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'doctor@lifeblossom.com', '$2a$10$dummyhash', 'doctor', 'Sarah', 'Johnson', '+234 802 345 6789'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'nurse@lifeblossom.com', '$2a$10$dummyhash', 'nurse', 'Grace', 'Okafor', '+234 803 456 7890'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'patient@lifeblossom.com', '$2a$10$dummyhash', 'patient', 'Chidi', 'Eze', '+234 804 567 8901'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'accountant@lifeblossom.com', '$2a$10$dummyhash', 'accountant', 'Folake', 'Adeyemi', '+234 805 678 9012');

-- 6c. Patient profile
INSERT INTO patients (id, org_id, user_id, patient_number, date_of_birth, gender, blood_group,
                      city, state, emergency_contact_name, emergency_contact_phone)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000004',
  'PT-0001',
  '1990-06-15', 'Male', 'O+',
  'Lagos', 'Lagos State',
  'Amara Eze', '+234 806 789 0123'
);

-- 6d. Staff profiles
INSERT INTO staff (id, org_id, user_id, staff_number, specialization, department, is_available,
                   available_from, available_until)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'STF-0001',
   'General Practitioner', 'Outpatient', true, '08:00', '17:00'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000003', 'STF-0002',
   NULL, 'Emergency', true, '07:00', '19:00'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'STF-0003',
   NULL, 'Administration', true, '09:00', '17:00'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000005', 'STF-0004',
   NULL, 'Finance', true, '09:00', '17:00');

-- 6e. Appointment
INSERT INTO appointments (id, org_id, patient_id, staff_id, appointment_date, start_time, end_time,
                          status, type, reason)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  CURRENT_DATE + 1, '10:00', '10:30',
  'scheduled', 'in_person',
  'Quarterly hypertension checkup'
);

-- 6f. Medical record (diagnosis)
INSERT INTO medical_records (id, org_id, patient_id, staff_id, appointment_id, record_type,
                             title, diagnosis, notes)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'diagnosis',
  'Hypertension Review',
  'Essential hypertension, Stage 1',
  'BP 130/85 — improved from 145/95. Continue Amlodipine 5mg. Follow-up in 3 months.'
);

-- 6g. Prescription
INSERT INTO prescriptions (id, org_id, patient_id, doctor_id, appointment_id, diagnosis, status)
VALUES (
  'g0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'Essential hypertension, Stage 1',
  'active'
);

INSERT INTO prescription_items (id, prescription_id, medication_name, dosage, frequency, duration, route, quantity, refills_remaining)
VALUES
  ('h0000000-0000-0000-0000-000000000001', 'g0000000-0000-0000-0000-000000000001',
   'Amlodipine', '5mg', 'Once daily', '90 days', 'oral', 90, 2),
  ('h0000000-0000-0000-0000-000000000002', 'g0000000-0000-0000-0000-000000000001',
   'Lisinopril', '10mg', 'Once daily', '90 days', 'oral', 90, 2);

-- 6h. Invoice
INSERT INTO invoices (id, org_id, patient_id, appointment_id, invoice_number, subtotal, tax, total,
                      status, due_date)
VALUES (
  'i0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'INV-2026-0001',
  2500000,  -- ₦25,000
  0,
  2500000,  -- ₦25,000
  'pending',
  CURRENT_DATE + 14
);

INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total)
VALUES
  ('j0000000-0000-0000-0000-000000000001', 'i0000000-0000-0000-0000-000000000001',
   'General Consultation', 1, 1500000, 1500000),
  ('j0000000-0000-0000-0000-000000000002', 'i0000000-0000-0000-0000-000000000001',
   'Blood Pressure Monitoring', 1, 1000000, 1000000);

-- 6i. Notification
INSERT INTO notifications (id, org_id, user_id, type, title, message, link)
VALUES (
  'k0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000004',
  'appointment_reminder',
  'Appointment Reminder',
  'You have a checkup with Dr. Sarah Johnson tomorrow at 10:00 AM.',
  '/patient/appointments'
);

-- 6j. Audit log
INSERT INTO audit_logs (id, org_id, user_id, action, entity_type, entity_id, new_values, ip_address)
VALUES (
  'l0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'create',
  'appointment',
  'e0000000-0000-0000-0000-000000000001',
  '{"reason": "Quarterly hypertension checkup", "patient_name": "Chidi Eze"}'::jsonb,
  '192.168.1.100'::inet
);
