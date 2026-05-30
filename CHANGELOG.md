# Changelog

## [Unreleased]

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
