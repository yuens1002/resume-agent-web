/*
 * Machine-readable surface for the portfolio domain.
 *
 * The site is a client-rendered SPA, so a non-JS consumer (LLM browse tool, crawler)
 * fetching www.yuens.me would otherwise see only the title + an empty <div id="root">.
 * This module makes the served HTML self-describing — JSON-LD (schema.org/Person) +
 * a crawlable <noscript> profile + discovery links — and serves real robots.txt /
 * llms.txt files, with the actual machine API living on agent.yuens.me.
 *
 * Data is fetched fresh from /info and cached in memory (loaded at boot, refreshed on a
 * timer), so the hot path is ~0ms and profile edits propagate without a redeploy.
 */
import type {
  PublicProfile,
  BackendSkill,
  BackendEmployment,
  BackendEducation,
  BackendProject,
} from '../src/lib/types.ts'

const RESUME_API_BASE = (process.env.RESUME_API_BASE ?? 'https://agent.yuens.me').replace(/\/$/, '')
export const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://www.yuens.me').replace(/\/$/, '')
// Role is derived from the live profile (availability.preferred_roles), not hardcoded,
// so the published title stays honest as the candidate re-targets. Fallback only if absent.
const FALLBACK_ROLE = 'Frontend / Full-stack Engineer'

let cached: PublicProfile | null = null

/** Fetch /info into the in-memory cache; keep last-known on failure. */
export async function refreshProfile(): Promise<void> {
  try {
    // Bounded timeout so a stalled backend can't hang server startup; keep last-known on failure.
    const res = await fetch(`${RESUME_API_BASE}/info`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) cached = (await res.json()) as PublicProfile
    else console.warn('[machine] /info responded', res.status)
  } catch (err) {
    console.warn('[machine] /info fetch failed:', err instanceof Error ? err.message : err)
  }
}
export function getProfile(): PublicProfile | null {
  return cached
}

// ── observations cache (GET /observations — the dated, authored reasoning trail) ──
export interface PublicObservation {
  id: string
  date: string
  captured_at?: string
  type: string
  topics: string[]
  content: string
  /** Backend-issued citation URL (agent.yuens.me/observations/:id). */
  url: string
}

let cachedObs: PublicObservation[] = []

/** Fetch /observations into the in-memory cache; keep last-known on failure. */
export async function refreshObservations(): Promise<void> {
  try {
    const res = await fetch(`${RESUME_API_BASE}/observations`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.warn('[machine] /observations responded', res.status)
      return
    }
    const body = (await res.json()) as { observations?: PublicObservation[] }
    if (Array.isArray(body.observations)) cachedObs = body.observations
  } catch (err) {
    console.warn('[machine] /observations fetch failed:', err instanceof Error ? err.message : err)
  }
}
export function getObservations(): PublicObservation[] {
  return cachedObs
}

/**
 * Automated sync/telemetry entries mixed into the feed alongside authored notes
 * (e.g. "VERSION DRIFT [repo]: package.json@x is ahead of CHANGELOG@y"). They are
 * type `observation` like everything else, so type filtering can't separate them.
 *
 * This is a FRONTEND-SIDE STOPGAP: publishing these as indexable pages would be thin
 * content. The durable fix is a backend flag on /observations (resume-agent#222) —
 * once that ships, delete this and filter server-side.
 */
const MACHINE_TOPICS = new Set(['version_drift', 'sync_warning'])
export function isAuthoredObservation(o: PublicObservation): boolean {
  if ((o.topics ?? []).some((t) => MACHINE_TOPICS.has(t))) return false
  return (o.content ?? '').trim().length >= 120
}

// ── helpers ──
const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const year = (d?: string | null): string => (d ? (/^(\d{4})/.exec(d.trim())?.[1] ?? '') : '')
const period = (s?: string, e?: string | null): string => {
  const a = year(s)
  if (!a) return e ? year(e) : 'now'
  if (e === null) return `${a}–now`
  const b = year(e)
  return b && b !== a ? `${a}–${b}` : a
}
const flatSkills = (skills: BackendSkill[] = []): string[] => skills.flatMap((s) => s.items ?? [])
const absoluteUrl = (u?: string): string | undefined =>
  u ? (u.startsWith('http') ? u : `https://${u.replace(/^\/+/, '')}`) : undefined

