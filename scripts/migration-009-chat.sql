-- =============================================================
-- Migration 009 — Real-time Hospital Chat
-- Tables: chats, chat_messages, chat_presence
-- + notification_type ENUM extension, RLS, realtime publication
-- Run this in the Supabase SQL editor.
-- =============================================================

-- ── 1. Extend notification_type ENUM (guard for re-runs) ──────
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'chat_message';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. chats: a 1:1 conversation between a patient and a staff member ──
CREATE TABLE IF NOT EXISTS chats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message  TEXT,
  last_sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, staff_user_id)
);

-- ── 3. chat_messages: individual messages within a chat ──────
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL CHECK (length(btrim(message)) > 0),
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. chat_presence: last-seen heartbeat for online dots ────
CREATE TABLE IF NOT EXISTS chat_presence (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chats_org        ON chats(org_id);
CREATE INDEX IF NOT EXISTS idx_chats_patient    ON chats(patient_id);
CREATE INDEX IF NOT EXISTS idx_chats_staff      ON chats(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated    ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(chat_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_chat_presence_org ON chat_presence(org_id, last_seen_at DESC);

-- ── 6. Realtime publication (enables client-side live updates) ──
-- Idempotent: only ADD tables that aren't already members.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_presence;
  END IF;
END $$;

-- ── 7. RLS ─────────────────────────────────────────────────────
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;

-- Helper: is the authenticated user a participant of this chat?
-- (SECURITY DEFINER avoids RLS recursion — a patient querying the
--  patients table from within a chats policy.)
CREATE OR REPLACE FUNCTION is_chat_participant(chat_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chats c
    WHERE c.id = chat_id
      AND (
        c.staff_user_id = auth.uid()
        OR c.patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      )
  );
$$;

-- chats: participant can read; insertion happens via API only
DROP POLICY IF EXISTS chats_participant_select ON chats;
CREATE POLICY chats_participant_select ON chats
  FOR SELECT USING (
    org_id = current_org_id()
    AND (
      staff_user_id = auth.uid()
      OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    )
  );

-- chat_messages: participant can read (required for realtime delivery)
DROP POLICY IF EXISTS chat_messages_select ON chat_messages;
CREATE POLICY chat_messages_select ON chat_messages
  FOR SELECT USING (is_chat_participant(chat_id));

-- chat_messages: participant can insert their own messages
DROP POLICY IF EXISTS chat_messages_insert ON chat_messages;
CREATE POLICY chat_messages_insert ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND is_chat_participant(chat_id)
  );

-- chat_messages: participant can mark messages as read
DROP POLICY IF EXISTS chat_messages_update ON chat_messages;
CREATE POLICY chat_messages_update ON chat_messages
  FOR UPDATE USING (is_chat_participant(chat_id))
  WITH CHECK (is_chat_participant(chat_id));

-- chat_presence: org members can read presence, user updates own
DROP POLICY IF EXISTS chat_presence_select ON chat_presence;
CREATE POLICY chat_presence_select ON chat_presence
  FOR SELECT USING (org_id = current_org_id());

DROP POLICY IF EXISTS chat_presence_upsert ON chat_presence;
CREATE POLICY chat_presence_upsert ON chat_presence
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = current_org_id());

DROP POLICY IF EXISTS chat_presence_update ON chat_presence;
CREATE POLICY chat_presence_update ON chat_presence
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
