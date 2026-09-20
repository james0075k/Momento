# Deploying Momento

```
GitHub (push to main)
  └─ CI/CD workflow ── checks ──► lint, types, unit tests, build, audit, Playwright end-to-end
                          │            (any failure stops here: nothing deploys)
                          ├─► deploy-api ──► Hostinger VPS: PM2 + nginx  (api.<your domain>)
                          └─► deploy-web ──► Vercel                       (<your domain>)
Pull request ── checks ──► Vercel preview (same-repo PRs only), URL posted as a comment
```

The web app talks to the API over HTTPS. Only the API talks to MongoDB Atlas and Cloudinary.
Payment is manual over WhatsApp, so there are no payment-provider keys to manage.

**Decision made for you:** the API deploys to Hostinger with PM2, not to Vercel serverless. The API
keeps its rate-limit counters in memory, hashes passwords with a native argon2 module, and holds a
MongoDB connection; a long-running process suits all three. See "API on Vercel instead" at the end
if you want to change that.

## 1. MongoDB Atlas

1. Create a cluster (region closest to your VPS) and a database user with **readWrite on the
   `momento` database only**.
2. Network Access: allow the **VPS's public IP** only. Add your own IP temporarily for the seeding
   step below, then remove it.
3. Copy the connection string and add the database name:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/momento`.
4. Backups: see section 8. The free (M0) tier does not include Atlas Cloud Backup, so use the
   `mongodump` job even if you upgrade later.

## 2. Cloudinary

Create a free account. You need the cloud name, API key and API secret (API only). Uploads are signed
by the API and limited to our folders.

## 3. Hostinger VPS (API)

Use a VPS plan (shared hosting cannot run Node with PM2). Ubuntu 22.04 or 24.04 assumed.

```bash
# as root, once
adduser --disabled-password --gecos "" deploy
mkdir -p /var/www/momento-api/{releases,shared} && chown -R deploy:deploy /var/www/momento-api
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable

