import { readFile } from 'node:fs/promises'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import type { PublicProfile } from '../src/lib/types.ts'
import {
  refreshProfile,
  getProfile,
  refreshObservations,
  getObservations,
  buildHeadInjection,
  buildNoscript,
  buildLlmsTxt,
  buildSitemap,
  buildProjectsIndex,
  buildProjectPage,
  buildObservationsIndex,
  buildObservationPage,
  projectsIndexMeta,
  projectPageMeta,
  projectPageHead,
  observationsIndexMeta,
  observationPageMeta,
  observationTitles,
  observationPageHead,
  hasDetailPage,
  renderShell,
  renderStaticPage,
  metaDescription,
  ROBOTS_TXT,
  SITE_URL,
} from './machine-surface.ts'

const PORT = parseInt(process.env.PORT ?? '8787', 10)
const RESUME_API_BASE = (process.env.RESUME_API_BASE ?? 'https://agent.yuens.me').replace(/\/$/, '')
const RESUME_AGENT_API_KEY = process.env.RESUME_AGENT_API_KEY ?? ''

const app = new Hono()

/**
 * POST /api/resume — credential proxy for the gated backend /resume (AUTH_MODE=key).
 * Attaches the Bearer key server-side, consumes the SSE stream, and returns the final
 * JSON payload. The key never reaches the browser. No email / no extra rate-limit —
 * the backend's own 30 req/min-per-IP limit applies.
 */
