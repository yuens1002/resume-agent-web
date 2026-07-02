# 0001 — Derive render intent from the backend response, don't re-guess it

## Problem

Asking "tell me about project X" would sometimes render the About card
(skills grid + employment timeline) instead of the project card, even when
the LLM's answer correctly discussed the named project.

## Root cause

`App.tsx` decided which rich card to attach (`Turn.render`: `'work' | 'about' |
'fit' | null`) **before** the backend responded, via `resolveRender()` — a
keyword scorer run against the raw question text (`src/lib/intent.ts`). That
value was written into `Turn` at creation and never revisited once the
`/query` response arrived.

Meanwhile the backend (`resume-agent`, `src/lib/query-prompt.ts:120`)
already computes and returns `project_slugs`, documented in its own contract
as *"the single source of truth for which project cards the UI renders"*.
The frontend received this field, stored it on the turn (`projectSlugs`),
and then never used it to decide *which* card to show — only `WorkResult`
(when already selected) used it to decide *which projects* to show inside
the card.

So two independent classifiers existed for the same decision — a
pre-response keyword guess and a post-response backend fact — and only the
weaker one (the guess) was wired to the UI. Whenever the keyword guess
favored `'about'` (e.g. a question containing "experience" or "about")
while the LLM's actual answer discussed a specific project, the wrong card
rendered.

## Decision

**Derive, don't ask.** After the response lands, `deriveRender()`
(`src/lib/intent.ts`) reconciles the two signals:

```ts
deriveRender(preResponseRender, projectSlugs) =
  projectSlugs.length > 0 ? 'work' : preResponseRender
```

A non-empty `project_slugs` always wins and forces the project card,
overriding a wrong pre-response guess. This works because `project_slugs`
is an authoritative fact the backend already computes as part of answering
the question — not a redundant judgment call bolted on afterward.

### Why not just ask the backend for an explicit `render` field instead?

That was the first idea, and it's wrong. The backend (`resume-agent`) calls
`generateText` with a prompt-engineered JSON envelope — not
`generateObject`/tool-calling with a validated schema (see
`resume-agent/src/lib/ai.ts`). Nothing enforces internal consistency between
JSON fields the model writes. Adding a second categorical field
(`render: 'work' | 'about' | 'fit'`) invites the model to emit
self-contradictory output — e.g. `render: "about"` alongside
`project_slugs: ["artisan-roast"]` — which then has to be arbitrated
*anyway*, by trusting `project_slugs` over the new field. Skip the redundant
field; derive from the fact that already has a documented single-source-of-
truth contract.

More generally: every extra free-choice categorical judgment asked of a
model (on top of `confidence`, `sources`, `project_slugs`, `follow_up_suggestions`
it already produces per response) is a new place for drift, especially on a
small model (`claude-haiku-4.5` via OpenRouter) with no schema enforcement.
Prefer deriving presentation decisions in code from facts the model already
reliably produces.

### Why not default to `'about'` when `project_slugs` is empty?

Considered and rejected. `Thread.tsx` only reads `turn.render` after
`pending` is false — so the pre-response guess is otherwise inert dead
state, which made "just default the empty case to `'about'`" tempting.
But `project_slugs` is empty for *every* answer that discusses no specific
project — including off-topic declines, capability-gap answers ("have you
used Kubernetes?"), and honesty-floor low-confidence answers
(`RULE_HONESTY`, `RULE_GAPS` in `query-prompt.ts`). There is no backend
signal equivalent to `project_slugs` that says "this answer is broadly
about the candidate." Defaulting to `'about'` would have regressed those
answers into always growing an unwanted employment-timeline card. Falling
back to the pre-response keyword guess (including `null`, which correctly
suppresses any card) preserves existing decline/gap behavior while fixing
the actual bug.

### `'fit'` is unaffected

`'fit'` is never decided by the LLM at all — `FIT_RE` in `App.tsx` matches
tool-trigger phrases ("match a job", "check my fit") and short-circuits
before `/query` is even called. `deriveRender` is only invoked in the
`askApi(...).then()` path, which `fit` turns never reach.

## Consequence

- `Turn.render` is now correct once a response with non-empty
  `project_slugs` arrives, regardless of how the pre-response keyword guess
  scored the question.
- The `'about'` classification remains a frontend-only heuristic with a
  known gap: there's no backend-authoritative way (yet) to distinguish "this
  should show the About card" from "this is a decline/gap with no card."
  A future backend field for this would face the same self-consistency risk
  called out above — it should only be added if it can be derived from data
  the model already produces (e.g. via `confidence` correlating with
  declines), not as a new independent categorical judgment.
- Tests: `src/lib/intent.test.ts` covers the reported bug, the preserved
  `'about'`/`null` fallback cases (regression guard for the rejected
  default-to-`'about'` design), and the `undefined`/`[]` equivalence.
