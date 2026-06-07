import { useProfile } from '../lib/profile-context.ts'
import { Chip } from './ui.tsx'

const HEADLINE = "Ask the questions every static résumé hides from"

export function Greeting({ onAsk }: { onAsk: (q: string) => void }) {
  const profile = useProfile()
  const first = profile.contact.name.split(' ')[0]
  const starters = [
    `Tell me about ${first}`,
    'Show recent work',
    `What sets ${first} apart?`,
    `What's ${first}'s availability?`,
    'Match a job & tailor it',
  ]
  return (
    <div className="greet turn-anim">
      <span className="greet-eyebrow">A live, queryable résumé</span>
      <h1>{HEADLINE}</h1>
      <p className="lede">{profile.summary}</p>
      <div className="chiprow">
        {starters.map((s, i) => (
          <Chip key={s} hint={i === 0} onClick={() => onAsk(s)}>
            {s}
          </Chip>
        ))}
      </div>
    </div>
  )
}
