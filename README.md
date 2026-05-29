# yuens.me — live, queryable résumé

A single-page conversation thread for **Sunny Yuen**: ask questions in plain language,
score a job's fit, and generate a tailored résumé. The UI is a React + Vite SPA wired to
the [`resume-agent`](https://github.com/yuens1002/resume-agent) backend at
`agent.yuens.me`; a tiny Hono server serves the build and proxies the one auth-gated
endpoint.

## Architecture

```
Browser ── direct ──▶ agent.yuens.me   /info  /query  /match        (public)
Browser ── /api/resume ──▶ this server ── Bearer key ──▶ agent.yuens.me/resume (SSE)
```

- `/info` → profile, `/query` → chat answers, `/match` → fit score: called straight from
  the browser (CORS-open, public).
- `/resume` is key-gated, so `server/index.ts` proxies it, attaching `RESUME_AGENT_API_KEY`
  server-side and collapsing the SSE stream into one JSON payload. The key never ships to
  the client. The tailored résumé opens as a printable doc in a new tab.

## Stack

React 19 · Vite · TypeScript · Hono (`@hono/node-server`) · `qrcode.react`. The design
system is the hand-authored `src/styles.css` (ported from the prototype — see
`prototype/DESIGN-HANDOFF.md`). Deployed on Railway.

## Develop

```bash
npm install
cp .env.example .env      # fill RESUME_AGENT_API_KEY for the résumé proxy
npm run dev               # vite (5173) + tsx server (8787); /api proxied to the server
```

Append `?instant=1` to disable the typewriter/entrance animations while building.

## Build & run

```bash
npm run build             # vite build → dist/
npm start                 # tsx server/index.ts — serves dist/ + /api/resume
```

## Environment

| Var | Scope | Notes |
|---|---|---|
| `VITE_API_BASE` | client (build-time, public) | resume-agent base, e.g. `https://agent.yuens.me` |
| `VITE_SITE_URL` | client (build-time, public) | canonical site; the agent-menu QR encodes this |
| `RESUME_API_BASE` | server | backend the `/api/resume` proxy forwards to |
| `RESUME_AGENT_API_KEY` | server (**secret**) | resume-agent `API_KEY`; never committed, never in the bundle |
| `PORT` | server | Railway injects this |

## Deploy (Railway)

Build `npm run build`, start `npm start`, healthcheck `/healthz`. Set the four env vars
in the Railway service (`RESUME_AGENT_API_KEY` as a secret). The apex domain `yuens.me`
points here; `agent.yuens.me` stays the backend.
