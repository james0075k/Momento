# Security

This is the Phase 7 review of Momento against the CIA table in the build plan (confidentiality,
integrity, availability). Each row says what is in place, where, and which test proves it.
"Known limits" at the end lists what is deliberately not covered yet.

## Reporting a problem

Email the shop owner privately (do not open a public issue) with steps to reproduce. Please do not
test against real customer data.

## Confidentiality

| Control                                                                                                                                                                      | Where                                                         | Proof                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| Passwords hashed with argon2id, never returned by the API                                                                                                                    | `apps/api/src/services/auth.ts`, `models/User.ts`             | `auth.test.ts` (stores an argon2id hash, no hash in response) |
| Same 401 and same timing for a wrong password and an unknown email                                                                                                           | `services/auth.ts` (dummy hash)                               | `auth.test.ts` (same 401)                                     |
| Access token 15 min, refresh token 7 days, rotated on every use; reuse of an old refresh token revokes the whole login                                                       | `services/auth.ts`, `models/RefreshToken.ts`                  | `auth.test.ts` (rotation, reuse detection)                    |
| Cookies are `httpOnly`; in production also `Secure` and `SameSite=None` (`Lax` in dev); refresh cookie only sent to `/auth`                                                  | `services/cookies.ts`                                         | `security.test.ts` (cookie flags), `admin.spec.ts`            |
| Roles: `admin` and `staff`; every write route checks the role; deletes and settings are admin-only                                                                           | `middleware/auth.ts`, `routes/index.ts`                       | `auth.test.ts`, `catalog.test.ts`, `reviews.test.ts`          |
| Customer phone and address readable only by staff/admin. Public tracking needs order code **and** phone and never returns the address or photos                              | `controllers/orders.ts`                                       | `orders.test.ts` ("order privacy")                            |
| Public review lists never show `verifiedOrderCode`                                                                                                                           | `controllers/reviews.ts` (strips it for the public)           | `reviews.test.ts` (verified reviews)                          |
| Secrets only from environment variables; production refuses to start with JWT secrets under 32 characters                                                                    | `config/env.ts`                                               | `.env.example` lists names only                               |
| No personal data in logs: request cookies and auth headers removed, `phone`, `email`, `address` and passwords redacted                                                       | `config/logger.ts`                                            | code review                                                   |
| No personal data in error reports: Sentry runs with `sendDefaultPii: false` and request bodies, cookies, headers, query strings and user details are stripped before sending | `apps/api/src/config/sentry.ts`, `apps/web/src/lib/sentry.ts` | code review                                                   |
| Audit log holds no request bodies (who, role, method, path, status only)                                                                                                     | `middleware/audit.ts`, `models/AuditLog.ts`                   | `security.test.ts` ("without the request body")               |
| HTTPS only: HSTS on the web app (2 years, preload) and helmet on the API; `upgrade-insecure-requests` in the CSP                                                             | `apps/web/next.config.ts`, `app.ts`                           | `storefront.spec.ts`, `security.test.ts`                      |
| Error messages leak nothing: unexpected errors return `{"error":"Internal server error"}`, malformed JSON returns a generic 400, unknown routes a bare 404                   | `middleware/errorHandler.ts`                                  | `security.test.ts` ("never leaks stack traces")               |

## Integrity

