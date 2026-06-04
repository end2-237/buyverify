import Groq from "groq-sdk";

// Modèles par ordre de puissance — fallback automatique
export const MODELS = [
  "moonshotai/kimi-k2-instruct",
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
];

export interface DetectionResult {
  percentage: number;
  confidence: string;
  indicators: string[];
  summary: string;
}

export function getClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

/**
 * Appel Groq avec fallback automatique entre modèles.
 */
export async function chatWithFallback(
  groq: Groq,
  messages: Groq.Chat.ChatCompletionMessageParam[],
  opts: { maxTokens: number; temperature: number; jsonMode?: boolean }
): Promise<string> {
  let lastError = "";
  for (const model of MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages,
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      if (!raw) throw new Error("Réponse vide");
      return raw;
    } catch (err) {
      lastError = (err as Error).message;
      continue;
    }
  }
  throw new Error(`Tous les modèles ont échoué : ${lastError}`);
}

const DETECTION_SYSTEM = `Tu es le moteur de détection IA le plus rigoureux au monde, plus précis que GPTZero, Originality.ai et Turnitin réunis. Tu analyses un texte sur de multiples dimensions linguistiques pour estimer le pourcentage de contenu généré par IA.

DIMENSIONS D'ANALYSE (évalue chacune) :

1. PERPLEXITÉ — Le texte est-il trop prévisible ? Les humains font des choix de mots surprenants ; l'IA choisit le mot statistiquement le plus probable.

2. BURSTINESS (variance) — Les humains alternent phrases très courtes et très longues de façon chaotique. L'IA produit des phrases de longueur homogène et régulière.

3. STRUCTURE & TRANSITIONS — L'IA abuse de "En effet", "De plus", "Par ailleurs", "Il est important de noter", "En conclusion", listes parfaitement parallèles, paragraphes de taille égale.

4. LEXIQUE RÉVÉLATEUR — Mots/tournures typiques de l'IA : "crucial", "essentiel", "il convient de", "joue un rôle", "dans le paysage de", "à l'ère du numérique", "plonger dans", "tapisserie", "témoignage de", "naviguer", emphase excessive.

5. PERFECTION ANORMALE — Absence totale de fautes, de digressions, de répétitions involontaires, d'opinions tranchées, d'humour, d'argot, de références personnelles concrètes.

6. PLATITUDE SÉMANTIQUE — Affirmations génériques, équilibrées, sans prise de risque, qui pourraient s'appliquer à n'importe quel contexte ("présente des avantages et des inconvénients").

7. RYTHME ÉMOTIONNEL — Les humains ont des montées et descentes d'intensité ; l'IA reste plate et neutre.

MÉTHODE : note chaque dimension mentalement de 0 (humain) à 100 (IA), puis calcule une moyenne pondérée. La burstiness et la perplexité comptent double.

Sois SÉVÈRE : un texte poli et générique est presque toujours de l'IA. Ne sois indulgent que si tu vois de vraies marques humaines (fautes, ton personnel, irrégularité forte).

Réponds UNIQUEMENT en JSON valide, sans markdown :
{"percentage":<entier 0-100>,"confidence":"<faible|moyenne|élevée>","indicators":["<indicateur précis et concret>", ...],"summary":"<2 phrases expliquant le verdict>"}`;

/**
 * Détecte le taux d'IA d'un texte.
 */
export async function detect(groq: Groq, text: string): Promise<DetectionResult> {
  const raw = await chatWithFallback(
    groq,
    [
      { role: "system", content: DETECTION_SYSTEM },
      { role: "user", content: `Analyse ce texte avec la plus grande rigueur :\n\n"""${text.slice(0, 8000)}"""` },
    ],
    { maxTokens: 1024, temperature: 0, jsonMode: true }
  );

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON introuvable dans la réponse de détection");
  const parsed = JSON.parse(match[0]) as DetectionResult;

  // Garde-fous
  parsed.percentage = Math.max(0, Math.min(100, Math.round(parsed.percentage)));
  if (!Array.isArray(parsed.indicators)) parsed.indicators = [];
  if (!parsed.confidence) parsed.confidence = "moyenne";
  if (!parsed.summary) parsed.summary = "";
  return parsed;
}

