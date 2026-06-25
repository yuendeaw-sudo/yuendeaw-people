-- ============================================================================
-- YuenDeaw People OS — 0008 invite tracking
-- HR/owner adds an employee → sends an invite. The person logs in with Google
-- using the same email; 0007 auto-links the account to this record.
-- ============================================================================

alter table public.employees add column if not exists invited_at timestamptz;
