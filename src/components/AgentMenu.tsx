import { useProfile } from '../lib/profile-context.ts'
import { AGENT_CARD_URL } from '../lib/api.ts'
import { Icon } from './Icon.tsx'
import { QrCode } from './QrCode.tsx'
import { CopyField } from './CopyField.tsx'

export function AgentMenu({ onClose }: { onClose: () => void }) {
  const { contact } = useProfile()
  return (
    <>
      <div className="scrim" style={{ background: 'transparent', backdropFilter: 'none' }} onClick={onClose} />
      <div className="menu" role="menu">
        <div className="menu-hero">
          <div className="qr">
            <QrCode data={contact.site} size={92} />
          </div>
          <div className="qr-cap">
            <span className="t">On the Go?</span>
            <span className="s">Scan to chat on mobile</span>
          </div>
        </div>
        <div className="menu-list">
          <div
            style={{
              padding: '8px 12px 4px',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
            }}
          >
            For machines
          </div>
          <CopyField value={contact.mcp} label="Connect via MCP" />
          <a className="menu-item" href={AGENT_CARD_URL} target="_blank" rel="noreferrer">
            <span className="mi-ic">
              <Icon name="doc" />
            </span>
            <span className="mi-main">
              <span className="mi-t">Agent card</span>
              <span className="mi-s">/.well-known/agent-card.json</span>
            </span>
            <span className="mi-act">A2A</span>
          </a>
          {contact.github && (
            <a className="menu-item" href={contact.github} target="_blank" rel="noreferrer">
              <span className="mi-ic">
                <Icon name="github" />
              </span>
              <span className="mi-main">
                <span className="mi-t">GitHub</span>
                <span className="mi-s">{contact.github.replace(/^https?:\/\//, '')}</span>
              </span>
              <span className="mi-act">↗</span>
            </a>
          )}
        </div>
      </div>
    </>
  )
}
