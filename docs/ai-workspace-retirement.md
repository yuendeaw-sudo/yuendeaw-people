# AI Workspace retirement — safe migration checklist

## Goal
Stop billed Supabase Compute for `ai-workspace` (`qbkrsexjksmjnrevtrnn`) **without deleting its historic data**, while preserving live People OS workflows and handling separate LINE/Discord integrations.

## Phase 1 — People OS replacement (current Draft PR)
- [x] Replace People OS `/ai-workplace` iframe to `https://ai.yuendeaw.com` with same-site, signed-in agent launcher.
- [x] Load existing `public.ai_agents` rows from **People OS Supabase** (`bhvbkqcporxbfobehvns`), preserving the `owner_only` filter.
- [ ] Check build/typecheck and Preview with authorized staff.
- [ ] Verify each native `/ai-workplace/[key]` route and `/api/ai/chat` on real, permitted test account.
- [ ] Confirm owner-only agents are unavailable to other employees.
- [ ] Deploy only after approval and test native app navigation / mobile display. Old iframe still serves Production until merged.

## Phase 2 — Bot integrations / dependent systems
- Legacy ai-workspace Vercel hosts: `ai.yuendeaw.com` and `ai.standnextstage.com`.
- Legacy code exposes inbound `/api/discord`, `/api/line`, `/api/chat`, and uses its own Supabase DB and credentials.
- Old database has **four Discord channel links and one LINE group link**. No app sign-ins in recent 30 days; last AI usage in July 2026. This is not proof the external webhooks are disabled.
- [ ] Confirm LINE Developers and Discord Developer Portal webhook/Interactions destinations and active usage; **do not disable or redirect without explicit owner approval**.
- [ ] For still-needed workflows, implement/test equivalent functionality on the chosen owner-approved host and database (likely People OS); migrate only necessary agent/permissions mappings.
- [ ] For no-longer-used webhooks, revoke or disconnect deliberately, without breaking unrelated LINE OA booking integrations.

## Phase 3 — Archives and recovery
- Existing `ai-workspace` Supabase: 16 public tables; AI chat messages, documents, usage history, linked bot channels.
- [ ] Obtain verified full Postgres backup/export, including Auth identities/policies/functions/extensions and migration history; redact confidential info and store privately, never in GitHub.
- [ ] Export Supabase Storage buckets and verify file count and restore test; Storage inventory currently **not independently verified** due connector permission.
- [ ] Preserve relevant Vercel env configuration/secret inventory securely and document domain ownership/rollback. **Do not commit secrets**.
- [ ] Test data restore in isolated destination and record checksum / counts / recovery procedure.

## Phase 4 — Stop Compute (separate approval required)
- Supabase Pro projects cannot be directly paused. Supabase docs describe transferring an eligible project under 500 MB to a Free organization, then pausing it.
- Current PostgreSQL database estimate was approximately 15 MB; this is NOT a full disk/storage eligibility check.
- [ ] Create/identify appropriate Free organization and confirm eligibility, quotas and transfer constraints.
- [ ] Owner approves exact project move + downtime to `ai-workspace` only, *after* Dependencies and backups pass.
- [ ] Transfer and pause project; verify `Stand-next-stage`, Communeed, and YuenDeaw People remain healthy and billing compute falls.
- [ ] Keep archive, rollback and limited monitoring notes.

**Never delete ai-workspace project/database merely to save cost. Do not merge this PR automatically.**
