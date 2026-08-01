-- ============================================================================
-- MIGRATION 012: Payment cancellation
-- Adds:
--   1. payment_status ENUM extension: cancelled
--   2. notification_type ENUM extension: payment_cancelled
-- Run this in the Supabase SQL editor.
-- ============================================================================

-- ── 1. payment_status ENUM extension (guarded) ──
DO $$ BEGIN
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. notification_type ENUM extension (guarded) ──
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_cancelled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
