# AI Workspace retirement — safe migration checklist

> **Status changed on 2026-10-20:** The owner confirmed directly deleting the Supabase project `qbkrsexjksmjnrevtrnn`. Supabase now lists only the live STANd, Communeed and YuenDeaw People projects. The earlier goal of preserving data *by transferring and pausing the existing project* is no longer possible: Supabase states deletion is irreversible, including Supabase-hosted backups. Historical data requires an already downloaded external backup; **none has been verified**. LINE Developers still points to the old database-dependent Vercel endpoint, so a new working webhook must be tested before switching. No working rollback to the old Supabase backend exists. PR #2 / PR #3 remain Draft.

## Goal
**Revised goal:** Restore the general-purpose LINE assistant on existing People OS and remove obsolete web dependencies. Legacy ai-workspace Compute has already ended because the owner deleted its Supabase project; we cannot ensure preservation of hosted historical data. Check for independently downloaded backups before attempting any restoration.

## Phase 1 — People OS replacement (current Draft PR)
- [x] Replace People OS `/ai-workplace` iframe to `https://ai.yuendeaw.com` with same-site, signed-in agent launcher.
- [x] Load existing `public.ai_agents` rows from **People OS Supabase** (`bhvbkqcporxbfobehvns`), preserving the `owner_only` filter.
- [x] Vercel latest Preview compiled and is READY; unauthenticated HTTP smoke verified: launcher and agent detail both redirect to /login (307), chat POST denies with 401. **Still pending authenticated user QA**.
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

## Phase 2 dependency inventory — verified 2026-10-20

| Inbound integration | Existing code/host | DB usage | Decision |
|---|---|---|---|
| Discord HTTP interactions | Legacy `ai-workspace/app/api/discord/route.ts` on `ai.yuendeaw.com/api/discord` **if** developer portal currently points there (unverified) | `discord_channel_links` (4 configured); agents, conversations, messages, usage_logs, tasks | Do not switch/delete endpoint until application ID, developer-portal Interactions URL and actual activity verified |
| LINE Messaging API | Legacy `ai-workspace/app/api/line/route.ts` on `ai.yuendeaw.com/api/line` **if** LINE Developers webhook points there (unverified) | `line_group_links` (1 configured); agents, conversations, messages, usage_logs | Do not disconnect channel or reuse LINE OA credentials from Communeed without explicit mapping |
| AI Workplace web | Legacy `ai.yuendeaw.com` embedded in People OS | Legacy Auth/AI data, AI provider APIs | Replacement prepared in this PR using People OS native 12-agent catalog and `/api/ai/chat` (not deployed) |
| People OS internal agent chat | `/ai-workplace/[key]` and `/api/ai/chat` | People OS `ai_agents`, `ai_usage_logs` | Already independent of legacy Supabase; PR now enforces `ai_workplace:view` in launcher, detail page, and API, as well as owner-only agents |

**Observability:** Vercel ai-workspace runtime logs for a seven-day lookback show only two requests to `/`; none surfaced for `/api/line` or `/api/discord`. This does **not** prove external webhook configuration, deliveries or zero usage outside the retention window. Last stored AI usage was 2026-07-03 in the previous read-only inspection. No credentials or channel IDs were exported.

### Bot cutover or retirement gate

1. In LINE Developers **Messaging API**, check webhook URL for the AI channel, not the Communeed studio booking channel. Record whether it points to legacy `/api/line`; do not send or store access tokens.
2. In Discord Developer Portal, inspect **Interactions Endpoint URL** for the AI application. Record whether it points to legacy `/api/discord`. Check whether slash commands are still required in the four linked channels.
3. Decide per integration: RETAIN (implement and test replacement using People OS database and dedicated credentials), RETIRE (unregister endpoint/commands after owner approval), or UNCONFIRMED (keep legacy online).
4. For retained bots, implement signed-request validation, identity/allowlist gates, idempotent event processing, and write correct logs in the destination database. Run provider verification and real QA before changing portal URLs.
5. For retired bots, document change/rollback and manually confirm no workflow uses the channel. Do not share a LINE channel secret across unrelated bots.
6. Only after dependency sign-off, verified backups and approved transfer/pause should the legacy database Compute be stopped.

