import { describe, expect, it } from 'vitest'
import {
  clamp,
  ogImageForCover,
  isAuthoredObservation,
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

describe('isAuthoredObservation', () => {
  it('keeps a substantial authored note', () => {
    expect(isAuthoredObservation(obs({ topics: ['OEP'] }))).toBe(true)
  })

  it('drops machine-generated sync entries by topic', () => {
    expect(isAuthoredObservation(obs({ topics: ['resume-agent', 'version_drift'] }))).toBe(false)
    expect(isAuthoredObservation(obs({ topics: ['sync_warning'] }))).toBe(false)
  })

  it('drops entries too short to be worth a crawlable page', () => {
    expect(isAuthoredObservation(obs({ content: 'too short' }))).toBe(false)
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

  it('omits /observations entirely when nothing survives the filter', () => {
    expect(buildSitemap(profile, [])).not.toContain('/observations')
    expect(buildSitemap(profile, [obs({})])).toContain(`<loc>${SITE_URL}/observations</loc>`)
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
