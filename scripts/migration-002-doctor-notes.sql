-- ============================================================================
-- MIGRATION 002: Doctor's Clinical Visit Notes
-- Creates structured doctor_notes table for permanent patient e-file storage.
-- Access restricted to doctor and nurse roles only.
-- ============================================================================

-- 1. Create the doctor_notes table
CREATE TABLE IF NOT EXISTS doctor_notes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id           UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id            UUID REFERENCES staff(id) ON DELETE SET NULL,
  appointment_id       UUID REFERENCES appointments(id) ON DELETE SET NULL,
  visit_date           DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Structured JSON fields matching the clinical template
  vitals               JSONB DEFAULT '{}'::jsonb,
  -- BP, weight, height, temperature, cholesterol, heart_rate, respiratory_rate, allergies

  tests_procedures     JSONB DEFAULT '{}'::jsonb,
  -- ecg, xray, blood_test, urine_test, saliva_test, other_tests

  clinical_findings    TEXT,
  -- patient complaints, physical exam findings, abnormalities, progress

  diagnosis            JSONB DEFAULT '{}'::jsonb,
  -- primary, secondary[], suspected[]

  medications          JSONB DEFAULT '[]'::jsonb,
  -- array of { drug_name, dosage, frequency, duration }

  treatment_recommendations TEXT,
  -- lifestyle advice, dietary recommendations, follow-up tests, referrals

  next_visit_date      DATE,
  next_visit_reason    TEXT,

  is_confidential      BOOLEAN DEFAULT true,
  created_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_doctor_notes_org ON doctor_notes (org_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_patient ON doctor_notes (patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_doctor ON doctor_notes (doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_visit ON doctor_notes (org_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_created ON doctor_notes (org_id, created_at DESC);

-- 3. Row-Level Security
ALTER TABLE doctor_notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON doctor_notes; END $$;
CREATE POLICY org_isolation ON doctor_notes
  USING (org_id = public.current_org_id());

-- 4. Updated-at trigger
DO $$ BEGIN
  CREATE TRIGGER trg_doctor_notes_updated_at BEFORE UPDATE ON doctor_notes
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
