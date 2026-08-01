-- ============================================================================
-- MIGRATION 011: Hospital Bank Accounts + Payment Methods
-- Adds:
--   1. hospital_bank_accounts table (up to 5 bank accounts per org)
--   2. payment_method ENUM extension: bank_transfer, pos
--   3. notification_type ENUM extension: payment_declared, payment_confirmed
-- Run this in the Supabase SQL editor.
-- ============================================================================

-- ── 1. payment_method ENUM extension (guarded) ──
DO $$ BEGIN
  ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'bank_transfer';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'pos';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. notification_type ENUM extension (guarded) ──
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_declared';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_confirmed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. hospital_bank_accounts table ──
CREATE TABLE IF NOT EXISTS hospital_bank_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bank_name      VARCHAR(120) NOT NULL,
  account_name   VARCHAR(160) NOT NULL,
  account_number VARCHAR(30) NOT NULL,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_bank_accounts_org ON hospital_bank_accounts (org_id);
