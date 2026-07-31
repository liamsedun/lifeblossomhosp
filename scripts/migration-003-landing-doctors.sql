-- ============================================================================
-- MIGRATION 003: Landing Page Doctors Table
-- Creates the landing_doctors table referenced by the public landing page
-- and the admin settings page for managing doctor profiles.
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_landing_doctors_org ON landing_doctors (org_id);
CREATE INDEX IF NOT EXISTS idx_landing_doctors_active ON landing_doctors (org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_landing_doctors_sort ON landing_doctors (org_id, sort_order);

ALTER TABLE landing_doctors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON landing_doctors; END $$;
CREATE POLICY org_isolation ON landing_doctors
  USING (org_id = public.current_org_id());

DO $$ BEGIN
  CREATE TRIGGER trg_landing_doctors_updated_at BEFORE UPDATE ON landing_doctors
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed data
INSERT INTO landing_doctors (id, org_id, name, specialty, available, availability, sort_order, is_active)
VALUES
  ('dd000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Dr Sarah Johnson', 'Cardiologist', true, 'Monday to Friday -- 8:30AM - 3:30PM', 1, true),
  ('dd000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Dr Michael Okonkwo', 'Pediatrician', true, 'Monday to Saturday -- 9:00AM - 5:00PM', 2, true),
  ('dd000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Dr Fatima Abubakar', 'Gynecologist', true, 'Tuesday to Saturday -- 10:00AM - 4:00PM', 3, true)
ON CONFLICT (id) DO NOTHING;
