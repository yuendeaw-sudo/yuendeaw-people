# AI Workspace retirement — safe, phased migration

**Status:** AW.1 dependency inventory verified; AW.2 code is **PR / Preview only**. The legacy Supabase project and both AI domains remain online. **No production database/schema changes, transfers, pauses, webhook changes or deletion performed by this PR.**

## Goal

Retire the standalone `ai-workspace` Supabase Micro Compute **without deleting its data**, while replacing the specific YuenDeaw People navigation dependency with existing People OS AI capabilities.

Source:
- Legacy Vercel project: `ai-workspace`, domains `ai.yuendeaw.com` and `ai.standnextstage.com`.
- Legacy Supabase ref: `qbkrsexjksmjnrevtrnn` (Pro organization).
- YuenDeaw People: `people.yuendeaw.com`, separate Supabase ref `bhvbkqcporxbfobehvns`.
- YuenDeaw People has 12 active `ai_agents` (1 owner-only) and an existing `/api/ai/chat` based on its own Supabase + Anthropic configuration.

## AW.1 — Dependency inventory [REVIEWED]

| Integration | Evidence | Decision |
| --- | --- | --- |
| People OS `/ai-workplace` | Previous page embedded `https://ai.yuendeaw.com` in an iframe | Replace with native People OS agent catalog; use same authenticated employee session |
| People OS `/ai-workplace/[key]` | Already uses People OS `ai_agents` | Retain; enforce `ai_workplace:view` and employed/owner status on direct access |
| People OS `/api/ai/chat` | Already calls Anthropic, reading People OS `ai_agents` | Retain; enforce employee/owner and `ai_workplace:view` within API |
| Legacy Discord Interactions | `app/api/discord/route.ts` on legacy Vercel, 4 linked channels in legacy DB at prior audit | **Do not disable or move until webhook endpoint and actual server usage are checked** |
| Legacy LINE callback | `app/api/line/route.ts` on legacy Vercel, 1 linked group in legacy DB at prior audit | **Do not disable or move until LINE Developer webhook and actual use are checked** |
| Legacy data | 16 tables, 3 Auth identities, 29 conversations, 66 messages, 35 usage logs, 1 document, 2 images at prior read-only audit | Preserve **as archived history**, not duplicate into People OS silently |
| Legacy Vercel deployments | Latest observed Production deploy dated 2026-07-01 | No evidence of a newer code release; not proof bots are unused |

The historical row counts above are from an earlier read-only audit (2026-10-20); repeat an inventory before moving or pausing the project. No personal records, chat messages, keys or access tokens are copied into this repo.

## AW.2 — Replace YuenDeaw People AI entry [IN REVIEW]

This PR:
1. Renders People OS active agents from the existing `ai_agents` table, ordered by `sort_order`. Shows only non-sensitive presentation fields and filters owner-only agents for non-owner viewers.
2. Provides a mobile-friendly searchable catalog and links to existing `/ai-workplace/[key]` chat pages. No new account, database, model provider, or AI integration is created.
3. Requires authenticated owner/employee and `ai_workplace:view` on the catalog, the detail page **and** `/api/ai/chat` (which has its own API auth boundary).
4. Supports an emergency rollback **before retirement** through the server environment variable `AI_WORKPLACE_LEGACY_IFRAME=true`. Default behavior uses native People OS AI.
5. Leaves the legacy domains, webhooks, data and People OS backend untouched.

### Acceptance gate (owner/staff QA; not automated by this PR)
- [ ] Preview builds successfully and unauthenticated `/ai-workplace` redirects to login.
- [ ] Owner session sees 12 agents, including the owner-only agent; non-owner with AI permission sees only 11.
- [ ] Non-owner *without* `ai_workplace:view` cannot open `/ai-workplace/[key]` nor POST `/api/ai/chat` (403).
- [ ] Use an approved People OS QA account to send a low-cost test message; verify streaming response and access policy. No real employee personal data in the prompt.
- [ ] Mobile UI and links work on phone. Existing HR, Leave, Payroll and other People OS routes still work.
- [ ] Confirm legacy iframe fallback works while original service remains live, if required for rollback.
- [ ] Explicit owner approval for Merge/Production release. **Do not merge automatically.**

## AW.3 — Archive, transfer [BLOCKED pending prerequisites]

- **Existing Pro projects cannot be paused directly**. Supabase supports moving an eligible project to a separate Free organization and then pausing it.
- The connected Supabase account currently exposes only **one Pro organization**, no target Free organization.
- Owner must create/select a Free Supabase organization and review transfer eligibility before proceeding. The target organization must allow transfers and project quota; the source owner must approve the move.
- Confirm the exact legacy project is eligible: complete DB and Storage inventory, <500 MB database eligibility, no incompatible project addons, no active GitHub integration or log drains.
- Obtain a **verified restorable backup** (Postgres + Auth data, RLS/functions, Storage files, and encrypted configuration inventory). Supabase scheduled DB backups do **not** by themselves prove Storage content is exported. Never place secrets/PII in GitHub, chat, or CI logs.
- Record file counts/checksums or a private backup validation record, **not personal row values**, and designate how the owner can restore it.
- Capture and validate bot callback destinations (LINE + Discord) in their respective provider consoles. Disable unused callbacks or migrate approved ones to an independent endpoint *before* pausing Supabase. A Bot still configured to the legacy domain can continue receiving webhook calls even if nobody has signed into the web app.
- Transfer to Free only after explicit owner review of downtime, domain and bot effects; Supabase documents possible 1–2 minute downtime when moving Pro to Free.

## AW.4 — Pause and verify spend [BLOCKED until AW.3 passes]

- Pause the same Supabase project **in place** in Free; **do not delete it**. Keep project ref and recovery steps. Pausing disables its Auth/DB/Storage/API until resumed.
- Independently verify YuenDeaw People native AI still works and no live LINE/Discord callbacks depend on the paused service.
- Monitor usage and next Supabase invoice. Estimated potential savings for one Micro Compute resource are roughly US$9.68 per 30-day cycle, depending on actual billed hours.
- Archive the previous Vercel project and domains only in a separate, approved step if they are no longer needed. Avoid broken links or DNS changes without an approved redirect plan.

## Recovery / rollback

- **Before pausing:** enable `AI_WORKPLACE_LEGACY_IFRAME=true` in People OS, if the legacy service is still healthy, or revert the People OS PR.
- **After pausing:** resume the Supabase project in the Free organization, verify DB/Auth/Storage/bots, and only then re-enable legacy links or webhooks if needed. Never suggest the old iframe works while the original database is paused.
- The old repository `yuendeaw-sudo/ai-workspace` stays archived in GitHub only if explicitly requested; source history must not be deleted.

### Reference documentation

- https://supabase.com/docs/guides/platform/project-transfer
- https://supabase.com/docs/guides/troubleshooting/pausing-pro-projects-vNL-2a
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/platform/manage-your-usage/compute