**No external developer-portal write or webhook removal has occurred.** No user data or secrets were copied.

## Owner decision — 2026-10-20 (confirmed)
- LINE AI Bot must remain operational. Owner confirmed LINE Developers Webhook URL: https://ai-workspace-swart.vercel.app/api/line
- Discord Bot is **not needed**; do not port the Discord application, slash commands or permissions to People OS. Provider-side disconnection and legacy credentials retirement remain pending; simply omitting it from a new codebase does not deactivate the existing Discord application.
- The replacement LINE endpoint is being developed independently under **[PR #3](https://github.com/yuendeaw-sudo/yuendeaw-people/pull/3)**: `https://people.yuendeaw.com/api/line/ai`. It is currently **Preview only, disabled/fail-closed without the dedicated LINE channel secrets**, and has an additive SQL migration requiring separate review.
- The owner chose **อ๋อย as a general-purpose AI helper**, not a Production/HR/Sales agent. PR #3 now uses a standalone `general_assistant` prompt in LINE, with explicit group allowlisting and no People OS specialized agent access.
- Do **not** change the actual LINE Developers Webhook URL, Discord Developer settings, Production Vercel secrets, legacy Supabase organization or historical chat data based solely on a Draft PR.
- LINE-specific cutover, QA, backup/rollback and Discord retirement instructions: `docs/ai-line-cutover.md` in the PR #3 branch.

> **Backup answer confirmed:** The owner states that no external SQL dump, downloaded backup or chat export was saved before deleting `ai-workspace`. Do not plan data restoration from the deleted Supabase project. Only GitHub source code and existing Vercel configuration remain independently accessible. The replacement LINE bot's group ID can be recovered safely using a temporary signed webhook discovery flow in PR #3, without relying on deleted records.

## Phase 3 — Data recovery after deletion
- [x] Confirmed the old `ai-workspace` Supabase project is absent from the owner's accessible organization.
- [x] Asked: owner confirmed **no downloaded backups or historical export**.
- [ ] If a verifiable offline backup exists, inventory/validate it privately and assess restoration to a separately approved location. Never publish sensitive data to GitHub.
- [x] No offline backup exists. Legacy Supabase-hosted chat, documents, LINE group mapping and Auth identities cannot be recovered from GitHub source alone.
- [ ] Keep Vercel project configuration secure while transferring the exact LINE AI channel credentials to People OS. Do not share tokens in chat.
- [ ] Audit any other remaining custom domains, API dependencies and AI/LINE/Discord credentials of the still-deployed old Vercel project.

## Phase 4 — Billing / retirement
- [x] Old Supabase project was deleted by the owner; no transfer or pause remains possible.
- [ ] Confirm subsequent Supabase invoices contain no further Compute hours for deleted project; charges incurred before deletion may remain.
- [ ] Ship the replacement signed LINE AI webhook from [PR #3](https://github.com/yuendeaw-sudo/yuendeaw-people/pull/3), using only an approved LINE group, selected `general_assistant`, and a controlled provider test.
- [x] Prepared a temporary opt-in group-discovery command `อ๋อย group id` in PR #3. It requires a valid LINE signature and separate discovery-only mode; does not run the LLM or write old group data.
- [ ] Decommission Discord at the developer portal (owner no longer uses Discord bot) and revoke unneeded credentials; preserve any independently backed-up data.
- [ ] Retire the legacy Vercel project and domains only after LINE cutover and verification of unrelated dependencies; old webhook is already nonfunctional due to deleted Supabase.

**No automatic PR merge, webhook switch, credential revocation, Production SQL application, or deletion was performed by this document change.**
