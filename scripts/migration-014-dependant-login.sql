-- ============================================================================
-- Migration-014: Enable dependant logins
-- ----------------------------------------------------------------------------
-- Creates provision_dependant_login() — a SECURITY DEFINER function that
-- provisions (or updates) a real Supabase Auth account for a user row that
-- has no auth account yet (dependant placeholder users).
--
-- The auth user is created with the SAME id as public.users.id so that
-- resolvePatientId(), login profile lookup and the patients.user_id FK
-- all keep working unchanged.
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
begin
  if p_email is null or btrim(p_email) = '' then
    raise exception 'Email is required to provision a login';
  end if;

  if p_password is null or length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  v_encrypted := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Upsert the auth.users row (fixes both "no account yet" and "reset password")
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, recovery_sent_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, phone_change_token, phone_confirmed_at
  ) values (
    '00000000-0000-0000-0000-000000000000', p_user_id, 'authenticated', 'authenticated',
    lower(p_email), v_encrypted, v_now, v_now, v_now,
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, v_now, v_now,
    '', '', '', '', '', null
  )
  on conflict (id) do update
    set email = lower(p_email),
        encrypted_password = v_encrypted,
        email_confirmed_at = v_now,
        updated_at = v_now;

  -- Ensure the auth.identities row exists for email login
  v_identity_id := gen_random_uuid();
  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at, id
  ) values (
    p_user_id::text, p_user_id,
    jsonb_build_object('sub', p_user_id::text, 'email', lower(p_email)),
    'email', v_now, v_now, v_now, v_identity_id
  )
  on conflict (provider_id, provider) do update
    set identity_data = jsonb_build_object('sub', p_user_id::text, 'email', lower(p_email)),
        updated_at = v_now;
end;
$$;

-- Only the service role (server) may call this — never anon/authenticated
revoke all on function public.provision_dependant_login(uuid, text, text) from public;
grant execute on function public.provision_dependant_login(uuid, text, text) to service_role;
