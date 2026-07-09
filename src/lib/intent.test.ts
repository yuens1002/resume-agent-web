import { describe, expect, it } from 'vitest'
import { deriveRender, resolveRender } from './intent.ts'

describe('resolveRender (pre-response keyword guess)', () => {
  it('scores "work" above "about" for a project-named question', () => {
    expect(resolveRender('tell me about project artisan-roast')).toBe('work')
  })

  it('scores "about" for a broad experience question', () => {
    expect(resolveRender('tell me about your experience')).toBe('about')
  })

  it('returns null when no intent keywords match (declines/off-topic/gaps)', () => {
    expect(resolveRender('have you used Kubernetes?')).toBe(null)
    expect(resolveRender("what's the weather like?")).toBe(null)
  })
})

describe('deriveRender (post-response reconciliation)', () => {
  it('overrides a wrong "about" guess to "work" when the backend confirms project_slugs', () => {
    // The originally reported bug: "tell me about project X" misclassified as
    // 'about' pre-response, but the LLM answered with a specific project.
    expect(deriveRender('about', ['artisan-roast'])).toBe('work')
  })

  it('overrides a "null" guess to "work" when the backend confirms project_slugs', () => {
    expect(deriveRender(null, ['brew-guide'])).toBe('work')
  })

  it('keeps a correct "work" guess when the backend also confirms project_slugs', () => {
    expect(deriveRender('work', ['artisan-roast', 'brew-guide'])).toBe('work')
  })

  it('preserves the pre-response "work" guess when project_slugs is empty (WorkResult applies its own fallback)', () => {
    expect(deriveRender('work', [])).toBe('work')
  })

  it('preserves the pre-response "about" guess when project_slugs is empty', () => {
    expect(deriveRender('about', [])).toBe('about')
  })

  it('preserves "null" (no card) when project_slugs is empty — declines/gaps must not grow an About card', () => {
    expect(deriveRender(null, [])).toBe(null)
  })

  it('treats an undefined project_slugs field the same as empty', () => {
    expect(deriveRender('about', undefined)).toBe('about')
    expect(deriveRender(null, undefined)).toBe(null)
  })

  it('opens the fit card when action_intent signals open_match_tool, overriding any keyword guess', () => {
    expect(deriveRender('about', [], { tool: 'open_match_tool' })).toBe('fit')
    expect(deriveRender(null, [], { tool: 'open_match_tool' })).toBe('fit')
  })

  it('opens the fit card even when project_slugs is also non-empty', () => {
    expect(deriveRender('work', ['artisan-roast'], { tool: 'open_match_tool' })).toBe('fit')
  })

  it('ignores a null or absent action_intent and falls back to project_slugs/pre-response logic', () => {
    expect(deriveRender('work', ['artisan-roast'], null)).toBe('work')
    expect(deriveRender('about', [])).toBe('about')
  })
})
