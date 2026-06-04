"use client";

import { useState, useRef } from "react";

interface DetectionResult {
  percentage: number;
  confidence: string;
  indicators: string[];
  summary: string;
}

type Step = "input" | "detecting" | "result" | "humanizing" | "humanized";

export default function Home() {
  const [text, setText] = useState("");
  const [humanizedText, setHumanizedText] = useState("");
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "txt") {
      const content = await file.text();
      setText(content);
    } else {
      setError("Formats supportés : .txt");
    }
  };

  const handleDetect = async () => {
    if (text.trim().length < 50) {
      setError("Le texte doit contenir au moins 50 caractères.");
      return;
    }
    setError("");
    setStep("detecting");
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDetection(data);
      setStep("result");
    } catch (err) {
      setError((err as Error).message);
      setStep("input");
    }
  };

  const handleHumanize = async () => {
    setError("");
    setStep("humanizing");
    try {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHumanizedText(data.humanizedText);
      setStep("humanized");
    } catch (err) {
      setError((err as Error).message);
      setStep("result");
    }
  };

  const handleReset = () => {
    setText("");
    setHumanizedText("");
    setDetection(null);
    setStep("input");
    setError("");
  };

  const handleVerifyHumanized = async () => {
    const toVerify = humanizedText;
    setText(toVerify);
    setHumanizedText("");
    setDetection(null);
    setStep("detecting");
    setError("");
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: toVerify }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDetection(data);
      setStep("result");
    } catch (err) {
      setError((err as Error).message);
      setStep("input");
    }
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 70) return "text-red-500";
    if (pct >= 40) return "text-orange-400";
    return "text-green-400";
  };

  const getScoreBg = (pct: number) => {
    if (pct >= 70) return "from-red-500 to-red-700";
    if (pct >= 40) return "from-orange-400 to-orange-600";
    return "from-green-400 to-green-600";
  };

  const getScoreLabel = (pct: number) => {
    if (pct >= 80) return "Très probablement IA";
    if (pct >= 60) return "Probablement IA";
    if (pct >= 40) return "Mixte humain/IA";
    if (pct >= 20) return "Probablement humain";
    return "Très probablement humain";
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-sm font-bold">
              AI
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">BuyVerify</h1>
              <p className="text-xs text-gray-400">Détection & Humanisation IA</p>
            </div>
          </div>
          {step !== "input" && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Nouveau texte
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {step === "input" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                Détectez et humanisez vos textes
              </h2>
              <p className="text-gray-400">
                Collez votre texte ou importez un fichier .txt pour analyser les traces d&apos;IA
              </p>
            </div>

            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Collez votre texte ici (minimum 50 caractères)..."
                className="w-full h-64 bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-violet-500 transition-colors text-sm leading-relaxed"
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-600">
                {text.length} caractères
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-600 text-sm">ou</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            <div
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-violet-500 transition-colors group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-3">📄</div>
              <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                Cliquez pour importer un fichier{" "}
                <span className="text-violet-400">.txt</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleDetect}
              disabled={text.trim().length < 50}
              className="w-full py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Analyser le texte
            </button>
          </div>
        )}

        {step === "detecting" && (
          <div className="text-center space-y-8 py-20">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
              <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🔍</div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Analyse en cours...</h2>
              <p className="text-gray-400">Détection des traces d&apos;IA dans votre texte</p>
            </div>
          </div>
        )}

        {step === "result" && detection && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Résultat de l&apos;analyse</h2>
            </div>

            <div className="bg-gray-900 rounded-2xl p-8 text-center space-y-4">
              <div className="relative w-40 h-40 mx-auto">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="#1f2937" strokeWidth="12" />
                  <circle
                    cx="80" cy="80" r="70"
                    fill="none"
                    stroke={detection.percentage >= 70 ? "#ef4444" : detection.percentage >= 40 ? "#f97316" : "#22c55e"}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - detection.percentage / 100)}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${getScoreColor(detection.percentage)}`}>
                    {detection.percentage}%
                  </span>
                  <span className="text-xs text-gray-500">IA détectée</span>
                </div>
              </div>

              <div>
                <div className={`text-xl font-semibold bg-gradient-to-r ${getScoreBg(detection.percentage)} bg-clip-text text-transparent`}>
                  {getScoreLabel(detection.percentage)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Confiance : <span className="text-gray-300 capitalize">{detection.confidence}</span>
                </div>
              </div>

              <p className="text-gray-300 text-sm max-w-lg mx-auto leading-relaxed">
                {detection.summary}
              </p>
            </div>

            {detection.indicators.length > 0 && (
              <div className="bg-gray-900 rounded-2xl p-6 space-y-3">
                <h3 className="font-semibold text-gray-300">Indicateurs détectés</h3>
                <ul className="space-y-2">
                  {detection.indicators.map((indicator, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className="text-violet-400 mt-0.5">▸</span>
                      {indicator}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleReset}
                className="py-3 rounded-xl font-medium border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white transition-all"
              >
                Nouveau texte
              </button>
              <button
                onClick={handleHumanize}
                className="py-3 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all"
              >
                Humaniser → 0% IA
              </button>
            </div>
          </div>
        )}

        {step === "humanizing" && (
          <div className="text-center space-y-8 py-20">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
              <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Humanisation en cours...</h2>
              <p className="text-gray-400">Réécriture naturelle de votre texte</p>
            </div>
          </div>
        )}

        {step === "humanized" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-full px-4 py-1.5 text-green-400 text-sm font-medium">
                <span>✓</span> Texte humanisé avec succès
              </div>
              <h2 className="text-2xl font-bold">Votre texte humanisé</h2>
              <p className="text-gray-400 text-sm">Réécrit pour être indétectable par les outils IA</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Original</span>
                  {detection && (
                    <span className="text-xs text-gray-600">{detection.percentage}% IA</span>
                  )}
                </div>
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-6">{text}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-green-400 uppercase tracking-wider">Humanisé</span>
                  <span className="text-xs text-gray-600">~0% IA</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed line-clamp-6">{humanizedText}</p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-400">Texte complet humanisé</h3>
              <textarea
                value={humanizedText}
                onChange={(e) => setHumanizedText(e.target.value)}
                className="w-full h-52 bg-gray-800 rounded-lg p-3 text-gray-100 text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleReset}
                className="py-3 rounded-xl font-medium border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white transition-all text-sm"
              >
                Nouveau texte
              </button>
              <button
                onClick={handleVerifyHumanized}
                className="py-3 rounded-xl font-medium border border-violet-700 hover:border-violet-500 text-violet-300 hover:text-violet-100 transition-all text-sm"
              >
                Vérifier le score
              </button>
              <button
                onClick={() => downloadText(humanizedText, "texte-humanise.txt")}
                className="py-3 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 transition-all text-sm"
              >
                Télécharger
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
