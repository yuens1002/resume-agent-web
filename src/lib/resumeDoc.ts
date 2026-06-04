import type { ResumeResponse, BackendSkill } from './types.ts'
import { periodFrom, year } from './adaptProfile.ts'

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Skills may arrive as a flat string[] or as {category,items}[] — normalize to flat list. */
function flatSkills(skills: ResumeResponse['skills']): string[] {
  if (!Array.isArray(skills)) return []
  if (skills.length && typeof skills[0] === 'string') return skills as string[]
  return (skills as BackendSkill[]).flatMap((s) => s.items ?? [])
}

const HOST = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />'

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">'

const DOC_CSS = `
  :root{--accent-ink:#2f4866;--good:#4a6b52}
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
  .skills{display:flex;flex-wrap:wrap;gap:6px}
  .skill{font-family:"JetBrains Mono",monospace;font-size:11px;padding:3px 9px;border-radius:5px;background:#f5f2ea;border:1px solid #e0dacd;color:#4a463e}
  .job,.proj{margin-bottom:14px}
  .jhead{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
  .co{font-family:Newsreader,serif;font-weight:600;font-size:15.5px;color:#1f1d1a}
  .role{font-size:13px;color:#4a463e}
  .when{margin-left:auto;font-family:"JetBrains Mono",monospace;font-size:11px;color:#807a6e}
  ul{margin:6px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:4px}
  li{font-size:13px;line-height:1.5;color:#2a2824}
  .edu{font-size:13px;color:#2a2824;margin-bottom:4px}
  @media print{.bar{display:none}.paper{margin:0;border:0;box-shadow:none;padding:0;max-width:none}@page{margin:14mm}}
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
  const contactBits = [c.email, c.website?.replace(/^https?:\/\//, ''), c.github?.replace(/^https?:\/\//, ''), c.linkedin?.replace(/^https?:\/\//, '')]
    .filter(Boolean)
    .map((b) => `<span>${esc(b)}</span>`)
    .join('<span class="sep">·</span>')

  const skills = flatSkills(resume.skills)
    .map((s) => `<span class="skill">${esc(s)}</span>`)
    .join('')

  const jobs = (resume.employment ?? [])
    .map(
      (e) => `<div class="job"><div class="jhead"><span class="co">${esc(e.company)}</span>` +
        `<span class="role">${esc(e.title)}</span><span class="when">${esc(periodFrom(e.start_date, e.end_date))}</span></div>` +
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
      (ed) => `<div class="edu"><span class="co" style="font-size:13.5px">${esc(ed.institution)}</span> — ` +
        `${esc([ed.degree, ed.field].filter(Boolean).join(', '))} · ${esc(year(ed.end_date) || year(ed.start_date))}</div>`,
    )
    .join('')

  const rubric = resume.rubric_meta ?? resume._rubric
  const rubricBadge =
    rubric && typeof rubric.total === 'number'
      ? `<span class="badge">rubric ${esc(rubric.total)}/10 · ${rubric.passed ? 'passed' : 'draft'}</span>`
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
      ${skills ? `<section><h3>Skills</h3><div class="skills">${skills}</div></section>` : ''}
      ${jobs ? `<section><h3>Experience</h3>${jobs}</section>` : ''}
      ${projects ? `<section><h3>Selected Projects</h3>${projects}</section>` : ''}
      ${education ? `<section><h3>Education</h3>${education}</section>` : ''}
    </div>
  </body></html>`
}
