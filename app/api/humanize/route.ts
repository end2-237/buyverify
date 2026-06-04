import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

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
      content: `Tu es un expert en réécriture de textes pour les rendre 100% humains et naturels, indétectables par les outils IA.

Techniques :
- Varie la longueur des phrases
- Introduis des légères imperfections naturelles
- Ajoute de la personnalité et des tournures idiomatiques
- Utilise des transitions conversationnelles
- Préserve le sens exact et les informations clés

Réponds UNIQUEMENT avec le texte réécrit, sans introduction ni explication.`,
    },
    {
      role: "user",
      content: `Réécris ce texte pour qu'il soit 100% humain :\n\n${text.slice(0, 8000)}`,
    },
  ];

  let lastError = "";
  for (const model of MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        max_tokens: 4096,
        temperature: 0.85,
        messages,
      });

      const humanizedText = completion.choices[0]?.message?.content ?? "";
      if (!humanizedText) throw new Error("Réponse vide du modèle");

      return NextResponse.json({ humanizedText });
    } catch (err) {
      lastError = (err as Error).message;
      continue;
    }
  }

  return NextResponse.json({ error: `Tous les modèles ont échoué. Dernière erreur : ${lastError}` }, { status: 500 });
}
