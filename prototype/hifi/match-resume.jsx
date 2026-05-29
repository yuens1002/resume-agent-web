/* match-resume.jsx — JD → fit match → tailored résumé flow.
   Mirrors the backend shapes: MatchResponse + ResumeResponse.
   Mock logic is deterministic off the JD text so swapping in
   fetch('/match') / fetch('/resume') later is a drop-in. (→ window) */

const { useState: useMR, useRef: useMRRef } = React;

/* ---- sample JDs the visitor can one-tap ---- */
const SAMPLE_JDS = [
  { id: "fe", label: "Senior Frontend Engineer",
    text: "Senior Frontend Engineer — React, TypeScript, Next.js. Own a design system, drive accessibility (WCAG 2.1 AA), and partner with design. 5+ years building production web apps. Testing culture (Jest, Playwright). Bonus: experience integrating AI/LLM features." },
  { id: "fs", label: "Full-Stack (AI)",
    text: "Full-Stack Engineer, AI Products. Ship LLM-powered features end to end — TypeScript, Node, Postgres, and modern React. Experience with agent frameworks, prompt engineering, and streaming UIs. You've taken something from zero to production. Startup pace." },
  { id: "lead", label: "Frontend Lead / Manager",
    text: "Frontend Engineering Lead. Manage a team of 4–6, set technical direction, own hiring and mentorship. 8+ years frontend, 3+ leading teams. React/TypeScript at scale, native mobile a plus. Strong product and stakeholder communication." },
];

/* crude keyword scorer → realistic MatchResponse, keyed off JD text */
const SKILL_BANK = {
  "typescript": "TypeScript", "react": "React / Next.js", "next": "React / Next.js",
  "vue": "Vue.js", "node": "Node.js", "postgres": "PostgreSQL", "accessib": "Accessibility (508/WCAG)",
  "wcag": "Accessibility (508/WCAG)", "508": "Accessibility (508/WCAG)",
  "jest": "Testing (Jest/Playwright)", "playwright": "Testing (Jest/Playwright)", "test": "Testing (Jest/Playwright)",
  "design system": "Design systems", "ai": "AI/LLM integration", "llm": "AI/LLM integration",
  "agent": "AI/LLM integration", "prompt": "AI/LLM integration", "stream": "Streaming UIs",
};
const HAS = ["TypeScript", "React / Next.js", "Vue.js", "Node.js", "PostgreSQL", "Accessibility (508/WCAG)", "Testing (Jest/Playwright)", "Design systems", "AI/LLM integration", "Streaming UIs"];

function scoreJD(jd) {
  const s = jd.toLowerCase();
  const required = [];
  for (const [k, v] of Object.entries(SKILL_BANK)) if (s.includes(k) && !required.includes(v)) required.push(v);
  if (required.length === 0) required.push("React / Next.js", "TypeScript", "Testing (Jest/Playwright)");

  const matched = required.filter((r) => HAS.includes(r));
  const missing = required.filter((r) => !HAS.includes(r));

  // leadership / mobile detection → partials + experience hit
  const wantsLead = /lead|manage|mentor|hiring|director/.test(s);
  const wantsMobile = /native|react native|ios|android|mobile app/.test(s);
  const partial = [];
  if (wantsMobile) partial.push("Mobile-native (React Native)");

  const skills_score = (matched.length + partial.length * 0.5) / Math.max(required.length + partial.length, 1);
  const years = 1.0, scope = wantsLead ? 0.3 : 1.0, recency = 1.0;
  const exp_score = (years + scope + recency) / 3;
  const industry = 0.6, product_type = /commerce|ecommerce|retail|coffee|shop/.test(s) ? 1.0 : 0.7, scale = 0.7;
  const domain_score = (industry + product_type + scale) / 3;

  const fit = Math.round((0.5 * skills_score + 0.3 * exp_score + 0.2 * domain_score) * 100) / 100;
  const action = fit >= 0.8 ? "apply" : fit >= 0.6 ? "apply-with-tailoring" : "pass";
  const titleMatch = jd.split("\n")[0].split(/\s[—–-]\s|[.,]/)[0].trim().slice(0, 52) || "this role";

  const verdict = wantsLead
    ? "Strong individual-contributor fit; the formal team-lead requirement is the main gap — worth a conversation about scope."
    : action === "apply"
      ? `Close match for ${titleMatch}. Recent work maps directly to the core requirements; the AI experience is a differentiator.`
      : `Solid fit with a few areas to emphasize. Tailoring the résumé to lead with the JD's priorities would strengthen the application.`;

  return {
    fit_score: fit,
    matched,
    gaps: [...missing, ...partial.map((p) => `${p} (partial)`)],
    verdict,
    recommended_action: action,
    titleMatch,
    scoring: {
      skills: { matched, partial, missing, score: Math.round(skills_score * 100) / 100 },
      experience: { years, scope, recency, score: Math.round(exp_score * 100) / 100 },
      domain: { industry, product_type, scale, score: Math.round(domain_score * 100) / 100 },
    },
  };
}

