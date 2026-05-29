/* ui.jsx — icons, QR, and small presentational helpers (→ window) */
const { useState: useUiState } = React;

const ICONS = {
  agent: "M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9zM19 14l.9 2.2 2.1.9-2.1.9L19 20l-.9-2L16 17.1l2.1-.9z",
  dots: "M5 12a1.6 1.6 0 11-3.2 0 1.6 1.6 0 013.2 0zm8.6 0a1.6 1.6 0 11-3.2 0 1.6 1.6 0 013.2 0zm8.6 0a1.6 1.6 0 11-3.2 0 1.6 1.6 0 013.2 0z",
  send: "M4 12l16-8-6 16-2.5-6.2L4 12z",
  close: "M5 5l14 14M19 5L5 19",
  arrow: "M5 12h13m-5-6l6 6-6 6",
  github: "M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.6.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.7.4-1.1.6-1.4-2.2-.3-4.5-1.1-4.5-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 015 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.5 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 3.9-1.3 6.8-5.1 6.8-9.6C22 6.6 17.5 2 12 2z",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 10-5.7-5.7l-1.5 1.5M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 105.7 5.7l1.5-1.5",
  copy: "M9 9h10v10H9zM5 15H4V4h11v1",
  check: "M5 12l5 5L20 6",
  calendar: "M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z",
  download: "M12 4v11m0 0l-4-4m4 4l4-4M5 20h14",
  chat: "M21 12a8 8 0 01-11.5 7.2L4 20l.8-5.5A8 8 0 1121 12z",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18",
  doc: "M14 3v5h5M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8l-5-5z",
  pin: "M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z M12 13a3 3 0 100-6 3 3 0 000 6z",
};

function Icon({ name, style }) {
  const d = ICONS[name] || "";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {name === "agent" ? <path d={d} fill="currentColor" stroke="none" /> : <path d={d} />}
    </svg>
  );
}

/* real, scannable QR via public render service, themed to the paper palette */
function QrCode({ data, size = 96 }) {
  const fg = "262420", bg = "f5f2ea";
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&margin=0&qzone=1&color=${fg}&bgcolor=${bg}&data=${encodeURIComponent(data)}`;
  return (
    <div style={{
      width: size, height: size, padding: 7, borderRadius: 12,
      background: "#fff", border: "1px solid var(--hair-2)", boxShadow: "var(--shadow-sm)",
    }}>
      <img src={url} alt="QR code" width={size - 14} height={size - 14}
        style={{ display: "block", width: "100%", height: "100%", imageRendering: "pixelated", borderRadius: 4 }} />
    </div>
  );
}

/* tiny copy-to-clipboard inline control */
function CopyField({ value, label }) {
  const [done, setDone] = useUiState(false);
  const copy = () => {
    try { navigator.clipboard && navigator.clipboard.writeText(value); } catch (e) {}
    setDone(true); setTimeout(() => setDone(false), 1400);
  };
  return (
    <button className="menu-item" onClick={copy}>
      <span className="mi-ic"><Icon name="link" /></span>
      <span className="mi-main">
        <span className="mi-t">{label}</span>
        <span className="mi-s">{value.replace(/^https?:\/\//, "")}</span>
      </span>
      <span className="mi-act">{done ? "copied ✓" : "copy"}</span>
    </button>
  );
}

Object.assign(window, { Icon, QrCode, CopyField, ICONS });
