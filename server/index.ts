import { readFile } from 'node:fs/promises'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

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

// Static SPA + client-side fallback (no app routes — any unmatched path serves index.html).
app.use('/*', serveStatic({ root: './dist' }))
app.get('*', async (c) => {
  try {
    return c.html(await readFile('./dist/index.html', 'utf8'))
  } catch {
    return c.text('Build not found. Run `npm run build`.', 500)
  }
})

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`portfolio server on http://localhost:${PORT}  → proxying /resume to ${RESUME_API_BASE}`)
  if (!RESUME_AGENT_API_KEY) console.warn('[warn] RESUME_AGENT_API_KEY is unset — /api/resume will fail against a key-gated backend.')
})
