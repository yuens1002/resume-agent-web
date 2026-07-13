import type {
  PublicProfile,
  QueryResponse,
  MatchResponse,
  ResumeResponse,
  VerifyGitEvidenceResponse,
} from './types.ts'

const API_BASE = (import.meta.env.VITE_API_BASE ?? 'https://agent.yuens.me').replace(/\/$/, '')

export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://yuens.me').replace(/\/$/, '')
export const MCP_URL = `${API_BASE}/public-mcp`
export const AGENT_CARD_URL = `${API_BASE}/.well-known/agent-card.json`
export const OEP_PUBLIC_KEY_URL = `${API_BASE}/.well-known/oep-public-key.json`

async function postJSON<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new ApiError(res.status, `${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** GET /info — full public profile (replaces the prototype's static profile.js). */
export async function getProfile(): Promise<PublicProfile> {
  const res = await fetch(`${API_BASE}/info`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new ApiError(res.status, `/info → ${res.status}`)
  return res.json() as Promise<PublicProfile>
}

/**
 * POST /query — grounded answer (JSON mode keeps sources + follow-ups).
 * The `x-agent-type: human` header opts into resume-agent's conversational answer
 * mode (short prose, no inline [n] markers / Sources block) once it ships — it's
 * ignored until then (CORS-verified to allow the header), so no redeploy needed.
 */
export function ask(question: string, context?: string): Promise<QueryResponse> {
  const body: Record<string, string> = { question }
  if (context) body.context = context
  return postJSON<QueryResponse>('/query', body, { 'x-agent-type': 'human' })
}

/**
 * GET /verify/git-evidence — OEP Phase 3 signature check for one project's git
 * evidence. The backend does the actual crypto verification; this just relays
 * the plain-English verdict (pass/fail/not_present/unsigned/key_not_configured).
 */
export async function verifyGitEvidence(slug: string): Promise<VerifyGitEvidenceResponse> {
  const res = await fetch(`${API_BASE}/verify/git-evidence?slug=${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new ApiError(res.status, `/verify/git-evidence → ${res.status}`)
  return res.json() as Promise<VerifyGitEvidenceResponse>
}

/** POST /match — deterministic weighted (50/30/20) job-fit score. */
export function match(job_description: string): Promise<MatchResponse> {
  return postJSON<MatchResponse>('/match', { job_description })
}

/**
 * POST /api/resume — same-origin proxy (server attaches the Bearer key and
 * collapses the backend SSE stream into one JSON payload). Never hits the
 * gated backend directly from the browser.
 */
export async function generateResume(job_description: string): Promise<ResumeResponse> {
  const res = await fetch('/api/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_description }),
  })
  if (!res.ok) {
    let detail = `/api/resume → ${res.status}`
    try {
      const j = (await res.json()) as { error?: string }
      if (j?.error) detail = j.error
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<ResumeResponse>
}
