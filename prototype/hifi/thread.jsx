/* thread.jsx — conversation engine: intents, streaming, turns, composer (→ window) */
const { useState: useTState, useEffect: useTEffect, useRef: useTRef } = React;

/* ---- canned, profile-grounded intents ---- */
const INTENTS = [
  { keys: ["recent work", "work", "project", "projects", "portfolio", "built", "build", "shipped", "show me"],
    render: "work",
    answer: "Most of my recent energy has gone into Artisan Roast — an open-source coffee-commerce platform I built solo with an AI-native workflow, now live with weekly releases. Here it is, alongside the rest of my recent work.",
    confidence: "high", sources: ["projects", "summary"],
    followups: ["How is Artisan Roast built?", "Why build it solo?", "What's the AI part?"] },

  { keys: ["ai", "ml", "llm", "claude", "agent", "gpt", "gemini", "machine learning", "artificial"],
    render: null,
    answer: "AI is woven through my recent work, not bolted on. On Artisan Roast I built a nightly QA agent with the Claude Agent SDK that reads accessibility trees to verify acceptance criteria, plus an in-app personalization engine — and Resume Agent, the thing you're talking to right now, is an A2A-queryable profile API.",
    confidence: "high", sources: ["projects · artisan-roast", "projects · resume-agent"],
    followups: ["Show me the projects", "Tell me about Resume Agent", "Are you available?"] },

  { keys: ["available", "availability", "hiring", "open to", "looking", "hire you", "start", "remote"],
    render: null,
    answer: "Yes — I'm actively looking and open to remote, for Frontend, Full-Stack, or Software Engineer roles. The fastest path is a quick intro call; I can also score a specific job post for fit if you have one handy.",
    confidence: "high", sources: ["availability"],
    followups: ["Score a job post", "What roles?", "How do I reach you?"] },

  { keys: ["typescript", "type script", " ts ", "language", "languages"],
    render: null,
    answer: "TypeScript is my default for new work. Artisan Roast is ~638 TypeScript files end to end, and the Resume Agent backend is TS on Hono with Zod-validated routes. Before that I shipped TS/React UIs at Wipro straight from Figma specs.",
    confidence: "high", sources: ["skills", "projects · artisan-roast", "employment · Wipro"],
    followups: ["Vue or React?", "How do you test?", "Show recent work"] },

  { keys: ["vue", "react", "frontend", "front end", "front-end", "next.js", "ui", "css"],
    render: null,
    answer: "I've shipped production UIs in both ecosystems — Vue.js since DealerOn and through the Census/Drupal work at MetroStar, and React/Next.js more recently at Wipro and across Artisan Roast. Accessibility and testing ride alongside the UI for me, not after it.",
    confidence: "high", sources: ["employment", "skills"],
    followups: ["Accessibility experience?", "TypeScript?", "Show recent work"] },

  { keys: ["accessib", "a11y", "508", "wcag", "compliance"],
    render: null,
    answer: "Accessibility is a habit, not an afterthought. I built automated 508 test suites with Jest, Playwright, and Cucumber for the US Census Bureau, and resolved 508/WCAG issues on the Coherence Design System — and on Artisan Roast my QA agent verifies against the accessibility tree rather than CSS selectors.",
    confidence: "high", sources: ["employment · MetroStar", "employment · DesignIt"],
    followups: ["How do you test?", "Show recent work"] },

  { keys: ["test", "testing", "jest", "playwright", "coverage", "qa"],
    render: null,
    answer: "I treat tests as part of the build. I've lifted unit coverage from 50% to 80%+ with Jest and RTL, written end-to-end suites in Playwright and Cucumber for government work, and built an autonomous nightly QA agent that opens GitHub issues when acceptance criteria regress.",
    confidence: "high", sources: ["employment · DesignIt", "projects · artisan-roast"],
    followups: ["Show recent work", "Accessibility experience?"] },

  { keys: ["fit", "score", "job description", "jd", "match", "role for", "good fit", "resume", "résumé", "cv", "tailor", "tailored", "generate"],
    render: "fit",
    answer: "Happy to. Paste the job description below — or pick a sample — and I'll score the fit honestly (weighted 50/30/20). If it's a match, I can tailor a résumé to that exact role and email it to you.",
    confidence: "high", sources: ["match endpoint", "resume endpoint"],
    followups: ["Show recent work"] },

  { keys: ["about", "yourself", "who are", "background", "tell me about you", "experience", "years", "summary"],
    render: "about",
    answer: "Short version: I'm a frontend / full-stack engineer with 6+ years across startups and government — deep in Vue and React, with strong testing and accessibility habits, and lately a lot of hands-on AI integration. Here's the fuller picture.",
    confidence: "high", sources: ["summary", "employment"],
    followups: ["Show recent work", "Are you available?", "Experience with AI?"] },

  { keys: ["contact", "email", "reach", "calendly", "call", "book", "linkedin", "talk"],
    render: null,
    answer: "Easiest is a short intro call — my Calendly is linked in the ⌘ menu, top-right — or email me at syuen@sbgrp.cc. You can also point your own AI at my MCP endpoint from that same menu.",
    confidence: "high", sources: ["contact"],
    followups: ["Are you available?", "Show recent work"] },
];

