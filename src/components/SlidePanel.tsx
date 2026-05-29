import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'

/*
 * One right-slide-in panel shell (scrim + aside + sticky header + close).
 * Shared by ProjectDetail and the résumé doc — the prototype duplicated `.detail`
 * markup across both; this unifies it. Esc-to-close is handled globally in App.
 */
export function SlidePanel({
  kicker,
  title,
  ariaLabel,
  meta,
  actions,
  className = '',
  headerClassName = '',
  onClose,
  children,
}: {
  kicker: string
  title: string
  ariaLabel?: string
  meta?: ReactNode
  actions?: ReactNode
  className?: string
  headerClassName?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className={`detail${className ? ` ${className}` : ''}`} role="dialog" aria-label={ariaLabel ?? title}>
        <div className={`detail-head${headerClassName ? ` ${headerClassName}` : ''}`}>
          <div className="dh-main">
            <span className="detail-kicker">{kicker}</span>
            <h2>{title}</h2>
            {meta}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {actions}
            <button className="closebtn" onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
          </div>
        </div>
        {children}
      </aside>
    </>
  )
}
