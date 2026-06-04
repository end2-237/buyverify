import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// Fallback chain: try best model first, then reliable fallback
const MODELS = [
  "moonshotai/kimi-k2-instruct",
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
];

export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  let parsed: { text?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const text = parsed.text ?? "";
  if (text.trim().length < 50) {
    return NextResponse.json({ error: "Le texte doit contenir au moins 50 caractères." }, { status: 400 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `Tu es un expert en détection de textes générés par IA. Analyse le texte et détermine le pourcentage de contenu IA (0% = humain, 100% = IA).

Réponds UNIQUEMENT en JSON valide, sans markdown, sans bloc de code :
{"percentage":<0-100>,"confidence":"<faible|moyenne|élevée>","indicators":["..."],"summary":"..."}`,
    },
    {
      role: "user",
      content: `Analyse ce texte :\n\n${text.slice(0, 6000)}`,
    },
  ];

  let lastError = "";
  for (const model of MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        max_tokens: 1024,
        temperature: 0.1,
        messages,
      });

      const raw = completion.choices[0]?.message?.content ?? "";
      if (!raw) throw new Error("Réponse vide du modèle");

      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error(`JSON introuvable dans : ${raw.slice(0, 100)}`);

      const result = JSON.parse(match[0]);
      return NextResponse.json(result);
    } catch (err) {
      lastError = (err as Error).message;
      // Try next model
      continue;
    }
  }

  return NextResponse.json({ error: `Tous les modèles ont échoué. Dernière erreur : ${lastError}` }, { status: 500 });
}
