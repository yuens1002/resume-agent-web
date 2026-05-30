# Changelog

## [Unreleased]

- 2026-05-30 — feat(answer): render /query answers as on-brand markdown with mobile/UX fixes
  - integrate the design-system `.richtext` prose scope + `.t-*` type scale
  - render answers with `react-markdown` + `remark-gfm` (fade-in reveal); `sanitizeAnswer` strips inline `[n]` citations and the trailing `Sources:` block
  - fix mobile horizontal overflow: long follow-up chips now wrap
  - lock background scroll while an overlay is open (no double scrollbar on the project deep-dive)
  - treat "Match a job & tailor my résumé" (and similar) as a tool trigger that opens the JD/match UI directly instead of querying the LLM
  - agent-card menu row shows host-only (`agent.yuens.me`)
