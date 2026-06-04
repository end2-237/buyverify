"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface DetectionResult {
  percentage: number;
  confidence: string;
  indicators: string[];
  summary: string;
}
type Step = "input" | "detecting" | "result" | "humanizing" | "humanized";

/* ── Animated background ──────────────────────────────────── */
function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(79,70,229,0.12) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        animation: "grid-pulse 6s ease-in-out infinite",
      }} />

      {/* Blobs */}
      <div style={{
        position: "absolute", top: "-15%", right: "-10%",
        width: 560, height: 560,
        background: "radial-gradient(circle, rgba(199,210,254,0.45) 0%, transparent 70%)",
        borderRadius: "50%",
        animation: "float-slow 12s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "5%", left: "-8%",
        width: 420, height: 420,
        background: "radial-gradient(circle, rgba(167,243,208,0.30) 0%, transparent 70%)",
        animation: "float-med 16s ease-in-out infinite 2s",
        borderRadius: "50%",
      }} />
      <div style={{
        position: "absolute", top: "40%", left: "30%",
        width: 300, height: 300,
        background: "radial-gradient(circle, rgba(253,230,138,0.20) 0%, transparent 70%)",
        animation: "drift-x 10s ease-in-out infinite 1s",
        borderRadius: "50%",
      }} />

      {/* Morphing shape */}
      <div style={{
        position: "absolute", top: "60%", right: "5%",
        width: 180, height: 180,
        background: "rgba(199,210,254,0.18)",
        border: "1px solid rgba(79,70,229,0.12)",
        animation: "morph 14s ease-in-out infinite, float-slow 18s ease-in-out infinite 3s",
      }} />

      {/* Fine lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07 }}>
        <line x1="0" y1="30%" x2="100%" y2="28%" stroke="#4f46e5" strokeWidth="0.8" />
        <line x1="0" y1="68%" x2="100%" y2="71%" stroke="#4f46e5" strokeWidth="0.8" />
        <line x1="20%" y1="0" x2="18%" y2="100%" stroke="#4f46e5" strokeWidth="0.8" />
        <line x1="78%" y1="0" x2="80%" y2="100%" stroke="#4f46e5" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

/* ── Animated counter ─────────────────────────────────────── */
function AnimNum({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf: number;
    const t0 = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - t0) / 1100, 1);
      setV(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v}{suffix}</>;
}

/* ── Score Arc ────────────────────────────────────────────── */
function ScoreArc({ pct }: { pct: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    const t0 = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - t0) / 1200, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * pct));
      if (p < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  const r = 70, circ = 2 * Math.PI * r;
  const color = val >= 70 ? "#b91c1c" : val >= 40 ? "#b45309" : "#059669";
  return (
    <div style={{ position: "relative", width: 180, height: 180 }}>
      <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="12" />
        <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - val / 100)}
          style={{ transition: "stroke 0.5s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 38, lineHeight: 1, color, letterSpacing: "-0.04em" }}>{val}%</span>
        <span style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>IA détectée</span>
      </div>
    </div>
  );
}

/* ── Progress bar ─────────────────────────────────────────── */
function ProgressBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 100); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)", color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 99, background: color, width: `${w}%`, transition: "width 1s cubic-bezier(.22,1,.36,1)" }} />
      </div>
    </div>
  );
}

