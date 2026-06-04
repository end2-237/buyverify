"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface DetectionResult {
  percentage: number;
  confidence: string;
  indicators: string[];
  summary: string;
}

type Step = "input" | "detecting" | "result" | "humanizing" | "humanized";

/* ── Score Ring ─────────────────────────────────────────────── */
function ScoreRing({ pct }: { pct: number }) {
  const [val, setVal] = useState(0);
  const r = 52;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    let raf: number;
    const t0 = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - t0) / 1100, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * pct));
      if (p < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  const color = pct >= 70 ? "#dc2626" : pct >= 40 ? "#d97706" : "#16a34a";
  const trackColor = pct >= 70 ? "#fef2f2" : pct >= 40 ? "#fffbeb" : "#f0fdf4";
  const offset = circ * (1 - val / 100);

  return (
    <div className="relative" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke={trackColor} strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-800 tabular-nums leading-none" style={{ color, fontFamily: "var(--font-display)", fontWeight: 800 }}>
          {val}%
        </span>
        <span className="text-xs mt-1" style={{ color: "var(--text-3)", fontFamily: "var(--font-body)" }}>IA détectée</span>
      </div>
    </div>
  );
}

/* ── Bar ────────────────────────────────────────────────────── */
function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-14 shrink-0" style={{ color: "var(--text-3)", fontFamily: "var(--font-body)" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${w}%`,
            background: color,
            transition: "width 900ms cubic-bezier(.22,1,.36,1)",
          }}
        />
      </div>
      <span className="text-xs tabular-nums w-8 text-right" style={{ color: "var(--text-2)" }}>{pct}%</span>
    </div>
  );
}

/* ── Upload zone ────────────────────────────────────────────── */
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
        borderRadius: "var(--r-xl)",
        border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
        background: dragging ? "var(--accent-bg)" : "var(--surface-2)",
        padding: "28px 24px",
        textAlign: "center",
        cursor: "pointer",
        transition: "border-color 150ms ease, background 150ms ease",
      }}
    >
      {busy ? (
        <div className="flex flex-col items-center gap-2">
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13, color: "var(--text-3)" }}>Extraction…</span>
        </div>
      ) : name ? (
        <div className="flex flex-col items-center gap-1">
          <span style={{ fontSize: 22 }}>📄</span>
          <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{name}</span>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>Cliquer pour changer</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <span style={{ fontSize: 28 }}>📂</span>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: 0 }}>
            Glissez ou <span style={{ color: "var(--accent)", fontWeight: 600 }}>parcourez</span>
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {["PDF", "DOCX", "TXT"].map((f) => (
              <span key={f} style={{
                padding: "2px 8px", borderRadius: "var(--r-sm)",
                border: "1px solid var(--border)", background: "var(--surface)",
                fontSize: 11, color: "var(--text-3)", fontFamily: "monospace",
              }}>.{f.toLowerCase()}</span>
            ))}
          </div>
        </div>
      )}
      <input ref={ref} type="file" accept=".txt,.pdf,.docx" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) process(f); }} />
    </div>
  );
}