/** Declared target roles from the live profile (or a fallback). */
const roleList = (p: PublicProfile): string[] =>
  p.availability?.preferred_roles?.length ? p.availability.preferred_roles : [FALLBACK_ROLE]
const roleStr = (p: PublicProfile): string => roleList(p).join(' / ')

/** Collapse whitespace and trim to ≤max chars at a word boundary (SEO descriptions want ~155–160). */
export function clamp(s: string | undefined, max = 160): string {
  const t = (s ?? '').trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  const cut = t.slice(0, max - 5)
  return `${cut.slice(0, cut.lastIndexOf(' ')).trim()}…`
}

/** SEO meta description = the live summary, trimmed to ~155 chars at a word boundary. */
export function metaDescription(p: PublicProfile): string {
  return clamp(p.summary)
}

// ── JSON-LD (schema.org ProfilePage → Person) ──
export function buildJsonLd(p: PublicProfile): string {
  const c = p.contact ?? ({} as PublicProfile['contact'])
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateModified: p.updated_at,
    mainEntity: {
      '@type': 'Person',
      name: c.name,
      jobTitle: roleList(p),
      description: p.summary,
      url: SITE_URL,
      ...(c.email ? { email: `mailto:${c.email}` } : {}),
      sameAs: [c.github, c.linkedin].map(absoluteUrl).filter(Boolean),
      knowsAbout: flatSkills(p.skills),
      alumniOf: (p.education ?? []).map((ed: BackendEducation) => ({
        '@type': 'EducationalOrganization',
        name: ed.institution,
      })),
      subjectOf: (p.projects ?? []).map((pr: BackendProject) => ({
        '@type': 'CreativeWork',
        name: pr.name,
        description: pr.description,
        ...(absoluteUrl(pr.url || pr.repo) ? { url: absoluteUrl(pr.url || pr.repo) } : {}),
      })),
    },
  }
  // Escape `<` so a profile value containing `</script>` can't break out of the tag.
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
}

// ── discovery links + JSON-LD for <head> ──
export function buildHeadInjection(p: PublicProfile): string {
  return (
    buildJsonLd(p) +
    `<link rel="alternate" type="application/json" href="${RESUME_API_BASE}/info" title="Profile data (JSON)">` +
    `<link rel="alternate" type="application/json" href="${RESUME_API_BASE}/.well-known/agent-card.json" title="A2A agent card">`
  )
}

// ── crawlable profile for non-JS consumers (kept in <noscript>) ──
export function buildNoscript(p: PublicProfile): string {
  const c = p.contact ?? ({} as PublicProfile['contact'])
  const skills = (p.skills ?? [])
    .map((s: BackendSkill) => `<p><strong>${esc(s.category)}:</strong> ${esc((s.items ?? []).join(', '))}</p>`)
    .join('')
  const jobs = (p.employment ?? [])
    .map(
      (e: BackendEmployment) =>
        `<li><strong>${esc(e.company)}</strong> — ${esc(e.title)} (${esc(period(e.start_date, e.end_date))})<ul>` +
        (e.bullets ?? []).map((b) => `<li>${esc(b)}</li>`).join('') +
        `</ul></li>`,
    )
    .join('')
  const projects = (p.projects ?? [])
    .map((pr: BackendProject) => {
      const link = absoluteUrl(pr.url || pr.repo)
      return `<li><strong>${esc(pr.name)}</strong> — ${esc(pr.description)}${link ? ` (${esc(link)})` : ''}</li>`
    })
    .join('')
  const edu = (p.education ?? [])
    .map((ed: BackendEducation) => `<li>${esc(ed.institution)} — ${esc([ed.degree, ed.field].filter(Boolean).join(', '))} (${esc(year(ed.end_date))})</li>`)
    .join('')

  return (
    `<noscript><main>` +
    `<h1>${esc(c.name)}</h1><p>${esc(roleStr(p))}${c.email ? ` · ${esc(c.email)}` : ''}</p>` +
    `<p>${esc(p.summary)}</p>` +
    `<h2>Skills</h2>${skills}` +
    `<h2>Experience</h2><ul>${jobs}</ul>` +
    `<h2>Projects</h2><ul>${projects}</ul>` +
    `<h2>Education</h2><ul>${edu}</ul>` +
    `<p>Machine-readable endpoints: <a href="${RESUME_API_BASE}/info">profile JSON</a>, ` +
    `<a href="${RESUME_API_BASE}/.well-known/agent-card.json">A2A agent card</a>, ` +
    `<a href="${SITE_URL}/llms.txt">llms.txt</a>. Ask questions over HTTP (POST ${RESUME_API_BASE}/query) ` +
    `or MCP (${RESUME_API_BASE}/public-mcp, tool ask_candidate).</p>` +
    `</main></noscript>`
  )
}

