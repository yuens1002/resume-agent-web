import type { ResumeResponse, BackendSkill } from './types.ts'
import { year } from './adaptProfile.ts'

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Skills may arrive as a flat string[] or as {category,items}[] — normalize to labelled rows (flat → one unlabelled row). */
export function skillRows(skills: ResumeResponse['skills']): BackendSkill[] {
  if (!Array.isArray(skills) || !skills.length) return []
  if (typeof skills[0] === 'string') return [{ category: '', items: skills as string[] }]
  return (skills as BackendSkill[]).filter((s) => s.items?.length)
}

/** Header contact links. LinkedIn is left out on purpose, per the résumé conventions the backend follows (resume-agent#298). */
export function contactLinks(c: Partial<ResumeResponse['contact']>): string[] {
  return [c.email, c.website, c.github]
    .filter((b): b is string => Boolean(b))
    .map((b) => b.replace(/^https?:\/\//, ''))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2023-01" → "Jan 2023"; a bare year stays a year; anything unparseable → ''. */
export function monthYear(date: string | null | undefined): string {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(date?.trim() ?? '')
  if (!m) return ''
  const month = m[2] ? MONTHS[Number(m[2]) - 1] : undefined
  return month ? `${month} ${m[1]}` : m[1]
}

/**
 * Printed employment dates: "Jan 2023 – Aug 2023", "Aug 2023 – Present" (en dash), per the
 * résumé conventions. The on-screen cards keep periodFrom's compact year style.
 */
export function resumePeriod(start: string, end: string | null): string {
  const s = monthYear(start)
  const e = end === null ? 'Present' : monthYear(end)
  if (!s) return e === 'Present' ? '' : e
  return e ? `${s} – ${e}` : s
}

/** US Letter at 0.5in margins, in CSS px (96/in): the printable box the fit script targets. */
const PRINT_WIDTH_PX = 720
const PRINT_HEIGHT_PX = 960
/** Smallest print scale the fit script will go to before accepting a second page. */
const MIN_PRINT_SCALE = 0.86

/**
 * Print sizing, written once and emitted twice: under `@media print`, and under `.measure`
 * so the fit script can lay out an offscreen copy exactly as it will print. Every size
 * scales with `--s`, which the script lowers until the copy fits one page.
 */
const PRINT_RULES: [string, string][] = [
  ['.paper', `width:${PRINT_WIDTH_PX}px;max-width:none;margin:0;padding:0;border:0;border-radius:0;box-shadow:none;line-height:1.32`],
  ['h1', 'font-size:calc(25px*var(--s))'],
  ['.title', 'font-size:calc(10.5px*var(--s));margin-top:calc(2px*var(--s))'],
  ['.head', 'padding-bottom:calc(8px*var(--s));margin-bottom:calc(10px*var(--s))'],
  ['.contact', 'font-size:calc(10px*var(--s));margin-top:calc(5px*var(--s))'],
  ['section', 'margin-bottom:calc(8px*var(--s))'],
  ['h3', 'font-size:calc(10px*var(--s));padding-bottom:calc(3px*var(--s));margin-bottom:calc(5px*var(--s))'],
  ['.summary', 'font-size:calc(13px*var(--s));line-height:1.35'],
  ['.srow', 'font-size:calc(12.5px*var(--s));line-height:1.32;margin-bottom:0'],
  ['.job', 'margin-bottom:calc(7px*var(--s));break-inside:avoid'],
  ['.proj', 'margin-bottom:calc(7px*var(--s));break-inside:avoid'],
  ['.co', 'font-size:calc(14px*var(--s))'],
  ['.role', 'font-size:calc(12px*var(--s))'],
  ['.when', 'font-size:calc(10px*var(--s))'],
  ['ul', 'margin-top:calc(3px*var(--s));gap:calc(1px*var(--s))'],
  ['li', 'font-size:calc(12.5px*var(--s));line-height:1.32'],
  ['.edu', 'font-size:calc(12.5px*var(--s));margin-bottom:calc(2px*var(--s))'],
  ['.edu .co', 'font-size:calc(13px*var(--s))'],
]
const printRules = (scope: string): string =>
  PRINT_RULES.map(([sel, decl]) => `${scope}${sel}{${decl}}`).join('')

/**
 * Lowers `--s` until an offscreen print-layout copy of the page fits one printed page.
 * Runs on load and again on `beforeprint`, where print media may already apply: the copy
 * must stay laid out then (never `display:none` under print), and a copy that measures 0
 * keeps the scale already set rather than resetting it.
 */
const FIT_SCRIPT = `<script>(function(){
  var H=${PRINT_HEIGHT_PX},MIN=${MIN_PRINT_SCALE},STEP=0.02,root=document.documentElement;
  function fit(){
    var paper=document.querySelector('.paper');if(!paper)return;
    var box=document.createElement('div');box.className='measure';box.setAttribute('aria-hidden','true');
    var copy=paper.cloneNode(true);box.appendChild(copy);document.body.appendChild(box);
    var prev=root.style.getPropertyValue('--s');
    var s=1;root.style.setProperty('--s','1');
    if(!copy.offsetHeight){if(prev)root.style.setProperty('--s',prev);else root.style.removeProperty('--s');box.remove();return}
    while(copy.offsetHeight>H&&s-STEP>=MIN-1e-9){s-=STEP;root.style.setProperty('--s',s.toFixed(2))}
    box.remove();
  }
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(fit);
  window.addEventListener('beforeprint',fit);
})()</script>`

/** The backend rubric's maximum total (resume-agent `scoreResume`: five rules, one point each). */
const RUBRIC_MAX = 5

const HOST = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />'

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">'

const DOC_CSS = `
  :root{--accent-ink:#2f4866;--good:#4a6b52;--s:1}
  *{box-sizing:border-box}
  body{margin:0;background:#efebe1;color:#1f1d1a;font-family:Georgia,serif;-webkit-font-smoothing:antialiased}
  .bar{position:sticky;top:0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px 22px;background:#fbfaf6;border-bottom:1px solid #d4cdbd;font-family:"JetBrains Mono",monospace;font-size:11px;color:#807a6e}
  .bar .t{font-family:Newsreader,serif;font-size:15px;font-weight:600;color:#1f1d1a;margin-right:auto}
  .bar .badge{display:inline-flex;gap:6px;align-items:center;padding:4px 9px;border-radius:7px;background:#e7ecf3;color:var(--accent-ink);border:1px solid #cdd7e4;text-transform:uppercase;letter-spacing:.03em}
  .bar button{font-family:"Public Sans",system-ui,sans-serif;font-size:13px;font-weight:600;padding:8px 14px;border-radius:9px;border:1px solid #262420;background:#262420;color:#f5f2ea;cursor:pointer}
  .paper{background:#fff;max-width:780px;margin:18px auto 60px;padding:46px 50px;border:1px solid #d4cdbd;border-radius:6px;box-shadow:0 6px 22px -10px rgba(38,36,32,.22);font-size:13.5px;line-height:1.5}
  h1{font-family:Newsreader,serif;font-weight:600;font-size:30px;letter-spacing:-.01em;margin:0}
  .title{font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--accent-ink);margin-top:4px}
  .head{border-bottom:2px solid #1f1d1a;padding-bottom:14px;margin-bottom:18px}
  .contact{display:flex;gap:8px;flex-wrap:wrap;font-family:"JetBrains Mono",monospace;font-size:11px;color:#6b675e;margin-top:9px}
  .contact .sep{color:#b6afa1}
  section{margin-bottom:20px}
  h3{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#807a6e;border-bottom:1px solid #e0dacd;padding-bottom:5px;margin:0 0 11px}
  .summary{font-family:Newsreader,serif;font-size:15.5px;line-height:1.55;margin:0;color:#2a2824}
  .srow{font-size:13px;line-height:1.5;color:#2a2824;margin-bottom:2px}
  .srow b{font-weight:600;color:#1f1d1a}
  .job,.proj{margin-bottom:14px}
  .jhead{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
  .co{font-family:Newsreader,serif;font-weight:600;font-size:15.5px;color:#1f1d1a}
  .role{font-size:13px;color:#4a463e}
  .when{margin-left:auto;font-family:"JetBrains Mono",monospace;font-size:11px;color:#807a6e}
  ul{margin:6px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:4px}
  li{font-size:13px;line-height:1.5;color:#2a2824}
  .edu{font-size:13px;color:#2a2824;margin-bottom:4px}
  .edu .co{font-size:13.5px}
  .measure{position:absolute;left:-10000px;top:0;visibility:hidden}
  ${printRules('.measure ')}
  @media print{body{background:#fff}.bar{display:none}${printRules('')}@page{size:letter;margin:0.5in}}
`

/** Shown immediately in the synchronously-opened tab while /resume runs. */
export const LOADING_HTML = `${HOST}<title>Tailoring résumé…</title>${FONTS}<style>${DOC_CSS}
  .load{display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;height:100vh;font-family:Newsreader,serif;color:#4a463e}
  .spin{width:30px;height:30px;border-radius:50%;border:3px solid #cdd7e4;border-top-color:var(--accent-ink);animation:s .8s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
  .prog{width:220px;height:3px;background:#e0dacd;border-radius:2px;overflow:hidden;margin-top:6px}
  .prog-fill{height:100%;width:0;background:var(--accent-ink);border-radius:2px}
  .prog-pct{font-family:"JetBrains Mono",monospace;font-size:11px;color:#b6afa1}
  @media(prefers-reduced-motion:reduce){.spin{animation:none}.prog{display:none}.prog-pct{display:none}}</style></head>
  <body><div class="load">
    <div class="spin"></div>
    <div>Tailoring résumé…</div>
    <div class="prog"><div class="prog-fill" id="pf"></div></div>
    <div class="prog-pct" id="pp">0%</div>
  </div>
  <script>
    var s=Date.now(),d=55000,t=92;
    var rm=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    function tick(){
      var e=Math.min((Date.now()-s)/d,1),v=t*(1-Math.pow(1-e,3));
      document.getElementById('pf').style.width=v+'%';
      document.getElementById('pp').textContent=Math.round(v)+'%';
      if(e<1)requestAnimationFrame(tick);
    }
    if(!rm)requestAnimationFrame(tick);
  </script></body></html>`

export const ERROR_HTML = (msg: string) => `${HOST}<title>Couldn't generate résumé</title><style>${DOC_CSS}
  .load{display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;height:100vh;font-family:Georgia,serif;color:#4a463e;text-align:center;padding:24px}</style></head>
  <body><div class="load"><div style="font-size:18px;color:#1f1d1a">Couldn't generate the résumé</div><div>${esc(msg)}</div></div></body></html>`

/** Build the self-contained printable résumé document for the new tab. */
export function buildResumeHTML(resume: ResumeResponse, tailoredTitle: string): string {
  const c = resume.contact ?? ({} as ResumeResponse['contact'])
  const contactBits = contactLinks(c)
    .map((b) => `<span>${esc(b)}</span>`)
    .join('<span class="sep">·</span>')

  const skills = skillRows(resume.skills)
    .map((r) => `<div class="srow">${r.category ? `<b>${esc(r.category)}:</b> ` : ''}${esc(r.items.join(', '))}</div>`)
    .join('')

  const jobs = (resume.employment ?? [])
    .map(
      (e) => `<div class="job"><div class="jhead"><span class="co">${esc(e.company)}</span>` +
        `<span class="role">${esc(e.title)}</span><span class="when">${esc(resumePeriod(e.start_date, e.end_date))}</span></div>` +
        `<ul>${(e.bullets ?? []).map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>`,
    )
    .join('')

  const projects = (resume.projects ?? [])
    .map(
      (p) => `<div class="proj"><div class="jhead"><span class="co">${esc(p.name)}</span>` +
        `<span class="role">${esc(p.description)}</span></div>` +
        `<ul>${(p.highlights ?? []).slice(0, 4).map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>`,
    )
    .join('')

  const education = (resume.education ?? [])
    .map(
      (ed) => `<div class="edu"><span class="co">${esc(ed.institution)}</span> — ` +
        `${esc([ed.degree, ed.field].filter(Boolean).join(', '))} · ${esc(year(ed.end_date) || year(ed.start_date))}</div>`,
    )
    .join('')

  const rubric = resume.rubric_meta ?? resume._rubric
  const rubricBadge =
    rubric && typeof rubric.total === 'number'
      ? `<span class="badge">rubric ${esc(rubric.total)}/${RUBRIC_MAX} · ${rubric.passed ? 'passed' : 'draft'}</span>`
      : ''

  return `${HOST}<title>${esc(c.name)} — ${esc(tailoredTitle)}</title>${FONTS}<style>${DOC_CSS}</style></head>
  <body>
    <div class="bar">
      <span class="t">Tailored to: ${esc(tailoredTitle)}</span>
      ${rubricBadge}
      <button onclick="window.print()">Save as PDF / Print</button>
    </div>
    <div class="paper">
      <header class="head">
        <h1>${esc(c.name)}</h1>
        <div class="title">${esc(tailoredTitle)}</div>
        <div class="contact">${contactBits}</div>
      </header>
      <section><p class="summary">${esc(resume.summary)}</p></section>
      ${skills ? `<section><h3>Skills</h3>${skills}</section>` : ''}
      ${jobs ? `<section><h3>Experience</h3>${jobs}</section>` : ''}
      ${projects ? `<section><h3>Selected Projects</h3>${projects}</section>` : ''}
      ${education ? `<section><h3>Education</h3>${education}</section>` : ''}
    </div>
    ${FIT_SCRIPT}
  </body></html>`
}
