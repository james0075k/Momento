# Search visibility (Phase 6)

## Where things live

| What                                       | File                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Site URL, delivery promises, business info | `apps/web/src/lib/site.ts`                                                         |
| Title, canonical, Open Graph, Twitter      | `apps/web/src/lib/seo.ts` (`buildMetadata`)                                        |
| JSON-LD builders                           | `apps/web/src/lib/jsonld.ts`, rendered by `components/seo/json-ld.tsx`             |
| 40 to 60 word answers                      | `apps/web/src/lib/answers.ts` (products, services)                                 |
| Sitemap, robots, llms.txt, OG image        | `apps/web/src/app/{sitemap,robots}.ts`, `llms.txt/route.ts`, `opengraph-image.tsx` |
| Blog posts                                 | `apps/web/src/content/blog.ts`                                                     |
| Occasion landing pages                     | `apps/web/src/config/occasions.ts`, rendered by `/occasions/[slug]`                |
| Site-wide FAQ and ordering steps           | `apps/web/src/content/faq.ts`                                                      |

## Add a blog post

Add an object to `BLOG_POSTS` in `content/blog.ts`. Keep `answer` to 40 to 60 words and `description` to about 160
characters. Use `[text](/path)` for internal links. `pnpm --filter @momento/web test` checks answer length and that
every internal link points at a real route.

## Environment variables

- `NEXT_PUBLIC_SITE_URL`: the public origin. Canonicals, the sitemap and structured data all use it, so set it in production.
- `GOOGLE_SITE_VERIFICATION`: the token from Google Search Console's HTML tag method.
- `NEXT_PUBLIC_BUSINESS_*`: optional LocalBusiness street, email and opening hours.
- Vercel Analytics renders only when `VERCEL=1`, which Vercel sets. Turn it on in the project's Analytics tab.

## Checking it

1. `pnpm build && pnpm --filter @momento/web start`, with the API running and seeded.
2. Open `/sitemap.xml`, `/robots.txt` and `/llms.txt`.
3. Paste a live page URL into <https://search.google.com/test/rich-results> (Product, Breadcrumb, FAQ) and
   <https://validator.schema.org/> for everything else. Localhost URLs cannot be tested there, so use a preview deployment.
4. Lighthouse: `npx lighthouse <url> --only-categories=seo,performance`.

Note: Google no longer shows HowTo rich results and limits FAQ rich results to a few authoritative sites. The markup
is still valid and helps other search and answer engines read the pages.
