# Marketing Scanner access and operations

The existing `ALLOWED_IPS` list is unchanged. On Vercel, only the overwritten forwarding header is used, normalized as an exact IPv4/IPv6 address. Missing/malformed configuration never creates a public diagnosis bypass. Self-hosted deployments do not trust forwarded IP headers by default.

## Access rules

- `/`, `/inquiry`, `/notice`: introductory content, static illustrative sample, inquiry form. No search registration, sitemap, or indexing rollout was added.
- Registered IPs: existing diagnosis, competitor analysis, PDF, and report viewing remain available without customer approval/monthly quotas.
- Other IPs: inquiry → operator verifies contact → approval → one-use invitation → password activation → login. Sessions are seven days, invitation links 48 hours.
- `/manage` and `/api/admin`: **both** registered IP and authenticated admin required. IP access alone never grants administration.
- Analyze, competitor, deepdive, share read/write, baseline comparison, and `/r/[id]` enforce server permissions independently of middleware. Report metadata is generic. Legacy unowned reports are internal-only; new reports are owner-scoped. Link recipients do not get anonymous access.
- Report data expires after 21 days; inquiry data after 90 days. Account deletion is available in admin; report expiration is unchanged. Account information use is disclosed and consented during activation. No contact information is logged or automatically sent to messaging/email services.
- Account suspension, expiry, deletion, changed grants, or reissued activation links invalidate prior sessions. Ordinary account access is checked against current database records on every request.
- Monthly budgets use UTC calendar months: diagnoses N, competitor comparisons N, detailed competitor analyses 5N. Atomic Redis Lua checks current approval/expiry/feature flags/version and prevents concurrent same-feature jobs. Normal server failures refund; an abruptly terminated invocation may remain charged. A running job has a 120-second lock, longer than the route's execution budget.
- PDF export is a convenience on already-authorized report data, not DRM. It cannot prevent an authorized viewer from copying information.

## Initial admin registration

Set production `SAAS_SETUP_TOKEN_HASH` to the SHA-256 of a cryptographically random 32-byte base64url token, and `SAAS_SETUP_EXPIRES_AT` to its expiry in epoch milliseconds. The raw token belongs only in the operator's private setup guide, never in the repo, logs, URL, or a public environment variable. Complete `/setup` from a registered IP. A Redis atomic marker disables bootstrap permanently after one admin is created. The code is not a password-reset backdoor. The operator chooses their password; this deployment does not create an operator password.

Admin operations: review pending inquiry, verify the contact and agreed conditions, select expiry/limit/features, approve, then deliver the activation link to that verified customer outside the app. Activation tokens use URL fragments and are removed from the visible URL after reading. Only token hashes are stored. Reset links require manual identity verification and revoke prior login sessions. Admin credential recovery requires an authenticated infrastructure operator; there is no public recovery endpoint.

No payment, automatic email, or external CRM delivery is connected in this release. Inquiry monitoring is through the admin screen. Production credentials/data are not used by local tests. Preview SaaS accounts and reports have separate Redis namespaces.

## Security

- Opaque 256-bit session identifiers; only SHA-256 digests in Redis. Production cookies are Secure, HttpOnly, SameSite=Strict and `__Host-` scoped.
- Scrypt password hashes: N=131072, r=8, p=1, random per-account salts, constant-time comparison. Generic login failures with per-IP and per-identifier limits.
- Same-origin + JSON requirements for mutations, streaming request body caps, shared rate limits, fail-closed access when storage is unavailable.
- Customer website fetches use resolved-address pinning, validate all DNS answers, reject local/reserved/transition networks, revalidate redirects, restrict HTTP(S)/ports/credentials, bound response size and time, and strip authentication headers.
- Private responses forbid caching; global frame/content-type/referrer/CSP headers. The project already protects non-custom-domain deployment URLs; preserve that platform setting.

## Verification

`npm test` runs regressions and request/IP/ownership/SSRF checks. `npm run build` validates client/server boundaries and production compilation.

`npm run test:security` requires Redis 7+ and redis-cli. Optional `REDIS_SERVER_BIN` and `REDIS_CLI_BIN` locate binaries. The suite launches an isolated loopback Redis process and a loopback REST test bridge; it exercises the real Upstash SDK, Lua atomicity, TTLs, activation race, session rotation/revocation, report ownership and the full HTTP handler workflow. It never connects to production Redis or model APIs.