# Node 22, pnpm 11 (the version in package.json), PM2, nginx, certbot, curl, rsync
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs nginx certbot python3-certbot-nginx rsync curl
npm install -g pm2 pnpm@11
```

**Deploy key.** On your laptop: `ssh-keygen -t ed25519 -f momento-deploy -C github-deploy -N ""`. Put
`momento-deploy.pub` in `/home/deploy/.ssh/authorized_keys` (mode 600). The private key goes into the
GitHub secret `HOSTINGER_SSH_KEY`. Get the server's host key for the `HOSTINGER_KNOWN_HOSTS` secret
from your own machine, and check the fingerprint against the one in hPanel:

```bash
ssh-keyscan -t ed25519 <server-ip>
```

**Production settings** go in `/var/www/momento-api/shared/.env` (mode 600, owner `deploy`). Generate
each secret with `openssl rand -base64 48`, and use **different** values for the two JWT secrets:

```ini
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<48+ random characters>
JWT_REFRESH_SECRET=<a different 48+ random characters>
COOKIE_DOMAIN=.yourdomain.com.np
CORS_ALLOWED_ORIGINS=https://yourdomain.com.np
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SHOP_WHATSAPP_NUMBER=97798XXXXXXXX
SENTRY_DSN=<from section 6>
# Optional: shows feature-flag changes immediately (see docs/features.md)
WEB_REVALIDATE_URL=https://yourdomain.com.np/api/revalidate
REVALIDATE_SECRET=<the same 16+ character value as in Vercel>
# Optional: keys the phone hash used by referral codes (defaults to JWT_ACCESS_SECRET). Do not change it once referrals are live.
REFERRAL_PEPPER=<48+ random characters>
# Optional: daily summary email (see docs/features.md)
SITE_URL=https://yourdomain.com.np
RESEND_API_KEY=re_...
SUMMARY_FROM_EMAIL=reports@yourdomain.com.np
SUMMARY_TO_EMAIL=owner@example.com
CRON_SECRET=<a random 32+ character value>
```

**nginx** (`/etc/nginx/sites-available/momento-api`, then link it, `nginx -t`, reload, and run
`certbot --nginx -d api.yourdomain.com.np`):

```nginx
server {
  server_name api.yourdomain.com.np;
  client_max_body_size 2m;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

The API trusts exactly one proxy hop (`trust proxy 1`), which matches this nginx. If you add
Cloudflare in front, change it to 2 in `apps/api/src/app.ts`, or all visitors will share one rate limit.

**PM2 on boot:** as `deploy`, run `pm2 startup` and run the command it prints as root. The first
deploy runs `pm2 save` for you.

**First admin account.** The server install is production-only, so seed from your laptop once. Put
your IP in Atlas Network Access, then:

```bash
MONGODB_URI='mongodb+srv://...' FIRST_ADMIN_NAME='Your Name' FIRST_ADMIN_EMAIL='you@example.com' \
FIRST_ADMIN_PASSWORD='<long password>' pnpm --filter @momento/api seed:admin
```

Never run the plain `seed` (sample products and reviews) against production.

## 4. Vercel (web)

1. Import the GitHub repo. **Root Directory: `apps/web`**, and turn on **"Include source files
   outside of the Root Directory"** (the web app uses `packages/shared`). Framework: Next.js.
2. **Stop Vercel deploying on its own**, or code would ship before the tests pass: Project Settings ->
   Git -> _Ignored Build Step_ -> `exit 0`, or disconnect the Git repository. GitHub Actions becomes the
   only way to deploy.
3. Environment variables (Production and Preview):

   | Name                                                                          | Value                                                                      |
   | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_API_URL`                                                         | `https://api.yourdomain.com.np` (the preview environment can use the same) |
   | `NEXT_PUBLIC_SITE_URL`                                                        | `https://yourdomain.com.np`                                                |
   | `NEXT_PUBLIC_SHOP_WHATSAPP_NUMBER`                                            | `97798XXXXXXXX`                                                            |
   | `GOOGLE_SITE_VERIFICATION`                                                    | token from Search Console (HTML tag method)                                |
   | `REVALIDATE_SECRET`                                                           | same value as on the API server (optional, see `docs/features.md`)         |
   | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | from section 6 (the token uploads source maps at build time)               |

4. Turn on **Analytics** in the project (Vercel Analytics is already in the code and switches on by itself on Vercel).
5. Get the IDs for GitHub: on your laptop run `pnpm dlx vercel link` in the repo root, then read
   `.vercel/project.json` (`orgId`, `projectId`). Create a token at vercel.com/account/tokens.
6. Add the custom domain in Vercel and follow its DNS instructions.

## 5. GitHub

**Secrets** (Settings -> Secrets and variables -> Actions):

| Secret                  | What                                           |
| ----------------------- | ---------------------------------------------- |
| `VERCEL_TOKEN`          | Vercel access token                            |
| `VERCEL_ORG_ID`         | `orgId` from `.vercel/project.json`            |
| `VERCEL_PROJECT_ID`     | `projectId` from `.vercel/project.json`        |
| `HOSTINGER_SSH_HOST`    | server IP or hostname                          |
| `HOSTINGER_SSH_USER`    | `deploy`                                       |
| `HOSTINGER_SSH_PORT`    | optional, default 22                           |
| `HOSTINGER_SSH_KEY`     | the private deploy key (whole file)            |
| `HOSTINGER_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 <server-ip>` |

**Variables:** `API_BASE_URL` (`https://api.yourdomain.com.np`), `SITE_URL`, and optionally
`API_APP_DIR` if you did not use `/var/www/momento-api`.

**Environment:** create an environment named `production` (Settings -> Environments). Adding
_required reviewers_ there makes every production deploy wait for your approval; leave it empty for
fully automatic deploys.

**Branch protection on `main`:** require a pull request and the status checks from the first CI/CD
run ("Checks / Lint, typecheck, ..." and "Checks / End-to-end (Playwright)"). Then a red test can not
be merged, and a merge to main only deploys after the checks pass again.

## 6. Sentry

Create two projects (Next.js and Node.js) and copy their DSNs into `NEXT_PUBLIC_SENTRY_DSN` (Vercel)
and `SENTRY_DSN` (server `.env`). Create an auth token (project: releases + source maps) for
`SENTRY_AUTH_TOKEN`. Under Alerts, email yourself on every new issue. Events are scrubbed of cookies,
headers, bodies and user details before they leave the app (`SECURITY.md`).

Test it after the first deploy: temporarily throw an error in a page, deploy, and check the issue
arrives with a readable stack trace.

## 7. Monitoring

- `.github/workflows/uptime.yml` calls `https://api.../health/ready` (which also checks MongoDB) and the
  storefront every 15 minutes; a failing run emails repo watchers. GitHub cron can run a few minutes late.
- Also add a free monitor at UptimeRobot or Better Stack for `https://api.../health/ready` (1 to 5
  minute interval, alert by email/SMS). `/health` only says the process is up; `/health/ready` is the
  one that turns red when the database is unreachable.
- On the server: `pm2 status`, `pm2 logs momento-api`. Logs are JSON (pino) with personal data redacted.

## 8. MongoDB backups

The free Atlas tier (M0) has no Cloud Backup, so use `deploy/backup-mongo.sh`:

```bash
# on the VPS, as deploy; install the MongoDB Database Tools first (mongodump)
crontab -e
30 2 * * *  MONGODB_URI='mongodb+srv://...' BACKUP_DIR=/var/backups/momento bash /var/www/momento-api/current/deploy/backup-mongo.sh >> /var/log/momento-backup.log 2>&1
```

It keeps 14 days on the server. **Also copy the folder off the server** (for example nightly
`rclone`/`rsync` to another machine or cloud storage): a backup on the same disk is lost with the disk.
Restore into an empty database (never over live data without a second look):

```bash
mongorestore --uri='mongodb+srv://...' --gzip --archive=/var/backups/momento/momento-<date>.archive.gz \
  --nsFrom='momento.*' --nsTo='momento_restore.*'
```

Check the data in `momento_restore`, then copy what you need or swap the URI. Do a restore drill
every quarter; a backup you have never restored is a guess. If you move to a paid Atlas tier
(M10+), turn on Cloud Backup as well.

### Off-server copy

Set `OFFSITE_DEST` in the cron line and the backup script copies each file with `rclone` right after the dump (set the remote up
once with `rclone config`; Google Drive, Backblaze B2, S3 or another VPS all work). If the copy fails, the script exits with an
error, so the log shows it.

```bash
30 2 * * *  MONGODB_URI='...' OFFSITE_DEST='remote:momento-backups' BACKUP_DIR=/var/backups/momento bash .../backup-mongo.sh >> /var/log/momento-backup.log 2>&1
```

What a database backup does **not** hold: the pictures. Product images and customers' uploaded photos live in Cloudinary (the
database keeps only their links), so they are protected by Cloudinary, not by this backup. Secrets (`.env`) are not in it either:
keep them in a password manager.

