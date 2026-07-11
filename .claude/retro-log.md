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

## 2026-07-11 — Cross-repo backend-contract verification (confirming a working pattern) + resize_window limitation

**Gap 1:** No gap in-session — the pattern worked correctly twice (verified resume-agent#195/#198's actual shipped type before trusting "the routing pivot is live" the first time; verified again via #200 before retiring the client-side `isFitQuestion()` heuristic the second time, after the user asserted `narrate_fit`/`fit_question` had shipped). But the practice existed only as in-session behavior, not as a documented rule — a less careful future session (or a different agent) could skip the second verification and implement against a stale "issue closed" assumption, since resume-agent's own issue #195 stayed OPEN past the PR (#198) that implemented its "next step," and #198 itself shipped adjacent work while leaving the frontend-facing `fit_question` signal for a follow-up PR (#200).

**Root cause 1:** `CLAUDE.md`'s "Backend is consumed as-is" line said *that* the frontend hands off backend changes to `resume-agent`, but not *how* to confirm a claimed-shipped contract before building against it.

**Gap 2:** `mcp__claude-in-chrome__resize_window` was called twice (375×780, then 390×844) to verify the new chip at a narrow viewport per this repo's mobile-check convention. Both calls reported success, but `window.innerWidth` stayed at 2560 (the display's full resolution) — the browser window couldn't actually be shrunk in this environment. A CSS-based emulation attempt (forcing `document.body.style.width`) also failed because the page centers within the full 2560px viewport rather than reflowing, and produced a misleading empty screenshot.

**Root cause 2:** No documented awareness that `resize_window` can silently no-op in a maximized/fullscreen display; nothing told the session to check `window.innerWidth` before trusting the tool's reported success, or to stop retrying and reason from component reuse instead.

**Role:** cross-cutting — both are project-level working-agreement gaps, not code bugs.

**Fix applied to:**
- `CLAUDE.md` — Conventions: added a rule to verify a claimed-shipped backend contract via `gh issue view` / `gh pr view --json body` and the sibling repo's actual type definitions/route handler before implementing against it, with the #195/#198/#200 sequence as the concrete example.
- `CLAUDE.md` — Dev workflow step 3: added a caveat that `resize_window` may not actually resize in this environment, to confirm via `window.innerWidth`, and to fall back to component-reuse reasoning (or flag as unverified) rather than fighting the tool or faking a screenshot.
- `.claude/retro-log.md` — this entry.

**Prevented by:** Both rules are now in the project's durable working agreement (`CLAUDE.md`), loaded at the start of every session in this repo, rather than living only as one session's in-context behavior.

**Source:** ad-hoc session — surfaced during `/retro` after shipping resume-agent-web#26/#27
