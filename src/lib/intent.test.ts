import { describe, expect, it } from 'vitest'
import { deriveRender, resolveRender, mostRecentProjectSlugs, parseShownProjectSlugs } from './intent.ts'
import type { ProjectVM } from './types.ts'

function fakeProject(slug: string, started: string | undefined): ProjectVM {
  return {
    slug,
    name: slug,
    tagline: '',
    status: 'active',
    period: '',
    started,
    tech: [],
    problem: '',
    role: '',
    highlights: [],
    links: {},
    featured: false,
  }
}

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

// resume-agent#180–#190: the model's action_intent judgment proved unreliable
// for the "Show recent work" starter chip specifically (the exact question +
// the "human" caller-context the frontend always sends). Rendering the top
// projects directly from the already-loaded profile removes the model
// judgment call from this one closed, deterministic input entirely — see
// App.tsx's WORK_CHIP_TEXT branch.
describe('mostRecentProjectSlugs (deterministic "Show recent work" render)', () => {
  it('returns the N most recently started project slugs, newest first', () => {
    const projects = [
      fakeProject('oldest', '2020-01'),
      fakeProject('newest', '2026-01'),
      fakeProject('middle', '2023-01'),
    ]
    expect(mostRecentProjectSlugs(projects, 2)).toEqual(['newest', 'middle'])
  })

  it('returns fewer than count when the profile has fewer projects', () => {
    const projects = [fakeProject('only-one', '2025-01')]
    expect(mostRecentProjectSlugs(projects, 3)).toEqual(['only-one'])
  })

  it('returns an empty array for an empty profile', () => {
    expect(mostRecentProjectSlugs([], 3)).toEqual([])
  })

  it('treats a missing started date as oldest, not crashing or sorting first', () => {
    const projects = [
      fakeProject('no-date', undefined),
      fakeProject('has-date', '2024-01'),
    ]
    expect(mostRecentProjectSlugs(projects, 2)).toEqual(['has-date', 'no-date'])
  })

  it('does not mutate the input array', () => {
    const projects = [fakeProject('b', '2020-01'), fakeProject('a', '2026-01')]
    const original = [...projects]
    mostRecentProjectSlugs(projects, 2)
    expect(projects).toEqual(original)
  })
})

describe('parseShownProjectSlugs (deterministic "show more" follow-up)', () => {
  it('parses the shown_projects context string FollowupChips generates', () => {
    expect(parseShownProjectSlugs('shown_projects: bookie, brew-guide, resume-agent-web')).toEqual([
      'bookie',
      'brew-guide',
      'resume-agent-web',
    ])
  })

  it('returns an empty array when context is undefined', () => {
    expect(parseShownProjectSlugs(undefined)).toEqual([])
  })

  it('returns an empty array when context does not start with the expected prefix', () => {
    expect(parseShownProjectSlugs('some other context string')).toEqual([])
  })

  it('handles a single shown project with no trailing comma', () => {
    expect(parseShownProjectSlugs('shown_projects: bookie')).toEqual(['bookie'])
  })
})
