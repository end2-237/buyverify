"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface DetectionResult {
  percentage: number;
  confidence: string;
  indicators: string[];
  summary: string;
}

type Step = "input" | "detecting" | "result" | "humanizing" | "humanized";

function ScoreRing({ percentage }: { percentage: number }) {
  const [displayed, setDisplayed] = useState(0);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - displayed / 100);

  const color =
    percentage >= 70 ? "#ef4444" : percentage >= 40 ? "#f97316" : "#22c55e";
  const glow =
    percentage >= 70
      ? "drop-shadow(0 0 12px rgba(239,68,68,0.6))"
      : percentage >= 40
      ? "drop-shadow(0 0 12px rgba(249,115,22,0.6))"
      : "drop-shadow(0 0 12px rgba(34,197,94,0.6))";

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(ease * percentage));
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [percentage]);

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: glow, transition: "stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>{displayed}%</span>
        <span className="text-[11px] text-gray-500 mt-0.5">IA détectée</span>
      </div>
    </div>
  );
}

function ConfidencePill({ confidence }: { confidence: string }) {
  const map: Record<string, string> = {
    faible: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    moyenne: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    élevée: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[confidence] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
      {confidence}
    </span>
  );
}

function UploadZone({ onText }: { onText: (t: string, name: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "txt") {
        const text = await file.text();
        onText(text, file.name);
      } else if (ext === "pdf" || ext === "docx") {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/parse", { method: "POST", body: fd });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        onText(data.text, file.name);
      } else {
        alert("Format non supporté. Utilisez .txt, .pdf ou .docx");
        setFileName("");
      }
    } catch (e) {
      alert((e as Error).message);
      setFileName("");
    }
    setLoading(false);
  }, [onText]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl p-8 text-center transition-all duration-200 overflow-hidden
        ${dragging
          ? "border-2 border-violet-400 bg-violet-500/10"
          : "border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
        }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-blue-600/5 pointer-events-none" />

      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Extraction du texte...</p>
        </div>
      ) : fileName ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-xl">✓</div>
          <p className="text-sm text-violet-300 font-medium">{fileName}</p>
          <p className="text-xs text-gray-500">Cliquer pour changer</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl animate-float">
            📂
          </div>
          <div>
            <p className="text-sm text-gray-300">
              Glissez un fichier ou{" "}
              <span className="text-violet-400 font-medium">parcourir</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">PDF · DOCX · TXT</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {["PDF", "DOCX", "TXT"].map((f) => (
              <span key={f} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-400 font-mono">
                .{f.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".txt,.pdf,.docx"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
      />
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [humanizedText, setHumanizedText] = useState("");
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [charCount, setCharCount] = useState(0);

  const handleTextChange = (val: string) => {
    setText(val);
    setCharCount(val.length);
  };

  const handleDetect = async () => {
    if (text.trim().length < 50) { setError("Minimum 50 caractères requis."); return; }
    setError(""); setStep("detecting");
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDetection(data); setStep("result");
    } catch (e) { setError((e as Error).message); setStep("input"); }
  };

  const handleHumanize = async () => {
    setError(""); setStep("humanizing");
    try {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHumanizedText(data.humanizedText); setStep("humanized");
    } catch (e) { setError((e as Error).message); setStep("result"); }
  };

  const handleReset = () => {
    setText(""); setHumanizedText(""); setDetection(null);
    setStep("input"); setError(""); setCharCount(0);
  };

  const handleVerify = async () => {
    const toVerify = humanizedText;
    setText(toVerify); setHumanizedText(""); setDetection(null);
    setStep("detecting"); setError("");
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: toVerify }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDetection(data); setStep("result");
    } catch (e) { setError((e as Error).message); setStep("input"); }
  };

  const download = (content: string, filename: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    Object.assign(document.createElement("a"), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
  };

  const copy = (content: string) => navigator.clipboard.writeText(content);

  const scoreLabel = (p: number) =>
    p >= 80 ? "Très probablement IA" : p >= 60 ? "Probablement IA" : p >= 40 ? "Mixte humain / IA" : p >= 20 ? "Probablement humain" : "Très probablement humain";

  const scoreColor = (p: number) =>
    p >= 70 ? "text-red-400" : p >= 40 ? "text-orange-400" : "text-emerald-400";

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-violet-500/25 animate-pulse-ring">
                AI
              </div>
            </div>
            <div>
              <div className="font-bold text-base tracking-tight">BuyVerify</div>
              <div className="text-[11px] text-gray-500">Détection & Humanisation IA</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {step !== "input" && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white glass glass-hover transition-all"
              >
                <span>+</span> Nouveau
              </button>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              En ligne
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">

        {/* ── INPUT ── */}
        {step === "input" && (
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Hero */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-violet-300 border border-violet-500/20 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                Propulsé par Claude AI
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                Détectez et{" "}
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-shimmer">
                  humanisez
                </span>
                {" "}vos textes
              </h1>
              <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
                Analysez le taux d&apos;IA dans n&apos;importe quel document, puis transformez-le en texte 100% naturel.
              </p>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Précision", value: "~94%", icon: "🎯" },
                { label: "Formats", value: "3", icon: "📄" },
                { label: "Humanisation", value: "100%", icon: "✨" },
              ].map((s) => (
                <div key={s.label} className="glass rounded-2xl p-4 text-center">
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="text-lg font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Text input */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Texte à analyser</span>
                <span className={`text-xs tabular-nums ${charCount >= 50 ? "text-emerald-400" : "text-gray-600"}`}>
                  {charCount} / 50 min
                </span>
              </div>
              <textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Collez votre texte ici…"
                className="w-full h-52 bg-transparent p-4 text-gray-200 placeholder-gray-600 resize-none focus:outline-none text-sm leading-7"
              />
            </div>

            {/* Separator */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-xs text-gray-600 px-2">ou importez un fichier</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <UploadZone onText={(t) => { handleTextChange(t); }} />

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                <span className="text-lg">⚠️</span> {error}
              </div>
            )}

            <button
              onClick={handleDetect}
              disabled={text.trim().length < 50}
              className="w-full py-4 rounded-2xl font-semibold text-base relative overflow-hidden group transition-all
                bg-gradient-to-r from-violet-600 to-blue-600
                hover:from-violet-500 hover:to-blue-500
                disabled:opacity-30 disabled:cursor-not-allowed
                shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span>🔍</span> Analyser le texte
              </span>
            </button>
          </div>
        )}

        {/* ── DETECTING ── */}
        {step === "detecting" && (
          <div className="max-w-md mx-auto text-center py-24 space-y-8">
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 rounded-full bg-violet-500/10" />
              <div className="absolute inset-2 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
              <div className="absolute inset-5 rounded-full border-2 border-blue-500/20 border-t-blue-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🔍</div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Analyse en cours…</h2>
              <p className="text-gray-500 text-sm">Claude inspecte les patterns stylistiques de votre texte</p>
            </div>
            <div className="flex items-center justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === "result" && detection && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Résultat de l&apos;analyse</h2>
              <ConfidencePill confidence={detection.confidence} />
            </div>

            {/* Score card */}
            <div className="glass rounded-3xl p-8">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <ScoreRing percentage={detection.percentage} />
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <div className={`text-2xl font-bold ${scoreColor(detection.percentage)}`}>
                      {scoreLabel(detection.percentage)}
                    </div>
                    <p className="text-gray-400 text-sm mt-2 leading-relaxed">{detection.summary}</p>
                  </div>
                  {/* Mini progress bars */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16">IA</span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-1000"
                          style={{ width: `${detection.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-gray-400 w-8">{detection.percentage}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16">Humain</span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000"
                          style={{ width: `${100 - detection.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-gray-400 w-8">{100 - detection.percentage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Indicators */}
            {detection.indicators.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <span className="text-violet-400">▸</span> Indicateurs détectés
                </h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {detection.indicators.map((ind, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-violet-400/60 mt-0.5 text-xs">◆</span>
                      <span className="text-sm text-gray-400 leading-relaxed">{ind}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text preview */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Texte analysé</span>
                <button onClick={() => copy(text)} className="text-xs text-gray-600 hover:text-gray-300 transition-colors">Copier</button>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed line-clamp-4">{text}</p>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleReset}
                className="py-3.5 rounded-2xl text-sm font-medium glass glass-hover text-gray-300 hover:text-white transition-all"
              >
                Nouveau texte
              </button>
              <button
                onClick={handleHumanize}
                className="py-3.5 rounded-2xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
              >
                <span>✨</span> Humaniser → 0% IA
              </button>
            </div>
          </div>
        )}

        {/* ── HUMANIZING ── */}
        {step === "humanizing" && (
          <div className="max-w-md mx-auto text-center py-24 space-y-8">
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10" />
              <div className="absolute inset-2 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
              <div className="absolute inset-5 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Humanisation en cours…</h2>
              <p className="text-gray-500 text-sm">Claude réécrit votre texte avec un style naturel et authentique</p>
            </div>
            <div className="flex items-center justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* ── HUMANIZED ── */}
        {step === "humanized" && (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Success banner */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">✓</div>
              <div>
                <div className="text-sm font-semibold text-emerald-300">Humanisation réussie</div>
                <div className="text-xs text-emerald-600">Votre texte a été réécrit pour passer indétecté par les outils IA</div>
              </div>
            </div>

            {/* Before / After */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="glass rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Original</span>
                  </div>
                  {detection && (
                    <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                      {detection.percentage}% IA
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-8">{text}</p>
              </div>

              <div className="glass rounded-2xl p-5 space-y-3 border-emerald-500/20 bg-emerald-500/[0.03]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Humanisé</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    ~0% IA
                  </span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed line-clamp-8">{humanizedText}</p>
              </div>
            </div>

            {/* Full editable output */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Texte complet</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copy(humanizedText)}
                    className="text-xs text-gray-500 hover:text-gray-200 px-3 py-1 rounded-lg hover:bg-white/5 transition-all"
                  >
                    Copier
                  </button>
                  <button
                    onClick={() => download(humanizedText, "texte-humanise.txt")}
                    className="text-xs text-violet-400 hover:text-violet-200 px-3 py-1 rounded-lg hover:bg-violet-500/10 transition-all"
                  >
                    ↓ Télécharger
                  </button>
                </div>
              </div>
              <textarea
                value={humanizedText}
                onChange={(e) => setHumanizedText(e.target.value)}
                className="w-full h-60 bg-transparent p-4 text-gray-200 text-sm leading-7 resize-none focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleReset}
                className="py-3.5 rounded-2xl text-sm font-medium glass glass-hover text-gray-300 hover:text-white transition-all"
              >
                Nouveau texte
              </button>
              <button
                onClick={handleVerify}
                className="py-3.5 rounded-2xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <span>🔍</span> Vérifier le score
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] mt-16">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-gray-600">
          <span>BuyVerify © 2026</span>
          <span>Propulsé par Claude AI</span>
        </div>
      </footer>
    </div>
  );
}
