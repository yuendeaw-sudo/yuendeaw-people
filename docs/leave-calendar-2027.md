# Company calendar and employee leave planning

- `/calendar` is available from both employee and owner navigation and from Dashboard, Profile and Time & Leave.
- The published holiday dataset contains only AD 2027 / BE 2570: 13 traditional holidays and 3 additional company days. Chinese New Year is observed February 8; Christmas December 27. Chakri and Coronation days are excluded.
- No database migration, entitlement update or historical leave rewrite is part of this change. BE 2569 records, holidays, request totals and quotas remain untouched. Years without a published dataset say so explicitly; an empty holiday dataset is never described as zero holidays.
- Personal calendar queries are explicitly scoped to the signed-in employee, including owners/HR, retain session RLS and omit reasons and evidence paths from the client payload.
- Started approved leave (including ongoing requests), future approved leave and pending/awaiting-confirm requests are shown separately. Figures retain stored request totals and attribute a request to its start-date year, matching the existing system. Rejected/cancelled requests remain identifiable in monthly history but do not enter summary figures.
- Headline cards describe recorded sick/personal/annual leave; there are no progress bars, remaining-quota headlines or use-it-up prompts. Exact planning figures remain available under a disclosure and in the request form.
- Entitlement rules continue to come from existing leave_policies. Existing annual rules currently grant 6/8/10/12 days at 1/2/4/6 completed years, which are more generous than the discussed 1/3/5/10-year proposal. This release does not reduce them or enable first-year prorating. A future policy revision must be separately effective-dated and honor existing rights.
- The calendar is a planning view; existing request submission, day-counting and approval behavior are unchanged. It does not automatically subtract company holidays from a submitted date range. Monday–Friday is stated as a display assumption; shift workers follow their agreed schedule.

## Validation

- `node tests/company-calendar.mjs`: holiday counts, substitutes, monthly limits, missing-year handling, Bangkok year boundary, recorded half-days and leave status/time separation.
- `npx tsc --noEmit`
- `npm run build`
- Browser QA could not run: managed preview supplies Vite flags (`--host`, `--strictPort`) that Next.js rejects. No production auth was bypassed; temporary synthetic preview fixtures were removed.
