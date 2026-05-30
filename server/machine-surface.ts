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
const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://www.yuens.me').replace(/\/$/, '')
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

/** SEO meta description = the live summary, trimmed to ~155 chars at a word boundary. */
export function metaDescription(p: PublicProfile): string {
  const s = (p.summary ?? '').trim()
  if (s.length <= 160) return s
  const cut = s.slice(0, 155)
  return `${cut.slice(0, cut.lastIndexOf(' ')).trim()}…`
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
].join('\n')
