import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Le texte doit contenir au moins 50 caractères." },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `Tu es un expert en réécriture de textes pour les rendre 100% humains et naturels.

Ton objectif : réécrire le texte fourni pour qu'il soit indétectable par les outils de détection d'IA, tout en préservant le sens et les informations.

Techniques à appliquer :
- Varie la longueur des phrases (courtes, longues, fragmentées)
- Introduis des légères imperfections stylistiques naturelles
- Ajoute de la personnalité, des opinions nuancées, des tournures idiomatiques
- Utilise des transitions moins formelles et plus conversationnelles
- Intègre des hésitations ou reformulations naturelles
- Diversifie le vocabulaire avec des mots courants et informels
- Remplace les formulations génériques par des expressions plus vivantes
- Casse la symétrie parfaite des constructions
- Préserve le sens exact, les faits et les informations clés

Réponds UNIQUEMENT avec le texte réécrit, sans introduction ni explication.`,
      messages: [
        {
          role: "user",
          content: `Réécris ce texte pour qu'il soit 100% humain et naturel :\n\n${text}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    return NextResponse.json({ humanizedText: content.text });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
