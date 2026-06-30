import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon.tsx'

/* ── Btn — solid (default) or ghost; renders <button> or <a href> ── */
type BtnBase = { variant?: 'solid' | 'ghost'; icon?: string; iconLeft?: string; children: ReactNode }
export function Btn(
  props: BtnBase & (ButtonHTMLAttributes<HTMLButtonElement> | (AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })),
) {
  const { variant = 'solid', icon, iconLeft, children, ...rest } = props as BtnBase & Record<string, unknown>
  const className = `btn${variant === 'ghost' ? ' ghost' : ''}`
  const inner = (
    <>
      {iconLeft && <Icon name={iconLeft} />}
      {children}
      {icon && <Icon name={icon} />}
    </>
  )
  if ('href' in rest && rest.href) {
    return (
      <a className={className} target="_blank" rel="noreferrer" {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {inner}
      </a>
    )
  }
  return (
    <button className={className} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {inner}
    </button>
  )
}

/* ── Chip — starter / follow-up (default|solid) and composer hints (mini) ── */
export function Chip({
  variant = 'default',
  hint = false,
  onClick,
  children,
}: {
  variant?: 'default' | 'solid' | 'mini'
  hint?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  const base = variant === 'mini' ? 'mini-chip' : variant === 'solid' ? 'chip solid' : 'chip'
  return (
    <button className={hint ? `${base} chip--hint` : base} onClick={onClick}>
      {children}
    </button>
  )
}

/* ── Badge — status badge, optional leading dot ── */
export function Badge({
  muted = false,
  dot = true,
  children,
}: {
  muted?: boolean
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span className={`badge${muted ? ' muted' : ''}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}

/* ── Pill — availability (green pulse) ── */
export function Pill({ label }: { label: string }) {
  return (
    <span className="avail">
      <span className="pulse" />
      {label}
    </span>
  )
}

/* ── Card / CardPad ── */
export function Card({ pad = false, className = '', children }: { pad?: boolean; className?: string; children: ReactNode }) {
  return <div className={`card${pad ? ' card-pad' : ''}${className ? ` ${className}` : ''}`}>{children}</div>
}

/* ── TechPills — a row of .tech chips, with optional +N overflow ── */
export function TechPills({ items, max }: { items: string[]; max?: number }) {
  const shown = max ? items.slice(0, max) : items
  const extra = max && items.length > max ? items.length - max : 0
  return (
    <div className="techrow">
      {shown.map((t) => (
        <span key={t} className="tech">
          {t}
        </span>
      ))}
      {extra > 0 && <span className="tech">+{extra}</span>}
    </div>
  )
}

/* ── SectionHeader — mono-uppercase + hairline (project-detail sections) ── */
export function SectionHeader({ children }: { children: ReactNode }) {
  return <h4>{children}</h4>
}

/* ── Avatar — the agent glyph ── */
export function Avatar() {
  return (
    <div className="agent-avatar">
      <Icon name="agent" />
    </div>
  )
}

/* ── Gauge — animated fit ring ── */
export function Gauge({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 46
  return (
    <div className="gauge">
      <svg width="108" height="108" viewBox="0 0 108 108">
        <circle cx="54" cy="54" r="46" fill="none" stroke="var(--hair)" strokeWidth="8" />
        <circle
          cx="54"
          cy="54"
          r="46"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.7,.3,1)' }}
        />
      </svg>
      <div className="num">
        {pct}
        <small>fit</small>
      </div>
    </div>
  )
}

/* ── ScoreBar — weighted 50/30/20 breakdown bar ── */
export function ScoreBar({ label, weight, score }: { label: string; weight: string; score: number }) {
  return (
    <div className="sbar">
      <div className="sbar-head">
        <span className="sbar-label">{label}</span>
        <span className="sbar-weight">{weight}</span>
        <span className="sbar-score">{Math.round(score * 100)}</span>
      </div>
      <div className="sbar-track">
        <div className="sbar-fill" style={{ width: `${Math.round(score * 100)}%` }} />
      </div>
    </div>
  )
}

/* ── SourcePills + FollowupChips — revealed under an answer ── */
export function SourcePills({ sources }: { sources: string[] }) {
  if (!sources.length) return null
  return (
    <div className="sources">
      <span className="lbl">sources</span>
      {sources.map((s) => (
        <span key={s} className="src">
          {s}
        </span>
      ))}
    </div>
  )
}

export function FollowupChips({
  items,
  shownProjects = [],
  onAsk,
}: {
  items: string[]
  shownProjects?: string[]
  onAsk: (q: string, context?: string) => void
}) {
  if (!items.length) return null
  const context = shownProjects.length ? `shown_projects: ${shownProjects.join(', ')}` : undefined
  return (
    <div className="followups">
      <span className="lbl">follow-ups</span>
      {items.map((f) => (
        <Chip key={f} onClick={() => onAsk(f, context)}>
          {f}
        </Chip>
      ))}
    </div>
  )
}
