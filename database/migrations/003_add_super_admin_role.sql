-- Migration 003: Add super_admin role to user_role enum

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The actual super admin auth user is created via the /api/auth/setup-super-admin endpoint
-- because Supabase Auth requires the service role API, not raw SQL.
-- After running this migration, call the endpoint to bootstrap:
--   GET /api/auth/setup-super-admin
