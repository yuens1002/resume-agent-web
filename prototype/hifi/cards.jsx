/* cards.jsx — rich result cards + overlays (→ window) */
const { useState: useCardState } = React;

/* ---- featured case study ---- */
function FeaturedCase({ project, onOpen }) {
  return (
    <div className="card feat">
      <div className="feat-info">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="badge"><span className="dot" />{project.status}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-soft)" }}>{project.period}</span>
        </div>
        <h3 className="feat-title">{project.name}</h3>
        <p className="feat-tag">{project.tagline}</p>
        <div className="techrow">
          {project.tech.slice(0, 6).map((t) => <span key={t} className="tech">{t}</span>)}
          {project.tech.length > 6 && <span className="tech">+{project.tech.length - 6}</span>}
        </div>
        <div className="btnrow">
          <button className="btn" onClick={() => onOpen(project.slug)}>Open deep-dive <Icon name="arrow" /></button>
          {project.links.demo && <a className="btn ghost" href={project.links.demo} target="_blank" rel="noreferrer">Live demo <Icon name="link" /></a>}
        </div>
      </div>
      <div className="feat-art"><span className="ph">product shot</span></div>
    </div>
  );
}

/* ---- project list ---- */
function ProjectList({ projects, onOpen }) {
  return (
    <div className="card">
      <div className="plist">
        {projects.map((p) => (
          <button key={p.slug} className="prow" onClick={() => onOpen(p.slug)}>
            <span className="prow-thumb" />
            <span className="prow-main">
              <span className="prow-name">{p.name}</span>
              <span className="prow-tag">{p.tagline}</span>
            </span>
            <span className="prow-meta">{p.period.split("·")[0].trim()}</span>
            <span className="prow-arrow"><Icon name="arrow" style={{ width: 18, height: 18 }} /></span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---- work result = featured + the rest ---- */
function WorkResult({ onOpen }) {
  const ps = window.PROFILE.projects;
  const featured = ps.find((p) => p.featured) || ps[0];
  const rest = ps.filter((p) => p.slug !== featured.slug);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FeaturedCase project={featured} onOpen={onOpen} />
      <ProjectList projects={rest} onOpen={onOpen} />
    </div>
  );
}

/* ---- project deep-dive overlay ---- */
function ProjectDetail({ slug, onClose }) {
  const p = window.PROFILE.projects.find((x) => x.slug === slug);
  if (!p) return null;
  return (
    <React.Fragment>
      <div className="scrim" onClick={onClose} />
      <aside className="detail" role="dialog" aria-label={p.name}>
        <div className="detail-head">
          <div className="dh-main">
            <span className="detail-kicker">/projects/{p.slug}</span>
            <h2>{p.name}</h2>
          </div>
          <button className="closebtn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="detail-body">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span className="badge"><span className="dot" />{p.status}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-soft)" }}>{p.period}</span>
          </div>
          <p style={{ fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.45, margin: 0, color: "var(--ink)" }}>{p.tagline}</p>

          <div className="dsec"><h4>The problem</h4><p>{p.problem}</p></div>
          <div className="dsec"><h4>My role</h4><p>{p.role}</p></div>
          <div className="dsec">
            <h4>Highlights</h4>
            <ul>{p.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
          </div>
          <div className="dsec"><h4>Architecture</h4><p>{p.architecture}</p></div>
          <div className="dsec"><h4>Impact</h4><p>{p.impact}</p></div>
          <div className="dsec">
            <h4>Stack</h4>
            <div className="techrow">{p.tech.map((t) => <span key={t} className="tech">{t}</span>)}</div>
          </div>
          <div className="btnrow">
            {p.links.demo && <a className="btn" href={p.links.demo} target="_blank" rel="noreferrer">Live demo <Icon name="link" /></a>}
            {p.links.repo && <a className="btn ghost" href={p.links.repo} target="_blank" rel="noreferrer">View repo <Icon name="github" /></a>}
          </div>
        </div>
      </aside>
    </React.Fragment>
  );
}

/* ---- job-fit tool ---- */
const FIT_DEMO = {
  score: 88,
  rec: "strong match — apply",
  verdict: "Senior frontend role in the Vue/React + TypeScript space with an AI-integration angle. Sunny's recent work maps closely; the AI/agent experience is a differentiator.",
  matched: ["TypeScript", "React / Next.js", "Vue.js", "Testing (Jest/Playwright)", "AI/LLM integration", "Accessibility"],
  gaps: ["Formal team lead title", "Mobile-native (RN)"],
};
function FitTool() {
  const [jd, setJd] = useCardState("");
  const [res, setRes] = useCardState(null);
  const [busy, setBusy] = useCardState(false);
  const run = () => {
    setBusy(true);
    setTimeout(() => { setRes(FIT_DEMO); setBusy(false); }, 850);
  };
  const C = 2 * Math.PI * 46;
  return (
    <div className="card card-pad fit">
      <textarea placeholder="Paste a job description — I'll score the fit honestly (deterministic, weighted 50/30/20)…"
        value={jd} onChange={(e) => setJd(e.target.value)} />
      <div>
        <button className="btn" onClick={run} disabled={busy}>
          {busy ? "Scoring…" : res ? "Re-score" : "Score the fit"} {!busy && <Icon name="arrow" />}
        </button>
      </div>
      {res && (
        <div className="turn-anim" style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 4 }}>
          <div className="fit-result">
            <div className="gauge">
              <svg width="108" height="108" viewBox="0 0 108 108">
                <circle cx="54" cy="54" r="46" fill="none" stroke="var(--hair)" strokeWidth="8" />
                <circle cx="54" cy="54" r="46" fill="none" stroke="var(--accent)" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - res.score / 100)}
                  style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.3,1)" }} />
              </svg>
              <div className="num">{res.score}<small>fit</small></div>
            </div>
            <div className="fit-verdict">
              <span className="rec">▸ {res.rec}</span>
              <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.45, color: "var(--ink-2)" }}>{res.verdict}</p>
            </div>
          </div>
          <div className="fit-cols">
            <div>
              <h5>Matched</h5>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {res.matched.map((m) => <span key={m} className="fit-tag ok"><span className="mk">✓</span>{m}</span>)}
              </div>
            </div>
            <div>
              <h5>To tailor</h5>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {res.gaps.map((m) => <span key={m} className="fit-tag gap"><span className="mk">○</span>{m}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- about result ---- */
function AboutResult() {
  const P = window.PROFILE;
  return (
    <div className="card card-pad about">
      <div className="skillgrid">
        {P.skills.map((s) => (
          <div key={s.category} className="skillcat">
            <h5>{s.category}</h5>
            <div className="techrow">{s.items.map((i) => <span key={i} className="tech">{i}</span>)}</div>
          </div>
        ))}
      </div>
      <div>
        <h5 style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-soft)", margin: "0 0 6px" }}>Experience</h5>
        <div className="tl">
          {P.employment.map((e) => (
            <div key={e.company} className="tl-row">
              <span className="tl-when">{e.period}</span>
              <div className="tl-what">
                <span className="tl-co">{e.company}</span>
                <span style={{ color: "var(--ink-soft)", fontSize: 13.5 }}> · {e.title}</span>
                <ul className="tl-bul">{e.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-soft)" }}>
        {P.education.map((ed) => (
          <span key={ed.school}><strong style={{ color: "var(--ink-2)", fontWeight: 600 }}>{ed.school}</strong> · {ed.line} · {ed.year}</span>
        ))}
      </div>
    </div>
  );
}

/* ---- agent / machine menu ---- */
function AgentMenu({ onClose }) {
  const c = window.PROFILE.contact;
  return (
    <React.Fragment>
      <div className="scrim" style={{ background: "transparent", backdropFilter: "none" }} onClick={onClose} />
      <div className="menu" role="menu">
        <div className="menu-hero">
          <div className="qr"><QrCode data={c.gpt} size={92} /></div>
          <div className="qr-cap">
            <span className="t">Talk to my agent</span>
            <span className="s">Scan to chat in ChatGPT, or:</span>
            <a href={c.gpt} target="_blank" rel="noreferrer">Open Custom GPT <Icon name="arrow" style={{ width: 14, height: 14 }} /></a>
          </div>
        </div>
        <div className="menu-list">
          <div style={{ padding: "8px 12px 4px", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-faint)" }}>For machines</div>
          <CopyField value={c.mcp} label="Connect via MCP" />
          <button className="menu-item" onClick={() => {}}>
            <span className="mi-ic"><Icon name="doc" /></span>
            <span className="mi-main"><span className="mi-t">Agent card</span><span className="mi-s">/.well-known/agent-card.json</span></span>
            <span className="mi-act">A2A</span>
          </button>
          <a className="menu-item" href={c.github} target="_blank" rel="noreferrer">
            <span className="mi-ic"><Icon name="github" /></span>
            <span className="mi-main"><span className="mi-t">GitHub</span><span className="mi-s">{c.github.replace(/^https?:\/\//, "")}</span></span>
            <span className="mi-act">↗</span>
          </a>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { FeaturedCase, ProjectList, WorkResult, ProjectDetail, FitTool, AboutResult, AgentMenu });
