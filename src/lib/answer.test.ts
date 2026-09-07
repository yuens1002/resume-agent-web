import { describe, expect, it } from 'vitest'
import { resolvePublicationPill } from './answer.ts'
import type { PublicationCitation } from './types.ts'

// resume-agent-web#34: the backend normalizes a cited publication's sources[]
// entry to `publications.<slug>` (was a bare, unstyled `publications`), so an
// unhandled pill would render that raw path. resolvePublicationPill maps it to
// the piece's title + canonical_url, degrading to the raw string whenever it
// can't resolve confidently — never a guess.
describe('resolvePublicationPill', () => {
  const other: PublicationCitation = {
    slug: 'artisan-roast-notes',
    title: 'Artisan Roast Field Notes',
    platform: 'Medium',
    canonical_url: 'https://medium.com/artisan-roast-notes',
    date: '2026-05-02',
  }
  const pubs: PublicationCitation[] = [
    other,
    { slug: 'beyond-the-chatbot', title: 'Beyond the Chatbot', platform: 'Dev.to', canonical_url: 'https://dev.to/beyond-the-chatbot', date: '2026-08-14' },
  ]

  it('resolves a matching slug to its title and canonical_url', () => {
    expect(resolvePublicationPill('publications.beyond-the-chatbot', pubs)).toEqual({
      label: 'Beyond the Chatbot',
      href: 'https://dev.to/beyond-the-chatbot',
    })
  })

  // With only one fixture entry, a single-candidate lookup can't distinguish the
  // actually-cited slug's match from an arbitrary pick — a second, unrelated
  // publication makes sure the CITED slug is what actually resolves.
  it('resolves the actually-cited slug, not merely any known publication', () => {
    expect(resolvePublicationPill('publications.artisan-roast-notes', pubs)).toEqual({
      label: 'Artisan Roast Field Notes',
      href: 'https://medium.com/artisan-roast-notes',
    })
  })

  it('matches on the slug segment only, ignoring a trailing field sub-path', () => {
    expect(resolvePublicationPill('publications.beyond-the-chatbot.grounded_in', pubs)).toEqual({
      label: 'Beyond the Chatbot',
      href: 'https://dev.to/beyond-the-chatbot',
    })
  })

  // resume-agent's upsert_publication takes a bare string for slug, with no
  // character restrictions — a slug can itself contain dots. Splitting off
  // the sub-path at the first dot after `publications.` would truncate a
  // dotted slug and, worse, could resolve to a *different* publication that
  // happens to share the truncated prefix. Mirrors the backend's own
  // longest-slug-wins resolution (publication-citations.ts resolveParsedPath).
  it('resolves a dotted slug in full, not truncated at its first dot', () => {
    const dotted: PublicationCitation[] = [
      { slug: 'web-2.0-notes', title: 'Web 2.0 Notes', platform: 'Dev.to', canonical_url: 'https://dev.to/web-2-0-notes', date: '2026-07-01' },
    ]
    expect(resolvePublicationPill('publications.web-2.0-notes', dotted)).toEqual({
      label: 'Web 2.0 Notes',
      href: 'https://dev.to/web-2-0-notes',
    })
  })

  // Fixture deliberately lists the SHORTER slug ('ai') last: an implementation
  // that dropped the length comparison and just kept overwriting on every
  // match (last-match-wins instead of longest-match-wins) would still pass
  // this test if 'ai.notes' were listed last — it has to be genuinely
  // comparing lengths, not merely iterating in a favorable order.
  it('prefers the longest matching slug when a shorter slug is a prefix of another', () => {
    const overlapping: PublicationCitation[] = [
      { slug: 'ai.notes', title: 'AI Notes', platform: 'Dev.to', canonical_url: 'https://dev.to/ai-notes', date: '2026-02-01' },
      { slug: 'ai', title: 'AI', platform: 'Dev.to', canonical_url: 'https://dev.to/ai', date: '2026-01-01' },
    ]
    expect(resolvePublicationPill('publications.ai.notes', overlapping)).toEqual({
      label: 'AI Notes',
      href: 'https://dev.to/ai-notes',
    })
    expect(resolvePublicationPill('publications.ai', overlapping)).toEqual({
      label: 'AI',
      href: 'https://dev.to/ai',
    })
  })

  // A shorter slug that is merely a character prefix — with no '.' boundary —
  // of the cited path must NOT match. Guards against a loosened comparison
  // like `remainder.startsWith(candidate.slug)` with no separator check, which
  // would wrongly resolve 'ai-notes' to the unrelated 'ai' piece.
  it('does not match a slug that is a bare character prefix with no dot boundary', () => {
    const withShortSlug: PublicationCitation[] = [
      { slug: 'ai', title: 'AI', platform: 'Dev.to', canonical_url: 'https://dev.to/ai', date: '2026-01-01' },
    ]
    expect(resolvePublicationPill('publications.ai-notes', withShortSlug)).toEqual({
      label: 'publications.ai-notes',
    })
  })

  it('falls back to the raw string for an unknown slug', () => {
    expect(resolvePublicationPill('publications.some-other-piece', pubs)).toEqual({
      label: 'publications.some-other-piece',
    })
  })

  it('does not match a slug that is only a prefix of the cited path, or a case-different slug', () => {
    // Guards against an implementation loosened to startsWith/includes/case-insensitive
    // compare — the backend resolves by exact slug equality (or exact + '.' sub-path).
    expect(resolvePublicationPill('publications.beyond', pubs)).toEqual({
      label: 'publications.beyond',
    })
    expect(resolvePublicationPill('publications.Beyond-The-Chatbot', pubs)).toEqual({
      label: 'publications.Beyond-The-Chatbot',
    })
  })

  // A bare `publications` (no slug at all) is the exact regression this feature
  // fixes for sources[] display, but it is NOT itself a citation to resolve —
  // an implementation that made the slug segment optional would wrongly start
  // resolving it to an arbitrary publication.
  it('falls back to the raw string for a bare "publications" with no slug', () => {
    expect(resolvePublicationPill('publications', pubs)).toEqual({ label: 'publications' })
    expect(resolvePublicationPill('publications.', pubs)).toEqual({ label: 'publications.' })
  })

  // Guards the leading anchor: a source that merely contains "publications."
  // somewhere other than the start must never resolve.
  it('does not match "publications." occurring mid-string rather than at the start', () => {
    expect(resolvePublicationPill('profile.publications.beyond-the-chatbot', pubs)).toEqual({
      label: 'profile.publications.beyond-the-chatbot',
    })
  })

  it('falls back to the raw string when publications is empty (older backend, no envelope)', () => {
    expect(resolvePublicationPill('publications.beyond-the-chatbot', [])).toEqual({
      label: 'publications.beyond-the-chatbot',
    })
  })

  it('falls back to the raw string for a non-publication source (e.g. projects.*)', () => {
    expect(resolvePublicationPill('projects.artisan-roast', pubs)).toEqual({
      label: 'projects.artisan-roast',
    })
  })

  // canonical_url is owner-supplied with no scheme validation at the write
  // boundary, so a non-http(s) value must never reach the rendered <a href>.
  // Explicit positives (plain http, uppercase scheme) guard against a tightened
  // regex (e.g. dropping the `s?` or the `i` flag) breaking real canonical
  // URLs while every negative case here stays green.
  it('includes href only for an http(s) canonical_url, in either case', () => {
    const httpOnly: PublicationCitation = { slug: 'http-piece', title: 'HTTP Piece', platform: 'Dev.to', canonical_url: 'http://dev.to/http-piece', date: '2026-01-01' }
    const upperScheme: PublicationCitation = { slug: 'upper-piece', title: 'Upper Piece', platform: 'Dev.to', canonical_url: 'HTTPS://dev.to/upper-piece', date: '2026-01-01' }
    expect(resolvePublicationPill('publications.http-piece', [httpOnly])).toEqual({
      label: 'HTTP Piece',
      href: 'http://dev.to/http-piece',
    })
    expect(resolvePublicationPill('publications.upper-piece', [upperScheme])).toEqual({
      label: 'Upper Piece',
      href: 'HTTPS://dev.to/upper-piece',
    })
  })

  it.each([
    ['javascript:alert(1)', 'javascript:'],
    ['data:text/html,<script>alert(1)</script>', 'data:'],
    ['vbscript:msgbox(1)', 'vbscript:'],
    ['//evil.example/phish', 'protocol-relative'],
    ['', 'empty string'],
  ])('falls back to a label with no href when canonical_url is %s (%s)', (canonical_url) => {
    const unsafe: PublicationCitation = { slug: 'unsafe-piece', title: 'Unsafe Piece', platform: 'Dev.to', canonical_url, date: '2026-01-01' }
    expect(resolvePublicationPill('publications.unsafe-piece', [unsafe])).toEqual({ label: 'Unsafe Piece' })
  })

  it('falls back to the raw source string, not a blank label, when title is empty', () => {
    const untitled: PublicationCitation = { slug: 'untitled-piece', title: '', platform: 'Dev.to', canonical_url: 'https://dev.to/untitled-piece', date: '2026-01-01' }
    expect(resolvePublicationPill('publications.untitled-piece', [untitled])).toEqual({
      label: 'publications.untitled-piece',
      href: 'https://dev.to/untitled-piece',
    })
  })
})
