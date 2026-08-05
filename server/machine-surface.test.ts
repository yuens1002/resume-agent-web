import { describe, expect, it } from 'vitest'
import {
  clamp,
  ogImageForCover,
  hasDetailPage,
  observationTitles,
  DETAIL_PAGE_MIN_CHARS,
  applyMeta,
  renderStaticPage,
  buildSitemap,
  SITE_URL,
  type PublicObservation,
} from './machine-surface.ts'
import type { PublicProfile } from '../src/lib/types.ts'

/** Minimal stand-in for the built dist/index.html — same tags applyMeta rewrites. */
const SHELL = `<!doctype html><html><head>
<link rel="canonical" href="%VITE_SITE_URL%" />
<title>fallback</title>
<meta name="description" content="fallback" />
<meta property="og:title" content="fallback" />
<meta property="og:description" content="fallback" />
<meta property="og:url" content="%VITE_SITE_URL%" />
<meta property="og:type" content="website" />
<meta property="og:image" content="%VITE_SITE_URL%/og-default.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="fallback" />
<meta name="twitter:description" content="fallback" />
<meta name="twitter:image" content="%VITE_SITE_URL%/og-default.jpg" />
<script type="module" crossorigin src="/assets/index-abc.js"></script>
</head><body><div id="root"></div></body></html>`

const obs = (over: Partial<PublicObservation>): PublicObservation => ({
  id: 'id',
  date: '2026-01-01',
  type: 'observation',
  topics: [],
  content: 'x'.repeat(200),
  url: 'https://example.test/observations/id',
  ...over,
})

describe('clamp', () => {
  it('leaves short text untouched and collapses whitespace', () => {
    expect(clamp('a  b\n c')).toBe('a b c')
  })

  it('truncates at a word boundary with an ellipsis', () => {
    const out = clamp(`${'word '.repeat(60)}end`, 60)
    expect(out.length).toBeLessThanOrEqual(60)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toContain('wor…') // never mid-word
  })

  it('treats undefined as empty', () => {
    expect(clamp(undefined)).toBe('')
  })

  it('hard-cuts an unbroken token rather than dropping a character at lastIndexOf -1', () => {
    const out = clamp('x'.repeat(200), 60)
    expect(out).toBe(`${'x'.repeat(59)}…`)
    expect(out.length).toBe(60)
  })

  it('ignores a word boundary too early to be worth honouring', () => {
    // One short word then a long identifier: backing up to the only space would leave "a…".
    const out = clamp(`a ${'y'.repeat(200)}`, 60)
    expect(out.startsWith('a y')).toBe(true)
    expect(out.length).toBe(60)
  })

  it('never exceeds max', () => {
    for (const max of [20, 60, 160]) {
      expect(clamp('word '.repeat(80), max).length).toBeLessThanOrEqual(max)
      expect(clamp('z'.repeat(400), max).length).toBeLessThanOrEqual(max)
    }
  })
})

describe('ogImageForCover', () => {
  it('maps a .webp cover to its 1200x630 JPEG sibling', () => {
    expect(ogImageForCover('https://cdn.test/bucket/brew-guide.webp')).toBe(
      'https://cdn.test/bucket/brew-guide-og.jpg',
    )
  })

  it('returns undefined for a missing or non-webp cover, so the default OG applies', () => {
    expect(ogImageForCover(undefined)).toBeUndefined()
    expect(ogImageForCover('https://cdn.test/bucket/cover.png')).toBeUndefined()
  })
})

describe('hasDetailPage', () => {
  it('gives a substantial note its own page', () => {
    expect(hasDetailPage(obs({ content: 'x'.repeat(DETAIL_PAGE_MIN_CHARS + 1) }))).toBe(true)
  })

  it('keeps a note with nothing beyond its excerpt inline on the index', () => {
    // A 55-char note published as a standalone URL would be thin content and would
    // duplicate the index besides.
    expect(hasDetailPage(obs({ content: 'discounnet issue resolution completed, the what and how' }))).toBe(false)
    expect(hasDetailPage(obs({ content: 'x'.repeat(DETAIL_PAGE_MIN_CHARS) }))).toBe(false)
  })

  it('is a length judgment only — never an authored/machine one', () => {
    // That call belongs to the backend's `authored` flag (resume-agent#222); a long
    // machine entry must not qualify here by being long, because it never reaches us.
    expect(hasDetailPage(obs({ content: 'y'.repeat(500), topics: ['version_drift'] }))).toBe(true)
  })
})

