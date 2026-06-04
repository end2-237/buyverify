import Groq from "groq-sdk";

// Modèles par ordre de puissance — fallback automatique
export const MODELS = [
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "llama3-8b-8192",
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

const HUMANIZE_SYSTEM = `Tu es un rédacteur professionnel chevronné. Ta mission : réécrire un texte pour qu'il passe pour l'œuvre d'un expert humain et échappe aux détecteurs d'IA (GPTZero, Originality.ai, Turnitin, Copyleaks, ZeroGPT) — TOUT EN RESTANT professionnel, cohérent et soigné. Le résultat doit ressembler à de l'excellent travail, pas à du bavardage.

PRINCIPE DIRECTEUR : on humanise par la FINESSE, pas par le relâchement. Un bon rédacteur humain écrit de façon naturelle et variée sans jamais devenir familier ni partir dans tous les sens.

TECHNIQUES :

1. RYTHME NATUREL (burstiness) — Varie la longueur des phrases de façon organique : certaines courtes et nettes, d'autres plus développées avec une subordonnée ou une incise. Évite la régularité mécanique de l'IA, mais reste fluide et lisible.

2. VOCABULAIRE PRÉCIS (perplexité) — Préfère le mot juste et spécifique au terme générique. Utilise un lexique riche et professionnel, des verbes d'action concrets, sans tomber dans l'argot ni le registre parlé.

3. SUPPRIME LES TICS D'IA — Bannis les formules creuses et répétitives : "il est important de noter", "il convient de souligner", "joue un rôle clé", "dans le paysage de", "à l'ère du numérique", "en conclusion", l'enchaînement systématique "en effet / de plus / par ailleurs". Remplace par des transitions variées et naturelles.

4. STRUCTURE VIVANTE — Ne fais pas des paragraphes tous de la même taille, ni des listes parfaitement symétriques. Enchaîne les idées avec une logique réelle, pas avec un gabarit mécanique.

5. CONCRET ET ASSURÉ — Remplace les affirmations vagues et prudentes par des formulations précises, documentées, qui prennent position avec mesure. Un expert affirme, il ne se contente pas de "présenter les avantages et les inconvénients".

INTERDICTIONS ABSOLUES :
- Ne deviens JAMAIS familier, parlé ou désinvolte (pas de "franchement", "du coup", "en gros", "bon", interjections, hésitations).
- N'introduis AUCUNE faute volontaire, AUCUNE digression, AUCUN remplissage. La cohérence et le professionnalisme priment.
- Ne change PAS le sens, les faits ni la langue du texte.
- N'ajoute AUCUNE introduction ("Voici le texte réécrit"), AUCUNE balise, AUCUN guillemet englobant.

Réponds UNIQUEMENT avec le texte réécrit, brut.`;

const HUMANIZE_RETRY_SUFFIX = `

NOTE : la version précédente était encore perçue comme générée par IA. Affine davantage — varie plus subtilement le rythme des phrases, remplace les tournures encore trop lisses ou prévisibles par des formulations d'expert plus précises et personnelles. IMPORTANT : reste professionnel et cohérent. N'introduis NI familiarité, NI désordre, NI remplissage.`;

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
    { maxTokens: 4096, temperature: aggressive ? 0.85 : 0.7 }
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
  target = 20,
  maxIterations = 2
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
