# Changelog

## [Unreleased]

- 2026-06-07 — fix(intent): remove bare 'work' keyword from work render classifier — was matching "what kind of work is Sunny looking for?" (availability question) as a project card trigger; tighten 'tell me about you' to require trailing space so it doesn't match "tell me about your projects"

- 2026-06-07 — fix(followup): filter follow-up suggestions already asked in the current conversation — prevents repeated chips across turns

- 2026-06-07 — fix(scroll-nav): direction-intent detection — show ↑/↓ only after 80px sustained scroll in one direction; hide at top/bottom; hide on idle; net-distance threshold robust against trackpad jitter

- 2026-06-04 — fix(style): remove body::before decorative gradient overlay — eliminated the blue-tinted radial shade visible in the top portion of the page

- 2026-06-04 — feat(ux): third-person voice for chips and composer
  - starter chips now use the candidate's first name derived from the live profile — no hardcoding; e.g. "Tell me about [name]", "What are [name]'s strengths?", "What's [name]'s availability?"
  - composer hint chips follow the same pattern: "How does [name] approach testing?", "How do I reach [name]?"
  - composer placeholder updated to match: "Ask anything about [name]…"
  - framing shifts from first-person (asking the candidate) to third-person (asking about the candidate), matching how the LLM already responds
  - fix(menu): remove text-decoration underline from Agent card and GitHub links in the ⌘ menu

- 2026-06-04 — feat(ux): progress bar on résumé load + mobile layout fixes
  - animated ease-out progress bar (0→92% over 55s) + percentage counter shown while résumé generates
  - wording: "Tailoring résumé…" (removed "your")
  - mobile: show `.hdr-role` tagline with text-overflow ellipsis instead of hiding it
  - mobile: force `.skillgrid` to single column (`grid-template-columns: 1fr`)

- 2026-06-04 — feat(greeting): reorder and retitle starter chips
  - replace "Experience with AI?" with "What are your strengths?" — maps to the recruiter strengths question, surfaces predominant experience across all past and current work
  - replace "Are you available?" with "What's your availability?" — more natural phrasing
  - reorder chips: Tell me about yourself → Show recent work → What are your strengths? → What's your availability? → Match a job & tailor my résumé
  - add 'strength' keyword to the about render-intent classifier so the strengths chip attaches the skills + employment card

- 2026-06-04 — feat(ui): typewriter answer reveal and sharpened greeting headline
  - replace fade-in with word-by-word typewriter reveal; duration capped at 700ms total so long answers burst in fast, short ones feel natural (~15ms/word)
  - blinking cursor tracks the live edge during reveal; disappears when last word lands, triggering sources + follow-up chips
  - `prefers-reduced-motion` and `?instant=1` both bypass the animation
  - greeting headline rewritten from first-person persona to idea-voice: "Ask the questions every static résumé hides from"

- 2026-06-04 — feat(docx): render website field in contact header — positioned after email, before github/linkedin; closes #144

- 2026-05-30 — feat(forkable): make the site open-source/forkable — identity-free head, LICENSE, fork README
  - derive `<title>`/`og:title` from the live profile name and `canonical`/`og:url` from `VITE_SITE_URL` (build-time `%VITE_SITE_URL%`); no person/domain hardcoded in the served HTML
  - add MIT `LICENSE`; rewrite `README` with the "why this exists" thesis, the OB1/Open Brain lineage + credit, a fork quickstart, and customization guide
  - `.env.example` reframed as fork guidance (point the URLs at your own resume-agent)
- 2026-05-30 — feat(seo): machine-readable surface (JSON-LD, noscript, llms.txt) for LLM consumers
  - server injects `schema.org/Person` JSON-LD + a crawlable `<noscript>` profile + discovery `<link>`s, so a non-JS fetch of the site is no longer an empty shell
  - serve real `/robots.txt` (welcomes AI bots) and `/llms.txt` (candidate summary + query endpoints); redirect `/.well-known/agent-card.json` and `/openapi.json` to the backend
  - derive the published role from live `availability.preferred_roles` and inject the `<meta description>`/`og:description` from the live summary — no hardcoded title/description drift
  - profile is cached in memory (loaded at boot, refreshed every 10 min) so the hot path stays ~0ms and edits propagate without a redeploy
- 2026-05-30 — feat(ux): richer sample JDs, run-once chip cue, and conversational pre-wire
  - rewrite the sample-JD pills as realistic, keyword-dense postings (SFE 80% apply · Full-Stack AI 94% apply · Lead 56% pass) so the demo scores are representative
  - first starter chip: replace the solid "looks-selected" fill with a single run-once attention cue (pop + accent ripple), then it rests; reduced-motion safe
  - pre-wire conversational mode: send `x-agent-type: human` on `/query` (CORS-verified) so human-visitor answers shorten automatically once resume-agent ships the mode — no redeploy
  - dev workflow: local-first (`npm run dev` on `:5000`); add project `CLAUDE.md`; retire the Railway staging service
- 2026-05-30 — feat(answer): render /query answers as on-brand markdown with mobile/UX fixes
  - integrate the design-system `.richtext` prose scope + `.t-*` type scale
  - render answers with `react-markdown` + `remark-gfm` (fade-in reveal); `sanitizeAnswer` strips inline `[n]` citations and the trailing `Sources:` block
  - fix mobile horizontal overflow: long follow-up chips now wrap
  - lock background scroll while an overlay is open (no double scrollbar on the project deep-dive)
  - treat "Match a job & tailor my résumé" (and similar) as a tool trigger that opens the JD/match UI directly instead of querying the LLM
  - agent-card menu row shows host-only (`agent.yuens.me`)
