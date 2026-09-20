# End-to-end tests (Playwright)

```bash
pnpm --filter @momento/e2e e2e:install   # once: downloads Chromium
pnpm --filter @momento/e2e e2e           # runs everything
pnpm --filter @momento/e2e e2e:ui        # Playwright's interactive runner
```

One command starts everything it needs, on ports that do not clash with `pnpm dev`:

| Piece                                 | Port  | Notes                                                   |
| ------------------------------------- | ----- | ------------------------------------------------------- |
| Throwaway MongoDB (in memory)         | 27117 | Fresh every run, nothing to clean up                    |
| API, seeded with the sample catalogue | 4100  | Test-only secrets, first admin `e2e-admin@example.com`  |
| Web app, production build             | 3200  | Builds into `apps/web/.next-e2e`, so `pnpm dev` is safe |

The first run builds the web app (about two minutes) and downloads a MongoDB binary. In CI the same
command runs as the `End-to-end` job and blocks the deploy if it fails.

## What is covered

- `storefront.spec.ts` (desktop and phone): browse, add to cart, checkout, order confirmation with the
  `wa.me` link and message, order tracking, wrong-phone tracking, security headers, no CSP violations,
  `noindex` on private pages, sitemap and robots.
- `admin.spec.ts`: admin login and cookie flags, CSRF refusal, create a product, customer review stays
  hidden until an admin approves it, anonymous access refused, database readiness.

The admin panel UI does not exist yet (Phase 5), so the admin tests drive the API the panel will call.
There is a `test.fixme` marking the browser version to write once `/admin` exists.

## Tips

- Clicks on a freshly loaded page can land before React has hydrated. Use the `hydrated()` helper in
  `storefront.spec.ts` before clicking buttons that rely on JavaScript.
- A failing run leaves a trace: `pnpm exec playwright show-trace test-results/<folder>/trace.zip`.
