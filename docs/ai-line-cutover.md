# Phase AI-2 — Keep LINE AI, retire Discord, remove legacy Supabase dependency

> **Critical status update — 2026-10-20:** The owner confirmed manually deleting the Supabase project `ai-workspace` (`qbkrsexjksmjnrevtrnn`). Supabase no longer lists this project. Its database, Auth and associated hosted backups are unavailable; according to Supabase, project deletion is irreversible. The old Vercel website still exists, but its LINE webhook and login refer to a missing Supabase backend. **Do not use the old webhook URL as a functioning rollback target.** No downloadable external backup has been verified. PR #3 and People OS Supabase remain unaffected; PR #3 is still Draft and its Production Webhook URL has not been switched.

## Decision (owner, 2026-10-20)
- **Keep LINE AI Bot**. Current LINE Developers Messaging API webhook is:
  https://ai-workspace-swart.vercel.app/api/line
- **Retire Discord Bot**; there is no requirement to migrate slash commands, four existing channel mappings, or Discord user integrations.
- The legacy Supabase project has **already been deleted by the owner**. Do not attempt transfer/pause or claim its database is recoverable. Check separately for any user-downloaded offline backup.
- Legacy Vercel project and LINE Developers webhook settings are **not changed by this Draft PR**; the old database-backed service is broken due to deletion.

## AI bot persona — owner decision (2026-10-20)
The owner confirmed that **"อ๋อย" is a general-purpose AI assistant**, not a
Production Assistant, HR assistant, or any other department-specific agent.

- Virtual identifier: `general_assistant`; display name: **อ๋อย**.
- General system prompt supports questions, brainstorming, plans, writing and rewriting, summaries and problem solving in Thai.
- The bot intentionally does **not** read People OS employee data, owner-only prompts or the legacy company Knowledge Base.
- All permitted LINE groups must map to `general_assistant` only. Any specialist value fails closed at server configuration validation.
- No extra Supabase users, `ai_agents` rows or databases need to be created.
- Usage metadata stores `agent_key: "general_assistant"` with a null `agent_id` (nullable field in existing People OS database).

## Confirmed backup status and onboarding — 2026-10-20
- The owner confirmed **no independent database dump, downloaded backup or chat export exists** from the deleted Supabase `ai-workspace` project. Its historical conversations, stored knowledge and old line_group_links records **cannot be reconstructed** from the remaining GitHub source.
- Existing LINE Channel credentials belong to the old **Vercel** project and may still be securely reused; legacy Supabase credentials **must not** be reused.
- To avoid requiring a login to the broken old AI Workspace admin, use a temporary **LINE group discovery mode** on the replacement endpoint:
  1. On People OS Vercel configure only the dedicated AI LINE Channel Secret and Access Token (server-only), set `LINE_AI_GROUP_DISCOVERY_MODE=true`, and leave `LINE_AI_ENABLED=false`. Both true fails closed.
  2. Once the replacement route is approved, deployed and the LINE Developers webhook is switched to `https://people.yuendeaw.com/api/line/ai`, write **`อ๋อย group id`** inside the existing LINE group where the bot is a member.
  3. The signed webhook replies with that group's exact ID **inside the same LINE group only**. It does not call an AI model, accept general messages, store raw IDs, or write database records.
  4. Owner verifies the correct LINE group ID and authorizes adding it to `LINE_AI_GROUP_AGENTS_JSON` mapping to `general_assistant`. Disable discovery mode, configure `LINE_AI_MODEL`, and set `LINE_AI_ENABLED=true` only after approved SQL and separate signed/real delivery QA.
  5. Verify LINE Developers **Verify** and one normal AI response. Unlike the original plan, **the deleted legacy database-backed URL cannot be used as a working rollback**.
- Mode-specific variables: `LINE_AI_GROUP_DISCOVERY_MODE` is true only while recovering the group ID. If AI is disabled and discovery is off, the webhook responds 503. No group ID recovery occurs automatically without an authenticated provider event.

## Replacement architecture
- New endpoint: https://people.yuendeaw.com/api/line/ai (only after this PR is reviewed and merged).
- It runs on existing YuenDeaw People (Vercel project `yuendeaw-people` / Supabase project `bhvbkqcporxbfobehvns`).
- It does not create new Supabase projects, members or global AI workspaces.
- Trigger words preserved: `ai`, `อ๋อย`, `น้องอ๋อย`, and genuine @bot mention.
- Accepts only configured LINE Group/room IDs. Every approved group maps to the virtual `general_assistant` persona. The bot does not load or expose employee/owner-only `ai_agents` prompts.
- Verifies raw-body LINE HMAC-SHA256 in constant time before reading events; does not trust the caller's identity or free-text chosen agent name.
- Dedupe on hashed `webhookEventId`, limit eight requests per group per 60 seconds, and store only opaque event/group hashes and token usage metrics (no raw message text or LINE reply tokens).
- LINE's verify request (`events: []`) must return HTTP 200 after the private credentials are supplied and signature is valid.
- LINE replies via channel-specific access token. Provider credentials remain server-side in Vercel, never in Github / chat / client env vars.
- Uses the **existing** People OS Anthropic key with a separately selected `LINE_AI_MODEL`, max response length to control spend.
- No Discord route or Discord credentials are copied.

## Required database migration — NOT yet applied
File: `supabase/migrations/0022_ai_line_webhook_dedupe.sql`.
- Add small `public.ai_line_webhook_events` table with primary-key dedupe.
- Enable RLS and revoke ordinary user access. Only `service_role` can read/write.
- Apply to **People OS Supabase only**, not ai-workspace, STANd or Communeed.
- Perform postcheck on table, index, RLS, grants; use a rollback-only duplicate-event test before enabling the bot.
- This migration and any Production rollout require owner authorization; GitHub PR alone does not run it.

