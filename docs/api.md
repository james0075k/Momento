# Momento API

Express + Mongoose REST API in `apps/api`. Request and response shapes come from the Zod schemas in `packages/shared` (`@momento/shared`); the schema names below are exported from there.

A test (`apps/api/src/test/docs.test.ts`) fails if a route is registered but missing here, or documented but missing in code. Keep every route as a `### \`METHOD /path\`` heading.

## Conventions

**Base URL**: `NEXT_PUBLIC_API_URL` (dev default `http://localhost:4000`). Currency is NPR, whole rupees (integers).

**Success**: `{ "data": ... }`. Lists: `{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }`. Deletes return `204` with no body.

**Errors**: `{ "error": "message", "details"?: ... }`.

| Status | Meaning                                                                                |
| ------ | -------------------------------------------------------------------------------------- |
| 400    | Validation failed (`details` is Zod's `flatten()`), bad id, or a business-rule failure |
| 401    | No or invalid session                                                                  |
| 403    | Wrong role, or missing `X-Requested-With: momento` header                              |
| 404    | Not found (also returned for hidden/inactive items to the public)                      |
| 409    | Duplicate slug/code, or an order status change that is not allowed                     |
| 429    | Rate limit hit                                                                         |
| 503    | Cloudinary is not configured                                                           |

**Ids**: Mongo ObjectIds as 24-char hex strings, returned as `id` (never `_id`). Where a resource has a `slug`, `:id` accepts either.

**Pagination**: `?page=1&limit=20` (`limit` max 100).

**Phones** are normalised to digits (optional leading `+`) on input.

### Authentication and CSRF

- Login sets two `httpOnly` cookies: `momento_at` (access JWT, 15 min, path `/`) and `momento_rt` (refresh JWT, 7 days, path `/auth`). In production they are `Secure` and `SameSite=None`; in development `SameSite=Lax`.
- Send requests with `credentials: "include"`.
- **CSRF**: every non-GET request must carry the header `X-Requested-With: momento`. Browsers cannot add it to cross-site form posts, and CORS only allows origins in `CORS_ALLOWED_ORIGINS`.
- **Refresh rotation**: `POST /auth/refresh` revokes the presented refresh token and issues a new pair. Presenting an already-used refresh token revokes the whole login family (theft detection); the user must log in again.
- Passwords are hashed with argon2id.

### Roles

| Role    | Can do                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------- |
| public  | Read active catalog, settings, approved reviews; create orders and reviews; track an order         |
| `staff` | Everything public, plus create/update catalog items, manage orders, moderate reviews, sign uploads |
| `admin` | Everything staff can, plus delete, coupons, settings, and creating users                           |

Legend below: **Public**, **Optional auth** (public, but staff see hidden items), **Staff** (staff or admin), **Admin**.

### Rate limits (per IP, 15 minute window)

| Limit                        | Default                   | Applies to                                     |
| ---------------------------- | ------------------------- | ---------------------------------------------- |
| General                      | 300 (`RATE_LIMIT_GLOBAL`) | All routes                                     |
| Login (failed attempts only) | 10                        | `POST /auth/login`                             |
| Orders                       | 20                        | `POST /orders`                                 |
| Reviews                      | 10                        | `POST /reviews`                                |
| Lookups                      | 60                        | `POST /orders/track`, `POST /coupons/validate` |
| Photo uploads                | 40                        | `POST /uploads/order-signature`                |

---

## Health

### `GET /health`

Public. `{ status: "ok", timestamp }` (`healthResponseSchema`). Liveness only: the process is up.

### `GET /health/ready`

Public. Readiness: `200 { status: "ok", timestamp }` when MongoDB answers a ping, `503 { status: "unavailable", timestamp }` when it does not. Point uptime monitors here.

## Auth

### `POST /auth/login`

Public, login rate limit. Body `loginInputSchema`: `{ email, password }`. Sets the auth cookies and returns `{ data: User }`. Wrong password and unknown email return the same `401`.

### `POST /auth/refresh`

Public (needs the `momento_rt` cookie). Rotates the refresh token, sets new cookies, returns `204`. `401` if missing, invalid, expired or reused (cookies are cleared).

### `POST /auth/logout`

Public. Revokes the refresh-token family, clears cookies, returns `204`.

### `GET /auth/me`

Staff. Returns `{ data: User }` for the current session.

### `POST /auth/users`

Admin. Body `createUserInputSchema`: `{ name, email, password (10+ chars), phone?, role: "admin" | "staff" (default "staff") }`. Returns `201 { data: User }`, `409` if the email exists. The first admin comes from the seed script (see below), not this route.

## Categories

Fields (`categoryInputSchema`): `name`, `slug`, `image?`, `order`, `isActive`.

### `GET /categories`

Optional auth. Query: `page`, `limit`, `includeInactive` (staff only). Sorted by `order`, then `name`. The public only sees `isActive` categories.

### `GET /categories/:id`

Optional auth. `:id` is an id or slug. `404` for inactive categories unless staff.

### `POST /categories`

Staff. Body `categoryInputSchema`. `201`. `409` on duplicate slug.

### `PATCH /categories/:id`

Staff. Body `categoryUpdateSchema` (any subset).

### `DELETE /categories/:id`

Admin. `204`.

## Products

Fields (`productInputSchema`): `title`, `slug`, `categoryId`, `shortDescription`, `description` (rich text; **sanitize before rendering**), `images[]`, `basePrice`, `variants[]` (`size`, `cover?`, `pages?`, `price`; each gets an `id`), `highlights[]`, `specs[]` (`label`, `value`), `faqs[]` (`question`, `answer`), `seoTitle?`, `seoDescription?`, `isFeatured`, `isActive`.

A product with variants is priced by the chosen variant; without variants it is priced by `basePrice`. Text search uses a MongoDB text index on `title` and `description`.

### `GET /products`

Optional auth. Query (`productListQuerySchema`): `page`, `limit`, `category` (id or slug), `occasion` (slug, e.g. `wedding`), `q` (text search, ranked by relevance), `ids` (comma-separated product ids, max 24: wishlist and recently viewed), `featured=true|false`, `sort` (`newest` default, `price_asc`, `price_desc`, `title`), `includeInactive` (staff only), `active=true|false` (staff only: only visible, or only hidden, products). The public only sees active products.

### `GET /products/:id`

Optional auth. Id or slug. `404` for inactive products unless staff.

### `GET /products/:id/also-bought`

Public. Feature flag `alsoBought`: `404` while it is off. Id or slug. Up to 4 active products that appear in the same
non-cancelled orders as this one (at least 2 separate orders per pair). Products only, no order data. May be empty.

### `POST /products`

Staff. Body `productInputSchema`. `201`. `400` if `categoryId` does not exist, `409` on duplicate slug.

### `PATCH /products/:id`

Staff. Body `productUpdateSchema`. Send each existing variant back with its `id` so carts keep working; variants without an `id` are created new, and variants left out are removed.

### `DELETE /products/:id`

Admin. `204`. Past orders keep their own snapshot of title, image and price.

## Services

Fields (`serviceInputSchema`): `title`, `slug`, `description`, `icon?`, `image?`, `startingPrice?`, `showOnHome`, `order`, `isActive`.

### `GET /services`

Optional auth. Query: `page`, `limit`, `showOnHome=true`, `includeInactive` (staff only).

### `GET /services/:id`

Optional auth. Id or slug.

### `POST /services`

Staff. Body `serviceInputSchema`. `201`.

### `PATCH /services/:id`

Staff. Body `serviceUpdateSchema`.

### `DELETE /services/:id`

Admin. `204`.

## Home sections

Fields (`homeSectionInputSchema`): `type` (`hero`, `services`, `featured`, `reviews`, `guarantees`, `gallery`), `title`, `subtitle?`, `itemRefs[]` (ids of the products, services or reviews to show, in order), `order`, `isVisible`.

### `GET /home-sections`

Optional auth. Sorted by `order`. The public only sees `isVisible` sections; staff can pass `includeInactive=true`.

### `GET /home-sections/:id`

Optional auth. Id only.

### `POST /home-sections`

Staff. Body `homeSectionInputSchema`. `201`.

### `PATCH /home-sections/:id`

Staff. Body `homeSectionUpdateSchema`.

### `DELETE /home-sections/:id`

Admin. `204`.

## Orders

Payment is manual: the customer places the order, sends the order code on WhatsApp, pays by eSewa, Khalti or bank, and staff mark it paid.

**Pricing is always computed on the server.** The request carries only product ids, variant ids and quantities; any price, subtotal, discount or total the client sends is ignored.

- `unitPrice` = chosen variant price, or product `basePrice` if it has no variants
- `subtotal` = sum of `unitPrice × quantity`
- `discount` = coupon discount (percent is rounded down; a fixed amount is capped at the subtotal)
- `deliveryFee` = settings fee for the area, or `0` when `subtotal >= freeDeliveryThreshold` (checked before the discount)
- `total` = `subtotal − discount + deliveryFee`

**Order code**: `MOM-YYYY-####` (e.g. `MOM-2026-0001`), allocated atomically; the counter restarts each year. New orders start as `pending_payment`.

**Status transitions** (anything else returns `409`; `delivered` and `cancelled` are final):

| From              | Allowed next            |
| ----------------- | ----------------------- |
| `pending_payment` | `paid`, `cancelled`     |
| `paid`            | `printing`, `cancelled` |
| `printing`        | `shipped`, `cancelled`  |
| `shipped`         | `delivered`             |
| `delivered`       | none                    |
| `cancelled`       | none                    |

Cancelling gives the coupon use back.

### `POST /orders`

Public, orders rate limit. Body `createOrderInputSchema`:

```json
{
  "customer": {
    "name": "Sita Sharma",
    "phone": "9812345678",
    "address": "Baneshwor",
    "area": "inside_valley"
  },
  "items": [{ "productId": "…", "variantId": "…", "quantity": 2 }],
  "couponCode": "WELCOME10",
  "paymentMethod": "whatsapp",
  "note": "Please call before delivery",
  "photos": ["https://res.cloudinary.com/<cloud>/image/upload/v1/momento/orders/abc.jpg"]
}
```

`photos` (optional, max 30) are URLs from `POST /uploads/order-signature` uploads only; other hosts are rejected. `area` is `inside_valley` or `outside_valley`; `paymentMethod` is `whatsapp` (default), `esewa`, `khalti` or `bank`. Returns `201 { data: Order }` with `code`, priced `items` (title, image and variant label are snapshotted), `subtotal`, `deliveryFee`, `discount`, `total`, `status`. `400` for an inactive or unknown product, a missing or unknown variant, or an invalid, expired, exhausted or under-minimum coupon.

### `POST /orders/track`

Public, lookup rate limit. Body `{ code, phone }`. The phone must match the one on the order (last 10 digits compared). Returns status, item titles and quantities, totals and status history, with **no name, phone or address**. `404` for any mismatch, without saying which part was wrong.

### `GET /orders`

Staff. Query: `page`, `limit`, `status`, `q` (matches code, customer name or phone). Newest first. Includes customer details.

### `GET /orders/:id`

Staff. Full order including customer details and `statusHistory`.

### `PATCH /orders/:id/status`

Staff. Body `{ status, adminNotes? }`. Applies the transition table above atomically and appends to `statusHistory` with the actor's user id. `409` if the transition is not allowed.

### `PATCH /orders/:id/notes`

Staff. Body `{ adminNotes }` (up to 1000 characters; an empty string clears them). Changes the notes only: the status and its history stay as they are. The notes are never shown to the customer. `404` if the order does not exist.

## Reviews

Reviews start as `pending` and only show publicly once staff set them to `approved`. Submitted `status` or `verified` values are ignored.

### `GET /reviews`

Optional auth. Query: `page`, `limit`, `productId`, `serviceId`, `status` (staff only). The public always gets `approved` only, and never sees `verifiedOrderCode`. Staff see everything, with `?status=pending|approved|rejected` to filter.

### `POST /reviews`

Public, reviews rate limit. Body `reviewInputSchema`: exactly one of `productId` / `serviceId`, `name`, `rating` (1–5), `comment`, `title?`, `photos[]` (image URLs), and optionally `orderCode` + `orderPhone` (both or neither). If they match an order that contains the reviewed product, the review is stored with `verified: true`. Returns `201` with the created review (`status: "pending"`). `400` if the product or service does not exist.

### `PATCH /reviews/:id/status`

Staff. Body `{ status: "pending" | "approved" | "rejected" }`. Can also un-approve a review.

### `PATCH /reviews/:id/reply`

Staff. Body `{ reply }` (up to 1000 characters; an empty string removes the reply). The reply is public, and shows under the review only while the review is `approved`. `404` if the review does not exist.

### `DELETE /reviews/:id`

Admin. `204`.

## Customers

### `GET /customers`

Staff. Query: `page`, `limit`, `q` (matches name or phone). There is no customers collection: each row is worked out from the orders, one per phone number (last 10 digits), newest name and phone format winning. Row: `{ key, name, phone, orders, spent, firstOrderAt, lastOrderAt }`; `spent` leaves cancelled orders out. Newest customer activity first.

## Coupons

Fields (`couponInputSchema`): `code` (uppercased, 3–32 of `A-Z 0-9 _ -`), `type` (`percent` or `fixed`), `value` (percent max 100), `minOrderAmount?`, `expiresAt?`, `usageLimit?`, `isActive`. `usedCount` is maintained by the server.

### `POST /coupons/validate`

Public, lookup rate limit. Body `{ code, subtotal }`. Returns `{ data: { code, discount } }` without using the coupon. `404` if unknown, `400` if inactive, expired, exhausted or under the minimum. Use it for the cart preview; the real check happens again in `POST /orders`.

### `GET /coupons`

Admin. Query: `page`, `limit`.

### `GET /coupons/:id`

Admin.

### `POST /coupons`

Admin. Body `couponInputSchema`. `201`, `409` on duplicate code.

### `PATCH /coupons/:id`

Admin. Body `couponUpdateSchema`.

### `DELETE /coupons/:id`

Admin. `204`.

## Settings

A single document. Fields (`settingsInputSchema`): `shopWhatsappNumber` (digits with country code), `deliveryFees` (`insideValley`, `outsideValley`, `freeDeliveryThreshold?`), `socialLinks`, `paymentDetails` (`esewaId`, `khaltiId`, bank fields, `qrImage`), `seo` (`defaultTitle`, `defaultDescription`, `ogImage`). Created with defaults on first read.

### `GET /settings`

Public. Everything here is meant to be shown to customers (WhatsApp number, payment details for manual payment).

### `PUT /settings`

Admin. Body `settingsInputSchema` (full replacement). Returns the saved settings.

## Uploads

### `POST /uploads/signature`

Staff. Body `{ folder: "products" | "services" | "categories" | "reviews" | "site" }`. Returns `{ data: { cloudName, apiKey, timestamp, folder, signature } }`. The API secret never leaves the server.

The browser then uploads straight to Cloudinary:

```ts
const form = new FormData();
form.append("file", file);
form.append("api_key", apiKey);
form.append("timestamp", String(timestamp));
form.append("folder", folder); // "momento/<folder>", must match the signed value
form.append("signature", signature);
const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
  method: "POST",
  body: form,
});
const { secure_url } = await res.json(); // store this URL on the product, service, etc.
```

`503` when the `CLOUDINARY_*` variables are not set.

### `POST /uploads/order-signature`

Public, upload rate limit. No body. Same response as above plus `allowedFormats` (`jpg,jpeg,png,webp,heic`); the folder is always `momento/orders`. The client must also send `allowed_formats` with the returned value, because it is part of the signature. Put the returned `secure_url`s in `photos` on `POST /orders`.

---

## Environment variables

See `.env.example`. The API needs `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (32+ chars each in production), `CORS_ALLOWED_ORIGINS`, and `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` for uploads. Cookies use `COOKIE_DOMAIN` if set.

## Seeding

From the repo root:

```bash
pnpm --filter @momento/api seed:admin   # first admin only, from FIRST_ADMIN_NAME / FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD
pnpm --filter @momento/api seed         # admin + default settings + sample categories, products, services, home sections and reviews
```

Both are safe to re-run: existing records (matched by email or slug) are left alone. `seed` refuses to load sample data when `NODE_ENV=production` unless you pass `--allow-production`.

## Tests

```bash
pnpm --filter @momento/api test
```

Uses Vitest, Supertest and `mongodb-memory-server` (the first run downloads a `mongod` binary, about 600 MB, into the local cache).

## Phase 8: promotions

Each route below answers `404` while its feature flag is off (see `docs/features.md`).

### `POST /referrals/validate`

Public, rate limited. Flag `referrals`. Body `{ code }`. `200 { data: { code, discount } }` where `discount` is the
friend discount in NPR (`settings.referral.friendDiscount`, default 100). `400` if the code does not exist. It never
says whose code it is. The real checks (not your own code, once per phone) run when the order is placed.

### `POST /gift-cards/balance`

Public, rate limited. Flag `giftCards`. Body `{ code }`. `200 { data: { code, balance } }`. `404` for unknown and
switched-off cards alike, so codes cannot be probed.

### `GET /gift-cards`

Admin. Flag `giftCards`. Paginated list of cards with their balances.

### `POST /gift-cards`

Admin. Flag `giftCards`. Body `{ amount (min 100), code?, note? }`. Payment is manual, so an admin issues a card once
the customer has paid. The code is generated (`GC-XXXX-XXXX`) when left out. `201`; `409` if a chosen code exists.

### `PATCH /gift-cards/:id`

Admin. Flag `giftCards`. Body `{ isActive?, note? }`. A switched-off card cannot be used.

### Changes to existing routes

- `POST /orders` accepts `referralCode` (flag `referrals`) and `giftCardCode` (flag `giftCards`); with the flag off
  the field is refused with `400`. Order of use: coupon, then referral (both off the items), then delivery is added,
  then the gift card pays what is left up to its balance. Orders now also store `referralDiscount` and `giftCardApplied`.
- Cancelling an order returns the gift card money and frees the phone's referral use.
- Delivering an order issues the customer a referral code; delivering a referred friend's order gives whoever
  referred them a one-use `THANKS-` coupon (`settings.referral.referrerReward`, default 100, valid 180 days).
- `POST /orders/track` also returns `referralDiscount`, `giftCardApplied` and, with the `referrals` flag on and a code
  issued, `referral: { code, friendDiscount, rewards: [{ code, value }] }`.
- `PUT /settings` accepts `banner` (`{ text, href?, couponCode?, startsAt, endsAt }`, or `null` to remove it) and
  `referral` (`{ friendDiscount, referrerReward }`).

## Phase 8: notifications and exports

### `GET /orders/:id/whatsapp`

Staff. Flag `orderAlerts`. `200 { data: { customerReply, teamShare } }`: two `wa.me` links. `customerReply` opens a chat with the
customer with a message that fits the order's status. `teamShare` opens WhatsApp's contact picker with the order written out (code,
items, area, total; no phone number and no address) to forward to a printer or rider. `404` if the order does not exist.

### `GET /summary/daily`

Staff. Flag `dailySummary`. Query `day` (`YYYY-MM-DD`, a Nepal day; default today in Nepal). `200 { data }` with new orders and their
statuses, payments confirmed that day, top products, orders waiting for payment for over 24 hours (with reply links), reviews awaiting
approval, and delivered orders in the last 3 days that have not been asked for a review yet (with a prefilled WhatsApp message).
Sends nothing.

### `POST /internal/daily-summary`

Scheduler only. Flag `dailySummary`. Needs the `x-cron-secret` header to equal `CRON_SECRET`; a wrong or missing secret answers `404`,
exactly like an unknown route. Body `{ day?, dryRun? }`. Builds the summary and emails it through Resend, then marks the review requests
it listed (`reviewRequestSentAt`) so they are not repeated. `dryRun: true` returns the summary without sending or marking. `503` when
email is not configured, `502` when Resend fails (nothing is marked, so the next email offers the same requests again).

### `GET /orders/export.csv`

Admin only. Flag `csvExport`. Query `from`, `to` (Nepal days, inclusive), `status`. A UTF-8 CSV (with a byte-order mark for Excel), sent as
an attachment and never cached. One row per order: code, created, status, customer, phone, area, items, amounts, coupon, payment method.
No addresses. At most 100 000 rows (`X-Export-Truncated: true` if there were more). The download is written to the audit log.

### `GET /customers/export.csv`

Admin only. Flag `csvExport`. One row per phone number (last 10 digits): newest name, phone, order count, amount spent (cancelled orders
excluded), first and last order. Audited like the orders export.

### Changes to existing routes

- `POST /orders/track` items also return `productId` and `variantId` (only to someone holding the order code and phone), so "order again"
  can rebuild the cart.
- Spreadsheet cells that would run as a formula (starting `=`, `+`, `-`, `@`) are prefixed with an apostrophe in both CSV files.

## Admin panel

### `GET /stats/dashboard`

Staff, admin. Numbers for the admin dashboard, for Nepal days and months: today and this month (orders placed without cancelled
ones, payments confirmed and their revenue), orders waiting for payment right now, this month's orders by status (every status
present), top 5 products this month by quantity, and the count plus latest 5 reviews awaiting approval.