| Control                                                                                                                                                                              | Where                                           | Proof                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------- |
| Every body, query and param validated with Zod schemas from `packages/shared`                                                                                                        | `middleware/validate.ts`, `routes/index.ts`     | `catalog.test.ts`, `reviews.test.ts` (validation cases)                 |
| Input limits: JSON bodies max 1 MB (413 above), string lengths and array sizes capped in the schemas, page size max 100, photo count max 30, photos only from our Cloudinary folder  | `app.ts`, `packages/shared/src/*`               | `security.test.ts` (413), `orders.test.ts` (photos)                     |
| NoSQL injection: `express-mongo-sanitize` plus Zod rejecting objects where strings are expected                                                                                      | `app.ts`, `middleware/validate.ts`              | `security.test.ts`, `catalog.test.ts`                                   |
| Prices are always recomputed on the server; client prices are ignored                                                                                                                | `services/orderPricing.ts`                      | `orders.test.ts` (ignores every client-sent price)                      |
| CSRF: every non-GET request must carry `X-Requested-With: momento`, which a cross-site form or simple request cannot send, and CORS allows only listed origins                       | `middleware/csrf.ts`, `app.ts`                  | `auth.test.ts` (CSRF header), `admin.spec.ts`                           |
| CORS allow-list from `CORS_ALLOWED_ORIGINS`; unlisted origins get no CORS headers; empty list allows none                                                                            | `app.ts`                                        | `security.test.ts` (CORS allow-list)                                    |
| Order status only moves along allowed transitions, atomically                                                                                                                        | `services/orders.ts`                            | `orders.test.ts` (transitions)                                          |
| Audit log of every state-changing request by a signed-in user, kept one year                                                                                                         | `middleware/audit.ts`                           | `security.test.ts`                                                      |
| Web security headers: CSP (scripts, styles, images, connections, frames, forms locked to known origins), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` | `apps/web/next.config.ts`                       | `storefront.spec.ts` (headers and no CSP violations in a full checkout) |
| Rich text from the admin is sanitised before it is rendered                                                                                                                          | `apps/web/src/components/product/rich-text.tsx` | `rich-text.test.ts`                                                     |
| Structured data escapes `<` so no field can close its `<script>` tag                                                                                                                 | `apps/web/src/lib/jsonld.ts`                    | `jsonld.test.ts`                                                        |

## Availability

| Control                                                                                                                                            | Where                                            | Proof                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| Rate limits per IP per 15 minutes: 300 requests overall; 10 failed logins; 20 orders; 10 reviews; 60 tracking/coupon lookups; 40 upload signatures | `app.ts`                                         | `auth.test.ts`, `reviews.test.ts` (rate limit cases) |
| Request size limit 1 MB                                                                                                                            | `app.ts`                                         | `security.test.ts`                                   |
| Liveness `/health` and readiness `/health/ready` (pings MongoDB, 503 when down)                                                                    | `routes/health.ts`                               | `app.test.ts`, `security.test.ts`, `admin.spec.ts`   |
| Graceful shutdown on SIGTERM/SIGINT (finish requests, close database), PM2 restarts crashes and processes over 400 MB                              | `server.ts`, `deploy/ecosystem.config.cjs`       | manual                                               |
| Failed deploys roll back automatically: the release script checks `/health/ready` and switches back to the previous release if it fails            | `deploy/remote-release.sh`                       | first production deploy                              |
| Uptime checks every 15 minutes; Sentry alerts on new errors                                                                                        | `.github/workflows/uptime.yml`, Sentry           | see `DEPLOYMENT.md`                                  |
| Nightly `mongodump` with 14-day retention, restore steps documented                                                                                | `deploy/backup-mongo.sh`, `DEPLOYMENT.md`        | restore drill (quarterly)                            |
| ISR caching on public pages, MongoDB indexes, Cloudinary CDN for images                                                                            | `apps/web`, `apps/api/src/models`                | Lighthouse                                           |
| Friendly error pages that report to Sentry                                                                                                         | `apps/web/src/app/error.tsx`, `global-error.tsx` | manual                                               |

## Phase 8 additions

- `POST /api/revalidate` (web) needs the shared `REVALIDATE_SECRET` (16+ characters, compared in constant time),
  accepts only known tags (`settings`), and answers 404 to everything else. Without the secret set it is closed.
- Feature-flagged API routes answer 404 while their flag is off, so a disabled feature exposes nothing.
- The wishlist and recently viewed lists live in the visitor's browser; the server only receives product ids
  (`GET /products?ids=`, max 24, validated as ObjectIds). "Customers also bought" returns products only, and only
  when two or more separate orders support a pair, so it cannot reveal a single customer's basket.

- **Gift cards:** money moves only through atomic updates (`balance >= amount` is part of the update), so two orders
  cannot spend the same balance; a card can never be topped above what was issued. `POST /gift-cards/balance` is rate limited
  and answers 404 for unknown and switched-off cards alike, and codes use an alphabet without look-alike characters.
  Only admins issue or change cards, and those requests land in the audit log.
- **Referrals:** phone numbers are kept only as a keyed hash (HMAC-SHA256 with `REFERRAL_PEPPER` or the JWT secret). One
  referral discount per phone is enforced by a unique index, so it holds under concurrent orders. Validating a code never
  reveals whose it is.
- **Festival banner:** its link is limited to a site path or an https URL (no `javascript:` or `//host`), and it is rendered
  as text, never as HTML.