const DEFAULT_INTENT = {
  render: null,
  answer: "Good question. I answer straight from Sunny's canonical profile, so here's the honest version: a frontend / full-stack engineer with 6+ years, strong in TypeScript, Vue & React, testing and accessibility, with recent AI-integration work. Want me to show the recent work, or check fit against a role?",
  confidence: "medium", sources: ["summary"],
  followups: ["Show recent work", "Are you available?", "Score a job post"],
};

function resolveIntent(q) {
  const s = " " + q.toLowerCase() + " ";
  let best = null, bestScore = 0;
  for (const intent of INTENTS) {
    let score = 0;
    for (const k of intent.keys) if (s.includes(k)) score += k.length;
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  return best || DEFAULT_INTENT;
}

/* streaming prose — honors reduced-motion / ?instant for no-timer rendering */
const INSTANT = (() => {
  try {
    return new URLSearchParams(location.search).has("instant") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) { return false; }
})();

function AnswerBody({ text, onDone, size }) {
  const [shown, setShown] = useTState(INSTANT ? text : "");
  const [done, setDone] = useTState(INSTANT);
  useTEffect(() => {
    if (INSTANT) { onDone && onDone(); return; }
    const tokens = text.split(/(\s+)/);
    let i = 0, cancelled = false;
    const tick = () => {
      if (cancelled) return;
      i += 2;
      setShown(tokens.slice(0, i).join(""));
      if (i < tokens.length) setTimeout(tick, 22);
      else { setDone(true); onDone && onDone(); }
    };
    const start = setTimeout(tick, 160);
    return () => { cancelled = true; clearTimeout(start); };
  }, []);
  return <p className={"prose" + (size === "small" ? " small" : "")}>{shown}{!done && <span className="cursor" />}</p>;
}

/* ---- a single conversation turn ---- */
function Turn({ turn, onAsk, onOpen }) {
  const [revealed, setRevealed] = useTState(false);
  return (
    <div className="turn turn-anim">
      {turn.q && (
        <div className="ask-row"><div className="ask-bubble">{turn.q}</div></div>
      )}
      <div className="agent">
        <div className="agent-avatar"><Icon name="agent" /></div>
        <div className="agent-body">
          <div className="agent-meta">
            <span className="who">Sunny's agent</span>
            <span>·</span>
            <span className={"conf " + turn.confidence}><span className="dot" />{turn.confidence} confidence</span>
          </div>
          <AnswerBody text={turn.answer} onDone={() => setRevealed(true)} />
          {revealed && (
            <div className="turn-anim" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {turn.render === "work" && <WorkResult onOpen={onOpen} />}
              {turn.render === "fit" && <MatchResume />}
              {turn.render === "about" && <AboutResult />}
              {turn.sources && turn.sources.length > 0 && (
                <div className="sources">
                  <span className="lbl">sources</span>
                  {turn.sources.map((s) => <span key={s} className="src">{s}</span>)}
                </div>
              )}
              {turn.followups && turn.followups.length > 0 && (
                <div className="followups">
                  <span className="lbl">follow-ups</span>
                  {turn.followups.map((f) => <button key={f} className="chip" onClick={() => onAsk(f)}>{f}</button>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- opening greeting ---- */
function Greeting({ headline, onAsk }) {
  const starters = ["Show recent work", "Experience with AI?", "Are you available?", "Match a job & tailor my résumé", "Tell me about yourself"];
  return (
    <div className="greet turn-anim">
      <span className="greet-eyebrow">A live, queryable résumé</span>
      <h1>{headline}</h1>
      <p className="lede">{window.PROFILE.summary}</p>
      <div className="chiprow">
        {starters.map((s, i) => (
          <button key={s} className={"chip" + (i === 0 ? " solid" : "")} onClick={() => onAsk(s)}>{s}</button>
        ))}
      </div>
    </div>
  );
}

/* ---- composer ---- */
function Composer({ onAsk, showHints }) {
  const [v, setV] = useTState("");
  const ref = useTRef(null);
  const submit = () => { const q = v.trim(); if (!q) return; onAsk(q); setV(""); if (ref.current) ref.current.style.height = "auto"; };
  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } };
  const grow = (e) => { const t = e.target; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; setV(t.value); };
  const hints = ["TypeScript experience?", "Accessibility work?", "How do you test?", "How do I reach you?"];
  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea ref={ref} rows="1" value={v} placeholder="Ask me anything about my work…" onChange={grow} onKeyDown={onKey} />
        <button className="send" onClick={submit} disabled={!v.trim()} aria-label="Send"><Icon name="send" /></button>
      </div>
      {showHints && (
        <div className="composer-hint">
          {hints.map((h) => <button key={h} className="mini-chip" onClick={() => onAsk(h)}>{h}</button>)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { resolveIntent, AnswerBody, Turn, Greeting, Composer, INTENTS });