// ══ crawlable HTML pages (real per-route documents, not the SPA shell) ══

const DEFAULT_OG_IMAGE = '/og-default.jpg'

/**
 * Per-project OG image convention: `scripts/make-og-images.mjs` writes a 1200×630
 * `<slug>-og.jpg` beside each `<slug>.webp` cover in the same public bucket, so the
 * OG URL is a pure transform of the backend's `cover` — no backend change needed, and
 * both halves of the convention live in this repo. JPEG rather than the cover's WebP
 * because LinkedIn does not render WebP link previews (Slack and X do).
 */
export function ogImageForCover(cover?: string): string | undefined {
  return cover?.endsWith('.webp') ? cover.replace(/\.webp$/, '-og.jpg') : undefined
}

export interface PageMeta {
  title: string
  description: string
  /** Site-relative path, e.g. `/projects/foo` — canonical + og:url are built from it. */
  path: string
  /** Absolute image URL; falls back to the site-wide default. */
  image?: string
  type?: 'website' | 'article'
}

const setMeta = (html: string, attr: 'name' | 'property', key: string, value: string): string =>
  html.replace(new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), (_m, a, b) => a + esc(value) + b)

/**
 * Rewrite the built shell's <head> for one page. Values are escaped here so callers pass
 * raw strings. Also rewrites any leftover `%VITE_SITE_URL%` — Vite only substitutes it
 * when the env var is set at build time, so this keeps canonical/og:url correct even if
 * a build ran without it.
 */
export function applyMeta(baseHtml: string, meta: PageMeta): string {
  const url = `${SITE_URL}${meta.path}`
  const image = meta.image ?? `${SITE_URL}${DEFAULT_OG_IMAGE}`
  let h = baseHtml
    .replace(/%VITE_SITE_URL%/g, SITE_URL)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_m, a, b) => a + esc(url) + b)
  h = setMeta(h, 'name', 'description', meta.description)
  h = setMeta(h, 'property', 'og:title', meta.title)
  h = setMeta(h, 'property', 'og:description', meta.description)
  h = setMeta(h, 'property', 'og:url', url)
  h = setMeta(h, 'property', 'og:image', image)
  h = setMeta(h, 'property', 'og:type', meta.type ?? 'website')
  h = setMeta(h, 'name', 'twitter:title', meta.title)
  h = setMeta(h, 'name', 'twitter:description', meta.description)
  h = setMeta(h, 'name', 'twitter:image', image)
  return h
}

/** Head-only render — the SPA still boots; the document just describes itself properly. */
export function renderShell(baseHtml: string, meta: PageMeta, headExtra = ''): string {
  const h = applyMeta(baseHtml, meta)
  return headExtra ? h.replace('</head>', `${headExtra}\n</head>`) : h
}

/**
 * A real standalone document: same head / CSS / fonts as the SPA, but the React bundle
 * is dropped and content is server-rendered into #root. Crawlers and humans get the same
 * markup, and nothing hydrates so there is no mismatch to reconcile. The SPA has no
 * client-side router — these routes exist only here.
 */
