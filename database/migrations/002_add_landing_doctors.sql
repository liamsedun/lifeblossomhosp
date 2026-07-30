-- Migration 002: Add landing_doctors table for admin-editable doctor profiles

CREATE TABLE IF NOT EXISTS landing_doctors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  specialty     VARCHAR(200) NOT NULL,
  available     BOOLEAN DEFAULT true,
  availability  VARCHAR(255) DEFAULT '',
  image_url     TEXT,
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_doctors_org ON landing_doctors (org_id);
CREATE INDEX IF NOT EXISTS idx_landing_doctors_active ON landing_doctors (org_id, is_active, sort_order);

-- Seed default doctors for the default org
INSERT INTO landing_doctors (org_id, name, specialty, available, availability, sort_order)
SELECT
  'a0000000-0000-0000-0000-000000000001'::uuid,
  name, specialty, available, availability, sort_order
FROM (VALUES
  ('Dr. Sarah Johnson',   'Cardiologist',      true,  'Available Mon–Fri, 9 AM – 4 PM', 1),
  ('Dr. Michael Okonkwo', 'Pediatrician',       true,  'Available Mon–Sat, 8 AM – 3 PM', 2),
  ('Dr. Amina Bello',     'Gynecologist',       false, 'Available Tue–Thu, 10 AM – 5 PM',3),
  ('Dr. James Obi',       'General Surgeon',    true,  'Available Mon–Fri, 8 AM – 5 PM', 4)
) AS d(name, specialty, available, availability, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM landing_doctors
  WHERE org_id = 'a0000000-0000-0000-0000-000000000001'
  AND name = d.name
);

DO $$ BEGIN
  CREATE TRIGGER trg_landing_doctors_updated_at BEFORE UPDATE ON landing_doctors
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
