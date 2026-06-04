import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const MODEL = "moonshotai/kimi-k2-instruct";

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const { text } = await req.json();

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Le texte doit contenir au moins 50 caractères." },
        { status: 400 }
      );
    }

    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.85,
      messages: [
        {
          role: "system",
          content: `Tu es un expert en réécriture de textes pour les rendre 100% humains et naturels, indétectables par les outils IA.

Techniques à appliquer :
- Varie la longueur des phrases (courtes, longues, fragmentées)
- Introduis des légères imperfections stylistiques naturelles
- Ajoute de la personnalité, des opinions nuancées, des tournures idiomatiques
- Utilise des transitions moins formelles et plus conversationnelles
- Diversifie le vocabulaire avec des mots courants et informels
- Remplace les formulations génériques par des expressions vivantes
- Casse la symétrie parfaite des constructions
- Préserve le sens exact, les faits et les informations clés

Réponds UNIQUEMENT avec le texte réécrit, sans introduction ni explication.`,
        },
        {
          role: "user",
          content: `Réécris ce texte pour qu'il soit 100% humain et naturel :\n\n${text}`,
        },
      ],
    });

    const humanizedText = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ humanizedText });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
