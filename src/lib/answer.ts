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
    // strip trailing invitation-to-follow-up sentences the LLM sometimes appends
    // e.g. "Want to hear about Sunny's other 3 projects?" — these duplicate follow-up chips
    .replace(/\.?\s+(?:Want\s+to|Would\s+you\s+like\s+to|Interested\s+in|Curious\s+about)\s+[^?]+\?+\s*$/i, '')
    // tidy whitespace: collapse 3+ blank lines, trim trailing spaces per line
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
