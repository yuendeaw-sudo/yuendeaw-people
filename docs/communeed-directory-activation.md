# Communeed directory credential activation

The original DIRECTORY_API_TOKEN is a Vercel Secret and cannot be read back. The initial copy plan was replaced, with explicit owner approval, by a separate credential. The existing shared token and its callers remain unchanged.

The read-only /api/directory/is-employee endpoint accepts either DIRECTORY_API_TOKEN or the optional COMMUNEED_DIRECTORY_API_TOKEN. The latter grants access to this status endpoint only, not general HR, salary, payroll or personnel documents. The response and employment-status rules are unchanged.

On 2026-11-12 ICT, People PR5 merged a3fe6a7772b559036fcb9dc9ccc4364859a63f46 from validated head699674ab3aa2e7b199ea58fb31c04c93fe750163. Actions43143376372 passed actual-handler tests with controlled PostgREST plus full TypeScript/whitespace; final-head Preview and Production builds both READY. Production deployment dpl_65DTVwLFv6zGqbHxKNKDdRS8146u has people.yuendeaw.com assigned.

A new random credential was generated in memory and stored as a Production-only Secret in People COMMUNEED_DIRECTORY_API_TOKEN and Communeed PEOPLE_DIRECTORY_API_TOKEN. It was never put in a local file, browser, commit, URL or user-visible output. Source DIRECTORY_API_TOKEN metadata was verified unchanged. No HR service-role credential was copied. Temporary credential memory was cleared after verification.

Live HTTPS probe with the dedicated credential returned200 and {employee:false,status:null} for a synthetic .invalid address; an invalid credential returned401. No real employee was looked up, created or modified. Communeed PR306 deployed c7e617a096d8662787dd102e104ba7bb0ae146bb as READY dpl_DgEw2Dcic6NuDPJgLGMYtPrbZsNZ, with communeed.com/www.communeed.com assigned. Its new route rejects anonymous and cross-site requests. Native Admin UI loads, but no Editor/PM members exist there yet, so per-member live UI acceptance is not claimed.

This activates minimal status checking only. HR employee UUID mapping, performance evidence synchronization and employment classification remain separate work. No Production database, payroll, notification, employee or customer records changed.
