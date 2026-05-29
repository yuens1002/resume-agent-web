# Handoff: yuen.me — Live, Queryable Résumé (Direction D)

## Overview
A single-page "live résumé" for **Sunny Yuen** that a human can talk to in plain
language and an AI agent can query over HTTP / MCP. The page is a calm, editorial
**conversation thread**: a visitor asks questions (or taps topic chips) and the
candidate's agent answers with cited sources, rich inline cards (featured work,
project deep-dives), a job-fit match tool, and an **email-gated, rate-limited
tailored-résumé generator**. The "for machines" surface (Custom GPT QR, MCP
endpoint, A2A agent-card) lives quietly in a header overflow (⋯) menu.

This frontend is meant to sit **in front of the existing `resume-agent` backend**
(a Hono server — see the user's `resume-agent/` repo). The backend already exposes
the endpoints this UI needs; a few small additions are required (see
**Backend Integration** below).

---

## About the Design Files
The files in `prototype/` are a **design reference created in HTML/React-via-Babel** —
a high-fidelity, clickable prototype that demonstrates the intended look, copy,
layout, and interactions. **They are not production code to deploy directly.**

Your task is to **recreate this design in a real frontend** wired to the live
`resume-agent` API. Recommended stack: **Next.js (App Router) + TypeScript +
Tailwind**, which matches the candidate's other projects and deploys cleanly
to Vercel/Railway alongside the existing server. If you prefer, the existing Hono
server can also serve a static SPA build — either is fine. Do **not** ship the
in-browser Babel setup; compile properly.

What in the prototype is **real design intent** vs. **mock scaffolding**:

| Area | In the prototype | In production |
|---|---|---|
| Answers to questions | Canned, keyword-matched responses | Call `POST /query` (streaming) / `ask_candidate` |
| Job-fit score | Deterministic mock from JD text | Call `POST /match` → real `MatchResponse` |
| Tailored résumé | Built client-side from profile JSON | Call `POST /resume` (SSE) → real `ResumeResponse` |
| Email delivery | Simulated "sent" state | New backend step: render PDF + send email |
| Rate limit (10/hr) | `localStorage` counter | Server-side per-IP + per-email limit |
| Profile data | `hifi/profile.js` (static) | `GET /profile` (Supabase singleton) |
| QR code | Live render via api.qrserver.com | Use backend `/qr` route or generate at build |

---

## Fidelity
**High-fidelity.** Colors, typography, spacing, motion, and copy are final and
should be reproduced closely. Use the exact design tokens listed below. The
warm-paper editorial aesthetic is intentional and central to the brand — do not
substitute a generic UI-kit look.

---

## Design Tokens

### Color (CSS custom properties, from `hifi/styles.css`)
| Token | Value | Use |
|---|---|---|
| `--paper` | `#f5f2ea` | App background (warm paper) |
| `--paper-2` | `#efebe1` | Secondary fills, tracks |
| `--surface` | `#fbfaf6` | Cards, inputs |
| `--ink` | `#262420` | Primary text, dark buttons |
| `--ink-2` | `#4a463e` | Body text |
| `--ink-soft` | `#807a6e` | Secondary text |
| `--ink-faint` | `#b6afa1` | Placeholders, hairline meta |
| `--hair` | `#e0dacd` | Light dividers |
| `--hair-2` | `#d4cdbd` | Card borders |
| `--accent` | `#3d5a80` | Slate-blue accent (THEME-able) |
| `--accent-ink` | `#2f4866` | Accent text/hover |
| `--accent-wash` | `accent @ 12% over paper` | Tinted card backgrounds |
| `--good` | `#4a6b52` | Availability / success states |

Accent is user-themeable in the prototype (slate `#3d5a80`, terracotta `#9c5b3b`,
green `#4a6b52`, plum `#6b4a72`). Ship slate as default; the others are optional.

### Typography
- **Serif — `Newsreader`** (Google Fonts, weights 400/500/560/600): the agent's
  "voice" — answer prose, headlines, card titles, résumé body. Sizes: greeting H1
  38px/1.12 letter-spacing -.018em; answer prose 20px/1.5; card titles 27px.
- **Sans — `Public Sans`** (400/500/550/600/700): all UI — buttons, chips, labels,
  inputs, nav. Base 16px/1.55.
- **Mono — `JetBrains Mono`** (400/500): technical/meta — source pills, role line,
  endpoints, timestamps, eyebrows. Sizes 10.5–12px, letter-spacing .03–.14em,
  often uppercase.

### Spacing / radius / shadow
- App max-width **860px**, side padding 24px (16px on mobile ≤720px).
- Radii: cards `14px`, inputs/small `10px`, pills `999px`, buttons `9px`.
- Shadows: `--shadow-sm` subtle card lift; `--shadow-md` composer/overlays;
  `--shadow-lg` slide-in panels.
- Thread turn gap **30px**; card padding **20–22px**.

### Motion
- Turn entrance: `translateY(10px) → 0`, **0.42s** `cubic-bezier(.2,.7,.3,1)`.
- Answer text **streams token-by-token** (~22ms/2 tokens) with a blinking caret;
  rich cards/sources/follow-ups fade in *after* the text completes.
  **Must honor `prefers-reduced-motion`** (render instantly — the prototype also
  supports a `?instant=1` query flag that disables streaming).
- Fit gauge ring animates `stroke-dashoffset` over 1s.
- Score bars animate `width` over 0.9s.
- Spinner 0.8s linear; menu pop 0.18s; detail panel slide-in 0.28s.

---

## Screens / Views

This is a **single page** with one persistent layout and content that appends to a
conversation thread. Overlays (project detail, résumé doc, agent menu) layer on top.

### 1. Header (sticky)
- Left: candidate **name** (Newsreader 20px/560) with **role** beneath in mono 11px
  (`Frontend / Full-stack Engineer` — kept visible for SEO; hidden on mobile).
- Right: **availability pill** (green dot with pulse animation + "Open to work")
  and a **⋯ icon button** (38×38, 10px radius) that opens the agent/machine menu.
- Sits on a `linear-gradient(--paper 72%, transparent)` so thread scrolls under it.

### 2. Greeting (initial thread state)
- Mono eyebrow "A live, queryable résumé"; Newsreader H1 (the tweakable headline,
  default "Ask me anything — I'm a résumé you can actually talk to."); serif lede
  = profile summary; a row of **starter chips** (first is solid/dark): *Show recent
  work · Experience with AI? · Are you available? · Match a job & tailor my résumé ·
  Tell me about yourself*.

### 3. Conversation turn (appended on each question)
- **User question**: right-aligned dark bubble, radius `16px 16px 4px 16px`.
- **Agent answer**: 30×30 accent avatar + body containing:
  - meta line (mono): "Sunny's agent · ● high confidence" (confidence: high=green,
    medium=amber dot).
  - **streaming prose** (Newsreader 20px).
  - then (faded in): optional **rich card** (work / fit), **source pills** (mono,
    e.g. `projects`, `employment · Wipro`), and **follow-up chips** (re-ask on click).

### 4. Work result card (render === "work")
- **Featured case** (2-col grid, collapses to 1 on mobile): status badge + period,
  Newsreader title, tagline, tech pills, "Open deep-dive" (solid) + "Live demo"
  (ghost) buttons; right column is a gradient art placeholder ("product shot").
- **Project list** below: rows with thumb, name (serif), tagline, period, arrow;
  hover nudges padding/arrow. Click opens the **Project Detail** overlay.

### 5. Project Detail overlay (right slide-in panel, ~640px)
- Sticky header: mono kicker `/projects/<slug>`, Newsreader H2, close button.
- Body sections (mono uppercase headers + hairline rule): status/period, tagline,
  **The problem · My role · Highlights (bulleted) · Architecture · Impact · Stack
  (pills)**, then Live demo / View repo buttons. Closes via ✕ or Esc.

### 6. Match + Tailored Résumé tool (render === "fit") — the key flow
- **JD input**: textarea + "Score the fit" button + three sample-JD mini-chips
  (Senior Frontend Engineer / Full-Stack (AI) / Frontend Lead / Manager).
- **Match result** (after ~0.8s mock delay; real = `POST /match`):
  - **Fit gauge** (108px ring, animated) showing the score as a %.
  - **Verdict line** with `recommended_action` label (apply / apply-with-tailoring /
    pass) + one-sentence honest verdict.
  - **Weighted score bars**: Skills 50% · Experience 30% · Domain 20%.
  - **Matched** (green ✓) vs **To tailor** (amber ○) columns.
- **Résumé generation** (only when action ≠ "pass"; a "pass" shows a book-a-call
  nudge instead) — a 4-stage state machine in one CTA zone:
  1. **idle** — "Want a résumé tailored to this role?" + "Generate tailored résumé".
  2. **gating** — "Where should I send it?" + email input + "Email me the résumé" /
     "Cancel"; inline validation error; note "N of 10 generations left this hour ·
     email used only to send your résumé".
  3. **sending** — spinner + "Tailoring & sending…".
  4. **sent** — green check + "On its way to {email} ✓" + "Preview / download"
     button (opens the Résumé Doc overlay).
  - **limited** — if the 10/hr cap is hit, the CTA skips the gate and shows "Hourly
    limit reached … try again in ~X min" + a "Book a call" (Calendly) link.

### 7. Tailored Résumé Doc overlay (printable)
- Same right slide-in panel; header shows "Tailored to: {JD title}", a rubric badge
  ("rubric 8.6/10 · passed"), keyword-coverage stat, "emailed to {email}", a
  **Download PDF** button (calls `window.print()`), and close.
- Body = a clean white résumé "paper" with print styles (`@media print` isolates
  `.resume-doc`): name + JD-title-first headline + contact line; **Summary**
  (opens with the JD's exact title), **Skills** (JD-relevant first), **Experience**
  (per-role bullets), **Selected Projects**, **Education**.

### 8. Agent / Machine menu (⋯ overlay, ~320px, top-right)
- **Hero** (accent wash): **QR code** → Custom GPT, "Talk to my agent", "Open
  Custom GPT" link.
- **"For machines"** list: **Connect via MCP** (copies endpoint), **Agent card**
  (`/.well-known/agent-card.json`, tagged A2A), **GitHub** ↗.

### 9. Composer (sticky bottom) + Footer
- Auto-growing textarea + send button; Enter submits, Shift+Enter newlines. On the
  initial (empty) state, a row of mini suggestion chips sits below it.
- Footer: copyright · GitHub · LinkedIn · "⌘ for machines" (opens the menu).

---

## Interactions & Behavior
- **Ask** (chip, follow-up, or composer) → append a turn; resolve the answer; stream
  prose; reveal cards/sources/follow-ups; smooth-scroll to bottom (use
  `window.scrollTo`, **never** `scrollIntoView`).
- **Esc** closes any open overlay (menu / detail / résumé).
- **Email validation**: `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`; show inline error, stay on gate.
- **Rate limit (client mirror)**: keep last-hour generation timestamps; at 10, show
  the limited state. Server is the source of truth — surface its 429 the same way.
- **Reduced motion / `?instant=1`**: skip token streaming and entrance animations.
- **Responsive**: ≤720px — featured card → 1 col, fit columns → 1 col, menu becomes
  full-width, role line hidden, padding 16px.

## State Management
- `turns[]` — conversation history `{ q, answer, confidence, sources[], followups[],
  render: 'work'|'fit'|'about'|null }`.
- `detail` (open project slug | null), `menu` (bool), and résumé tool local state:
  `jd`, `match`, `stage ('idle'|'gating'|'sending'|'sent'|'limited')`, `email`,
  `emailErr`, `built` (generated résumé), `doc` (overlay open).
- Theme tokens (`--accent`) and agent voice (serif/sans) are app-level toggles.

---

## Backend Integration (against the existing `resume-agent` Hono server)

Endpoints the UI consumes (already implemented unless noted):
- **`GET /profile`** — singleton profile (name, role, summary, skills, employment,
  education, projects, contact). Replaces `hifi/profile.js`.
- **`POST /query`** (and `/public-mcp` `ask_candidate`) — the conversational answers.
  Returns/streams the answer; map to the agent turn. Use real confidence/sources if
  available, else keep the UI's source-pill treatment minimal.
- **`POST /match`** `{ job_description }` → `MatchResponse`
  `{ fit_score (0–1), matched[], gaps[], verdict, recommended_action:
  'apply'|'apply-with-tailoring'|'pass', scoring:{ skills, experience, domain } }`.
  Render gauge as `Math.round(fit_score*100)`; bars from `scoring.*.score`.
- **`POST /resume`** `{ job_description, framing_hints? }` — **SSE stream**; the final
  `data:` event is a `ResumeResponse` `{ contact, summary, skills[], employment[],
  education[], projects[] }` plus `_rubric`. **Note: this route is auth-gated**
  (`Authorization: Bearer` when `AUTH_MODE=key`) — the public frontend must call it
  via a server-side route/proxy that holds the key, never from the browser.

**New backend work required for the email flow (the one new feature):**
1. **Accept an email** with the résumé request (extend `/resume` body, or add a thin
   `POST /resume/email { job_description, email }` wrapper that calls the existing
   generator). Validate the email server-side.
2. **Render the `ResumeResponse` to a PDF** — the print CSS in
   `prototype/hifi/styles.css` (`@media print` + `.resume-paper`) is a ready template;
   render it headless (e.g. Playwright — already a project dependency) or with a
   PDF lib.
3. **Send the email** with the PDF attached (+ a link). Use the project's mailer or
   add one (Resend/Postmark/SES).
4. **Rate limit 10/hr** per IP **and** per email in front of `/resume` — the repo
   already has rate-limit middleware on public routes; reuse it and return **429**
   with a retry hint so the UI can show the "Hourly limit reached" state.
5. **QR**: there's an existing `/qr` route — use it (or generate the Custom GPT QR at
   build time) instead of the third-party image service used in the prototype.

---

## Assets
- **Fonts**: Newsreader, Public Sans, JetBrains Mono (Google Fonts).
- **Icons**: inline SVG paths defined in `prototype/hifi/ui.jsx` (`ICONS`) — reuse or
  swap for the codebase's icon library (lucide etc.) matching stroke weight ~1.7.
- **QR**: prototype renders via `api.qrserver.com`; replace per item 5 above.
- **Images**: none — the featured-work "product shot" is a styled placeholder; supply
  a real screenshot or keep the gradient placeholder.
- No proprietary/brand assets; all content is the candidate's own profile data.

---

## Files (in `prototype/`)
- `yuen.me — Live Resume.html` — entry point; wires fonts + scripts.
- `hifi/styles.css` — **all** design tokens, components, print styles. Primary ref.
- `hifi/profile.js` — static profile data (replace with `GET /profile`).
- `hifi/ui.jsx` — icons, QR, copy-field, small helpers.
- `hifi/cards.jsx` — featured case, project list, project detail overlay, about, agent menu.
- `hifi/match-resume.jsx` — the match → email-gated tailored-résumé flow + résumé doc + rate limit.
- `hifi/thread.jsx` — conversation engine (intents, streaming, turns, greeting, composer).
- `hifi/app.jsx` — header, state, overlays, theme/voice/copy toggles.
- `tweaks-panel.jsx` — prototype-only tweak controls; **omit in production**.

> Tip: open the prototype with `?instant=1` to see all content without waiting on
> the typewriter animation — useful while building.
