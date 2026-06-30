import { useProfile } from '../lib/profile-context.ts'
import type { ProjectVM } from '../lib/types.ts'
import { Icon } from './Icon.tsx'
import { Badge, Btn, Card, TechPills } from './ui.tsx'
import { SlidePanel } from './SlidePanel.tsx'

/* ── Featured case study ── */
function FeaturedCase({ project, onOpen }: { project: ProjectVM; onOpen: (slug: string) => void }) {
  return (
    <div className={`card feat${project.cover ? '' : ' feat--noart'}`}>
      <div className="feat-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge>{project.status}</Badge>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>{project.period}</span>
        </div>
        <h3 className="feat-title">{project.name}</h3>
        <p className="feat-tag">{project.tagline}</p>
        <TechPills items={project.tech} max={6} />
        <div className="btnrow">
          <Btn icon="arrow" onClick={() => onOpen(project.slug)}>
            Open deep-dive
          </Btn>
          {project.links.demo && (
            <Btn variant="ghost" icon="link" href={project.links.demo}>
              Live demo
            </Btn>
          )}
        </div>
      </div>
      {project.cover && (
        <div className="feat-art">
          <img className="cover-img" src={project.cover} alt={`${project.name} screenshot`} loading="lazy" />
        </div>
      )}
    </div>
  )
}

/* ── Project list rows ── */
function ProjectList({ projects, onOpen }: { projects: ProjectVM[]; onOpen: (slug: string) => void }) {
  return (
    <Card>
      <div className="plist">
        {projects.map((p) => (
          <button key={p.slug} className="prow" onClick={() => onOpen(p.slug)}>
            <span className="prow-thumb">
              {p.cover && <img className="cover-img" src={p.cover} alt="" loading="lazy" />}
            </span>
            <span className="prow-main">
              <span className="prow-name">{p.name}</span>
              <span className="prow-tag">{p.tagline}</span>
            </span>
            <span className="prow-meta">{p.period.split('·')[0].trim()}</span>
            <span className="prow-arrow">
              <Icon name="arrow" style={{ width: 18, height: 18 }} />
            </span>
          </button>
        ))}
      </div>
    </Card>
  )
}

/* ── Work result ──
   Uses project_slugs (backend single source of truth) when available.
   Falls back to source-pill slugs, then to featured + 2 most recent. */
export function WorkResult({ projectSlugs = [], sources = [], onOpen }: { projectSlugs?: string[]; sources?: string[]; onOpen: (slug: string) => void }) {
  const { projects } = useProfile()

  // project_slugs → direct; sources → extract "projects.*" slugs as fallback
  const slugs = projectSlugs.length
    ? projectSlugs
    : sources.filter((s) => s.startsWith('projects.')).map((s) => s.slice('projects.'.length))

  const resolvedProjects = slugs
    .map((slug) => projects.find((p) => p.slug === slug))
    .filter(Boolean) as ProjectVM[]

  // Fallback: featured + up to 2 (only when backend declared no project slugs at all).
  // If slugs were declared but none resolved locally (slug rename, stale cache),
  // show nothing — same guard as the prior hasProjectSources behavior — to avoid
  // displaying unrelated cards while source pills name specific projects.
  const slugsDeclared = slugs.length > 0
  const fallbackProjects: ProjectVM[] = (() => {
    if (slugsDeclared || projects.length === 0) return []
    const featured = projects.find((p) => p.featured) ?? projects[0]
    return [featured, ...projects.filter((p) => p.slug !== featured.slug).slice(0, 2)]
  })()

  const displayProjects = resolvedProjects.length > 0 ? resolvedProjects : fallbackProjects
  const isSourceDriven = resolvedProjects.length > 0

  if (displayProjects.length === 0) return null

  const total = displayProjects.length
  const label = isSourceDriven
    ? `${total} project${total !== 1 ? 's' : ''}`
    : `${total} most recent project${total !== 1 ? 's' : ''}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        {label}
      </div>
      {isSourceDriven && total === 1 ? (
        <FeaturedCase project={displayProjects[0]} onOpen={onOpen} />
      ) : isSourceDriven ? (
        <ProjectList projects={displayProjects} onOpen={onOpen} />
      ) : (
        <>
          <FeaturedCase project={displayProjects[0]} onOpen={onOpen} />
          {displayProjects.slice(1).length > 0 && <ProjectList projects={displayProjects.slice(1)} onOpen={onOpen} />}
        </>
      )}
    </div>
  )
}

/* ── Project deep-dive overlay ── */
export function ProjectDetail({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { projects } = useProfile()
  const p = projects.find((x) => x.slug === slug)
  if (!p) return null
  return (
    <SlidePanel kicker={`/projects/${p.slug}`} title={p.name} onClose={onClose}>
      <div className="detail-body">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge>{p.status}</Badge>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-soft)' }}>{p.period}</span>
        </div>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1.45, margin: 0, color: 'var(--ink)' }}>
          {p.tagline}
        </p>

        {p.problem && (
          <div className="dsec">
            <h4>The problem</h4>
            <p>{p.problem}</p>
          </div>
        )}
        {p.role && (
          <div className="dsec">
            <h4>My role</h4>
            <p>{p.role}</p>
          </div>
        )}
        {p.highlights.length > 0 && (
          <div className="dsec">
            <h4>Highlights</h4>
            <ul>
              {p.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        )}
        {p.architecture && (
          <div className="dsec">
            <h4>Architecture</h4>
            <p>{p.architecture}</p>
          </div>
        )}
        {p.impact && (
          <div className="dsec">
            <h4>Impact</h4>
            <p>{p.impact}</p>
          </div>
        )}
        <div className="dsec">
          <h4>Stack</h4>
          <TechPills items={p.tech} />
        </div>
        <div className="btnrow">
          {p.links.demo && (
            <Btn icon="link" href={p.links.demo}>
              Live demo
            </Btn>
          )}
          {p.links.repo && (
            <Btn variant="ghost" icon="github" href={p.links.repo}>
              View repo
            </Btn>
          )}
        </div>
      </div>
    </SlidePanel>
  )
}

/* ── About result — skills grid + employment timeline + education ── */
export function AboutResult() {
  const { skills, employment, education } = useProfile()
  return (
    <Card pad className="about">
      <div className="skillgrid">
        {skills.map((s) => (
          <div key={s.category} className="skillcat">
            <h5>{s.category}</h5>
            <TechPills items={s.items} />
          </div>
        ))}
      </div>
      <div>
        <h5
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10.5,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            margin: '0 0 6px',
          }}
        >
          Experience
        </h5>
        <div className="tl">
          {employment.map((e) => (
            <div key={e.company + e.period} className="tl-row">
              <span className="tl-when">{e.period}</span>
              <div className="tl-what">
                <span className="tl-co">{e.company}</span>
                <span style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}> · {e.title}</span>
                <ul className="tl-bul">
                  {e.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)' }}>
        {education.map((ed) => (
          <span key={ed.school}>
            <strong style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{ed.school}</strong> · {ed.line} · {ed.year}
          </span>
        ))}
      </div>
    </Card>
  )
}