/* ---- build a tailored ResumeResponse, JD-title-first ---- */
function buildResume(match, email) {
  const P = window.PROFILE;
  const title = match.titleMatch || P.contact.role;
  const lead = match.matched.slice(0, 4).join(", ");
  return {
    contact: P.contact,
    tailoredTo: title,
    email: email || null,
    summary: `${title} with 6+ years building user-centric web applications across startups and government. Strength in ${lead || "TypeScript, React, and testing"} — recently shipping AI-native products end to end, solo, from architecture through production.`,
    skills: [
      ...match.matched,
      ...P.skills.flatMap((s) => s.items).filter((i) => !match.matched.includes(i)),
    ].slice(0, 13),
    employment: P.employment.map((e) => ({
      company: e.company, title: e.title, period: e.period,
      bullets: e.bullets, // backend reorders; mock keeps order
    })),
    education: P.education,
    projects: P.projects.slice(0, 2).map((p) => ({ slug: p.slug, name: p.name, tagline: p.tagline, highlights: p.highlights.slice(0, 3), links: p.links })),
    _rubric: { total: 8.6, passed: true, winner_model: "gpt-4o-mini", keyword_coverage: "42%" },
  };
}

/* ---- client-side rate limit: 10 résumé generations / hour ----
   Mirrors the server's intended cap so the UI degrades gracefully.
   The real limit is enforced server-side; this is just honest UX. */
const RATE_KEY = "yuen_resume_gen_hits";
const RATE_MAX = 10;
function rateHits() {
  try {
    const now = Date.now();
    const arr = JSON.parse(localStorage.getItem(RATE_KEY) || "[]").filter((t) => now - t < 3600e3);
    return arr;
  } catch (e) { return []; }
}
function rateRemaining() { return Math.max(0, RATE_MAX - rateHits().length); }
function recordHit() {
  try { const a = rateHits(); a.push(Date.now()); localStorage.setItem(RATE_KEY, JSON.stringify(a)); } catch (e) {}
}
function minsToReset() {
  const a = rateHits(); if (!a.length) return 60;
  return Math.max(1, Math.ceil((3600e3 - (Date.now() - Math.min(...a))) / 60000));
}
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ============================================================
   In-thread tool: paste JD → match → (email-gated) generate résumé
   ============================================================ */
