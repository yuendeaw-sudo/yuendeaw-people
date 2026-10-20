# Phase AI-2 — Keep LINE AI, retire Discord, remove legacy Supabase dependency

## Decision (owner, 2026-10-20)
- **Keep LINE AI Bot**. Current LINE Developers Messaging API webhook is:
  https://ai-workspace-swart.vercel.app/api/line
- **Retire Discord Bot**; there is no requirement to migrate slash commands, four existing channel mappings, or Discord user integrations.
- Do not stop or delete legacy Supabase project \`qbkrsexjksmjnrevtrnn\` until LINE cutover, backup and restore checks pass.
- Legacy ai-workspace Production and LINE Developers webhook settings are **not changed by this Draft PR**.

## Replacement architecture
- New endpoint: https://people.yuendeaw.com/api/line/ai (only after this PR is reviewed and merged).
- It runs on existing YuenDeaw People (Vercel project \`yuendeaw-people\` / Supabase project \`bhvbkqcporxbfobehvns\`).
- It does not create new Supabase projects, members or global AI workspaces.
- Trigger words preserved: \`ai\`, \`อ๋อย\`, \`น้องอ๋อย\`, and genuine @bot mention.
- Accepts only configured LINE Group/room IDs. Different LINE groups may map to different **non-owner** People OS \`ai_agents.key\` values. No private/owner-only AI agents may be used by the bot.
- Verifies raw-body LINE HMAC-SHA256 in constant time before reading events; does not trust the caller's identity or free-text chosen agent name.
- Dedupe on hashed \`webhookEventId\`, limit eight requests per group per 60 seconds, and store only opaque event/group hashes and token usage metrics (no raw message text or LINE reply tokens).
- LINE's verify request (\`events: []\`) must return HTTP 200 after the private credentials are supplied and signature is valid.
- LINE replies via channel-specific access token. Provider credentials remain server-side in Vercel, never in Github / chat / client env vars.
- Uses the **existing** People OS Anthropic key with a separately selected \`LINE_AI_MODEL\`, max response length to control spend.
- No Discord route or Discord credentials are copied.

## Required database migration — NOT yet applied
File: \`supabase/migrations/0022_ai_line_webhook_dedupe.sql\`.
- Add small \`public.ai_line_webhook_events\` table with primary-key dedupe.
- Enable RLS and revoke ordinary user access. Only \`service_role\` can read/write.
- Apply to **People OS Supabase only**, not ai-workspace, STANd or Communeed.
- Perform postcheck on table, index, RLS, grants; use a rollback-only duplicate-event test before enabling the bot.
- This migration and any Production rollout require owner authorization; GitHub PR alone does not run it.

## Server-only Vercel environment variables
Configure on **People OS** project; use the dedicated LINE AI channel's secret/token
from the old ai-workspace environment **securely inside Vercel**, never paste them
into GitHub, chat, browser console, or a URL query string.

| Name | Scope / purpose |
|---|---|
| \`LINE_AI_ENABLED\` | \`true\` ONLY after cutover prerequisites, otherwise fail closed |
| \`LINE_AI_CHANNEL_SECRET\` | Secret belonging to the **exact existing AI LINE Messaging API channel** |
| \`LINE_AI_CHANNEL_ACCESS_TOKEN\` | Access token for the **same** channel |
| \`LINE_AI_GROUP_AGENTS_JSON\` | Server-side map from approved group/room ID to People OS \`ai_agents.key\` |
| \`LINE_AI_MODEL\` | An available Anthropic model chosen for cost/quality |
| \`ANTHROPIC_API_KEY\` | Existing People OS server-side secret, already configured |

Example mapping format only (do not use fake IDs in Production):
\`\`\`json
{"C_REPLACE_WITH_REAL_GROUP_ID":"production_assistant"}
\`\`\`
Make sure the configured group uses an active, non-owner People OS agent; the
legacy \`line_group_links\` team/agent mapping cannot be copied blindly because
the new People OS agent IDs and model are different.

**Do NOT copy Communeed's LINE OA booking secrets** into this AI Bot.

## Preview test plan (before touching provider webhook)
1. Run \`npm run test:ai-line\`, Next.js lint/type check and Vercel Preview build on the PR head.
2. With **fake Preview-only** LINE variables, check:
   - unsigned / invalid-signature POST → 401 (provided server is configured);
   - valid signed empty-event POST → 200;
   - wrong-group signed text event → 200, but no LLM call or DB writes;
   - replayed valid event cannot create duplicate claims (with DB test table in place).
3. With real, **server-only Preview** configuration and approved QA group, run one
   owner-approved real LINE message via \`ai ...\`, verify one reply, DB event and
   People OS usage log; test @mention and unknown group rejection.
4. Test in the same channel and LINE group that used the old bot. Compare answer
   quality and model cost; this implementation intentionally does not transfer
   old conversation history into People OS.

## Live LINE cutover (owner authorization at this gate)
1. Ensure PR2 People OS AI Workplace and PR3 AI LINE endpoint have passed QA.
   Deploy approved code and migration, configure real Production server-only variables.
2. Visit **LINE Developers → AI Messaging API channel → Messaging API → Webhook URL**.
   Switch **from**
   \`https://ai-workspace-swart.vercel.app/api/line\`
   **to**
   \`https://people.yuendeaw.com/api/line/ai\`.
3. Use LINE Developers **Verify** and send an approved test message. Confirm exactly
   one bot response, no duplicate usage, no secret in logs, and no disruption to
   Communeed's separate LINE OA.
4. Roll back by restoring the exact old URL while legacy ai-workspace remains online;
   do not remove the old credentials until this rollback window closes.
5. After verification, approve retirement of the legacy URL and ensure no other
   traffic depends on that host.

## Discord retirement (NO migration)
- In Discord Developer Portal, inspect the old AI application and remove/disable
  the slash commands or app installation where appropriate; clear the
  **Interactions Endpoint URL** after confirming the application does not serve
  other workflows. This is a provider action, not a database change.
- Keep historical Discord channel data in the ai-workspace archive until
  the backup and restore phase; do not export member IDs into GitHub.
- Then retire/revoke the old Discord bot credentials from the legacy Vercel
  project after assessing rollback and unrelated usages. No production
  Discord credentials are touched by this PR.
- If you no longer need the Discord application at all, optionally delete
  the old Developer Portal application **only after its data is archived**.

## Phase AI-3 / AI-4
- Archive full legacy DB and Storage; verify restore. No historic chat data
  deleted or moved by this PR.
- Move eligible legacy Supabase project into approved Free organization,
  then pause; Pro projects cannot be directly paused.
- Reconfirm STANd, Communeed, YuenDeaw People and LINE AI remain healthy,
  and check whether Compute charges stop.

**Release gate:** Do not merge or change LINE Developers webhook URL, Discord
application, Production SQL or Vercel Production keys automatically. 
