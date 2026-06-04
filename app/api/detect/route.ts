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
      max_tokens: 1024,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `Tu es un expert en détection de textes générés par IA. Analyse le texte et détermine le pourcentage de contenu généré par IA (0% = 100% humain, 100% = 100% IA).

Critères d'analyse :
- Structure répétitive et formules génériques
- Transitions trop parfaites et fluides
- Manque de personnalité, d'humour ou d'erreurs naturelles
- Vocabulaire trop académique ou "corporate"
- Phrases longues et complexes mais sans âme
- Absence de références personnelles ou d'opinions tranchées
- Cohérence surnaturelle du style

Réponds UNIQUEMENT en JSON valide :
{
  "percentage": <0-100>,
  "confidence": "<faible|moyenne|élevée>",
  "indicators": ["<indicateur 1>", "<indicateur 2>", ...],
  "summary": "<résumé en 1-2 phrases>"
}`,
        },
        {
          role: "user",
          content: `Analyse ce texte pour détecter les traces d'IA :\n\n${text}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Réponse invalide du modèle");

    return NextResponse.json(JSON.parse(match[0]));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
