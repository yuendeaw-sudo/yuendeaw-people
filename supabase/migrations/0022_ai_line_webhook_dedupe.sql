-- People OS Phase AI-2: LINE AI webhook idempotency and minimal metadata.
-- Apply to People OS Supabase only after release owner approves the exact migration.
-- No LINE messages, group IDs, reply tokens, secrets, or employee identities are stored.
CREATE TABLE IF NOT EXISTS public.ai_line_webhook_events (
  event_hash text PRIMARY KEY,
  group_hash text NOT NULL,
  agent_key text NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing','completed','failed','rate_limited')),
  received_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_code text
);

CREATE INDEX IF NOT EXISTS ai_line_events_group_received_idx
  ON public.ai_line_webhook_events (group_hash, received_at DESC);

ALTER TABLE public.ai_line_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_line_webhook_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_line_webhook_events TO service_role;

COMMENT ON TABLE public.ai_line_webhook_events IS
  'Service-role-only deduplication for signed YuenDeaw People LINE AI webhook. Hashes only; no conversation content.';

-- Keep existing People OS auth and ai_agents unchanged. No new public SELECT policies.
