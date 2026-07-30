-- ============================================================================
-- RESET: drop everything and recreate
-- Run this FIRST in Supabase SQL Editor, then run schema.sql
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP TRIGGER IF EXISTS trg_patients_updated_at ON patients;
DROP TRIGGER IF EXISTS trg_staff_updated_at ON staff;
DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
DROP TRIGGER IF EXISTS trg_medical_records_updated_at ON medical_records;
DROP TRIGGER IF EXISTS trg_prescriptions_updated_at ON prescriptions;
DROP TRIGGER IF EXISTS trg_prescription_items_updated_at ON prescription_items;
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;

-- Drop function
DROP FUNCTION IF EXISTS update_timestamp();

-- Drop tables (order matters for FK constraints)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS prescription_items CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop enums
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS appointment_type CASCADE;
DROP TYPE IF EXISTS record_type CASCADE;
DROP TYPE IF EXISTS prescription_status CASCADE;
DROP TYPE IF EXISTS medication_route CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS audit_action CASCADE;
