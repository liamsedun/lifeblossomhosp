-- ============================================================================
-- MIGRATION 004: Internal Email / Messaging System
-- Allows staff-to-staff and broadcast messaging with notification integration.
-- ============================================================================

-- 1. Internal Messages
CREATE TABLE IF NOT EXISTS internal_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject         VARCHAR(500) NOT NULL,
  body            TEXT NOT NULL,
  is_broadcast    BOOLEAN DEFAULT false,
  broadcast_scope VARCHAR(10) DEFAULT 'staff' CHECK (broadcast_scope IN ('staff', 'all')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Message Recipients
CREATE TABLE IF NOT EXISTS internal_message_recipients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    UUID NOT NULL REFERENCES internal_messages(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read       BOOLEAN DEFAULT false,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_msg_recipient UNIQUE (message_id, recipient_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_internal_messages_org ON internal_messages (org_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_sender ON internal_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_created ON internal_messages (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_recipients_message ON internal_message_recipients (message_id);
CREATE INDEX IF NOT EXISTS idx_msg_recipients_recipient ON internal_message_recipients (recipient_id);
CREATE INDEX IF NOT EXISTS idx_msg_recipients_unread ON internal_message_recipients (recipient_id, is_read) WHERE is_read = false;

-- RLS
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_message_recipients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON internal_messages; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS org_isolation ON internal_message_recipients; END $$;

CREATE POLICY org_isolation ON internal_messages
  USING (org_id = public.current_org_id());

CREATE POLICY org_isolation ON internal_message_recipients
  USING (true);
