import type { RenderKind } from './types.ts'

/**
 * Lightweight render-intent classifier — ported from the prototype's resolveIntent,
 * but ONLY the `render` decision. The answer text, sources, and follow-ups now come
 * from the real /query response; this just decides which rich card (if any) to attach.
 */
// 'fit' is NOT here: it's a tool trigger handled explicitly in App (see FIT_RE), not
// a card attached to a /query answer — otherwise a question mentioning "resume" would
// spuriously open the match tool.
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
  const s = ` ${q.toLowerCase()} `
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
