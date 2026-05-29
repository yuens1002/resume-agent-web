import { useProfile } from '../lib/profile-context.ts'
import { Chip } from './ui.tsx'

const HEADLINE = "Ask me anything — I'm a résumé you can actually talk to."

export const STARTERS = [
  'Show recent work',
  'Experience with AI?',
  'Are you available?',
  'Match a job & tailor my résumé',
  'Tell me about yourself',
]

export function Greeting({ onAsk }: { onAsk: (q: string) => void }) {
  const profile = useProfile()
  return (
    <div className="greet turn-anim">
      <span className="greet-eyebrow">A live, queryable résumé</span>
      <h1>{HEADLINE}</h1>
      <p className="lede">{profile.summary}</p>
      <div className="chiprow">
        {STARTERS.map((s, i) => (
          <Chip key={s} variant={i === 0 ? 'solid' : 'default'} onClick={() => onAsk(s)}>
            {s}
          </Chip>
        ))}
      </div>
    </div>
  )
}