## Server-only Vercel environment variables
Configure on **People OS** project; use the dedicated LINE AI channel's secret/token
from the still-existing legacy **Vercel project configuration** (not the deleted Supabase database) **securely inside Vercel**, never paste them
into GitHub, chat, browser console, or a URL query string.

| Name | Scope / purpose |
|---|---|
| `LINE_AI_ENABLED` | `false` during discovery; `true` ONLY after approved live cutover and prerequisites |
| `LINE_AI_GROUP_DISCOVERY_MODE` | `true` only during signed group-ID recovery, then `false` before AI is enabled; both modes active is rejected |
| `LINE_AI_CHANNEL_SECRET` | Secret belonging to the **exact existing AI LINE Messaging API channel** |
| `LINE_AI_CHANNEL_ACCESS_TOKEN` | Access token for the **same** channel |
| `LINE_AI_GROUP_AGENTS_JSON` | Server-side map from approved group/room ID to the literal `general_assistant` only |
| `LINE_AI_MODEL` | An available Anthropic model chosen for cost/quality |
| `ANTHROPIC_API_KEY` | Existing People OS server-side secret, already configured |

Example mapping format only (do not use fake IDs in Production):
```json
{"C_REPLACE_WITH_REAL_GROUP_ID":"general_assistant"}
```
This bot does not use People OS specialist agents. Do not map the LINE channel
to a Production/HR/Sales/owner-only employee Agent; the existing legacy
`line_group_links` team/agent IDs are not used in the new system.

**Do NOT copy Communeed's LINE OA booking secrets** into this AI Bot.

## Preview test plan (before touching provider webhook)
1. Run `npm run test:ai-line`, Next.js lint/type check and Vercel Preview build on the PR head.
2. With **fake Preview-only** LINE variables, check:
   - unsigned / invalid-signature POST → 401 (provided server is configured);
   - valid signed empty-event POST → 200;
   - wrong-group signed text event → 200, but no LLM call or DB writes;
   - a configuration mapping to a specialist agent must return 503; only `general_assistant` is allowed;
   - replayed valid event cannot create duplicate claims (with DB test table in place).
3. With real, **server-only Preview** configuration and approved QA group, run one
   owner-approved real LINE message via `ai ...`, verify one reply, DB event and
   People OS usage log; test @mention and unknown group rejection.
4. Test in the same channel and LINE group that used the old bot. Compare answer
   quality and model cost; this implementation intentionally does not transfer
   old conversation history into People OS.

## Live LINE cutover (owner authorization at this gate)
1. Ensure PR2 People OS AI Workplace and PR3 AI LINE endpoint have passed QA. The legacy LINE Group ID cannot be recovered through the deleted database; recover it through an owner-held record or a signed LINE Webhook event in a controlled enrollment process.
   Deploy approved code and migration, configure real Production server-only variables.
2. Visit **LINE Developers → AI Messaging API channel → Messaging API → Webhook URL**.
   Switch **from**
   `https://ai-workspace-swart.vercel.app/api/line`
   **to**
   `https://people.yuendeaw.com/api/line/ai`.
3. Use LINE Developers **Verify** and send an approved test message. Confirm exactly
   one bot response, no duplicate usage, no secret in logs, and no disruption to
   Communeed's separate LINE OA.
4. **Important: the old URL is not a valid working rollback** because its Supabase project was deleted. Before switching, have a known-good People OS deployment and the ability to roll back *its code or environment*. If the new webhook is unhealthy, keep or restore the last verified People OS deployment, not the broken legacy endpoint. Temporarily disable bot responses if no healthy version is available.
5. After verifying the new endpoint, disconnect the old URL and revoke legacy credentials only after the provider-level cleanup. Do not delete the remaining Vercel project until domain and backup decisions are reviewed.

## Discord retirement (NO migration)
- In Discord Developer Portal, inspect the old AI application and remove/disable
  the slash commands or app installation where appropriate; clear the
  **Interactions Endpoint URL** after confirming the application does not serve
  other workflows. This is a provider action, not a database change.
- Supabase-hosted legacy Discord channel mappings were removed with the deleted project; restore history only if a separate external backup exists. Do not export member IDs into GitHub.
- Retire/revoke the old Discord bot credentials from the remaining legacy Vercel project after checking any unrelated uses. No Production Discord credentials are changed by this PR.
- If you no longer need the Discord application at all, optionally delete the old Developer Portal application after assessing other users and integrations.

## Phase AI-3 / AI-4 — Updated after user deletion
- **AI-3 data recovery:** Supabase-hosted DB/Storage and built-in backups are no longer available after deletion. Ask the owner whether a separate downloaded database/Storage backup exists; do not assert any old chat, document or group mapping was preserved. GitHub source/migrations remain for reconstructing app behavior, not the lost records.
- **AI-4 Compute:** there is no ai-workspace Supabase project left to transfer or pause; future Compute for that project ends with deletion, though current-cycle charges before deletion may remain.
- **New release path:** configure credentials from retained legacy Vercel project, obtain LINE group ID from a correctly signed LINE provider event during a controlled QA enrollment or separate owner-held record, verify the new People OS webhook, then approve production cutover.
- Reconfirm STANd, Communeed, YuenDeaw People and LINE AI health; check the next billing cycle for reduced Compute.

**Release gate:** Do not merge or change LINE Developers webhook URL, Discord
application, Production SQL or Vercel Production keys automatically. 
