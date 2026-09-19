# Momento

You are building "Momento", a Nepal-based photo book, photo frame and photo print e-commerce website, with a Popsa-like feel (warm, fast, animated, trust-focused) but its own visual identity. Do not copy Popsa's images, text or exact layout.

Stack: pnpm monorepo. `apps/web` = Next.js 15 App Router + TypeScript + Tailwind v4 + shadcn/ui + Motion (import from `motion/react`) + Lenis. `apps/api` = Node.js + Express + TypeScript + Mongoose (MongoDB Atlas). `packages/shared` = Zod schemas and types used by both.

## Rules

1. **Colours**: use ONLY the brand tokens in `apps/web/src/styles/tokens.css`: `--brand` #D7263D, `--ink` #1B2A4E, `--accent` #F4A300, `--paper` #FBF7F2, `--surface` #FFFFFF, `--muted` #5B6478, `--success` #1F9D6B. No random hex values anywhere else.
2. **Security (CIA)**: validate every input with Zod, hash passwords with argon2, httpOnly+Secure+SameSite cookies, helmet, CORS allow-list, rate limits, mongo-sanitize, server-side price calculation, never log personal data, secrets only via env vars.
3. **Animation**: only `transform` and `opacity`, respect `prefers-reduced-motion`, keep Lighthouse mobile performance at 90+.
4. **Mobile-first and fully responsive**: design at 360px first, then scale up to 768, 1024 and 1440; touch targets at least 44px; no horizontal scroll; thumb-friendly sticky WhatsApp bar; the admin panel must also work on a phone. Accessibility: semantic HTML, alt text, keyboard focus states, WCAG AA contrast.
5. **Code quality**: strict TypeScript, no `any`, small components, reusable hooks, ESLint and Prettier clean.
6. **Payment is manual**: the customer sends the order over WhatsApp using a `wa.me` link with a prefilled message; the admin marks it paid.
7. **Currency is NPR**. Dates may later show Bikram Sambat.
8. Before finishing each phase: run lint, typecheck, tests and build; fix failures; then summarise what changed and how to run it.

Work only on the current phase. Ask before changing decisions made in earlier phases.

See `.claude/skills/momento-builder/SKILL.md` for the full build plan, phase prompts and acceptance checks.

## Commands

- `pnpm dev` — run apps/web and apps/api together
- `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` — run across the whole workspace
