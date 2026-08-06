# A résumé you can talk to

An open web front for [`resume-agent`](https://github.com/yuens1002/resume-agent): a calm,
single-page conversation thread where a visitor asks questions in plain language, scores a
job's fit, and generates a tailored résumé — and where an LLM or agent can read the whole
profile straight from the page. The reference instance runs at **[yuens.me](https://www.yuens.me)**.

Nothing here hardcodes a person. The site **queries** a profile (`/info`) and renders it;
point it at your own `resume-agent` and it's your site.

> **The other half — the truth layer.** This is just the *front*. The profile data, the
> query/agent API, and the honesty contract live in
> [`resume-agent`](https://github.com/yuens1002/resume-agent) — also open source, and a simple,
> vanilla backend you can stand up as-is. This portfolio works with it **from day one**: build
> your truth there, and this surfaces it to humans and machines. Two repos, one queryable you.

## Why this exists

> I built this for myself — a résumé I could keep *honest*. A résumé is usually the most
> static, hand-tuned, slightly-dishonest document a person owns, and it goes stale the day
> you stop editing it. I wanted the opposite: a profile that's queryable, versioned, and
> stays true to itself without manual tuning — one an AI can read fairly, because AI is
> increasingly the first reader.
>
> Building it for myself is what made it open. None of it hardcodes *me*; the engineering is
> the same for anyone. So if it's useful, take it. If a few people get seen a little more
> fairly because of it, that's the difference, and it compounds past me.
>
> The engineering *is* the portfolio — it doesn't describe how I work, it demonstrates it,
> live, to anyone (human or model) who looks.
>
> *(— draft, distilled from the build conversation. Edit it to your truth.)*

## Lineage

The grandfather of this idea is **[OB1 / Open Brain](https://github.com/NateBJones-Projects/OB1)**
by Nate B. Jones — infrastructure for *your* thinking: one database, one AI gateway, one
channel, any AI plugs in. It's **inward** by design — a private place to reason, with no
outward reach. It never tries to speak those thoughts in public, or to let your actions be
the thing others trust. That's its honest scope.

The **outward** half is what [`resume-agent`](https://github.com/yuens1002/resume-agent) and
this front add: they take the introspection layer and give it a **witness** — a queryable,
public record. Because a truth kept to yourself is only half a truth; it has no outside
witness to validate it. Publishing it, and letting humans and machines query it, is what makes
it true. *Trust by action, in the open.* The grandfather gave the mind a place to think; this
gives it a place to be seen.

## Architecture

```
Browser ── direct ──▶ agent.yuens.me   /info  /query  /match        (public)
Browser ── /api/resume ──▶ this server ── Bearer key ──▶ agent.yuens.me/resume (SSE)
LLM / crawler ──▶ this server  →  JSON-LD · <noscript> profile · /llms.txt · /robots.txt
```

- **Human surface:** a React + Vite SPA. `/info` → profile, `/query` → answers, `/match` →
  fit score, called straight from the browser (CORS-open). `/resume` is key-gated, so the
  tiny Hono server (`server/index.ts`) proxies it with `RESUME_AGENT_API_KEY` server-side —
  the key never ships to the client.
- **Machine surface:** the server makes the site self-describing for non-JS consumers —
  `schema.org/Person` JSON-LD, a crawlable `<noscript>` profile, discovery links, real
  `/robots.txt` + `/llms.txt`, and `/.well-known/agent-card.json` → backend. All derived
  from the live `/info` (cached, refreshed every 10 min) — see `server/machine-surface.ts`.
- **Crawlable pages:** the SPA has no client-side router, so `/projects`, `/projects/:slug`,
  `/observations` and `/observations/:id` are real standalone documents — the built shell
  with the React bundle dropped and content server-rendered in, each with its own title,
  description and self-canonical. Project pages come from `/info`. Observation pages are
  **opt-in only** — see below. `/sitemap.xml` is generated from exactly what is published.

### What gets a URL — the publish allowlist

**Only an observation tagged with the `publish` topic is rendered as a page or listed in
`/sitemap.xml`.** An untagged note has no URL, and `/observations/:id` returns `404` for it.

This is an allowlist on purpose. `authored: true` (resume-agent#222) answers *"did a human
write this"* — it does not answer *"was this written to be read by a stranger"*, and nothing
upstream does. The corpus is a working thought log, so it accumulates material that is
authored and harmless-looking yet not for publication. Selecting by exclusion means
enumerating those categories in advance, which is a denylist, and a denylist fails open.

Publishing is therefore a deliberate act: tag the note through the private MCP, and it
appears. Nothing appears by default, so an untagged note is unpublished by construction
rather than by anyone noticing what is wrong with it.

The tag is configurable via `OBSERVATION_PUBLISH_TAG` (default `publish`), and the filter is
applied once at the cache boundary in `server/machine-surface.ts`, so the index, the detail
pages and the sitemap cannot disagree about what is public — a route added later inherits it
without having to know it exists.

Run `npm run preflight` before shipping. It scans the published set for secrets and PII,
flags notes shaped like private working material, checks every sitemap URL resolves with a
unique canonical and title, and diffs what the deploy would newly expose against the live
sitemap. It fails if the allowlist ever matches the entire corpus — an allowlist that admits
everything is a denylist wearing a hat.

**Stack:** React 19 · Vite · TypeScript · Hono · `react-markdown` · `qrcode.react`. Design
system is the hand-authored `src/styles.css`. Deploys to Railway (or any Node host).

## Fork it — your own queryable résumé

1. **Deploy your own [`resume-agent`](https://github.com/yuens1002/resume-agent)** — it holds
   your profile data and the query/agent API.
2. **Fork this repo** and point it at your backend + site (see [Environment](#environment)):
   `VITE_API_BASE` + `RESUME_API_BASE` = your resume-agent base · `VITE_SITE_URL` = your
   canonical URL · `RESUME_AGENT_API_KEY` = your resume-agent key (server secret).
3. **Swap the favicons** in `public/` (see [Customize](#customize)).
4. **Build & deploy** (below).

Your name, role, summary, skills, projects — and the JSON-LD / `llms.txt` / `<noscript>`
machine surface — all come from *your* `/info`. The published `<title>`, description, and
canonical are derived from your profile + `VITE_SITE_URL`; no identity is baked into the code.

## Develop

```bash
npm install
cp .env.example .env      # set the vars below (RESUME_AGENT_API_KEY for the résumé proxy)
npm run dev               # vite on :5000 + tsx server on :8787 (/api proxied)
```

Append `?instant=1` to skip the typewriter/entrance animations. The **machine surface**
(JSON-LD / `<noscript>` / `llms.txt`) only renders in the production server, so test it with
`npm run build && npm start`.

## Build & run

```bash
npm run build             # vite build → dist/  (needs VITE_API_BASE + VITE_SITE_URL)
npm start                 # tsx server/index.ts — serves dist/ + /api/resume + machine surface
```

## Environment

| Var | Scope | Notes |
|---|---|---|
| `VITE_API_BASE` | client (build-time, public) | your resume-agent base, e.g. `https://agent.yourname.dev` |
| `VITE_SITE_URL` | client (build-time, public) | your canonical URL; drives `canonical`/`og:url` + the agent-menu QR |
| `RESUME_API_BASE` | server | backend the `/api/resume` proxy + machine surface read from |
| `RESUME_AGENT_API_KEY` | server (**secret**) | your resume-agent `API_KEY`; never committed, never in the bundle |
| `PORT` | server | host injects this (Railway etc.) |

## Customize

- **Identity** (name, role, summary, skills, projects, contact): edit your profile in
  `resume-agent` — it flows through here automatically, no code change.
- **Favicons:** `public/favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`.
- **Copy & samples:** greeting headline (`src/components/Greeting.tsx`), sample job posts
  (`src/components/MatchResume.tsx`), accent color (`src/styles.css` → `--accent`).
- **Machine surface:** `server/machine-surface.ts` (JSON-LD, `llms.txt`, `robots.txt`).

## Deploy (Railway)

Build `npm run build`, start `npm start`, healthcheck `/healthz`. Set the env vars on the
service (`RESUME_AGENT_API_KEY` as a secret). Point your apex/`www` domain at it; the
`resume-agent` backend stays on its own domain.

## License

[MIT](./LICENSE) — © 2026 Sunny Yuen. Fork it, make it yours, keep it honest.
