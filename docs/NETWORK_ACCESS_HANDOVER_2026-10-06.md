# Explicit login-free network access — 2026-10-06

The owner explicitly requested login-free Marketing Scanner use from one office IP after PR #60. This supersedes the previous blanket requirement for account login only for that configured network. Do not expand `ALLOWED_IPS` or administrator access.

## Behavior

- `lib/security/networkAccess.ts` matches the normalized, Vercel-verified client IP against the approved digest. The raw office IP is not printed in this public repository. `LOGIN_FREE_IP_HASHES`, if set, replaces the default list; an empty value disables this grant. A digest is configuration, not an authentication secret.
- `/api/access` returns `kind: internal, admin: false` without issuing a session or creating an account. Existing approved account sessions take priority, preserving their permissions, monthly limits, and per-account activity history.
- The network can analyze, compare competitors, run deep dives, export PDFs, save reports, and reopen network-owned reports. Existing same-origin checks, request rate limits, safe URL fetching, and seven-day report expiry remain.
- Network reports use the existing `internal` owner and a shared network library. The restored network grant does **not** permit reading, listing, or updating customer-owned reports. Only the authenticated sole owner retains cross-account administration.
- Network PDF receipts are separate from account receipts, bound to the verified source network, expire after one hour, and enforce start → ready → save/open ordering. They never masquerade as personal account activity. Logged-in PDF activity keeps the existing account/session-version checks and metrics.
- First-screen and library copy clearly identify login-free network use and explain that personal activity attribution requires login.

## Validation

- Local tests use documentation-range IPs and an isolated Redis server; no production account or report records are created.
- Added `tests/network-access.integration.ts`: exact IP/mapped IPv4, forged secondary headers, non-Vercel fail-closed behavior, guest access response, all three analysis entry points, cross-origin rejection, administrator denial, report ownership isolation, PDF ordering/network binding/expiry, and account-session priority.
- Existing security, administrator activity, retention, unit/SSR regression suites and TypeScript/build checks cover the account-only paths and original report behavior.
- The configured production digest is separately checked against the owner-supplied IP and adjacent nonmatching addresses without committing the address into test files.
- A remote cloud browser cannot originate from the owner's office IP. Production verification can confirm deployment and deny non-office requests; it cannot claim a physical office-origin browser test.

Trusted client IP behavior: https://vercel.com/docs/headers/request-headers