describe('observationTitles', () => {
  const long = (s: string) => `${s} ${'x'.repeat(300)}`

  it('leaves a unique title alone', () => {
    const a = obs({ id: 'a', content: long('Alpha note'), date: '2026-01-01' })
    const b = obs({ id: 'b', content: long('Beta note'), date: '2026-01-01' })
    const t = observationTitles([a, b])
    expect(t.get('a')).not.toBe(t.get('b'))
    expect(t.get('a')).not.toContain('·')
  })

  it('disambiguates a collision with the topic that actually differs', () => {
    // Two notes captured in one session: same opening, same date, same type.
    // A longer excerpt does not separate these — measured against the live corpus,
    // collisions survive to 140 chars.
    const shared = long('MCP reconnection issue resolved. Root cause: private endpoint')
    const a = obs({ id: 'a', content: shared, date: '2026-04-30', topics: ['MCP', 'OAuth', 'JWT'] })
    const b = obs({ id: 'b', content: shared, date: '2026-04-30', topics: ['MCP', 'OAuth', 'auth'] })
    const t = observationTitles([a, b])
    expect(t.get('a')).not.toBe(t.get('b'))
    expect(t.get('a')).toContain('JWT')
    expect(t.get('b')).toContain('auth')
    // The shared topics must not be used — they don't distinguish anything.
    expect(t.get('a')).not.toContain('OAuth')
  })

  it('falls back to a short id when topics cannot separate them', () => {
    const shared = long('Identical opening')
    const a = obs({ id: 'aaaaaa11-0000', content: shared, date: '2026-01-01', topics: ['same'] })
    const b = obs({ id: 'bbbbbb22-0000', content: shared, date: '2026-01-01', topics: ['same'] })
    const t = observationTitles([a, b])
    expect(t.get(a.id)).not.toBe(t.get(b.id))
    expect(t.get(a.id)).toContain('aaaaaa')
    expect(t.get(b.id)).toContain('bbbbbb')
  })

  it('produces a unique title for every note in the set', () => {
    const shared = long('Same start')
    const set = [
      obs({ id: '1', content: shared, date: '2026-01-01', topics: ['x'] }),
      obs({ id: '2', content: shared, date: '2026-01-01', topics: ['y'] }),
      obs({ id: '3', content: shared, date: '2026-01-01', topics: ['z'] }),
      obs({ id: '4', content: long('Different'), date: '2026-01-01' }),
    ]
    const titles = [...observationTitles(set).values()]
    expect(new Set(titles).size).toBe(set.length)
  })
})

describe('applyMeta', () => {
  const html = applyMeta(SHELL, {
    title: 'Title & "quoted"',
    description: 'Desc',
    path: '/projects/foo',
    image: 'https://cdn.test/foo-og.jpg',
    type: 'article',
  })

  it('rewrites canonical and og:url from the path', () => {
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/projects/foo" />`)
    expect(html).toContain(`<meta property="og:url" content="${SITE_URL}/projects/foo" />`)
  })

  it('escapes values into attributes', () => {
    expect(html).toContain('<title>Title &amp; &quot;quoted&quot;</title>')
    expect(html).toContain('content="Title &amp; &quot;quoted&quot;"')
  })

  it('carries the image into both og and twitter tags', () => {
    expect(html).toContain('<meta property="og:image" content="https://cdn.test/foo-og.jpg" />')
    expect(html).toContain('<meta name="twitter:image" content="https://cdn.test/foo-og.jpg" />')
  })

  it('falls back to the default OG image when none is given', () => {
    const out = applyMeta(SHELL, { title: 't', description: 'd', path: '' })
    expect(out).toContain(`<meta property="og:image" content="${SITE_URL}/og-default.jpg" />`)
  })

  it('repairs %VITE_SITE_URL% left over from a build without the env var', () => {
    expect(html).not.toContain('%VITE_SITE_URL%')
  })
})

describe('renderStaticPage', () => {
  const out = renderStaticPage(SHELL, { title: 't', description: 'd', path: '/projects' }, '<main>hi</main>')

  it('drops the SPA bundle so nothing hydrates over the server-rendered content', () => {
    expect(out).not.toContain('type="module"')
  })

  it('replaces the mount point with the page content', () => {
    expect(out).toContain('<main>hi</main>')
    expect(out).not.toContain('<div id="root"></div>')
  })
})

describe('buildSitemap', () => {
  const profile = {
    updated_at: '2026-07-29T03:02:18.154+00:00',
    projects: [{ slug: 'alpha' }, { slug: 'beta' }],
  } as unknown as PublicProfile

  it('lists the homepage, the projects index, and every project', () => {
    const xml = buildSitemap(profile, [])
    expect(xml).toContain(`<loc>${SITE_URL}</loc>`)
    expect(xml).toContain(`<loc>${SITE_URL}/projects</loc>`)
    expect(xml).toContain(`<loc>${SITE_URL}/projects/alpha</loc>`)
    expect(xml).toContain(`<loc>${SITE_URL}/projects/beta</loc>`)
    expect(xml).toContain('<lastmod>2026-07-29</lastmod>')
  })

  it('omits /observations entirely when there are none', () => {
    expect(buildSitemap(profile, [])).not.toContain('/observations')
    expect(buildSitemap(profile, [obs({})])).toContain(`<loc>${SITE_URL}/observations</loc>`)
  })

  it('lists a detail URL only for notes that actually have a page', () => {
    const long = obs({ id: 'long-one', content: 'x'.repeat(DETAIL_PAGE_MIN_CHARS + 1) })
    const short = obs({ id: 'short-one', content: 'brief' })
    const xml = buildSitemap(profile, [long, short])
    expect(xml).toContain(`<loc>${SITE_URL}/observations/long-one</loc>`)
    // The short note renders inline on the index and has no URL of its own.
    expect(xml).not.toContain('short-one')
  })

  it('still emits a valid document when the profile cache is empty', () => {
    const xml = buildSitemap(null, [])
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain(`<loc>${SITE_URL}</loc>`)
    expect(xml).not.toContain('/projects')
  })

  it('omits /observations when the profile cache is empty, since that route 503s', () => {
    // Observations load from a separate fetch, so they can be present while the profile
    // is not — the sitemap must not advertise a URL the route cannot serve.
    expect(buildSitemap(null, [obs({})])).not.toContain('/observations')
  })
})
