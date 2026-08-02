-- =============================================================
-- Migration 016 — Medical Reports
-- Table: medical_reports
-- Run this in the Supabase SQL editor.
-- =============================================================

-- ── 1. medical_reports: official reports written by doctors / super admins ──
CREATE TABLE IF NOT EXISTS medical_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reference_number VARCHAR(50) NOT NULL,
  report_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  content          TEXT NOT NULL,
  author_name      VARCHAR(200) NOT NULL,
  author_title     VARCHAR(200),
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, reference_number)
);

-- ── 2. Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_medical_reports_org     ON medical_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_patient ON medical_reports(patient_id, report_date DESC);

-- ── 3. Updated-at trigger ──────────────────────────────────────
DO $$ BEGIN
  CREATE TRIGGER trg_medical_reports_updated_at BEFORE UPDATE ON medical_reports
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. RLS ─────────────────────────────────────────────────────
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;

-- Org members can read (API enforces role/ownership); writes go through the API
-- (service role bypasses RLS) or org admins directly.
DROP POLICY IF EXISTS medical_reports_select ON medical_reports;
CREATE POLICY medical_reports_select ON medical_reports
  FOR SELECT USING (org_id = current_org_id());

DROP POLICY IF EXISTS medical_reports_insert ON medical_reports;
CREATE POLICY medical_reports_insert ON medical_reports
  FOR INSERT WITH CHECK (org_id = current_org_id());

DROP POLICY IF EXISTS medical_reports_delete ON medical_reports;
CREATE POLICY medical_reports_delete ON medical_reports
  FOR DELETE USING (org_id = current_org_id());
