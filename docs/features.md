# Feature flags (Phase 8)

Every Phase 8 extra sits behind a flag in Settings. **Off is the default, and off means the site behaves
exactly as it did before the feature existed:** no UI, no requests, no page, and the API routes answer
`404` like an unknown route.

| Flag                | What it turns on                                                          | Slice |
| ------------------- | ------------------------------------------------------------------------- | ----- |
| `wishlist`          | Heart on product cards and pages, header link, `/wishlist`                | 1     |
| `recentlyViewed`    | "Recently viewed" on product and cart pages                               | 1     |
| `alsoBought`        | "Customers also bought" on product pages, `GET /products/:id/also-bought` | 1     |
| `share`             | WhatsApp, Facebook and copy-link buttons on products and blog posts       | 1     |
| `festivalBanner`    | Festival banner with countdown and coupon link                            | 2     |
| `referrals`         | Referral codes at checkout and on the tracking page                       | 2     |
| `giftCards`         | Gift cards at checkout, `/gift-cards` page, admin issuing                 | 2     |
| `orderAgain`        | "Order again" on order tracking                                           | 3     |
| `csvExport`         | Orders and customers CSV downloads (admin)                                | 3     |
| `orderAlerts`       | WhatsApp click-to-chat links for staff (`GET /orders/:id/whatsapp`)       | 3     |
| `dailySummary`      | Daily summary email (Resend)                                              | 3     |
| `nepali`            | Nepali language (`/ne`)                                                   | 4     |
| `bikramSambatDates` | Bikram Sambat dates                                                       | 4     |
| `photoEditor`       | Browser photo-layout editor                                               | 5     |

Slices 1 to 3 are built. Slices 4 and 5 are planned; their flags exist already and do nothing until the slice is built.

## Switching a flag

Until the admin panel exists (Phase 5), use either of these:

```bash
# CLI, on any machine that can reach the database (uses MONGODB_URI from .env)
pnpm --filter @momento/api flags list
pnpm --filter @momento/api flags set wishlist on

# or the API, as an admin (send only the flags you want to change)
PUT /settings   { ...current settings, "features": { "wishlist": true } }
```

Flags not named in an update keep their value. `GET /settings` always returns every flag as `true` or `false`.

## Seeing a change immediately

The web app caches settings for 60 seconds. To show a flag change at once, set the same secret in both apps:

| App | Variable                                                                        |
| --- | ------------------------------------------------------------------------------- |
| API | `WEB_REVALIDATE_URL` (`https://yourdomain/api/revalidate`), `REVALIDATE_SECRET` |
| Web | `REVALIDATE_SECRET` (same value, 16 or more characters)                         |

Without them everything still works; a change simply appears within a minute.

## Where the flags are read

- Server pages: `featureEnabled("wishlist")` in `apps/web/src/lib/catalog.ts` (for example `/wishlist` returns 404 when off).
- Client components: `useFeature("wishlist")` from `components/features/features-provider.tsx`, fed once by the root layout.
- API routes: `requireFeature("alsoBought")` in `apps/api/src/middleware/feature.ts`.

A flag that cannot be read (API down) counts as off.

## Data kept in the browser

The wishlist and recently viewed lists are stored in the visitor's own browser (`localStorage`, keys
`momento.wishlist.v1` and `momento.recent.v1`). There are no accounts and nothing is sent to the server except
the product ids needed to fetch the products (`GET /products?ids=...`).

## Promotions (slice 2)

**Festival banner** (`festivalBanner`). Set `banner` in Settings: `{ text, href?, couponCode?, startsAt, endsAt }`
(`PUT /settings`; send `banner: null` to remove it). It shows only between the two dates, as a slim bar above the header
with a countdown. Following it carries `couponCode` to checkout, where it is applied automatically. The same works for any
link ending `/checkout?coupon=CODE`. Visitors can dismiss it for the visit. `href` must be a site path or an https link.

**Gift cards** (`giftCards`). Payment is manual, so an admin issues a card once the customer has paid:
`POST /gift-cards { amount, note? }` returns a code like `GC-K7Q2-XF9M`. At checkout the card pays for the order,
delivery included, up to its balance; a partly used card keeps the rest. Cancelling an order puts the money back (never above
what was issued). `/gift-cards` explains how to buy one on WhatsApp and lets anyone check a balance.

**Referral codes** (`referrals`). A customer gets a code (like `MOM-K7Q2XF`) when one of their orders is delivered; it is
shown on the tracking page with a WhatsApp share link. A friend enters it at checkout for `friendDiscount` off their first
order. When the friend's order is delivered, the referrer gets a one-use coupon worth `referrerReward`, valid 180 days, shown on
their tracking page. Amounts live in Settings (`referral: { friendDiscount, referrerReward }`, both default to NPR 100).
Rules enforced by the server: not your own code (matched by phone, whatever its formatting), one referral discount per phone
(freed if that order is cancelled), and one reward per delivered order. Phone numbers are matched through a keyed hash
(`REFERRAL_PEPPER`, falling back to `JWT_ACCESS_SECRET`), never stored a second time.

**Order of use at checkout:** coupon, then referral (both come off the items and never below zero), then delivery is added,
then the gift card pays what is left. The server recomputes all of it; the page only previews.

Nothing here can be switched on by an order field alone: with a flag off, `POST /orders` refuses `referralCode` or
`giftCardCode` with a 400, and the routes answer 404.

## Notifications and admin tools (slice 3)

**Order alerts** (`orderAlerts`). WhatsApp cannot send a message on its own without the paid Business API, so these are links a
person taps. `GET /orders/:id/whatsapp` returns `customerReply` (opens a chat with the customer, with a message that fits the order
status) and `teamShare` (opens the contact picker with the order written out, for a printer or rider; it holds no phone number and no
address).

**Daily summary email** (`dailySummary`). Every evening (19:30 Nepal time, `.github/workflows/daily-summary.yml`) the API emails the
owner through Resend: new orders and their statuses, payments confirmed that day, top products, orders waiting for payment for over a
day (with a WhatsApp reminder link each), reviews awaiting approval, and orders delivered in the last 3 days with a ready WhatsApp
message asking for a review (each order is offered once, marked only after the email really went out). "Today" means the Nepal day.
`GET /summary/daily?day=YYYY-MM-DD` shows the same data as JSON for staff. To try it without sending, call the internal route with
`{"dryRun": true}`.

Setup: create a Resend account, add and verify your sending domain (the SPF and DKIM records Resend shows you), then set on the API
server `RESEND_API_KEY`, `SUMMARY_FROM_EMAIL` (an address on that domain), `SUMMARY_TO_EMAIL` (comma-separated) and `CRON_SECRET`;
add the same `CRON_SECRET` as a GitHub secret and `API_BASE_URL` as a GitHub variable. Then turn the flag on. Without the settings
the route answers 503 and the workflow run fails, so a missing setup is visible.

**Order again** (`orderAgain`). On the tracking page, a button puts the items of that order back in the cart at today's prices.
Products or sizes that no longer exist are skipped and listed.

**CSV export** (`csvExport`, admin only). `GET /orders/export.csv?from&to&status` and `GET /customers/export.csv` download UTF-8 files
that open correctly in Excel. They contain names and phone numbers but no addresses, are never cached, are capped at 100 000 rows,
and each download is written to the audit log. Cells that a spreadsheet could run as a formula are neutralised.
