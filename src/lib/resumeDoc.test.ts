import { describe, it, expect } from 'vitest'
import { buildResumeHTML, contactLinks, monthYear, resumePeriod, skillRows } from './resumeDoc.ts'
import type { ResumeResponse } from './types.ts'

const base: ResumeResponse = {
  contact: {
    name: 'Test Person',
    email: 'test@example.com',
    website: 'https://example.com',
    github: 'https://github.com/example',
    linkedin: 'https://linkedin.com/in/example',
  },
  summary: 'Engineer.',
  skills: [
    { category: 'Languages', items: ['TypeScript', 'Python'] },
    { category: 'Frameworks', items: ['React', 'Next.js'] },
  ],
  employment: [{ company: 'Acme', title: 'Engineer', start_date: '2020-05', end_date: '2022-03', bullets: ['Shipped it'] }],
  education: [],
  projects: [],
  rubric_meta: { total: 4.5, passed: true },
}

describe('contactLinks', () => {
  it('leaves LinkedIn out of the header and strips the scheme', () => {
    expect(contactLinks(base.contact)).toEqual(['test@example.com', 'example.com', 'github.com/example'])
  })
})

describe('skillRows', () => {
  it('keeps categorized rows and drops empty ones', () => {
    expect(skillRows([...(base.skills as { category: string; items: string[] }[]), { category: 'Empty', items: [] }]))
      .toEqual(base.skills)
  })
  it('renders an older flat list as one unlabelled row', () => {
    expect(skillRows(['Go', 'Rust'])).toEqual([{ category: '', items: ['Go', 'Rust'] }])
  })
  it('returns nothing for an empty or missing list', () => {
    expect(skillRows([])).toEqual([])
    expect(skillRows(undefined as unknown as string[])).toEqual([])
  })
})

describe('resumePeriod', () => {
  it('prints month and year with an en dash', () => {
    expect(resumePeriod('2023-01', '2023-08')).toBe('Jan 2023 – Aug 2023')
  })
  it('prints Present for a current role', () => {
    expect(resumePeriod('2023-08', null)).toBe('Aug 2023 – Present')
  })
  it('falls back to the year when a date has no month', () => {
    expect(monthYear('2016')).toBe('2016')
    expect(resumePeriod('2016', '2017-03')).toBe('2016 – Mar 2017')
  })
  it('degrades to whichever side is known', () => {
    expect(resumePeriod('', '2019-04')).toBe('Apr 2019')
    expect(resumePeriod('', null)).toBe('')
    expect(monthYear('not a date')).toBe('')
  })
})

describe('buildResumeHTML', () => {
  const html = buildResumeHTML(base, 'Frontend Engineer')

  it('prints one labelled, comma-separated row per skill category', () => {
    expect(html).toContain('<b>Languages:</b> TypeScript, Python')
    expect(html).toContain('<b>Frameworks:</b> React, Next.js')
  })

  it('prints employment dates as month and year', () => {
    expect(html).toContain('May 2020 – Mar 2022')
  })

  it('does not print a LinkedIn URL', () => {
    expect(html).not.toContain('linkedin.com')
  })

  it('shows the rubric on its real 0–5 scale', () => {
    expect(html).toContain('rubric 4.5/5 · passed')
  })

  it('ships the one-page fit script and print sizing', () => {
    expect(html).toContain("addEventListener('beforeprint',fit)")
    expect(html).toContain('@page{size:letter;margin:0.5in}')
  })
})
