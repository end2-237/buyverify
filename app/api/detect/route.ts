import { NextRequest, NextResponse } from "next/server";
import { getClient, detect, readText } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { text, error } = await readText(req);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!text || text.trim().length < 50) {
    return NextResponse.json({ error: "Le texte doit contenir au moins 50 caractères." }, { status: 400 });
  }

  try {
    const result = await detect(getClient(), text);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
