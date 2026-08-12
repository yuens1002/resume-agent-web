import { useRef, useState } from 'react'
import { match as matchApi, generateResume, ApiError } from '../lib/api.ts'
import { useProfile } from '../lib/profile-context.ts'
import type { MatchQualityCategory, MatchResponse, MatchScoredQuality } from '../lib/types.ts'
import { buildResumeHTML, LOADING_HTML, ERROR_HTML } from '../lib/resumeDoc.ts'
import { Btn, Card, Gauge, ScoreBar } from './ui.tsx'

// Realistic, keyword-dense postings tuned to the profile so the demo produces
// strong, representative scores (and clears the backend's thin-JD signal).
const SAMPLE_JDS = [
  {
    id: 'fe',
    label: 'Senior Frontend Engineer',
    text: `Senior Frontend Engineer

We're hiring a Senior Frontend Engineer to own our design system and ship accessible, high-performance web applications. You'll build and maintain reusable component libraries in React, TypeScript, and Next.js, drive WCAG 2.1 AA accessibility across the product, and partner closely with design and product.

Requirements:
- 5+ years building production single-page applications
- Deep React, TypeScript, and Next.js experience
- Strong testing culture: Jest, React Testing Library, Playwright
- Comfort with CI/CD, Core Web Vitals and performance optimization
- REST and GraphQL APIs

Bonus: experience integrating AI/LLM-powered features and streaming UIs.

Stack: React, TypeScript, Next.js, Tailwind CSS, Vitest/Playwright, GitHub Actions, Vercel.`,
  },
  {
    id: 'fs',
    label: 'Full-Stack (AI)',
    text: `Full-Stack Engineer, AI Products

Join a fast-moving team shipping LLM-powered features end to end. You'll build production UIs in React and Next.js with TypeScript, design and ship Node.js services backed by PostgreSQL and Prisma, and integrate AI/LLM capabilities — agent frameworks, prompt engineering, tool calling, and streaming responses.

Requirements:
- 5+ years across the full stack (TypeScript, React/Next.js, Node)
- PostgreSQL and an ORM (Prisma); REST/GraphQL APIs
- Testing discipline (Jest, Playwright) and CI/CD
- You've taken AI features from zero to production — real products, not demos
- High ownership, startup pace

Stack: TypeScript, React, Next.js, Node, PostgreSQL, Prisma, Vercel AI SDK.`,
  },
  {
    id: 'lead',
    label: 'Frontend Lead / Manager',
    text: `Frontend Engineering Lead

We're looking for a Frontend Engineering Lead to set technical direction and grow a team of 4–6 engineers. You'll own the architecture of our React/TypeScript/Next.js platform, establish design-system and accessibility (WCAG) standards, drive testing and CI/CD practices, and partner with product and design on the roadmap.

Requirements:
- 8+ years of frontend engineering, with 3+ years leading or managing teams (hiring, mentorship, performance)
- Deep React and TypeScript at scale
- Strong product sense and stakeholder communication
- Native mobile (React Native) a plus

This is a hands-on leadership role — roughly half architecture and code, half people and process.`,
  },
]

const ACTION_LABEL: Record<MatchResponse['recommended_action'], string> = {
  apply: 'strong match — apply',
  'apply-with-tailoring': 'good fit — tailor & apply',
  pass: 'likely a stretch',
}

function titleFromJD(jd: string): string {
  const first = jd.split('\n')[0] ?? ''
  return first.split(/\s[—–-]\s|[.,]/)[0].trim().slice(0, 52) || 'this role'
}

// No fixed weighting on the backend anymore — group whatever categories the JD
// actually raised and show a matched/total count per category instead of a %.
const CATEGORY_ORDER: MatchQualityCategory[] = ['skill', 'experience', 'domain']
const CATEGORY_LABEL: Record<string, string> = { skill: 'Skills', experience: 'Experience', domain: 'Domain' }

function categoryBreakdown(qualities: MatchScoredQuality[]) {
  const byCategory = new Map<string, MatchScoredQuality[]>()
  for (const q of qualities) {
    const items = byCategory.get(q.category)
    if (items) items.push(q)
    else byCategory.set(q.category, [q])
  }
  const rest = [...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c as MatchQualityCategory))
  const ordered = [...CATEGORY_ORDER.filter((c) => byCategory.has(c)), ...rest]
  return ordered.map((category) => {
    const items = byCategory.get(category)!
    const matched = items.filter((q) => q.verdict === 'matched').length
    return {
      category,
      label: CATEGORY_LABEL[category] ?? category[0].toUpperCase() + category.slice(1),
      matched,
      total: items.length,
      score: matched / items.length,
    }
  })
}

