/* Backend shapes (resume-agent /info, /query, /match, /resume) + UI view-models. */

// ── Backend: GET /info (public_profile row) ──
export interface BackendContact {
  name: string
  email: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
  website?: string
  calendly?: string
}
export interface BackendSkill {
  category: string
  items: string[]
}
export interface BackendEmployment {
  company: string
  title: string
  start_date: string
  end_date: string | null
  description?: string
  bullets: string[]
}
export interface BackendEducation {
  institution: string
  degree: string
  field: string
  start_date: string
  end_date: string | null
}
export interface BackendProject {
  name: string
  slug: string
  description: string
  problem: string
  role: string
  tech: string[]
  highlights: string[]
  architecture?: string
  impact?: string
  status: 'active' | 'in-progress' | 'archived'
  started?: string
  url?: string
  repo?: string
}
export interface BackendAvailability {
  seeking: boolean
  status: 'open' | 'actively-looking' | 'not-looking'
  preferred_roles: string[]
  preferred_locations: string[]
  remote: boolean
  start_date?: string
}
export interface PublicProfile {
  id: string
  contact: BackendContact
  summary: string
  skills: BackendSkill[]
  employment: BackendEmployment[]
  education: BackendEducation[]
  projects: BackendProject[]
  availability: BackendAvailability
  updated_at: string
}

// ── Backend: POST /query ──
export interface QueryResponse {
  answer: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
  follow_up_suggestions: string[]
}

// ── Backend: POST /match ──
export interface MatchScoring {
  skills: { matched: string[]; partial: string[]; missing: string[]; score: number }
  experience: { years: number; scope: number; recency: number; score: number }
  domain: { industry: number; product_type: number; scale: number; score: number }
}
export interface MatchResponse {
  fit_score: number
  matched: string[]
  gaps: string[]
  verdict: string
  recommended_action: 'apply' | 'apply-with-tailoring' | 'pass'
  scoring: MatchScoring
}

// ── Backend: POST /resume (final SSE event) ──
export interface ResumeRubric {
  total: number
  passed: boolean
  winner_model?: string
  keyword_coverage?: string
  [k: string]: unknown
}
export interface ResumeResponse {
  contact: BackendContact
  summary: string
  skills: BackendSkill[]
  employment: BackendEmployment[]
  education: BackendEducation[]
  projects: BackendProject[]
  _rubric?: ResumeRubric
}

// ── UI view-models (what components consume) ──
export type RenderKind = 'work' | 'fit' | 'about' | null

export interface ContactVM {
  name: string
  role: string
  email: string
  github?: string
  linkedin?: string
  calendly?: string
  site: string
  mcp: string
}
export interface EmploymentVM {
  company: string
  title: string
  period: string
  bullets: string[]
}
export interface EducationVM {
  school: string
  line: string
  year: string
}
export interface ProjectVM {
  slug: string
  name: string
  tagline: string
  status: string
  period: string
  tech: string[]
  problem: string
  role: string
  highlights: string[]
  architecture?: string
  impact?: string
  links: { demo?: string; repo?: string }
  featured: boolean
}
export interface AvailabilityVM {
  show: boolean
  label: string
}
export interface ProfileVM {
  contact: ContactVM
  summary: string
  skills: BackendSkill[]
  employment: EmploymentVM[]
  education: EducationVM[]
  projects: ProjectVM[]
  availability: AvailabilityVM
}

export interface Turn {
  key: string
  q: string
  answer: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
  followups: string[]
  render: RenderKind
  pending: boolean
  error?: boolean
}
