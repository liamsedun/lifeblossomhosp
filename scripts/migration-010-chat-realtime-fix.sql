-- =============================================================
-- Migration 010 — Chat realtime hardening
-- Replaces the SECURITY DEFINER-based RLS policies with plain
-- direct-join policies. Realtime (postgres_changes) evaluates
-- RLS using the subscriber's JWT; if a policy can't be resolved
-- in that context it silently drops events (messages only appear
-- after a refresh). Plain joins between different tables cannot
-- hit Postgres' RLS recursion guard and need no helper function.
-- Run this in the Supabase SQL editor.
-- =============================================================

-- ── 1. chat_messages: SELECT policy — plain EXISTS join ────────
DROP POLICY IF EXISTS chat_messages_select ON chat_messages;
CREATE POLICY chat_messages_select ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_messages.chat_id
        AND (
          c.staff_user_id = auth.uid()
          OR c.patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
        )
    )
  );

-- ── 2. chats: SELECT policy — plain join (no helper function) ──
DROP POLICY IF EXISTS chats_participant_select ON chats;
CREATE POLICY chats_participant_select ON chats
  FOR SELECT USING (
    org_id = current_org_id()
    AND (
      staff_user_id = auth.uid()
      OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    )
  );

-- ── 3. Keep INSERT/UPDATE policies (participant-only) ──────────
DROP POLICY IF EXISTS chat_messages_insert ON chat_messages;
CREATE POLICY chat_messages_insert ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_messages.chat_id
        AND (
          c.staff_user_id = auth.uid()
          OR c.patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS chat_messages_update ON chat_messages;
CREATE POLICY chat_messages_update ON chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_messages.chat_id
        AND (
          c.staff_user_id = auth.uid()
          OR c.patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_messages.chat_id
        AND (
          c.staff_user_id = auth.uid()
          OR c.patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
        )
    )
  );

-- ── 4. Sanity check: ensure both tables are published ──────────
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
