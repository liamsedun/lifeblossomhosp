-- ============================================================================
-- Migration-014: Enable dependant logins  (v3 — exact GoTrue row shape)
-- ----------------------------------------------------------------------------
-- Creates provision_dependant_login() — a SECURITY DEFINER function that
-- provisions (or updates) a real Supabase Auth account for a user row that
-- has no auth account yet (dependant placeholder users).
--
-- The auth user is created with the SAME id as public.users.id so that
-- resolvePatientId(), login profile lookup and the patients.user_id FK
-- all keep working unchanged.
--
-- v3 fix (root cause found via row diff vs a working account):
--   * email_change MUST be '' (empty string) — GoTrue scans it as a plain
--     string; NULL breaks every GoTrue query for that row (the actual bug)
--   * phone: use the real phone from public.users when present, else NULL
--     (never '' — auth.users.phone has a UNIQUE constraint)
--   * every other string/status column mirrors auth.admin.createUser()
--     output exactly (tokens '', booleans false, confirmations null)
--
-- Run in: Supabase SQL Editor  →  project hkqhsgdutaaufqqrekdx
-- ============================================================================

create or replace function public.provision_dependant_login(
  p_user_id uuid,
  p_email text,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_encrypted text;
  v_identity_id uuid;
  v_now timestamptz := now();
  v_phone text;
begin
  if p_email is null or btrim(p_email) = '' then
    raise exception 'Email is required to provision a login';
  end if;

  if p_password is null or length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  v_encrypted := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Use the profile's real phone (never '' — unique constraint on phone)
  select phone into v_phone from public.users where id = p_user_id;

  -- Upsert the auth.users row (fixes both "no account yet" and "reset password").
  -- Column-for-column mirror of GoTrue's createUser() output (verified against
  -- a working account row):
  --   * email_change = '' (CRITICAL — NULL breaks GoTrue's row scan)
  --   * phone = profile phone or NULL
  --   * all token columns = '', booleans = false, sent-at timestamps = null
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, invited_at, confirmation_sent_at, recovery_sent_at,
    last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at,
    phone, phone_confirmed_at, phone_change, phone_change_token,
    phone_change_sent_at, email_change, email_change_sent_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at,
    is_sso_user, is_anonymous, banned_until, deleted_at
  ) values (
    '00000000-0000-0000-0000-000000000000', p_user_id, 'authenticated', 'authenticated',
    lower(p_email), v_encrypted,
    v_now, null, null, null,
    null,
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    false, v_now, v_now,
    v_phone, null, '', '',
    null, '', null,
    '', '',
    '', '', 0,
    '', null,
    false, false, null, null
  )
  on conflict (id) do update
    set email = lower(p_email),
        encrypted_password = v_encrypted,
        email_confirmed_at = v_now,
        phone = v_phone,
        email_change = '',
        phone_change = '',
        updated_at = v_now;

  -- Ensure the auth.identities row exists for email login.
  -- Mirror GoTrue's identity shape: provider_id = user id, identity_data
  -- includes email_verified / phone_verified flags.
  v_identity_id := gen_random_uuid();
  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at, id
  ) values (
    p_user_id::text, p_user_id,
    jsonb_build_object(
      'sub', p_user_id::text,
      'email', lower(p_email),
      'email_verified', false,
      'phone_verified', false
    ),
    'email', v_now, v_now, v_now, v_identity_id
  )
  on conflict (provider_id, provider) do update
    set identity_data = jsonb_build_object(
          'sub', p_user_id::text,
          'email', lower(p_email),
          'email_verified', false,
          'phone_verified', false
        ),
        updated_at = v_now;
end;
$$;

-- Only the service role (server) may call this — never anon/authenticated
revoke all on function public.provision_dependant_login(uuid, text, text) from public;
grant execute on function public.provision_dependant_login(uuid, text, text) to service_role;