export function renderStaticPage(baseHtml: string, meta: PageMeta, bodyHtml: string, headExtra = ''): string {
  return renderShell(baseHtml, meta, headExtra)
    .replace(/<script type="module"[^>]*>\s*<\/script>/, '')
    .replace('<div id="root"></div>', bodyHtml)
}

// ── shared page furniture ──
const masthead = (p: PublicProfile): string =>
  `<header class="hdr"><div class="hdr-id">` +
  `<a class="hdr-name" href="/">${esc(p.contact?.name)}</a>` +
  `<span class="hdr-role">${esc(roleStr(p))}</span>` +
  `</div></header>`

const askCta = (label: string): string =>
  `<p style="margin:30px 0 0"><a class="chip solid" href="/">${esc(label)}</a></p>`

const eyebrow = (s: string): string => `<p class="greet-eyebrow" style="margin:0 0 10px">${esc(s)}</p>`

const projectPeriod = (pr: BackendProject): string => {
  const startYear = year(pr.started)
  return pr.status === 'archived' || !startYear ? startYear : `${startYear} — now`
}

/** JSON-LD for one project (schema.org CreativeWork authored by the profile's Person). */
function projectJsonLd(pr: BackendProject, p: PublicProfile): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: pr.name,
    description: pr.description,
    url: `${SITE_URL}/projects/${pr.slug}`,
    ...(pr.cover ? { image: pr.cover } : {}),
    ...(pr.tech?.length ? { keywords: pr.tech.join(', ') } : {}),
    ...(absoluteUrl(pr.repo) ? { codeRepository: absoluteUrl(pr.repo) } : {}),
    author: { '@type': 'Person', name: p.contact?.name, url: SITE_URL },
  }
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
}

// ── /projects ──
export function projectsIndexMeta(p: PublicProfile): PageMeta {
  const names = (p.projects ?? []).map((pr) => pr.name)
  const name = p.contact?.name ?? 'the candidate'
  return {
    title: `Projects — ${name}`,
    description: clamp(
      names.length
        ? `${names.length} shipped projects by ${name}: ${names.join(', ')}.`
        : `Selected work by ${name}.`,
    ),
    path: '/projects',
  }
}

export function buildProjectsIndex(p: PublicProfile): string {
  const rows = (p.projects ?? [])
    .map(
      (pr) =>
        `<a class="prow" href="/projects/${esc(pr.slug)}">` +
        `<span class="prow-thumb">${pr.cover ? `<img class="cover-img" src="${esc(pr.cover)}" alt="" loading="lazy">` : ''}</span>` +
        `<span class="prow-main">` +
        `<span class="prow-name">${esc(pr.name)}</span>` +
        `<span class="prow-tag">${esc(pr.description)}</span>` +
        `</span>` +
        `<span class="prow-meta">${esc(projectPeriod(pr))}</span>` +
        `</a>`,
    )
    .join('')

  return (
    `<div class="app">${masthead(p)}<main style="padding-bottom:60px">` +
    `${eyebrow('/projects')}` +
    `<h1 class="feat-title" style="font-size:34px;margin-bottom:10px">Projects</h1>` +
    `<p class="feat-tag" style="max-width:60ch;margin-bottom:24px">${esc(clamp(p.summary, 240))}</p>` +
    `<div class="card"><div class="plist">${rows}</div></div>` +
    askCta('Ask the agent about any of this →') +
    `</main></div>`
  )
}

// ── /projects/:slug ──
export function projectPageMeta(pr: BackendProject): PageMeta {
  return {
    title: `${pr.name} — ${clamp(pr.description, 70)}`,
    description: clamp(pr.description),
    path: `/projects/${pr.slug}`,
    image: ogImageForCover(pr.cover),
    type: 'article',
  }
}

