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

## 2026-07-09 — Public repo writing stance, recurrence

**Gap:** The 2026-06-07 rule above was violated: `gh issue create` for resume-agent-web#22 used the site owner's actual name ("Sunny") in the title/body multiple times, despite the memory rule already existing.

**Root cause:** The prior fix relied on passive recall — "memory entry loaded at session start" — but a session that starts with investigation (checking GitHub issues, reading changelogs) and only later drifts into *writing* a new issue doesn't naturally re-trigger the "this is public-facing content" check at the moment of the `gh issue create` call. The rule was known but not re-applied at the point of action.

**Role:** cross-cutting — same as the original entry; recurrence is a gap in *when* the rule gets applied, not in the rule's content.

**Fix applied to:**
- `~/.claude/projects/.../memory/feedback_public_repo_writing.md` — "How to apply" section rewritten from a passive scan ("scan for personal names") to a mechanical, point-of-call check: re-read the drafted body immediately before every `gh issue create` / `gh pr create` / `gh pr edit --body` / CHANGELOG.md edit on this repo (or resume-agent) and verify it contains none of the owner's personal identifiers.
- `.claude/retro-log.md` — this entry, documenting the recurrence so the pattern ("rule exists but isn't re-checked at the tool-call boundary") is visible for future retros.

**Prevented by:** The memory's "How to apply" now names the exact tool calls that require the check, rather than a general "before committing/filing" scan — narrowing the trigger to a concrete, checkable moment.

**Source:** ad-hoc session — user instruction during `/retro` (issue #22 itself was left as-is; recurrence prevention was the ask)