### Restoring with the script

`deploy/restore-mongo.sh` wraps the command above. It restores into a new `momento_restore` database by default, and refuses to
overwrite the live one unless you also set `I_UNDERSTAND_THIS_OVERWRITES=yes`.

```bash
TARGET_URI='mongodb+srv://...' ARCHIVE=/var/backups/momento/momento-<date>.archive.gz bash deploy/restore-mongo.sh
```

### Moving the database (new cluster, new provider, new region)

`deploy/transfer-mongo.sh` streams the database from the old place to the new one without writing a file:

```bash
SOURCE_URI='mongodb+srv://old...' TARGET_URI='mongodb+srv://new...' bash deploy/transfer-mongo.sh
```

1. Create the new database and allow the VPS's IP address in its network access list.
2. Run the transfer once as a rehearsal, and check that the counts match on both sides (orders, products, reviews, users).
3. Pick a quiet moment (orders placed after the copy would be missing), stop the API (`pm2 stop momento-api`), run the transfer
   again into an empty target, and compare the counts once more.
4. Change `MONGODB_URI` in the shared `.env`, then `pm2 start momento-api` (or `pm2 restart momento-api --update-env`).
   `/health/ready` must answer `ok`.
5. Keep the old database untouched for a week before deleting it.

Both databases must run a compatible MongoDB version (the new one may be the same or newer, not older).
The indexes come across with the data, and the API also creates any that are missing when it starts.

## Many shoppers at once

- The API keeps at most 20 database connections and gives up on a stuck database after 5 seconds, so a slow database shows a
  clear error instead of freezing the shop. If the database is down when the API starts, it retries every 10 seconds by itself.