/* ── Spinner for loading states ─────────────────────────────── */
function Spinner({ color = "var(--accent)" }: { color?: string }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: "50%",
      border: "3px solid var(--border)",
      borderTopColor: color,
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

/* ── Confidence badge ───────────────────────────────────────── */
function Badge({ label, variant }: { label: string; variant: "default" | "warn" | "success" | "accent" }) {
  const styles = {
    default: { bg: "var(--surface-3)", color: "var(--text-2)", border: "var(--border)" },
    warn:    { bg: "var(--warn-bg)", color: "var(--warn)", border: "#fde68a" },
    success: { bg: "var(--success-bg)", color: "var(--success)", border: "#bbf7d0" },
    accent:  { bg: "var(--accent-bg)", color: "var(--accent)", border: "#c7d2fe" },
  }[variant];
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 99,
      background: styles.bg, color: styles.color,
      border: `1px solid ${styles.border}`,
      fontSize: 12, fontWeight: 600,
    }}>{label}</span>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function Home() {
  const [text, setText] = useState("");
  const [humanized, setHumanized] = useState("");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");

  const detect = async (src: string) => {
    setError(""); setStep("detecting");
    try {
      const r = await fetch("/api/detect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: src }) });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setResult(d); setStep("result");
    } catch (e) { setError((e as Error).message); setStep("input"); }
  };

  const humanize = async () => {
    setError(""); setStep("humanizing");
    try {
      const r = await fetch("/api/humanize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setHumanized(d.humanizedText); setStep("humanized");
    } catch (e) { setError((e as Error).message); setStep("result"); }
  };

  const reset = () => { setText(""); setHumanized(""); setResult(null); setStep("input"); setError(""); };
  const verify = () => { const t = humanized; setText(t); setHumanized(""); setResult(null); detect(t); };
  const copy = (s: string) => navigator.clipboard.writeText(s);
  const dl = (s: string) => {
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([s], { type: "text/plain" })), download: "texte-humanise.txt" });
    a.click();
  };

  const scoreLabel = (p: number) =>
    p >= 80 ? "Très probablement IA" : p >= 60 ? "Probablement IA" : p >= 40 ? "Mixte" : p >= 20 ? "Probablement humain" : "Très probablement humain";
  const scoreVariant = (p: number): "warn" | "success" | "accent" =>
    p >= 60 ? "warn" : p >= 30 ? "accent" : "success";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(241,241,243,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 32, height: 32, borderRadius: "var(--r-md)",
              background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)",
              boxShadow: "0 2px 8px rgba(79,70,229,.3)",
            }}>BV</div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              BuyVerify
            </span>
          </div>

          <div className="flex items-center gap-2">
            {step !== "input" && (
              <button onClick={reset} className="btn-ghost" style={{ padding: "6px 16px", fontSize: 13 }}>
                + Nouveau
              </button>
            )}
            <div style={{
              padding: "4px 12px", borderRadius: 99,
              background: "var(--success-bg)", border: "1px solid #bbf7d0",
              fontSize: 12, color: "var(--success)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
              En ligne
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 96px" }}>

        {/* ══ INPUT ══════════════════════════════════════════════ */}
        {step === "input" && (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>

            {/* Hero */}
            <div className="animate-fade-up" style={{ marginBottom: 40 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 99, background: "var(--accent-bg)", border: "1px solid #c7d2fe", marginBottom: 20 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>Propulsé par Claude AI</span>
              </div>
              <h1 style={{
                fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(28px, 4vw, 44px)",
                letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--text-1)", margin: "0 0 14px",
              }}>
                Détectez les traces d&apos;IA.<br />
                <span style={{ color: "var(--accent)" }}>Humanisez à 100%.</span>
              </h1>
              <p style={{ fontSize: 16, color: "var(--text-2)", margin: 0, lineHeight: 1.7 }}>
                Analysez n&apos;importe quel document, obtenez un score précis,<br />puis réécrivez-le pour qu&apos;il soit indétectable.
              </p>
            </div>

            {/* Stats row */}
            <div className="animate-fade-up stagger-1" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
              {[
                { v: "~94%", l: "Précision", icon: "🎯" },
                { v: "PDF · DOCX · TXT", l: "Formats", icon: "📄" },
                { v: "100%", l: "Humanisation", icon: "✨" },
              ].map((s) => (
                <div key={s.l} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text-1)" }}>{s.v}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>{s.l}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Text input card */}
            <div className="animate-fade-up stagger-2 card" style={{ marginBottom: 16, overflow: "hidden" }}>
              <div style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--border-soft)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Texte à analyser</span>
                <span style={{ fontSize: 12, color: text.length >= 50 ? "var(--success)" : "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
                  {text.length} car. {text.length < 50 ? `(${50 - text.length} manquants)` : "✓"}
                </span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Collez votre texte ici…"
                style={{
                  width: "100%", height: 200, padding: "16px",
                  background: "transparent", border: "none", outline: "none", resize: "none",
                  fontSize: 14, color: "var(--text-1)", lineHeight: 1.75,
                  fontFamily: "var(--font-body)",
                }}
              />
            </div>

            {/* Divider */}
            <div className="animate-fade-up stagger-3" style={{ display: "flex", alignItems: "center", gap: 16, margin: "20px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>ou importez un fichier</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            <div className="animate-fade-up stagger-4" style={{ marginBottom: 20 }}>
              <UploadZone onText={setText} />
            </div>

            {error && (
              <div className="animate-scale-in" style={{
                padding: "12px 16px", borderRadius: "var(--r-md)",
                background: "var(--error-bg)", border: "1px solid #fecaca",
                color: "var(--error)", fontSize: 13, marginBottom: 16,
                display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button
              className="animate-fade-up stagger-5 btn-accent"
              onClick={() => detect(text)}
              disabled={text.trim().length < 50}
              style={{ width: "100%", padding: "15px 24px", fontSize: 15 }}
            >
              Analyser le texte
            </button>
          </div>
        )}

        {/* ══ DETECTING ══════════════════════════════════════════ */}
        {step === "detecting" && (
          <div className="animate-fade-in" style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><Spinner /></div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, margin: "0 0 8px", color: "var(--text-1)" }}>
              Analyse en cours…
            </h2>
            <p style={{ color: "var(--text-3)", fontSize: 14, margin: 0 }}>Claude inspecte les patterns stylistiques</p>
          </div>
        )}

        {/* ══ RESULT ═════════════════════════════════════════════ */}
        {step === "result" && result && (
          <div style={{ maxWidth: 780, margin: "0 auto" }}>

            {/* Page title */}
            <div className="animate-fade-up" style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, margin: 0, letterSpacing: "-0.02em", color: "var(--text-1)" }}>
                Résultat de l&apos;analyse
              </h2>
              <Badge label={`Confiance ${result.confidence}`} variant={result.confidence === "élevée" ? "success" : result.confidence === "moyenne" ? "accent" : "default"} />
            </div>

            {/* Score + summary — asymmetric layout */}
            <div className="animate-scale-in card stagger-1" style={{ padding: "32px", marginBottom: 16, display: "grid", gridTemplateColumns: "auto 1fr", gap: 40, alignItems: "center" }}>
              <ScoreRing pct={result.percentage} />
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: result.percentage >= 70 ? "var(--error)" : result.percentage >= 40 ? "var(--warn)" : "var(--success)", marginBottom: 8 }}>
                  {scoreLabel(result.percentage)}
                </div>
                <p style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>{result.summary}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Bar label="IA" pct={result.percentage} color={result.percentage >= 70 ? "var(--error)" : result.percentage >= 40 ? "var(--warn)" : "#fca5a5"} />
                  <Bar label="Humain" pct={100 - result.percentage} color="var(--success)" />
                </div>
              </div>
            </div>

            {/* Indicators grid */}
            {result.indicators.length > 0 && (
              <div className="animate-fade-up stagger-2 card" style={{ padding: "24px", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--text-1)", margin: "0 0 16px", letterSpacing: "-0.01em" }}>
                  Indicateurs détectés
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                  {result.indicators.map((ind, i) => (
                    <div key={i} className="animate-slide-right" style={{
                      animationDelay: `${i * 50}ms`,
                      padding: "10px 14px",
                      borderRadius: "var(--r-md)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-soft)",
                      display: "flex", gap: 10, alignItems: "flex-start",
                    }}>
                      <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 12, marginTop: 1 }}>◆</span>
                      <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{ind}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Original text preview */}
            <div className="animate-fade-up stagger-3 card" style={{ padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Texte analysé</span>
                <button onClick={() => copy(text)} style={{ fontSize: 12, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: "2px 8px" }}>
                  Copier
                </button>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {text}
              </p>
            </div>

            {error && (
              <div style={{ padding: "12px 16px", borderRadius: "var(--r-md)", background: "var(--error-bg)", border: "1px solid #fecaca", color: "var(--error)", fontSize: 13, marginBottom: 16 }}>
                ⚠ {error}
              </div>
            )}

            <div className="animate-fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button className="btn-ghost" onClick={reset} style={{ padding: "14px", fontSize: 14 }}>
                Nouveau texte
              </button>
              <button className="btn-accent" onClick={humanize} style={{ padding: "14px", fontSize: 14 }}>
                ✨ Humaniser → 0% IA
              </button>
            </div>
          </div>
        )}

        {/* ══ HUMANIZING ═════════════════════════════════════════ */}
        {step === "humanizing" && (
          <div className="animate-fade-in" style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <Spinner color="var(--success)" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, margin: "0 0 8px", color: "var(--text-1)" }}>
              Humanisation en cours…
            </h2>
            <p style={{ color: "var(--text-3)", fontSize: 14, margin: 0 }}>Claude réécrit votre texte avec un style naturel</p>
          </div>
        )}

        {/* ══ HUMANIZED ══════════════════════════════════════════ */}
        {step === "humanized" && (
          <div style={{ maxWidth: 780, margin: "0 auto" }}>

            {/* Success banner */}
            <div className="animate-scale-in" style={{
              padding: "14px 20px", borderRadius: "var(--r-lg)",
              background: "var(--success-bg)", border: "1px solid #bbf7d0",
              display: "flex", alignItems: "center", gap: 12, marginBottom: 24,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "var(--success)", fontSize: 14, fontWeight: 700 }}>✓</span>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--success)" }}>Humanisation réussie</div>
                <div style={{ fontSize: 12, color: "#4ade80" }}>Réécrit pour passer les détecteurs IA</div>
              </div>
            </div>

            {/* Before / After */}
            <div className="animate-fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--error)", display: "inline-block" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Original</span>
                  </div>
                  {result && <Badge label={`${result.percentage}% IA`} variant="warn" />}
                </div>
                <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7, margin: 0, display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {text}
                </p>
              </div>

              <div className="card" style={{ padding: "20px", borderColor: "#bbf7d0", background: "#fafffe" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Humanisé</span>
                  </div>
                  <Badge label="~0% IA" variant="success" />
                </div>
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, margin: 0, display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {humanized}
                </p>
              </div>
            </div>

            {/* Editable output */}
            <div className="animate-fade-up stagger-1 card" style={{ marginBottom: 16, overflow: "hidden" }}>
              <div style={{
                padding: "10px 16px", borderBottom: "1px solid var(--border-soft)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Texte complet</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => copy(humanized)} className="btn-ghost" style={{ padding: "4px 12px", fontSize: 12 }}>Copier</button>
                  <button onClick={() => dl(humanized)} className="btn-ghost" style={{ padding: "4px 12px", fontSize: 12, color: "var(--accent)", borderColor: "#c7d2fe" }}>↓ Télécharger</button>
                </div>
              </div>
              <textarea
                value={humanized}
                onChange={(e) => setHumanized(e.target.value)}
                style={{
                  width: "100%", height: 220, padding: "16px",
                  background: "transparent", border: "none", outline: "none", resize: "none",
                  fontSize: 14, color: "var(--text-1)", lineHeight: 1.75,
                  fontFamily: "var(--font-body)",
                }}
              />
            </div>

            <div className="animate-fade-up stagger-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button className="btn-ghost" onClick={reset} style={{ padding: "14px", fontSize: 14 }}>
                Nouveau texte
              </button>
              <button className="btn-accent" onClick={verify} style={{ padding: "14px", fontSize: 14 }}>
                🔍 Vérifier le score
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "16px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-3)" }}>
          <span>BuyVerify © 2026</span>
          <span>Propulsé par Claude AI</span>
        </div>
      </footer>
    </div>
  );
}
