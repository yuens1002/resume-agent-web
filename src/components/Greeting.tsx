import { useProfile } from '../lib/profile-context.ts'
import { Chip } from './ui.tsx'

const HEADLINE = "Ask the questions every static résumé hides from"

// Exported so App.tsx can match this exact starter-chip text deterministically
// (same pattern as the "${first}'s Resume" chip) rather than routing it
// through /query's free-form action_intent classification — see App.tsx.
export const WORK_CHIP_TEXT = 'Show recent work'

export function Greeting({ onAsk }: { onAsk: (q: string) => void }) {
  const profile = useProfile()
  const first = profile.contact.name.split(' ')[0]
  const starters = [
    `Tell me about ${first}`,
    WORK_CHIP_TEXT,
    `What's ${first}'s availability?`,
    `${first}'s Resume`,
  ]
  return (
    <div className="greet turn-anim">
      <span className="greet-eyebrow">A live, queryable résumé</span>
      <h1>{HEADLINE}</h1>
      <p className="lede">
        Ask the agent any interviewing question, or click a starter chip. Cited work is backed
        by git history. Verifiable, not just claimed.
      </p>
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