export function buildProjectPage(pr: BackendProject, p: PublicProfile): string {
  const para = (s?: string): string => (s?.trim() ? `<p>${esc(s)}</p>` : '')
  const dsec = (heading: string, inner: string): string =>
    inner ? `<div class="dsec"><h4>${esc(heading)}</h4>${inner}</div>` : ''
  const bullets = (xs?: string[]): string =>
    xs?.length ? `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''
  const demo = absoluteUrl(pr.url)
  const repo = absoluteUrl(pr.repo)

  return (
    `<div class="app">${masthead(p)}<main class="detail-body" style="padding:0 0 60px">` +
    `${eyebrow(`/projects/${pr.slug}`)}` +
    `<h1 class="feat-title" style="font-size:34px">${esc(pr.name)}</h1>` +
    `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">` +
    `<span class="badge">${esc(pr.status)}</span>` +
    `<span class="prow-meta">${esc(projectPeriod(pr))}</span>` +
    `</div>` +
    `<p style="font-family:var(--serif);font-size:20px;line-height:1.45;margin:0;color:var(--ink)">${esc(pr.description)}</p>` +
    (pr.cover
      ? `<img class="cover-img" src="${esc(pr.cover)}" alt="${esc(pr.name)} screenshot" style="width:100%;border-radius:var(--r);border:1px solid var(--hair-2)">`
      : '') +
    dsec('The problem', para(pr.problem)) +
    dsec('My role', para(pr.role)) +
    dsec('Highlights', bullets(pr.highlights)) +
    dsec('Architecture', para(pr.architecture)) +
    dsec('Impact', para(pr.impact)) +
    dsec('Stack', `<div class="techrow">${(pr.tech ?? []).map((t) => `<span class="tech">${esc(t)}</span>`).join('')}</div>`) +
    (demo || repo
      ? `<div class="btnrow">` +
        (demo ? `<a class="btn" href="${esc(demo)}">${esc(pr.urlLabel ?? 'Live demo')}</a>` : '') +
        (repo ? `<a class="btn ghost" href="${esc(repo)}">View repo</a>` : '') +
        `</div>`
      : '') +
    askCta('Ask the agent about this project →') +
    `</main></div>`
  )
}

/** Extra <head> content for a project page (JSON-LD). */
export function projectPageHead(pr: BackendProject, p: PublicProfile): string {
  return projectJsonLd(pr, p)
}

// ── /observations (index only — per-observation pages wait on the backend filter) ──
export function observationsIndexMeta(p: PublicProfile): PageMeta {
  const name = p.contact?.name ?? 'the candidate'
  return {
    title: `Observations — ${name}`,
    description: clamp(
      `Dated, public reasoning notes by ${name} — the "why" behind the projects, captured as work happened and citable by URL.`,
    ),
    path: '/observations',
  }
}

/*
 * These notes run long — several are full essays — so the index collapses each into a
 * native <details>. The complete text stays in the markup (crawlers index content inside
 * <details>; it is only visually collapsed), which matters because this is currently the
 * only page carrying it. When per-observation pages land, swap the expander for a link to
 * /observations/:id and cut this back to the excerpt, so the full text lives in one place.
 */
export function buildObservationsIndex(p: PublicProfile, obs: PublicObservation[]): string {
  const items = obs
    .map(
      (o) =>
        `<li class="obsrow"><details>` +
        `<summary>` +
        `<span class="prow-meta">${esc(o.date)}</span>` +
        `<span class="badge muted">${esc(o.type)}</span>` +
        `<span class="obs-excerpt">${esc(clamp(o.content, 150))}</span>` +
        `</summary>` +
        `<p class="obs-body">${esc(o.content)}</p>` +
        `<div class="techrow">${(o.topics ?? []).map((t) => `<span class="tech">${esc(t)}</span>`).join('')}</div>` +
        `</details></li>`,
    )
    .join('')

  return (
    `<div class="app">${masthead(p)}<main style="padding-bottom:60px">` +
    `${eyebrow('/observations')}` +
    `<h1 class="feat-title" style="font-size:34px;margin-bottom:10px">Observations</h1>` +
    `<p class="feat-tag" style="max-width:60ch;margin-bottom:8px">` +
    `Dated notes captured while the work happened — the reasoning trail behind the projects. ` +
    `Each one is also available as JSON from <a href="${RESUME_API_BASE}/observations">the agent API</a>.` +
    `</p>` +
    (items
      ? `<ul class="obslist">${items}</ul>`
      : `<p class="feat-tag" style="margin-top:24px">No observations published yet.</p>`) +
    askCta('Ask the agent about any of this →') +
    `</main></div>`
  )
}

