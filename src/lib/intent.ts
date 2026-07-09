import type { RenderKind } from './types.ts'

/**
 * Lightweight render-intent classifier — ported from the prototype's resolveIntent,
 * but ONLY the `render` decision. The answer text, sources, and follow-ups now come
 * from the real /query response; this just decides which rich card (if any) to attach.
 */
// 'fit' is NOT here: there's no reliable pre-response keyword heuristic for it — it's
// derived post-response from the backend's action_intent tool-call signal (see
// deriveRender below), not guessed from question text before the model has judged it.
const RENDER_INTENTS: { keys: string[]; render: Exclude<RenderKind, null> }[] = [
  {
    render: 'work',
    keys: ['recent work', 'project', 'projects', 'portfolio', 'built', 'build', 'shipped', 'show me'],
  },
  {
    render: 'about',
    keys: ['about', 'yourself', 'who are', 'background', 'tell me about you ', 'experience', 'years', 'summary', 'strength', 'sets', 'apart', 'growth areas', 'weaknesses'],
  },
]

export function resolveRender(q: string): RenderKind {
  // Normalize punctuation to spaces so "tell me about you?" matches "tell me about you "
  const s = ` ${q.toLowerCase().replace(/[^\w\s]/g, ' ')} `
  let best: RenderKind = null
  let bestScore = 0
  for (const intent of RENDER_INTENTS) {
    let score = 0
    for (const k of intent.keys) if (s.includes(k)) score += k.length
    if (score > bestScore) {
      bestScore = score
      best = intent.render
    }
  }
  return best
}

/**
 * Reconcile the pre-response keyword guess with the backend's response once it
 * lands.
 *
 * `action_intent` (resume-agent#174) wins outright: it's a first-class signal
 * derived from an actual tool-call event (the model invoked `open_match_tool`),
 * not free text the model could contradict itself on — so it overrides any
 * keyword guess or project_slugs, same as the old client-side FIT_RE bypass did,
 * but resolved by the model's judgment instead of a fixed phrase list.
 *
 * Otherwise, `project_slugs` is the backend's documented single source of truth
 * for which projects an answer discusses (see resume-agent's RULE_OUTPUT_JSON) —
 * so a non-empty list wins and forces the project card, overriding a wrong
 * pre-response guess (e.g. "about" for "tell me about project X").
 *
 * There is no equivalent backend signal for "about"-ness, so when neither fires
 * this intentionally falls back to the pre-response guess rather than defaulting
 * to 'about' — otherwise every decline / capability-gap / off-topic answer (which
 * also has empty project_slugs) would wrongly grow an About card.
 */
export function deriveRender(
  preResponseRender: RenderKind,
  projectSlugs: string[] | undefined,
  actionIntent?: { tool: string } | null,
): RenderKind {
  if (actionIntent?.tool === 'open_match_tool') return 'fit'
  return (projectSlugs?.length ?? 0) > 0 ? 'work' : preResponseRender
}
