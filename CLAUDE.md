# CLAUDE.md — portfolio-yuens-me

Single-page "live résumé" SPA for Sunny Yuen. Product + architecture detail is in
`README.md`; this file is the durable working agreement for the repo.

## Deploy topology

- **Frontend:** Vite + React + TS SPA. A tiny Hono server (`server/index.ts`) serves the
  build and proxies the auth-gated `/resume` (holds the API key server-side).
- **Backend:** consumed from `https://agent.yuens.me` (sibling public repo `resume-agent`).
  Public, browser-direct: `/info`, `/query`, `/match`. Gated: `/resume` (via `/api/resume` proxy).
- **Prod (the only cloud env):** Railway service **`web`** → **auto-deploys on merge to
  `main`**. Canonical host **`www.yuens.me`** (apex `yuens.me` 301→www via GoDaddy forwarding).
- **No staging service** — previews are **local** (a 24/7 cloud preview isn't worth the
  compute cost for a solo human-doing-local-dev workflow).

## Dev workflow — local-first; never push experimental work to `main` (it is prod)

1. **Branch** off `main`: `git checkout -b <type>/<scope>-<desc>`.
2. **Run locally:** `npm run dev` → http://localhost:5000 (Vite HMR + the `/api` proxy).
   Append `?instant=1` to skip the typewriter/entrance animations. Iterate here — this is
   the review surface, not a cloud deploy. For a production-like single-process check,
   `npm run build && npm start` (serves `dist/` + `/api` on one port).
3. **Verify locally**, including a **narrow viewport** for mobile (a real mobile regression —
   overflow + double-scrollbar — was caught this way; always check ≤390px). In a Claude-in-Chrome
   session, `resize_window` may report success but not actually shrink the OS window (observed
   stuck at the display's full resolution, e.g. 2560px, on 2026-07-11) — confirm with
   `window.innerWidth` after resizing before trusting a narrow-viewport screenshot. If it's
   stuck, don't fight it: when the change reuses an existing component/CSS class with no new
   styles, reasoning from that reuse is sufficient; otherwise flag the viewport as unverified
   rather than faking a check.
4. **Ship via `/commit`:** opens a PR → `main`, waits for Copilot review, addresses comments,
   resolves threads, squash-merges → prod auto-deploys. `/commit` also bumps the patch
   version and prepends `CHANGELOG.md`.

## Env vars

- Client (build-time, **public**, inlined by Vite): `VITE_API_BASE=https://agent.yuens.me`,
  `VITE_SITE_URL=https://www.yuens.me`.
- Server (runtime, **secret**): `RESUME_AGENT_API_KEY` (= resume-agent `API_KEY`),
  `RESUME_API_BASE`, `PORT`.
- Set on the `web` Railway service (the only cloud env). Never commit secrets; the
  client bundle must never contain the key.

## Conventions

- **Design system:** `src/styles.css` — ported tokens + the `.richtext` prose scope.
  Agent answers render via `react-markdown` + `remark-gfm` inside `.richtext`;
  `sanitizeAnswer` strips the backend's inline `[n]` citations + `Sources:` block.
- **Backend is consumed as-is.** Changes that belong to the data model or API (e.g. the
  project `cover` field, `jd_term_count`) are handed off to the `resume-agent` repo —
  mind downstream/public consumers. Frontend reads new fields once they ship.
- **Verify a claimed-shipped backend contract before implementing against it** — "the
  linked resume-agent issue is closed" is not the same as "the exact field/behavior this
  frontend change needs actually landed." Check the sibling repo directly: `gh issue view`
  / `gh pr view --json body` for the merged PR's description, and read the real type
  definition (`src/types.ts`) or route handler, not just the issue title. A resume-agent
  issue has stayed open past the PR that implements its "next step," and a PR can ship
  adjacent work while leaving the specific frontend-facing signal for a later PR — both
  happened during the resume-agent-web#26 fit-chip work (2026-07-11).
- **Project covers:** `/info` → `project.cover` (Supabase Storage bucket `project-covers`,
  same Supabase project as the profile + OB1).
- **Scratch files:** name them `.*.txt` (gitignored). Don't commit scratch output.