// ── /sitemap.xml ──
export function buildSitemap(p: PublicProfile | null, obs: PublicObservation[]): string {
  const day = (d?: string): string => (d ? (/^(\d{4}-\d{2}-\d{2})/.exec(d.trim())?.[1] ?? '') : '')
  const profileDay = day(p?.updated_at)
  const newestObs = obs.map((o) => day(o.date)).sort().pop() ?? profileDay

  const urls: Array<{ loc: string; lastmod: string; priority: string }> = [
    { loc: SITE_URL, lastmod: profileDay, priority: '1.0' },
  ]
  if (p?.projects?.length) {
    urls.push({ loc: `${SITE_URL}/projects`, lastmod: profileDay, priority: '0.8' })
    for (const pr of p.projects) {
      urls.push({ loc: `${SITE_URL}/projects/${pr.slug}`, lastmod: profileDay, priority: '0.7' })
    }
  }
  // Per-observation pages are not published yet (see isAuthoredObservation), so the
  // index is the only observation URL that belongs in the sitemap.
  if (obs.length) urls.push({ loc: `${SITE_URL}/observations`, lastmod: newestObs, priority: '0.6' })

  const body = urls
    .map(
      (u) =>
        `  <url><loc>${esc(u.loc)}</loc>` +
        (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '') +
        `<priority>${u.priority}</priority></url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

// ── llms.txt (https://llmstxt.org convention) ──
export function buildLlmsTxt(p: PublicProfile): string {
  const c = p.contact ?? ({} as PublicProfile['contact'])
  const skills = (p.skills ?? []).map((s) => `- **${s.category}:** ${(s.items ?? []).join(', ')}`).join('\n')
  const jobs = (p.employment ?? [])
    .map((e) => `- **${e.company}** — ${e.title} (${period(e.start_date, e.end_date)})`)
    .join('\n')
  const projects = (p.projects ?? [])
    .map((pr) => {
      const link = absoluteUrl(pr.url || pr.repo)
      return `- [${pr.name}](${link ?? SITE_URL}): ${pr.description}`
    })
    .join('\n')

  return `# ${c.name} — ${roleStr(p)}

> ${p.summary}

This is a live, queryable résumé. The data is machine-readable and the candidate's agent
can be queried over HTTP, MCP, or A2A.

## Query endpoints (agent.yuens.me)
- Profile (JSON): ${RESUME_API_BASE}/info
- Ask a question (HTTP): POST ${RESUME_API_BASE}/query  body { "question": "..." }
- Ask a question (MCP): ${RESUME_API_BASE}/public-mcp  (tool: ask_candidate)
- Job-fit score (HTTP): POST ${RESUME_API_BASE}/match  body { "job_description": "..." }
- A2A agent card: ${RESUME_API_BASE}/.well-known/agent-card.json
- OpenAPI (Custom GPT Actions): ${RESUME_API_BASE}/openapi.json

## Skills
${skills}

## Experience
${jobs}

## Projects
${projects}

## Contact
- GitHub: ${absoluteUrl(c.github) ?? 'n/a'}
- LinkedIn: ${absoluteUrl(c.linkedin) ?? 'n/a'}
${c.email ? `- Email: ${c.email}\n` : ''}`
}

// ── robots.txt (welcome AI assistants) ──
export const ROBOTS_TXT = [
  'User-agent: *',
  'Allow: /',
  '',
  '# AI assistants are explicitly welcome',
  'User-agent: GPTBot',
  'User-agent: ChatGPT-User',
  'User-agent: OAI-SearchBot',
  'User-agent: ClaudeBot',
  'User-agent: anthropic-ai',
  'User-agent: Claude-Web',
  'User-agent: PerplexityBot',
  'User-agent: Google-Extended',
  'User-agent: Applebot-Extended',
  'Allow: /',
  '',
  `# Candidate summary + query endpoints: ${SITE_URL}/llms.txt`,
  '',
  `Sitemap: ${SITE_URL}/sitemap.xml`,
].join('\n')