export function MatchResume() {
  const profile = useProfile()
  const [jd, setJd] = useState('')
  const [result, setResult] = useState<MatchResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [matchErr, setMatchErr] = useState('')
  const [gen, setGen] = useState<'idle' | 'generating'>('idle')
  const [genErr, setGenErr] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const runMatch = async (text?: string) => {
    const jdText = (text ?? jd).trim()
    if (!jdText) return
    if (text != null) setJd(text)
    setBusy(true)
    setResult(null)
    setMatchErr('')
    setGenErr('')
    try {
      setResult(await matchApi(jdText))
    } catch {
      setMatchErr("Couldn't score the fit right now — try again in a moment.")
    } finally {
      setBusy(false)
    }
  }

  const generate = async () => {
    const title = titleFromJD(jd)
    // Open the tab synchronously inside the click gesture so the browser doesn't
    // block it after the (async) fetch resolves.
    const win = window.open('', '_blank')
    if (win) win.document.write(LOADING_HTML)
    setGen('generating')
    setGenErr('')
    try {
      const resume = await generateResume(jd)
      const html = buildResumeHTML(resume, title)
      if (win) {
        win.document.open()
        win.document.write(html)
        win.document.close()
      } else {
        // Popup blocked — fall back to a Blob URL the visitor can open.
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
        if (!window.open(url, '_blank')) {
          setGenErr('Your browser blocked the new tab — allow pop-ups and try again.')
        }
      }
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 429
          ? 'Hit the hourly limit — please try again shortly.'
          : "Couldn't generate the résumé right now — please try again."
      setGenErr(msg)
      if (win) {
        win.document.open()
        win.document.write(ERROR_HTML(msg))
        win.document.close()
      }
    } finally {
      setGen('idle')
    }
  }

  const pct = result ? Math.round(result.fit_score * 100) : 0

  return (
    <Card pad className="fit">
      <textarea
        ref={taRef}
        placeholder="Paste a job description — I'll score the fit honestly against the role's skills, experience, and domain requirements…"
        value={jd}
        onChange={(e) => setJd(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn icon={busy ? undefined : 'arrow'} onClick={() => runMatch()} disabled={busy || !jd.trim()}>
          {busy ? 'Scoring…' : result ? 'Re-score' : 'Score the fit'}
        </Btn>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>or try:</span>
        {SAMPLE_JDS.map((j) => (
          <button key={j.id} className="mini-chip" onClick={() => runMatch(j.text)}>
            {j.label}
          </button>
        ))}
      </div>
      {matchErr && <span className="err-note">{matchErr}</span>}

      {result && (
        <div className="turn-anim" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 6 }}>
          <div className="fit-result">
            <Gauge pct={pct} />
            <div className="fit-verdict">
              <span className="rec">▸ {ACTION_LABEL[result.recommended_action]}</span>
              <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.45, color: 'var(--ink-2)' }}>
                {result.verdict}
              </p>
            </div>
          </div>

          {result.scoring.scored_qualities.length > 0 && (
            <div className="score-bars">
              {categoryBreakdown(result.scoring.scored_qualities).map((c) => (
                <ScoreBar key={c.category} label={c.label} weight={`${c.matched}/${c.total}`} score={c.score} />
              ))}
            </div>
          )}

          <div className="fit-cols">
            <div>
              <h5>Matched</h5>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {result.matched.map((m) => (
                  <span key={m} className="fit-tag ok">
                    <span className="mk">✓</span>
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h5>To tailor</h5>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {result.gaps.length ? (
                  result.gaps.map((m) => (
                    <span key={m} className="fit-tag gap">
                      <span className="mk">○</span>
                      {m}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>No notable gaps.</span>
                )}
              </div>
            </div>
          </div>

          {result.recommended_action !== 'pass' ? (
            <div className="gen-cta">
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>
                  Want a résumé tailored to this role?
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                  I'll re-frame the summary, reorder skills, and prioritize the most relevant bullets — then open it as a
                  printable PDF.
                </div>
                {genErr && <span className="err-note" style={{ marginTop: 6, display: 'block' }}>{genErr}</span>}
              </div>
              <Btn iconLeft={gen === 'generating' ? undefined : 'spark'} onClick={generate} disabled={gen === 'generating'}>
                {gen === 'generating' ? 'Generating…' : 'Generate tailored résumé'}
              </Btn>
            </div>
          ) : (
            <div className="gen-cta muted">
              <div style={{ flex: 1, minWidth: 180 }}>
                <span style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
                  This one looks like a stretch — happy to talk it through on a quick call instead.
                </span>
              </div>
              {profile.contact.calendly && (
                <Btn variant="ghost" iconLeft="calendar" href={profile.contact.calendly}>
                  Book a call
                </Btn>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
