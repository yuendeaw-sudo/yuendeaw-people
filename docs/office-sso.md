# Employee office sign-in

The People Supabase Auth project is the OAuth 2.1 authorization server. WWW,
AI Office and Ads have separate registered clients and exact callback URLs.
Clients use authorization-code + S256 PKCE + a host-bound encrypted flow cookie.
Neither refresh tokens nor session cookies are shared across subdomains.
Office sessions are encrypted, Secure, HttpOnly, SameSite=Lax and host-only.
They expire with their OAuth access token (at most one hour); a fresh flow uses
the existing People login without another Google login.

Every office request verifies the token with Auth, checks the registered client
claim, and reads the current employee record. Only linked users with a confirmed
email, status active/probation/intern and type full_time/probation/part_time/hybrid/
intern are allowed. Candidate, alumni, inactive and external/freelance types are
denied. The owner flag alone does not bypass the employee requirement.
Existing People module permissions remain in effect.

OAuth consent accepts only the three registered first-party client IDs, exact
callback URLs and the email scope. Registration of arbitrary OAuth apps remains
disabled. Tokens are validated online; no user_metadata is used for permissions.

## AI Office migration

The employee entry moves to the People Vercel project with host routing for
aioffice.yuendeaw.com. Existing D1 records remain on the private original Site.
The front end verifies employee membership before every request and calls a
private, signed backend adapter. The original Site audience stays private.
The backend verifies the HMAC, request timestamp and mutation replay ID.
An owner retains the exact old workspace ID. Other employees get isolated
workspaces and cannot read the owner's financial dashboard or growth reports.
Existing internal worker endpoints keep their original service credentials.
Do not switch DNS until both front-end and backend deployments pass read-only
acceptance and the old owner workspace data is verified.

Runtime configuration (values must never be committed): OFFICE_WWW_CLIENT_ID,
OFFICE_AI_CLIENT_ID, OFFICE_ADS_CLIENT_ID, OFFICE_SESSION_SECRET,
OFFICE_AI_BRIDGE_SECRET, OFFICE_AI_BACKEND_TOKEN, OFFICE_AI_OWNER_WORKSPACE.
The private backend uses OFFICE_BRIDGE_SECRET and OFFICE_OWNER_WORKSPACE.

## Acceptance

- In a clean browser, all protected destinations require central employee login.
- After one Google login, WWW shows signed-in state and People opens directly.
- AI Office enters without ChatGPT login; Ads enters without a separate Google
  login and still checks its existing Ads authorization.
- External, departed and candidate users are rejected server-side, not just hidden
  in the menu. Tests must not grant test users production employee membership.
- Invalid state, PKCE mismatch/reused code, forged/expired cookies, mismatched
  client tokens and replayed backend mutations are rejected.
- Central sign-out invalidation is not instant for an already issued OAuth access
  token; the office cookie lasts at most one hour. Employee revocation is checked
  on each request independently of that token lifetime.
