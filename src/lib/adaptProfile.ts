import type {
  PublicProfile,
  ProfileVM,
  EmploymentVM,
  EducationVM,
  ProjectVM,
  AvailabilityVM,
} from './types.ts'
import { SITE_URL, MCP_URL } from './api.ts'

const DEFAULT_ROLE = 'Full systems. Every layer. One engineer.'

/** "2023-08" | "2023" | "" → "2023" (year only); blank → "". */
export function year(date: string | null | undefined): string {
  if (!date) return ''
  const m = /^(\d{4})/.exec(date.trim())
  return m ? m[1] : ''
}

/** start/end → "2020 — 22" | "2023 — now". */
export function periodFrom(start: string, end: string | null): string {
  const s = year(start)
  if (!s) return end ? year(end) : 'now'
  if (end === null) return `${s} — now`
  const e = year(end)
  if (!e || e === s) return s
  // abbreviate same-century end year ("2022" → "22") to match the prototype's compact style
  return `${s} — ${e.slice(0, 2) === s.slice(0, 2) ? e.slice(2) : e}`
}

function availabilityVM(a: PublicProfile['availability']): AvailabilityVM {
  if (!a || a.status === 'not-looking') return { show: false, label: '' }
  return { show: true, label: 'Open to work' }
}

function projectVM(p: PublicProfile['projects'][number], featured: boolean): ProjectVM {
  const startYear = year(p.started)
  const period =
    p.status === 'archived' || !startYear
      ? startYear || ''
      : `${startYear} — now`
  return {
    slug: p.slug,
    name: p.name,
    tagline: p.description,
    status: p.status,
    period,
    tech: p.tech ?? [],
    problem: p.problem,
    role: p.role,
    highlights: p.highlights ?? [],
    architecture: p.architecture,
    impact: p.impact,
    links: { demo: p.url || undefined, demoLabel: p.urlLabel || undefined, repo: p.repo || undefined },
    featured,
    cover: p.cover || undefined,
  }
}

/** Map the backend's public_profile row onto the UI view-model the components expect. */
export function adaptProfile(raw: PublicProfile): ProfileVM {
  const c = raw.contact
  const featuredIdx = Math.max(
    0,
    raw.projects.findIndex((p) => p.status === 'active'),
  )

  const employment: EmploymentVM[] = raw.employment.map((e) => ({
    company: e.company,
    title: e.title,
    period: periodFrom(e.start_date, e.end_date),
    bullets: e.bullets ?? [],
  }))

  const education: EducationVM[] = raw.education.map((ed) => ({
    school: ed.institution,
    line: [ed.degree, ed.field].filter(Boolean).join(', '),
    year: year(ed.end_date) || year(ed.start_date),
  }))

  const projects: ProjectVM[] = raw.projects.map((p, i) => projectVM(p, i === featuredIdx))

  return {
    contact: {
      name: c.name,
      role: raw.tagline
        ?? (raw.availability?.preferred_roles?.length
          ? raw.availability.preferred_roles.join(' / ')
          : DEFAULT_ROLE),
      email: c.email,
      github: c.github,
      linkedin: c.linkedin,
      calendly: c.calendly,
      site: SITE_URL,
      mcp: MCP_URL,
    },
    summary: raw.summary,
    skills: raw.skills ?? [],
    employment,
    education,
    projects,
    availability: availabilityVM(raw.availability),
  }
}