- **Daily summary:** the internal route needs `CRON_SECRET` (constant-time compare) and otherwise answers 404 like an unknown
  route. The email holds order codes, customer names, totals and `wa.me` links (a phone number appears only inside a link), never
  addresses; every customer-supplied value is HTML-escaped. It goes only to `SUMMARY_TO_EMAIL`, an inbox you control. The GitHub
  workflow discards the response so names never reach the Actions log. Email provider errors are logged, never returned.
- **CSV exports:** admin only, behind a flag, no addresses, `Cache-Control: no-store`, capped, and every download is written to the
  audit log (the audit middleware now records `GET .../export.csv` as well as changes). Cells beginning `=`, `+`, `-` or `@` are
  prefixed so a spreadsheet cannot run them as formulas. Tracking now returns product ids to someone holding the order code and phone.

- **Admin panel:** the API checks the session and role on every request; the screens only hide what a role cannot use.
  Descriptions typed in the editor are cleaned again by the shop before display (`sanitize-html`). Image links are limited to
  Cloudinary in the form and by the upload signature; a product image from anywhere else is refused by the form. Content changes
  ask the website to refresh through the same secret-protected `/api/revalidate` route as settings.

## Supply chain

- `pnpm audit --audit-level=high` runs in CI and blocks the deploy. Current state: no known
  vulnerabilities in any dependency (checked at the end of Phase 7, after moving vitest to 4.x and
  forcing esbuild 0.28.1 or later).
- Dependabot opens weekly update PRs (npm and GitHub Actions). CodeQL scans on every PR and weekly.
- The deploy pins the server's SSH host key in a secret (`HOSTINGER_KNOWN_HOSTS`) and uses a
  dedicated deploy key, so a swapped server or a stolen laptop key alone cannot deploy.
- Fork and Dependabot PRs never get deploy secrets: the preview job is limited to same-repo PRs.

## Known limits (deliberate, with the fix when it matters)

1. **The admin panel does not exist yet (Phase 5).** The API side is protected and tested, but the
   panel's own UI is not. When it lands, add browser tests and check it sets `noindex`.
2. **CSP allows `'unsafe-inline'` scripts.** Next.js needs inline scripts to hydrate. Moving to
   nonce-based CSP needs middleware and makes every page dynamic. The CSP still blocks third-party
   scripts, framing, and sending data to unknown hosts.
3. **Rate limits are in memory, per process.** That is why the API runs as one PM2 instance. Do not
   scale it to several instances, or to serverless, without moving the counters to a shared store.
4. **Cross-site cookies.** In production the cookies are `SameSite=None; Secure` so a web app and API on
   different domains can share a session, but Safari and some browsers block third-party cookies.
   Put both on one parent domain (`momento.com.np` and `api.momento.com.np`) and set `COOKIE_DOMAIN`.
5. **Set `trust proxy` to match your proxy.** It is `1` (one proxy hop, such as nginx). If you add
   Cloudflare in front of nginx, change it to `2`, or every visitor shares one rate-limit bucket.
6. **No account lockout** beyond the per-IP login limit (10 failed attempts per 15 minutes).
   Admin accounts should have long passwords; add 2FA when the admin panel is built.
7. **Customer phone and address are stored as plain fields** (MongoDB Atlas encrypts disks at rest).
   Field-level encryption is possible later if the shop needs it.
8. **Secrets that were committed.** Earlier commits of `.env.example` contained a real MongoDB Atlas
   password and JWT secrets. They must be treated as leaked: rotate the Atlas password and both JWT
   secrets before going live (see `DEPLOYMENT.md`, "Before you go live"), and keep only empty names in
   `.env.example`.