const HUMANIZE_SYSTEM = `Tu es un écrivain humain expert dont la mission est de réécrire un texte pour qu'il devienne TOTALEMENT indétectable par TOUS les détecteurs d'IA (GPTZero, Originality.ai, Turnitin, Copyleaks, ZeroGPT), tout en gardant exactement le même sens, les mêmes faits et la même langue.

TECHNIQUES OBLIGATOIRES :

1. BURSTINESS MAXIMALE — Alterne brutalement. Une phrase de 3 mots. Puis une longue qui s'étire, digresse, ajoute une incise, rebondit sur une idée secondaire avant de retomber. Casse toute régularité.

2. PERPLEXITÉ — Choisis parfois le mot inattendu plutôt que l'évident. Utilise des synonymes moins courants, des images concrètes, des tournures idiomatiques familières.

3. SUPPRIME LE LEXIQUE IA — Bannis : "crucial", "essentiel", "il convient de", "joue un rôle clé", "il est important de noter", "en effet", "de plus", "par ailleurs", "en conclusion", "dans le paysage", "à l'ère de". Remplace par du langage direct et parlé.

4. VOIX HUMAINE — Ajoute des marqueurs de subjectivité : "franchement", "honnêtement", "bon", "du coup", "en gros", une parenthèse personnelle, une petite hésitation, une opinion assumée.

5. IMPERFECTIONS NATURELLES — Une répétition volontaire, une phrase qui commence par "Et" ou "Mais", une question rhétorique, une ellipse, un tiret cadratin pour casser le rythme.

6. ASYMÉTRIE — Ne fais jamais des paragraphes de taille égale. Ne fais jamais des listes parfaitement parallèles. Varie tout.

7. CONCRET PLUTÔT QUE GÉNÉRIQUE — Remplace les affirmations vagues par des formulations spécifiques et vivantes.

INTERDICTIONS ABSOLUES :
- Ne change PAS le sens ni les faits
- Ne change PAS la langue (garde le français si le texte est en français)
- N'ajoute AUCUNE introduction du type "Voici le texte réécrit"
- Ne mets AUCUNE balise, AUCUN guillemet englobant

Réponds UNIQUEMENT avec le texte réécrit, brut.`;

const HUMANIZE_RETRY_SUFFIX = `

ATTENTION : la version précédente a ENCORE été détectée comme IA. Sois BEAUCOUP plus agressif : casse davantage le rythme, rends le ton encore plus parlé et personnel, introduis plus d'irrégularités et d'imperfections naturelles. Éloigne-toi radicalement du style lisse et neutre.`;

/**
 * Réécrit un texte une fois.
 */
export async function humanizeOnce(groq: Groq, text: string, aggressive: boolean): Promise<string> {
  const system = aggressive ? HUMANIZE_SYSTEM + HUMANIZE_RETRY_SUFFIX : HUMANIZE_SYSTEM;
  const out = await chatWithFallback(
    groq,
    [
      { role: "system", content: system },
      { role: "user", content: `Réécris ce texte pour qu'il soit 100% humain et indétectable :\n\n"""${text.slice(0, 8000)}"""` },
    ],
    { maxTokens: 4096, temperature: aggressive ? 1.0 : 0.9 }
  );
  return out.trim();
}

export interface HumanizeResult {
  humanizedText: string;
  finalScore: number;
  iterations: number;
  history: number[];
}

/**
 * Humanise en BOUCLE : réécrit, re-détecte, recommence jusqu'à passer
 * sous le seuil cible ou épuiser les tentatives. Garde la meilleure version.
 */
export async function humanizeToTarget(
  groq: Groq,
  text: string,
  target = 12,
  maxIterations = 4
): Promise<HumanizeResult> {
  let current = text;
  let best = "";
  let bestScore = 101;
  const history: number[] = [];

  for (let i = 0; i < maxIterations; i++) {
    current = await humanizeOnce(groq, current, i > 0);

    let score: number;
    try {
      score = (await detect(groq, current)).percentage;
    } catch {
      // Si la détection échoue, on accepte la version courante
      score = 0;
    }
    history.push(score);

    if (score < bestScore) {
      bestScore = score;
      best = current;
    }

    if (score <= target) {
      return { humanizedText: current, finalScore: score, iterations: i + 1, history };
    }
    // Sinon on repart de la meilleure version pour la prochaine passe
    current = best;
  }

  return { humanizedText: best, finalScore: bestScore, iterations: maxIterations, history };
}

/**
 * Validation + parsing sûr du body.
 */
export async function readText(req: Request): Promise<{ text?: string; error?: string }> {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return { error: "Corps de requête invalide." };
  }
  if (!body) return { error: "Corps vide." };
  try {
    const parsed = JSON.parse(body) as { text?: string };
    return { text: parsed.text ?? "" };
  } catch {
    return { error: "JSON invalide." };
  }
}
