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
      max_tokens: 1024,
      system: `Tu es un expert en détection de textes générés par IA. Analyse le texte fourni et détermine le pourcentage de contenu généré par IA (0% = 100% humain, 100% = 100% IA).

Critères d'analyse :
- Structure répétitive et formules génériques
- Transitions trop parfaites et fluides
- Manque de personnalité, d'humour ou d'erreurs naturelles
- Vocabulaire trop académique ou "corporate"
- Phrases longues et complexes mais sans âme
- Absence de références personnelles ou d'opinions tranchées
- Cohérence surnaturelle du style

Réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "percentage": <nombre entre 0 et 100>,
  "confidence": "<faible|moyenne|élevée>",
  "indicators": ["<indicateur 1>", "<indicateur 2>", ...],
  "summary": "<résumé en 1-2 phrases>"
}`,
      messages: [
        {
          role: "user",
          content: `Analyse ce texte pour détecter les traces d'IA :\n\n${text}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON response");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
