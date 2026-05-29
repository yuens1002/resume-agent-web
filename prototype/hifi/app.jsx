/* app.jsx — Direction D hi-fi shell: header, conversation state, overlays, tweaks */
const { useState: useAppState, useEffect: useAppEffect, useRef: useAppRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#3d5a80",
  "headline": "Ask me anything — I'm a résumé you can actually talk to.",
  "voice": "serif"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [turns, setTurns] = useAppState([]);
  const [detail, setDetail] = useAppState(null);
  const [menu, setMenu] = useAppState(false);
  const endRef = useAppRef(null);
  const P = window.PROFILE;

  useAppEffect(() => { document.documentElement.style.setProperty("--accent", t.accent); }, [t.accent]);
  useAppEffect(() => { document.body.classList.toggle("voice-sans", t.voice === "sans"); }, [t.voice]);

  // auto-scroll to the newest turn (no scrollIntoView)
  useAppEffect(() => {
    if (turns.length === 0) return;
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  }, [turns.length]);

  // Esc closes overlays
  useAppEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setDetail(null); setMenu(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ask = (q) => {
    const intent = window.resolveIntent(q);
    setMenu(false);
    setTurns((prev) => [...prev, { key: Date.now() + "-" + prev.length, q, ...intent }]);
  };

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-id">
          <span className="hdr-name">{P.contact.name}</span>
          <span className="hdr-role">{P.contact.role}</span>
        </div>
        <div className="hdr-spacer" />
        <span className="avail"><span className="pulse" />{P.availability.status}</span>
        <button className="iconbtn" onClick={() => setMenu((m) => !m)} aria-label="Agent & links menu" title="Talk to my agent / for machines">
          <Icon name="dots" />
        </button>
      </header>

      <main className="thread">
        <Greeting headline={t.headline} onAsk={ask} />
        {turns.map((turn) => (
          <Turn key={turn.key} turn={turn} onAsk={ask} onOpen={setDetail} />
        ))}
        <div ref={endRef} />
      </main>

      <Composer onAsk={ask} showHints={turns.length === 0} />

      <footer className="foot">
        <span>© {P.contact.name}</span>
        <span className="sep">·</span>
        <a href={P.contact.github} target="_blank" rel="noreferrer">github.com/yuens1002</a>
        <span className="sep">·</span>
        <a href={P.contact.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
        <span className="sep">·</span>
        <button style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "var(--ink-2)" }} onClick={() => setMenu(true)}>⌘ for machines</button>
      </footer>

      {menu && <AgentMenu onClose={() => setMenu(false)} />}
      {detail && <ProjectDetail slug={detail} onClose={() => setDetail(null)} />}

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent}
          options={["#3d5a80", "#9c5b3b", "#4a6b52", "#6b4a72"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakRadio label="Agent voice" value={t.voice}
          options={["serif", "sans"]}
          onChange={(v) => setTweak("voice", v)} />
        <TweakSection label="Copy" />
        <TweakText label="Greeting" value={t.headline}
          onChange={(v) => setTweak("headline", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
