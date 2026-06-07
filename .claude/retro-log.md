# Retro Log — resume-agent-web

## 2026-06-07 — Public repo writing stance

**Gap:** CHANGELOG entries, PR descriptions, and GitHub issues written during development sessions used the site owner's personal name as example text (e.g. chip strings like "Tell me about [name]"), even though this is a public, forkable repo. Anyone who forks gets those references baked into git history and documentation.

**Root cause:** The `/commit` skill and session workflow don't distinguish between internal working notes and public-facing docs. No rule existed to enforce generic language in changelogs, PR bodies, and issues on public repos.

**Role:** cross-cutting — affects how commits are written, how PRs are described, and how issues are filed on public repos.

**Fix applied to:**
- `CHANGELOG.md` — replaced hardcoded name examples with `[name]` placeholder notation
- `.claude/retro-log.md` — this entry
- `~/.claude/projects/.../memory/feedback_public_repo_writing.md` — durable rule for future sessions

**Rule going forward:**
> In public-facing docs on this repo (CHANGELOG, PR titles/bodies, commit messages, GitHub issues), always use generic terms: "the candidate", "the profile name", `[name]`, "the site owner". Never use the actual person's name in examples, bullet points, or descriptions — even when the feature itself is personalized at runtime.

**Prevented by:** Memory entry loaded at session start; retro log entry for audit trail.

**Source:** ad-hoc session — user instruction during `/retro`
