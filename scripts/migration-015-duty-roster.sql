-- =============================================================
-- Migration 015 — Staff Duty Roaster & Leave Tracking
-- Tables: duty_roster
-- + staff.on_leave_until column, notification_type ENUM extension
-- Run this in the Supabase SQL editor.
-- =============================================================

-- ── 1. Extend notification_type ENUM (guard for re-runs) ──────
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'duty_schedule';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. staff: add on-leave tracking ────────────────────────────
ALTER TABLE staff ADD COLUMN IF NOT EXISTS on_leave_until DATE;

-- ── 3. duty_roster: one row per staff member per duty date ─────
CREATE TABLE IF NOT EXISTS duty_roster (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  shift_date  DATE NOT NULL,
  from_time   TIME NOT NULL,
  until_time  TIME NOT NULL,
  note        TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id, shift_date)
);

-- ── 4. Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_duty_roster_org   ON duty_roster(org_id);
CREATE INDEX IF NOT EXISTS idx_duty_roster_date  ON duty_roster(shift_date);
CREATE INDEX IF NOT EXISTS idx_duty_roster_staff ON duty_roster(staff_id, shift_date DESC);

-- ── 5. RLS ─────────────────────────────────────────────────────
ALTER TABLE duty_roster ENABLE ROW LEVEL SECURITY;

-- Org members can read the roster (needed for duty status display)
DROP POLICY IF EXISTS duty_roster_select ON duty_roster;
CREATE POLICY duty_roster_select ON duty_roster
  FOR SELECT USING (org_id = current_org_id());

-- Writes happen via the API (service role bypasses RLS), but allow
-- org admins to insert/update/delete rows directly as a fallback.
DROP POLICY IF EXISTS duty_roster_insert ON duty_roster;
CREATE POLICY duty_roster_insert ON duty_roster
  FOR INSERT WITH CHECK (org_id = current_org_id());

DROP POLICY IF EXISTS duty_roster_update ON duty_roster;
CREATE POLICY duty_roster_update ON duty_roster
  FOR UPDATE USING (org_id = current_org_id())
  WITH CHECK (org_id = current_org_id());

DROP POLICY IF EXISTS duty_roster_delete ON duty_roster;
CREATE POLICY duty_roster_delete ON duty_roster
  FOR DELETE USING (org_id = current_org_id());
