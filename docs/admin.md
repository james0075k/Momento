# Admin panel

Open <http://localhost:3000/admin> (or `https://your-domain/admin`). With `pnpm dev:local` the first admin is
`admin@momento.test` with the password in `.env` (`FIRST_ADMIN_PASSWORD`, default `Admin-Pass-2026!`).

## What is built so far

| Screen    | Who          | What it does                                                                                                       |
| --------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| Sign in   | anyone       | Email and password. Wrong details show one clear message; too many tries show a wait message.                      |
| Dashboard | staff, admin | Orders and revenue for today and this month, waiting payments, orders by status, top products, reviews to approve. |

| Orders | staff, admin | Search by code, name or phone and filter by status. Open an order for its items, totals, customer, photos and note; move it forward with one button (Mark as paid, Start printing, Mark as shipped, Mark as delivered) or cancel it after a confirmation; write notes for the team; print a delivery slip; and reply or share on WhatsApp. |
| Reviews | staff, admin | Reviews wait here until approved. Approve, reject or move a review back to waiting, write a public reply that shows under the review on the product page, and (admins only) delete. |
| Customers | staff, admin | Worked out from orders, one row per phone number: orders, amount spent (cancelled orders left out), first and last order, and a link to their orders. |
| Products | staff, admin | Search and filter (category, visible or hidden); create and edit with rich-text description, images, sizes with their own prices, highlights, occasions, specs, questions and answers, search-result text. Only admins delete. |
| Services | staff, admin | Same idea, plus "show on the home page" and a position. |
| Categories | staff, admin | Name, image, position, visible or hidden. Only admins delete. |
| Home page | staff, admin | Move sections up or down, show or hide them, edit their headings, and choose which products, services or reviews they show. |
| Coupons | admin | Percent or fixed amount, minimum order, last day (Nepal time), how many times it can be used. |
| Gift cards | admin | Issue a card after the customer has paid, copy the code, switch a card on or off. Needs the "Gift cards" feature to be on. |

More screens (settings, feature switches, team, audit log) are added milestone by milestone.
Days and months on the dashboard are **Nepal time** (a day starts at 00:00 in Nepal).

## Roles

- **admin**: everything.
- **staff**: day-to-day work (products, services, orders, reviews, customers). Staff cannot change settings, feature flags,
  the team, coupons, gift cards or categories, and cannot delete or export. The menu hides those, and the API refuses them anyway.

## How sign-in works

- Signing in sets two httpOnly cookies from the API: a 15-minute access cookie and a 7-day refresh cookie. The page never sees them.
- When the access cookie runs out, the panel renews it quietly and repeats the request once. If renewing fails, you land on the
  sign-in page and come back to where you were after signing in (only to pages inside `/admin`).
- The panel itself is a page in the website, but **the API is what protects the data**: every request is checked there, whatever
  the screen shows.
- Every admin page is marked `noindex` and `/admin` is disallowed in `robots.txt`.
- In production the website and the API must share a parent domain (for example `momento.com.np` and `api.momento.com.np`), or
  browsers may drop the sign-in cookies (see `SECURITY.md`).

## On a phone

The sidebar becomes a menu button that opens a full-screen menu. Buttons and fields are at least 44 px tall.

## Changes show on the website straight away

When you save a product, service, category, home-page section or review decision, the API tells the website to refresh
what it remembered for that item, so the change appears within a moment instead of after a minute. If the website cannot
be reached at that moment it catches up within 60 seconds anyway. This needs `WEB_REVALIDATE_URL` and `REVALIDATE_SECRET`
(see `docs/features.md`).

## Images

Upload from your computer (goes straight to Cloudinary, so Cloudinary must be set up), or paste an image link from Cloudinary.
Other websites' links are refused, because the shop only shows images from Cloudinary. The first image is the cover; use
Earlier and Later to change the order.

## Descriptions

The description boxes are a small editor: bold, italic, headings, lists and links. The shop cleans the result again before
showing it, so nothing unsafe can get through.

## Orders: notes, slip and WhatsApp

- **Status buttons** only offer what is allowed next. If a colleague changed the order first, you get a message and the page shows the
  current status. A cancelled or delivered order is finished.
- **Notes for the team** are saved on their own, without changing the status, and are never shown to the customer.
- **Print slip** opens a page laid out for paper (name, phone, address, items, note, total). Use the Print button, or your
  browser's print; the menu and buttons do not print. The slip holds the address, so keep printed slips with the parcel.
- **WhatsApp** (needs the "Order alerts" feature to be on): _Reply to customer_ opens a chat with a message that fits the current
  status; _Share with team_ writes the order out to forward to a printer or rider, without the phone number or the address.

## Reviews: replying

A reply is public: it shows as "Reply from Momento" under the review on the product page, but only while the review is approved.
Saving an empty reply removes it. Approving, rejecting and replying refresh the product page within a moment.