- Orders, coupons and gift cards are claimed with atomic updates: 100 orders placed at the same moment produced no duplicate order
  codes and never went past a coupon's use limit (this is tested).
- Rate limits are counted in the API's memory, which is why PM2 runs **one** instance. A restart resets the counters, and
  going to several instances needs a shared store (Redis) first.
- The admin lists are paged (at most 100 rows) and use indexes. With 30,000 orders the orders list answers in about 30 ms, the
  dashboard in about 130 ms and the customers list in about 170 ms on a laptop. The customers list reads every order each time,
  so its time grows with the number of orders; if it passes about a second (roughly 200,000 orders), keep a customers collection
  updated as orders arrive instead.
- Searching orders by text scans the orders. That is fine for tens of thousands of orders; beyond that, search by order code only.

## 9. How a deploy works

1. You merge to `main`.
2. `Checks` runs (lint, typecheck, format, unit tests, build, `pnpm audit`) and `End-to-end` runs
   Playwright against a throwaway database, the API and a production build of the web app. **If either
   fails, no deploy job starts.**
3. `deploy-api`: builds the API, uploads a new folder `releases/<commit>` over SSH, installs production
   dependencies, points `current` at it, restarts PM2 and polls `/health/ready` for 40 seconds. If the
   API does not come up healthy, it **switches back to the previous release by itself** and the job fails.
4. `deploy-web` (after the API, so a new site never runs against an older API): builds and deploys to Vercel.
5. Pull requests get a Vercel preview URL as a comment, after the checks pass.

The five newest releases are kept on the server. Database changes are not part of a deploy, so keep
schema changes backward compatible (add fields; do not rename or remove them in the same release).

## 10. Rollback

**API.** Actions -> _Roll back API_ -> Run workflow. Leave the release empty for the previous one, or
give a 12-character commit id (`ls /var/www/momento-api/releases` on the server). Or by hand:

```bash
ssh deploy@server
APP_DIR=/var/www/momento-api bash /var/www/momento-api/current/deploy/rollback.sh          # previous
APP_DIR=/var/www/momento-api bash /var/www/momento-api/current/deploy/rollback.sh <id>      # specific
```

**Web.** Vercel dashboard -> Deployments -> pick the last good deployment -> _Promote to Production_
(instant, no rebuild), or `pnpm dlx vercel rollback <deployment-url>`. Then revert the bad commit on
`main` so the next deploy does not bring it back.

**Data.** Restore from a backup as in section 8.

Order after a bad release: roll back first, investigate second.

## 11. Before you go live

- [ ] **Rotate the leaked secrets.** Earlier commits of `.env.example` contained a MongoDB Atlas
      password and JWT secrets. Change the Atlas database password, generate two new different JWT secrets,
      and never reuse the old ones. Consider the old values public.
- [ ] `.env.example` holds names only (no real values), and `.env` is not committed.
- [ ] `NODE_ENV=production`, `COOKIE_DOMAIN` and `CORS_ALLOWED_ORIGINS` set; web and API on the same parent domain.
- [ ] Atlas network access limited to the VPS; your own IP removed.
- [ ] First admin created and the password stored in a password manager. Do not seed sample data.
- [ ] Settings in the database (WhatsApp number, delivery fees, payment details) filled in by the admin.
- [ ] `NEXT_PUBLIC_SITE_URL` is the real domain; `/sitemap.xml` shows real product URLs; Search Console verified and the sitemap submitted.
- [ ] Sentry receives a test error; the uptime monitor is red-tested (stop the API briefly and see the alert).
- [ ] A backup ran, was copied off the server, and was restored once.
- [ ] Branch protection on `main` requires the CI checks.
- [ ] Vercel no longer deploys on its own (section 4, step 2).

## Alternative: API on Vercel instead

Not set up. It is possible (export the Express app from an `api/index.ts` function, keep
`vercel.json` rewrites to it), but before doing so:

1. The rate limiter needs a shared store (for example Upstash Redis), or limits reset on every cold start and split across instances.
2. Reuse the MongoDB connection across invocations (cache it on `globalThis`) and use Atlas's "allow from anywhere" or a paid tier with private networking, since Vercel has no fixed IP.
3. argon2 is a native module; it works on Vercel's Node runtime but adds cold-start time to logins.
4. Cookies need a shared parent domain, as above.