function MatchResume() {
  const [jd, setJd] = useMR("");
  const [match, setMatch] = useMR(null);
  const [busy, setBusy] = useMR(false);
  const [doc, setDoc] = useMR(null);          // overlay visibility (holds resume data when open)
  const [built, setBuilt] = useMR(null);       // generated resume data (kept for preview)
  // gen stages: idle → gating → sending → sent | limited
  const [stage, setStage] = useMR("idle");
  const [email, setEmail] = useMR("");
  const [emailErr, setEmailErr] = useMR("");
  const taRef = useMRRef(null);

  const runMatch = (text) => {
    const jdText = (text != null ? text : jd).trim();
    if (!jdText) return;
    if (text != null) setJd(text);
    setBusy(true); setMatch(null); setStage("idle"); setBuilt(null);
    setTimeout(() => { setMatch(scoreJD(jdText)); setBusy(false); }, 800);
  };

  const startGate = () => {
    if (rateRemaining() <= 0) { setStage("limited"); return; }
    setStage("gating");
  };
  const submitEmail = () => {
    if (!EMAIL_RE.test(email.trim())) { setEmailErr("Enter a valid email address."); return; }
    if (rateRemaining() <= 0) { setStage("limited"); return; }
    setEmailErr(""); setStage("sending");
    setTimeout(() => {
      recordHit();
      setBuilt(buildResume(match, email.trim()));
      setStage("sent");
    }, 1300);
  };

  const pct = match ? Math.round(match.fit_score * 100) : 0;
  const C = 2 * Math.PI * 46;
  const actionLabel = { "apply": "strong match — apply", "apply-with-tailoring": "good fit — tailor & apply", "pass": "likely a stretch" };

  return (
    <div className="card card-pad fit">
      <textarea ref={taRef} placeholder="Paste a job description — I'll score the fit honestly (weighted 50% skills · 30% experience · 20% domain)…"
        value={jd} onChange={(e) => setJd(e.target.value)} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn" onClick={() => runMatch()} disabled={busy || !jd.trim()}>
          {busy ? "Scoring…" : match ? "Re-score" : "Score the fit"} {!busy && <Icon name="arrow" />}
        </button>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>or try:</span>
        {SAMPLE_JDS.map((j) => (
          <button key={j.id} className="mini-chip" onClick={() => runMatch(j.text)}>{j.label}</button>
        ))}
      </div>

      {match && (
        <div className="turn-anim" style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 6 }}>
          <div className="fit-result">
            <div className="gauge">
              <svg width="108" height="108" viewBox="0 0 108 108">
                <circle cx="54" cy="54" r="46" fill="none" stroke="var(--hair)" strokeWidth="8" />
                <circle cx="54" cy="54" r="46" fill="none" stroke="var(--accent)" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
                  style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.3,1)" }} />
              </svg>
              <div className="num">{pct}<small>fit</small></div>
            </div>
            <div className="fit-verdict">
              <span className="rec">▸ {actionLabel[match.recommended_action]}</span>
              <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.45, color: "var(--ink-2)" }}>{match.verdict}</p>
            </div>
          </div>

          {/* scoring breakdown — the weighted 50/30/20 */}
          <div className="score-bars">
            <ScoreBar label="Skills" weight="50%" score={match.scoring.skills.score} />
            <ScoreBar label="Experience" weight="30%" score={match.scoring.experience.score} />
            <ScoreBar label="Domain" weight="20%" score={match.scoring.domain.score} />
          </div>

          <div className="fit-cols">
            <div>
              <h5>Matched</h5>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {match.matched.map((m) => <span key={m} className="fit-tag ok"><span className="mk">✓</span>{m}</span>)}
              </div>
            </div>
            <div>
              <h5>To tailor</h5>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {match.gaps.length ? match.gaps.map((m) => <span key={m} className="fit-tag gap"><span className="mk">○</span>{m}</span>)
                  : <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>No notable gaps.</span>}
              </div>
            </div>
          </div>

          {/* résumé generation — email-gated, rate-limited */}
          {match.recommended_action !== "pass" ? (
            <div className="gen-zone">
              {stage === "idle" && (
                <div className="gen-cta">
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--ink)" }}>Want a résumé tailored to this role?</div>
                    <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>I'll re-frame the summary, reorder skills, and prioritize the most relevant bullets — then email it to you.</div>
                  </div>
                  <button className="btn" onClick={startGate}><Icon name="spark" /> Generate tailored résumé</button>
                </div>
              )}

              {stage === "gating" && (
                <div className="gen-cta" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--ink)" }}>Where should I send it?</div>
                    <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>I'll email you the tailored résumé (PDF + a link). No list, no spam.</div>
                  </div>
                  <div className="gate-form">
                    <input className="gate-input" type="email" inputMode="email" placeholder="you@company.com"
                      value={email} autoFocus
                      onChange={(e) => { setEmail(e.target.value); if (emailErr) setEmailErr(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") submitEmail(); }} />
                    <button className="btn" onClick={submitEmail}><Icon name="send" /> Email me the résumé</button>
                    <button className="btn ghost" onClick={() => { setStage("idle"); setEmailErr(""); }}>Cancel</button>
                  </div>
                  {emailErr && <span style={{ color: "#b0703e", fontSize: 12.5, fontFamily: "var(--mono)" }}>{emailErr}</span>}
                  <span className="gate-note">{rateRemaining()} of {RATE_MAX} generations left this hour · email used only to send your résumé</span>
                </div>
              )}

              {stage === "sending" && (
                <div className="gen-cta">
                  <span className="spin" aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--ink)" }}>Tailoring & sending…</div>
                    <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>Re-framing for “{match.titleMatch}”, scoring against the rubric, and emailing it over.</div>
                  </div>
                </div>
              )}

              {stage === "sent" && (
                <div className="gen-cta sent">
                  <span className="sent-check"><Icon name="check" /></span>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--ink)" }}>On its way to {email} ✓</div>
                    <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>Tailored to “{match.titleMatch}”. Check your inbox — or preview it right here.</div>
                  </div>
                  <button className="btn ghost" onClick={() => setDoc(built)}><Icon name="doc" /> Preview / download</button>
                </div>
              )}

              {stage === "limited" && (
                <div className="gen-cta muted">
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 16, color: "var(--ink)" }}>Hourly limit reached</div>
                    <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>That's {RATE_MAX} résumés in an hour — try again in ~{minsToReset()} min, or grab a quick call and I'll tailor one personally.</div>
                  </div>
                  <a className="btn ghost" href={window.PROFILE.contact.calendly} target="_blank" rel="noreferrer"><Icon name="calendar" /> Book a call</a>
                </div>
              )}
            </div>
          ) : (
            <div className="gen-cta muted">
              <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>This one looks like a stretch — happy to talk through it on a quick call instead.</span>
            </div>
          )}
        </div>
      )}

      {doc && <ResumeDoc data={doc} onClose={() => setDoc(null)} />}
    </div>
  );
}

