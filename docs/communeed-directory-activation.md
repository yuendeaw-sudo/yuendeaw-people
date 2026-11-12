# Communeed directory credential activation

The existing DIRECTORY_API_TOKEN is a Vercel Sensitive/Secret variable and cannot be read back. The approved plan to copy its value into Communeed is therefore blocked. No attempt was made to extract it from the runtime, rotate it or change existing callers.

This proposed additive change lets the existing read-only directory endpoint also accept COMMUNEED_DIRECTORY_API_TOKEN. Its response and existing token remain unchanged. The key grants this directory endpoint only, not general HR or payroll access. No new employee identity/performance API is introduced.

After owner approval for the additional People-side change: generate a new random token in memory, store it as a Production-only Secret named COMMUNEED_DIRECTORY_API_TOKEN in People and PEOPLE_DIRECTORY_API_TOKEN in Communeed, merge validated People support and Communeed PR306, wait for Production READY, then check authorization and a read-only directory response. Never print, commit or persist the token to a local file. Do not copy an HR service-role key into Communeed. Keep People's existing DIRECTORY_API_TOKEN unchanged.

This PR is prepared for review, not activated. No secret value has been generated or written, no Production release and no live employee lookup have occurred. Local and CI tests exercise the actual handler with synthetic credentials and controlled PostgREST responses; they do not prove live credentials.
