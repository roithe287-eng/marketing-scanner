# Owner administration and per-account activity — 2026-10-06

## Intended behavior

- `/setup` creates the one owner account only. It requires the pre-existing registered-network check (`ALLOWED_IPS`), a cryptographically random setup code whose SHA-256 is `SAAS_SETUP_TOKEN_HASH`, and an unexpired `SAAS_SETUP_EXPIRES_AT`. The plaintext code must never be committed. The owner chooses their own email and password in the form.
- `admin-initialized` is the immutable owner ID. Every administrative request checks the active session, admin role, this exact owner ID, and the registered network. A second account with an admin role cannot inherit ownership.
- Registered IPs no longer bypass account login for B2B analysis or reports. Customer account creation and inquiry approval are available only to the owner. No public signup or promotion endpoint exists.
- `/manage` provides owner-only account creation, inquiry approval, suspension, expiry/feature/quota editing, single-use activation links, pagination, and per-user activity details. Activation links expire in 48 hours; sending them is a separate action.
- Email is the login account ID; the stable account UUID is the unique user ID. IP and coarse browser/OS labels are observations, not unique person/device identifiers. No hardware fingerprint is collected.

## Activity and retention

- Server events: login success/failure, logout, activation, analysis start/success/failure, share creation/update, report-page requests (prefetches excluded), comparison loading, and owner changes/record access.
- PDF generation requires an authenticated server-issued ticket. The ticket binds account, account version, scope and optional shared-report ID. Ready/failed transitions are exclusive; save/open require ready. Idempotency prevents retries from inflating counts. The client cannot set account ID/IP or submit arbitrary server events.
- PDF completion/save/open are browser reports or clicks, not proof of an OS-level file save. Network failures may leave incomplete client telemetry; the UI reports such failures. Completed analyses are not changed into failures if optional activity logging is unavailable.
- Detailed events/IP and daily counts use KST day keys with absolute expiry (at most 30 days). Up to 1,000 timeline events per day are retained, with the latest 200 shown. Counts are independent of timeline truncation. Lifetime aggregate counts contain no IP, browser, target URL or report contents and last until account deletion.
- Account deletion atomically removes the account, user event buckets, lifetime counts and recent monthly quota buckets. Late completion cannot recreate deleted personal records. Authentication tokens are invalid once the account is absent.
- Full report contents remain governed by the existing maximum seven-day policy. Expired links disappear from active-link lists; event metadata may remain for the detailed-log period. Downloaded copies cannot be recalled.
- Owner audit records use absolute UTC day buckets (maximum 180 days). The build migration converts the prior rolling-expiry audit list without renewing the original event age.
- `/privacy`, activation and login screens disclose purposes, fields, retention, interpretation and contact path. Historical usage before feature activation is not retroactively invented.

## Validation

- Full existing unit suite plus SSR activity-panel escaping/empty-state tests.
- `npm run test:admin`: real Redis integration for one-time setup, sole-owner checks, admin-only account creation, cross-account and cross-origin denial, analysis success/refund, PDF ticket identity/order/idempotency, share ownership/expiry, concurrent event deduplication, fixed retention, immediate suspension, atomic deletion, and legacy-audit migration.
- Existing Redis security suite covers inquiry → approval → activation → login → private report → suspension.
- TypeScript and optimized Next.js/Pocket builds.
- No production credentials or customer records are used in these tests. Browser-level interactive verification of the authenticated administrator screen still requires an authorized session.

## Operational continuation

Known production: `https://www.mktscanner.com/`, GitHub `roithe287-eng/marketing-scanner`.

At implementation time the connected Vercel account can list the expected team, but the project and its known deployment return 404 and the project list exposes only another project. Do not infer that a setup code is configured, that an owner exists, or that a production account was created. Do not put a bootstrap credential into the repository or introduce an auth bypass to work around this.

Before production merge, verify an existing owner can sign in on the registered network, or configure the one-time owner registration securely. Without that step, eliminating the old IP-only path may lock out the operator. Use the normal protected `/setup` flow; never ask for the owner's password in chat. Connector-error browser fallback requires the user's permission under the browser-use policy. The code change can be reviewed as a PR while this operational step is resolved.