app.post('/api/resume', async (c) => {
  let body: { job_description?: unknown; framing_hints?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  const job_description = typeof body.job_description === 'string' ? body.job_description.trim() : ''
  if (!job_description) return c.json({ error: 'job_description is required' }, 400)

  const payload: Record<string, unknown> = { job_description }
  if (Array.isArray(body.framing_hints)) payload.framing_hints = body.framing_hints

  let upstream: Response
  try {
    upstream = await fetch(`${RESUME_API_BASE}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(RESUME_AGENT_API_KEY ? { Authorization: `Bearer ${RESUME_AGENT_API_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('[api/resume] upstream fetch failed:', err instanceof Error ? err.message : err)
    return c.json({ error: 'Could not reach the résumé service.' }, 502)
  }

  if (upstream.status === 401) return c.json({ error: 'Résumé service auth failed (check API key).' }, 502)
  if (upstream.status === 429) return c.json({ error: 'Hourly limit reached — try again shortly.' }, 429)
  if (!upstream.ok) {
    console.error('[api/resume] upstream status', upstream.status)
    return c.json({ error: 'The résumé service returned an error.' }, 502)
  }

  // The backend streams SSE: ": keepalive" comments + a final `data: {…}` event.
  const text = await upstream.text()
  const dataLines = text
    .split(/\r?\n/)
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .filter(Boolean)

  if (dataLines.length === 0) return c.json({ error: 'Empty response from the résumé service.' }, 502)

  let parsed: unknown
  try {
    parsed = JSON.parse(dataLines[dataLines.length - 1])
  } catch {
    return c.json({ error: 'Malformed response from the résumé service.' }, 502)
  }
  if (parsed && typeof parsed === 'object' && 'error' in parsed) {
    return c.json({ error: String((parsed as { error: unknown }).error) }, 502)
  }

  return c.json(parsed as Record<string, unknown>)
})

app.get('/healthz', (c) => c.json({ ok: true }))

// ── machine-readable surface (real files, not the SPA shell) ──
app.get('/robots.txt', (c) => c.text(ROBOTS_TXT))
app.get('/llms.txt', (c) => {
  const p = getProfile()
  if (!p) return c.text('Profile temporarily unavailable.\n', 503)
  return c.text(buildLlmsTxt(p))
})
// The canonical agent surfaces live on the backend — redirect autodiscovery there
// instead of returning the SPA HTML.
app.get('/.well-known/agent-card.json', (c) => c.redirect(`${RESUME_API_BASE}/.well-known/agent-card.json`, 302))
app.get('/openapi.json', (c) => c.redirect(`${RESUME_API_BASE}/openapi.json`, 302))

// The built shell — head (fonts, favicons, hashed CSS/JS) is shared by every route.
let baseHtml: string | null = null
async function getBaseHtml(): Promise<string | null> {
  if (baseHtml === null) {
    try {
      baseHtml = await readFile('./dist/index.html', 'utf8')
    } catch {
      return null
    }
  }
  return baseHtml
}

// Serve the SPA with the machine surface injected: JSON-LD + discovery links in <head>,
// and a crawlable <noscript> profile in <body> (so a non-JS fetch isn't an empty shell).
async function renderIndex(): Promise<string | null> {
  const base = await getBaseHtml()
  if (!base) return null
  const p = getProfile()
  if (!p) return base.replace(/%VITE_SITE_URL%/g, SITE_URL)
  // Title + description come from the live profile (name/summary) — nothing person-specific
  // is hardcoded in the served HTML, so a fork publishes its own identity automatically.
  const name = p.contact?.name?.trim()
  const meta = {
    title: name ? `${name} — a résumé you can talk to` : 'A résumé you can talk to',
    description: metaDescription(p),
    path: '',
  }
  return renderShell(base, meta, buildHeadInjection(p)).replace('</body>', `${buildNoscript(p)}</body>`)
}

app.get('/', async (c) => {
  const html = await renderIndex()
  return html ? c.html(html) : c.text('Build not found. Run `npm run build`.', 500)
})

/*
 * Crawlable per-route pages. The SPA has no client-side router, so these are real
 * standalone documents (same shell, React bundle dropped) rather than SPA routes with
 * injected meta. Everything is driven by the cached backend data — no authored content
 * here — so a fork publishes its own pages automatically.
 */
app.get('/sitemap.xml', (c) => {
  const xml = buildSitemap(getProfile(), getObservations())
  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=UTF-8' })
})

/** Shared preamble for the static pages: the built shell + a loaded profile, or an error. */
type PageDeps =
  | { ok: true; base: string; p: PublicProfile }
  | { ok: false; error: string; status: 500 | 503 }

async function staticPageDeps(): Promise<PageDeps> {
  const base = await getBaseHtml()
  if (!base) return { ok: false, error: 'Build not found. Run `npm run build`.', status: 500 }
  const p = getProfile()
  if (!p) return { ok: false, error: 'Profile temporarily unavailable.', status: 503 }
  return { ok: true, base, p }
}

app.get('/projects', async (c) => {
  const d = await staticPageDeps()
  if (!d.ok) return c.text(d.error, d.status)
  return c.html(renderStaticPage(d.base, projectsIndexMeta(d.p), buildProjectsIndex(d.p)))
})

app.get('/projects/:slug', async (c) => {
  const d = await staticPageDeps()
  if (!d.ok) return c.text(d.error, d.status)
  const pr = d.p.projects?.find((x) => x.slug === c.req.param('slug'))
  // A real 404 — never a soft-200 SPA shell for a slug that doesn't exist.
  if (!pr) return c.text('Not found', 404)
  return c.html(
    renderStaticPage(d.base, projectPageMeta(pr), buildProjectPage(pr, d.p), projectPageHead(pr, d.p)),
  )
})

app.get('/observations', async (c) => {
  const d = await staticPageDeps()
  if (!d.ok) return c.text(d.error, d.status)
  const obs = getObservations()
  // Nothing tagged for publication means this index has no content to be. Serving a
  // 200 "none yet" page would be a thin page — and this URL is already in the live
  // sitemap, so a 404 is the signal that actually gets it dropped rather than kept
  // and rated. It returns as soon as a note is tagged.
  if (obs.length === 0) return c.text('Not found', 404)
  return c.html(renderStaticPage(d.base, observationsIndexMeta(d.p, obs), buildObservationsIndex(d.p, obs)))
})

app.get('/observations/:id', async (c) => {
  const d = await staticPageDeps()
  if (!d.ok) return c.text(d.error, d.status)
  const obs = getObservations()
  const o = obs.find((x) => x.id === c.req.param('id'))
  // Unknown id, or a note short enough to live inline on the index, has no page here.
  if (!o || !hasDetailPage(o)) return c.text('Not found', 404)
  // Titles are resolved against the whole corpus so two notes from one session
  // can't ship the same <title> — see observationTitles.
  const title = observationTitles(obs.filter(hasDetailPage)).get(o.id)
  return c.html(
    renderStaticPage(d.base, observationPageMeta(o, title), buildObservationPage(o, d.p), observationPageHead(o, d.p)),
  )
})

// Real static assets (hashed bundles, favicons) straight from disk.
app.use('/*', serveStatic({ root: './dist' }))

// SPA fallback for client routes — same injected HTML.
app.get('*', async (c) => {
  const html = await renderIndex()
  return html ? c.html(html) : c.text('Build not found. Run `npm run build`.', 500)
})

// Load the caches before serving, then refresh every 10 min (serve last-known on failure).
await Promise.all([refreshProfile(), refreshObservations()])
setInterval(() => {
  void refreshProfile()
  void refreshObservations()
}, 10 * 60_000)

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`portfolio server on http://localhost:${PORT}  → proxying /resume to ${RESUME_API_BASE}`)
  const obs = getObservations()
  console.log(`[machine] profile cache: ${getProfile() ? 'loaded' : 'EMPTY'} · /robots.txt /llms.txt + JSON-LD/noscript active`)
  console.log(
    `[machine] observations: ${obs.length} published (${obs.filter(hasDetailPage).length} with pages) · ` +
      `/sitemap.xml /projects/:slug /observations/:id serving real pages`,
  )
  if (!RESUME_AGENT_API_KEY) console.warn('[warn] RESUME_AGENT_API_KEY is unset — /api/resume will fail against a key-gated backend.')
})
