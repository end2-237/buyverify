import { NextRequest, NextResponse } from "next/server";
import { getClient, detect, readText } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text, error } = await readText(req);
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "Le texte doit contenir au moins 50 caractères." }, { status: 400 });
    }

    const key = process.env.GROQ_API_KEY;
    if (!key) return NextResponse.json({ error: "GROQ_API_KEY manquante côté serveur." }, { status: 500 });

    const result = await detect(getClient(), text);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
