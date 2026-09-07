import type { PublicationCitation } from './types.ts'

/*
 * Clean up a /query answer for the conversational UI.
 *
 * The backend returns a long, machine-cited answer: inline [1]..[n] markers, a
 * trailing "Sources: …" footnote block, and **markdown bold**. The prototype
 * never spec'd inline footnotes — attribution is the source pills. So we strip
 * the citation noise and keep only paragraph breaks + bold for legibility.
 */
export function sanitizeAnswer(raw: string): string {
  return raw
    // drop the trailing "Sources:" footnote block and anything after it
    .replace(/\n+\s*Sources?:[\s\S]*$/i, '')
    // remove inline citation markers like [1] or [12]
    .replace(/[ \t]*\[\d+\]/g, '')
    // strip trailing "Want to hear ...?" / "Would you like to hear/know ...?" CTAs the LLM
    // sometimes appends — these duplicate the follow-up chips and are specific enough
    // phrasing that they won't appear as legitimate answer content
    .replace(/\.?\s+(?:Want\s+to\s+hear|Would\s+you\s+like\s+to\s+(?:hear|know))\s+[^?]+\?+\s*$/i, '')
    // tidy whitespace: collapse 3+ blank lines, trim trailing spaces per line
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Only an http(s) URL is safe to render as an href — see resolvePublicationPill below. */
const SAFE_URL_RE = /^https?:\/\//i

/**
 * Resolve one `sources[]` entry against the `publications` envelope
 * (resume-agent-web#34). A cited publication's source path is
 * `publications.<slug>`, optionally followed by a field sub-path (e.g.
 * `.grounded_in`).
 *
 * A slug can itself contain dots — resume-agent's `upsert_publication`
 * takes a bare string with no character restrictions — so the sub-path
 * cannot be split off by finding the first dot after `publications.`; that
 * would truncate a dotted slug and, worse, could resolve to a *different*
 * publication that happens to share the truncated prefix. Instead this
 * mirrors the backend's own resolution exactly (`resolveParsedPath`'s
 * segment branch in publication-citations.ts): among publications whose
 * slug is a prefix of the remainder (either an exact match or followed by
 * `.`), the longest slug wins, and anything left over is the sub-path.
 *
 * Never guesses: no match (unknown slug, older backend with no envelope, or
 * a source that isn't a publication path at all) falls back to the raw
 * string with no href, same posture the backend takes when it can't resolve
 * a citation confidently. Same posture for `canonical_url` itself: it's
 * owner-supplied with no scheme validation at the write boundary, so a
 * non-http(s) value (e.g. a stray `javascript:` scheme) is treated as
 * unresolved rather than rendered as a clickable href.
 */
export function resolvePublicationPill(
  source: string,
  publications: PublicationCitation[],
): { label: string; href?: string } {
  if (!source.startsWith('publications.')) return { label: source }
  const remainder = source.slice('publications.'.length)
  let pub: PublicationCitation | undefined
  for (const candidate of publications) {
    const isMatch = remainder === candidate.slug || remainder.startsWith(`${candidate.slug}.`)
    if (isMatch && (!pub || candidate.slug.length > pub.slug.length)) pub = candidate
  }
  if (!pub) return { label: source }
  const label = pub.title || source
  return SAFE_URL_RE.test(pub.canonical_url) ? { label, href: pub.canonical_url } : { label }
}