function ScoreBar({ label, weight, score }) {
  return (
    <div className="sbar">
      <div className="sbar-head">
        <span className="sbar-label">{label}</span>
        <span className="sbar-weight">{weight}</span>
        <span className="sbar-score">{Math.round(score * 100)}</span>
      </div>
      <div className="sbar-track"><div className="sbar-fill" style={{ width: Math.round(score * 100) + "%" }} /></div>
    </div>
  );
}

/* ============================================================
   Tailored résumé overlay — printable (Download PDF = print)
   ============================================================ */
function ResumeDoc({ data, onClose }) {
  const c = data.contact;
  return (
    <React.Fragment>
      <div className="scrim" onClick={onClose} />
      <aside className="detail resume-doc" role="dialog" aria-label="Tailored résumé">
        <div className="detail-head no-print">
          <div className="dh-main">
            <span className="detail-kicker">tailored résumé · /resume</span>
            <h2>Tailored to: {data.tailoredTo}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
              <span className="badge"><span className="dot" />rubric {data._rubric.total}/10 · passed</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-soft)" }}>keyword coverage {data._rubric.keyword_coverage}</span>
              {data.email && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-soft)" }}>· emailed to {data.email}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => window.print()}><Icon name="download" /> Download PDF</button>
            <button className="closebtn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
          </div>
        </div>

        <div className="resume-paper">
          <header className="rp-head">
            <h1>{c.name}</h1>
            <div className="rp-title">{data.tailoredTo}</div>
            <div className="rp-contact">
              <span>{c.email}</span><span className="sep">·</span>
              <span>{c.github.replace(/^https?:\/\//, "")}</span><span className="sep">·</span>
              <span>{c.linkedin.replace(/^https?:\/\//, "")}</span>
            </div>
          </header>

          <section className="rp-sec">
            <p className="rp-summary">{data.summary}</p>
          </section>

          <section className="rp-sec">
            <h3>Skills</h3>
            <div className="rp-skills">{data.skills.map((s) => <span key={s} className="rp-skill">{s}</span>)}</div>
          </section>

          <section className="rp-sec">
            <h3>Experience</h3>
            {data.employment.map((e) => (
              <div key={e.company} className="rp-job">
                <div className="rp-job-head">
                  <span className="rp-co">{e.company}</span>
                  <span className="rp-role">{e.title}</span>
                  <span className="rp-when">{e.period}</span>
                </div>
                <ul>{e.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
              </div>
            ))}
          </section>

          <section className="rp-sec">
            <h3>Selected Projects</h3>
            {data.projects.map((p) => (
              <div key={p.slug} className="rp-proj">
                <div className="rp-proj-head"><span className="rp-co">{p.name}</span><span className="rp-role">{p.tagline}</span></div>
                <ul>{p.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
              </div>
            ))}
          </section>

          <section className="rp-sec">
            <h3>Education</h3>
            {data.education.map((ed) => (
              <div key={ed.school} className="rp-edu"><span className="rp-co">{ed.school}</span> — {ed.line} · {ed.year}</div>
            ))}
          </section>
        </div>
      </aside>
    </React.Fragment>
  );
}

Object.assign(window, { MatchResume, ResumeDoc, scoreJD, buildResume, SAMPLE_JDS });