/* ── Upload Zone ──────────────────────────────────────────── */
function UploadZone({ onText }: { onText: (t: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const process = useCallback(async (file: File) => {
    setBusy(true); setName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "txt") { onText(await file.text()); }
      else if (ext === "pdf" || ext === "docx") {
        const fd = new FormData(); fd.append("file", file);
        const r = await fetch("/api/parse", { method: "POST", body: fd });
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        onText(d.text);
      } else { alert("Formats : .txt · .pdf · .docx"); setName(""); }
    } catch (e) { alert((e as Error).message); setName(""); }
    setBusy(false);
  }, [onText]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) process(f); }}
      onClick={() => ref.current?.click()}
      style={{
        borderRadius: 14, border: `1.5px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
        background: dragging ? "var(--accent-bg)" : "transparent",
        padding: "20px", textAlign: "center", cursor: "pointer",
        transition: "border-color 150ms, background 150ms",
      }}
    >
      {busy ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13, color: "var(--text-3)" }}>Extraction…</span>
        </div>
      ) : name ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <svg width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{name}</span>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>Cliquer pour changer</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <svg width="20" height="20" fill="none" stroke="var(--text-3)" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
            Glissez un fichier ou <span style={{ color: "var(--accent)", fontWeight: 600 }}>parcourez</span>
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            {["PDF", "DOCX", "TXT"].map(f => (
              <span key={f} style={{ padding: "2px 7px", borderRadius: 5, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 10, color: "var(--text-3)", fontFamily: "monospace", fontWeight: 700 }}>.{f.toLowerCase()}</span>
            ))}
          </div>
        </div>
      )}
      <input ref={ref} type="file" accept=".txt,.pdf,.docx" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) process(f); }} />
    </div>
  );
}

/* ── Ticker ───────────────────────────────────────────────── */
function Ticker() {
  const items = ["Détection IA", "Humanisation", "Score précis", "PDF · DOCX · TXT", "Groq Kimi K2", "Résultat instantané", "100% naturel", "Indétectable"];
  const all = [...items, ...items];
  return (
    <div style={{ overflow: "hidden", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "11px 0", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
      <div style={{ display: "flex", gap: 56, animation: "ticker 20s linear infinite", width: "max-content" }}>
        {all.map((t, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontWeight: 700, color: "var(--text-3)", whiteSpace: "nowrap", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Loading screen ───────────────────────────────────────── */
function LoadingView({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="anim-fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 480, gap: 28 }}>
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 18, border: "1px solid var(--border)", background: "var(--surface)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--accent), transparent)", animation: "scan-line 1.6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
          </svg>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--text-1)", marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 14, color: "var(--text-3)" }}>{sub}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: `pulse-dot 1.2s ease-in-out ${i * 200}ms infinite` }} />
        ))}
      </div>
    </div>
  );
}

/* ── Pricing card ─────────────────────────────────────────── */
function PricingCard({
  tier, price, period, description, features, cta, accent, delay
}: {
  tier: string; price: string; period: string; description: string;
  features: string[]; cta: string; accent: boolean; delay: number;
}) {
  return (
    <div
      className="anim-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: accent ? "var(--text-1)" : "var(--surface)",
        border: `1px solid ${accent ? "transparent" : "var(--border)"}`,
        borderRadius: 24,
        padding: "36px 32px",
        boxShadow: accent ? "0 20px 60px rgba(17,17,20,0.25), 0 4px 16px rgba(17,17,20,0.15)" : "var(--shadow-md)",
        display: "flex", flexDirection: "column", gap: 0,
        position: "relative", overflow: "hidden",
        transform: accent ? "scale(1.04)" : "none",
      }}
    >
      {accent && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--accent), #818cf8, #38bdf8)" }} />
      )}
      {accent && (
        <div style={{ position: "absolute", top: 20, right: 20, padding: "3px 10px", borderRadius: 99, background: "rgba(255,255,255,0.1)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Populaire
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: accent ? "rgba(255,255,255,0.4)" : "var(--text-3)", marginBottom: 16 }}>{tier}</div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: price.length > 6 ? 26 : 44, letterSpacing: "-0.03em", color: accent ? "#fff" : "var(--text-1)", lineHeight: 1 }}>{price}</span>
        {period && <span style={{ fontSize: 14, color: accent ? "rgba(255,255,255,0.4)" : "var(--text-3)" }}>{period}</span>}
      </div>

      <p style={{ fontSize: 14, color: accent ? "rgba(255,255,255,0.55)" : "var(--text-2)", lineHeight: 1.6, marginBottom: 28 }}>{description}</p>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: accent ? "rgba(255,255,255,0.1)" : "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              <svg width="9" height="9" fill="none" stroke={accent ? "#fff" : "var(--accent)"} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span style={{ fontSize: 14, color: accent ? "rgba(255,255,255,0.75)" : "var(--text-2)", lineHeight: 1.5 }}>{f}</span>
          </div>
        ))}
      </div>

      <button style={{
        padding: "14px", borderRadius: 14, fontSize: 14, fontWeight: 700,
        fontFamily: "var(--font-display)", cursor: "pointer", border: "none",
        background: accent ? "#fff" : "var(--text-1)",
        color: accent ? "var(--text-1)" : "#fff",
        transition: "opacity 150ms, transform 150ms",
        boxShadow: accent ? "0 2px 8px rgba(255,255,255,0.15)" : "0 2px 8px rgba(0,0,0,0.15)",
      }}
        onMouseEnter={e => { (e.target as HTMLElement).style.opacity = "0.88"; (e.target as HTMLElement).style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.opacity = "1"; (e.target as HTMLElement).style.transform = "translateY(0)"; }}
      >
        {cta}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const [text, setText] = useState("");
  const [humanized, setHumanized] = useState("");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [iterations, setIterations] = useState(0);
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");

  const detect = async (src: string) => {
    setError(""); setStep("detecting");
    try {
      const r = await fetch("/api/detect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: src }) });
      const raw = await r.text();
      if (!raw) throw new Error("Réponse vide du serveur (vérifiez la clé GROQ_API_KEY).");
      const d = JSON.parse(raw);
      if (d.error) throw new Error(d.error);
      setResult(d); setStep("result");
    } catch (e) { setError((e as Error).message); setStep("input"); }
  };

  const humanize = async () => {
    setError(""); setStep("humanizing");
    try {
      const r = await fetch("/api/humanize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const raw = await r.text();
      if (!raw) throw new Error("Réponse vide du serveur (vérifiez la clé GROQ_API_KEY).");
      const d = JSON.parse(raw);
      if (d.error) throw new Error(d.error);
      setHumanized(d.humanizedText);
      setFinalScore(typeof d.finalScore === "number" ? d.finalScore : null);
      setIterations(typeof d.iterations === "number" ? d.iterations : 0);
      setStep("humanized");
    } catch (e) { setError((e as Error).message); setStep("result"); }
  };

  const reset = () => { setText(""); setHumanized(""); setResult(null); setFinalScore(null); setIterations(0); setStep("input"); setError(""); };
  const verify = () => { const t = humanized; setText(t); setHumanized(""); setResult(null); detect(t); };
  const copy = (s: string) => navigator.clipboard.writeText(s);
  const dl = (s: string) => {
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([s], { type: "text/plain" })), download: "texte-humanise.txt" });
    a.click();
  };

  const scoreColor = (p: number) => p >= 70 ? "var(--error)" : p >= 40 ? "var(--warn)" : "var(--success)";
  const scoreLabel = (p: number) => p >= 80 ? "Très probablement IA" : p >= 60 ? "Probablement IA" : p >= 40 ? "Mixte" : p >= 20 ? "Probablement humain" : "Très probablement humain";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", position: "relative" }}>
      <Background />

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(240,240,242,0.82)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--text-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em", color: "var(--text-1)" }}>BuyVerify</span>
              <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 6 }}>by <a href="https://buyticle.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Buyticle</a></span>
            </div>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {step !== "input" && (
              <button onClick={reset} className="btn-outline" style={{ padding: "7px 18px", fontSize: 13 }}>Nouveau texte</button>
            )}
            {step === "input" && (
              <a href="#pricing" className="btn-outline" style={{ padding: "7px 18px", fontSize: 13, textDecoration: "none" }}>Tarifs</a>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, background: "var(--success-bg)", border: "1px solid var(--success-border)", fontSize: 11, fontWeight: 600, color: "var(--success)" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", display: "inline-block", animation: "pulse-dot 2s ease-in-out infinite" }} />
              Actif
            </div>
          </nav>
        </div>
      </header>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ══ INPUT VIEW ══════════════════════════════════════ */}
        {step === "input" && (
          <>
            {/* Hero */}
            <section style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 32px 64px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
                {/* Left */}
                <div>
                  <div className="anim-fade-up d0" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 99, background: "rgba(255,255,255,0.8)", border: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 28, backdropFilter: "blur(8px)" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                    Groq · Kimi K2 · Précision maximale
                  </div>

                  <h1 className="anim-fade-up d1" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(36px, 4.5vw, 58px)", lineHeight: 1.0, letterSpacing: "-0.04em", color: "var(--text-1)", marginBottom: 24 }}>
                    Votre texte<br />contient-il<br /><span style={{ color: "var(--accent)" }}>des traces IA ?</span>
                  </h1>

                  <p className="anim-fade-up d2" style={{ fontSize: 17, color: "var(--text-2)", lineHeight: 1.75, maxWidth: 420, marginBottom: 40 }}>
                    Détectez le taux d&apos;IA dans n&apos;importe quel document et réécrivez-le pour qu&apos;il soit 100% humain.
                  </p>

                  <div className="anim-fade-up d3" style={{ display: "flex", gap: 40 }}>
                    {[{ n: 94, s: "%", l: "Précision" }, { n: 3, s: " formats", l: "Supportés" }].map(({ n, s, l }) => (
                      <div key={l}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 36, letterSpacing: "-0.04em", color: "var(--text-1)", lineHeight: 1 }}>
                          <AnimNum to={n} suffix={s} />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, fontWeight: 500 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — input card */}
                <div className="anim-scale-in d2">
                  <div className="surface" style={{ overflow: "hidden", backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.92)" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-soft)", background: "var(--surface-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Texte à analyser</span>
                      <span style={{ fontSize: 12, color: text.length >= 50 ? "var(--success)" : "var(--text-3)" }}>
                        {text.length >= 50 ? "Prêt" : `${50 - text.length} car. manquants`}
                      </span>
                    </div>
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="Collez votre texte ici…"
                      style={{ width: "100%", height: 175, padding: "20px", background: "transparent", border: "none", outline: "none", resize: "none", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-1)", lineHeight: 1.8 }}
                    />
                    <div style={{ padding: "0 20px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                        <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>ou</span>
                        <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
                      </div>
                      <UploadZone onText={setText} />
                    </div>
                    {error && (
                      <div style={{ margin: "0 20px 16px", padding: "10px 14px", borderRadius: 10, background: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error)", fontSize: 13 }}>{error}</div>
                    )}
                    <div style={{ padding: "0 20px 20px" }}>
                      <button className="btn-primary" onClick={() => detect(text)} disabled={text.trim().length < 50} style={{ width: "100%", padding: "15px" }}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Analyser le texte
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Ticker />

            {/* How it works */}
            <section style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 32px" }}>
              <div className="anim-fade-up d0" style={{ marginBottom: 48, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Comment ça marche</div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 32, letterSpacing: "-0.03em", color: "var(--text-1)" }}>Trois étapes,<br />zéro friction.</h2>
                </div>
                <div style={{ height: 1, flex: 1, maxWidth: 280, background: "var(--border)", marginLeft: 48, marginBottom: 8, transformOrigin: "left", animation: "line-grow 800ms cubic-bezier(.22,1,.36,1) 200ms both" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {[
                  { n: "01", t: "Importez", d: "Collez votre texte ou importez un fichier PDF, DOCX ou TXT directement depuis votre ordinateur." },
                  { n: "02", t: "Analysez", d: "Groq Kimi K2 inspecte la structure, le style et les patterns pour calculer un score IA précis." },
                  { n: "03", t: "Humanisez", d: "En un clic, obtenez une version réécrite, naturelle, qui passe tous les détecteurs IA du marché." },
                ].map(({ n, t, d }, i) => (
                  <div key={n} className={`anim-fade-up d${i + 1} surface`} style={{ padding: "28px 24px", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 52, letterSpacing: "-0.05em", lineHeight: 1, color: "var(--surface-3)", marginBottom: 20 }}>{n}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-1)", marginBottom: 10 }}>{t}</div>
                    <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>{d}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── PRICING ── */}
            <section id="pricing" style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 32px 96px" }}>
              <div className="anim-fade-up d0" style={{ textAlign: "center", marginBottom: 56 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Tarifs</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 40, letterSpacing: "-0.03em", color: "var(--text-1)", marginBottom: 14 }}>
                  Simple, transparent,<br />sans surprise.
                </h2>
                <p style={{ fontSize: 16, color: "var(--text-2)", maxWidth: 460, margin: "0 auto" }}>
                  Choisissez le plan qui correspond à vos besoins. Annulable à tout moment.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, alignItems: "end" }}>
                <PricingCard
                  tier="Gratuit" price="0 FCFA" period="/mois"
                  description="Pour découvrir et tester BuyVerify sans engagement."
                  features={["5 analyses / jour", "Détection IA basique", "Texte jusqu'à 1 000 mots", "Export .txt"]}
                  cta="Commencer gratuitement" accent={false} delay={0}
                />
                <PricingCard
                  tier="Pro" price="7 900 FCFA" period="/mois"
                  description="Pour les professionnels qui produisent du contenu régulièrement."
                  features={["Analyses illimitées", "Humanisation illimitée", "PDF · DOCX · TXT", "Vérification post-humanisation", "Modèle Groq Kimi K2", "Support prioritaire"]}
                  cta="Démarrer l'essai 7 jours" accent={true} delay={80}
                />
                <PricingCard
                  tier="Entreprise" price="32 000 FCFA" period="/mois"
                  description="Pour les équipes qui ont besoin de volume et d'intégrations."
                  features={["Tout le plan Pro", "API REST dédiée", "10 utilisateurs inclus", "Tableau de bord d'équipe", "Facturation annuelle disponible", "SLA 99.9%"]}
                  cta="Contacter l'équipe" accent={false} delay={160}
                />
              </div>

              {/* Guarantee strip */}
              <div className="anim-fade-up" style={{ marginTop: 40, padding: "20px 32px", borderRadius: 16, background: "rgba(255,255,255,0.7)", border: "1px solid var(--border)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
                {[
                  { icon: "shield", text: "Paiement sécurisé" },
                  { icon: "refresh", text: "Annulation à tout moment" },
                  { icon: "clock", text: "Essai 7 jours gratuit" },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="16" height="16" fill="none" stroke="var(--success)" strokeWidth="1.8" viewBox="0 0 24 24">
                      {icon === "shield" && <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>}
                      {icon === "refresh" && <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></>}
                      {icon === "clock" && <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>{text}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ══ DETECTING ══════════════════════════════════════ */}
        {step === "detecting" && (
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px" }}>
            <LoadingView label="Analyse en cours…" sub="Groq Kimi K2 inspecte les patterns stylistiques de votre texte" />
          </div>
        )}

        {/* ══ RESULT ═════════════════════════════════════════ */}
        {step === "result" && result && (
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px" }}>
            <div className="anim-fade-up d0" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Rapport d&apos;analyse</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 36, letterSpacing: "-0.03em", color: "var(--text-1)" }}>{scoreLabel(result.percentage)}</h2>
              </div>
              <div style={{ padding: "8px 20px", borderRadius: 99, background: result.confidence === "élevée" ? "var(--success-bg)" : "var(--surface)", border: `1px solid ${result.confidence === "élevée" ? "var(--success-border)" : "var(--border)"}`, fontSize: 13, fontWeight: 600, color: result.confidence === "élevée" ? "var(--success)" : "var(--text-2)" }}>
                Confiance {result.confidence}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, marginBottom: 20 }}>
              <div className="anim-scale-in d1 surface" style={{ padding: "36px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, background: "rgba(255,255,255,0.92)" }}>
                <ScoreArc pct={result.percentage} />
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
                  <ProgressBar label="IA" pct={result.percentage} color={scoreColor(result.percentage)} />
                  <ProgressBar label="Humain" pct={100 - result.percentage} color="var(--success)" />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="anim-fade-up d1 surface" style={{ padding: "28px 32px", background: "rgba(255,255,255,0.92)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Synthèse</div>
                  <p style={{ fontSize: 16, color: "var(--text-1)", lineHeight: 1.75, margin: 0 }}>{result.summary}</p>
                </div>
                {result.indicators.length > 0 && (
                  <div className="anim-fade-up d2 surface" style={{ padding: "28px 32px", flex: 1, background: "rgba(255,255,255,0.92)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Indicateurs détectés</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                      {result.indicators.map((ind, i) => (
                        <div key={i} className="anim-reveal" style={{ animationDelay: `${i * 60}ms`, padding: "10px 14px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-soft)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: scoreColor(result.percentage), flexShrink: 0, marginTop: 5 }} />
                          <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{ind}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="anim-fade-up d3 surface" style={{ padding: "20px 28px", marginBottom: 28, display: "flex", justifyContent: "space-between", gap: 24, alignItems: "center", background: "rgba(255,255,255,0.92)" }}>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, margin: 0, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{text}</p>
              <button onClick={() => copy(text)} className="btn-outline" style={{ flexShrink: 0, padding: "7px 16px", fontSize: 12 }}>Copier</button>
            </div>

            {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error)", fontSize: 13, marginBottom: 20 }}>{error}</div>}

            <div className="anim-fade-up d4" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <button className="btn-outline" onClick={reset} style={{ padding: "15px" }}>Nouveau texte</button>
              <button className="btn-accent" onClick={humanize} style={{ padding: "15px" }}>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Humaniser — viser 0% IA
              </button>
            </div>
          </div>
        )}

        {/* ══ HUMANIZING ═════════════════════════════════════ */}
        {step === "humanizing" && (
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px" }}>
            <LoadingView label="Humanisation en cours…" sub="Réécriture, vérification du score, puis nouvelle passe jusqu'à atteindre ~0% IA" />
          </div>
        )}

        {/* ══ HUMANIZED ══════════════════════════════════════ */}
        {step === "humanized" && (
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px" }}>
            <div className="anim-fade-up d0" style={{ marginBottom: 40, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Humanisation réussie</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 36, letterSpacing: "-0.03em", color: "var(--text-1)" }}>Votre texte réécrit</h2>
                <p style={{ fontSize: 15, color: "var(--text-2)", marginTop: 10 }}>
                  Indétectable par les outils IA, sens préservé{iterations > 0 ? ` — ${iterations} passe${iterations > 1 ? "s" : ""} de réécriture et vérification.` : "."}
                </p>
              </div>
              <div style={{ padding: "10px 20px", borderRadius: 12, background: "var(--success-bg)", border: "1px solid var(--success-border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <svg width="14" height="14" fill="none" stroke="var(--success)" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>{finalScore !== null ? `${finalScore}% IA` : "~0% IA"}</span>
              </div>
            </div>

            <div className="anim-fade-up d1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div className="surface" style={{ padding: "24px 28px", background: "rgba(255,255,255,0.92)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--error)" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Original</span>
                  </div>
                  {result && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--error)", background: "var(--error-bg)", border: "1px solid var(--error-border)", padding: "2px 10px", borderRadius: 99 }}>{result.percentage}% IA</span>}
                </div>
                <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.75, display: "-webkit-box", WebkitLineClamp: 8, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{text}</p>
              </div>

              <div className="surface" style={{ padding: "24px 28px", borderColor: "var(--success-border)", background: "rgba(240,253,244,0.8)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Humanisé</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", background: "var(--success-bg)", border: "1px solid var(--success-border)", padding: "2px 10px", borderRadius: 99 }}>{finalScore !== null ? `${finalScore}% IA` : "~0% IA"}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.75, display: "-webkit-box", WebkitLineClamp: 8, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{humanized}</p>
              </div>
            </div>

            <div className="anim-fade-up d2 surface" style={{ overflow: "hidden", marginBottom: 20, background: "rgba(255,255,255,0.92)" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-2)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Texte complet — éditable</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-outline" onClick={() => copy(humanized)} style={{ padding: "5px 14px", fontSize: 12 }}>Copier</button>
                  <button className="btn-accent" onClick={() => dl(humanized)} style={{ padding: "5px 14px", fontSize: 12 }}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Télécharger
                  </button>
                </div>
              </div>
              <textarea value={humanized} onChange={e => setHumanized(e.target.value)} style={{ width: "100%", height: 240, padding: "20px", background: "transparent", border: "none", outline: "none", resize: "none", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-1)", lineHeight: 1.8 }} />
            </div>

            <div className="anim-fade-up d3" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <button className="btn-outline" onClick={reset} style={{ padding: "15px" }}>Nouveau texte</button>
              <button className="btn-primary" onClick={verify} style={{ padding: "15px" }}>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Vérifier le score final
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid var(--border)", background: "rgba(240,240,242,0.9)", backdropFilter: "blur(12px)" }}>
        {/* Main footer */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 32px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--text-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em", color: "var(--text-1)" }}>BuyVerify</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7, maxWidth: 280, marginBottom: 16 }}>
              Détectez et humanisez vos textes IA en quelques secondes. Une solution <a href="https://buyticle.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Buyticle</a>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <a href="tel:+237696995879" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-2)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.93z"/>
                </svg>
                +237 696 995 879
              </a>
              <a href="mailto:contact@buyticle.com" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-2)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                contact@buyticle.com
              </a>
            </div>
          </div>

          {/* Produit */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Produit</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["Détection IA", "Humanisation", "Tarifs", "API"].map(l => (
                <span key={l} style={{ fontSize: 13, color: "var(--text-2)", cursor: "pointer" }}>{l}</span>
              ))}
            </div>
          </div>

          {/* Légal */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Légal</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["Conditions d'utilisation", "Politique de confidentialité", "Mentions légales"].map(l => (
                <span key={l} style={{ fontSize: 13, color: "var(--text-2)", cursor: "pointer" }}>{l}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>© 2026 BuyVerify — Une solution <a href="https://buyticle.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Buyticle</a></span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Groq · Kimi K2 · moonshotai</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
