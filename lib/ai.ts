import Groq from "groq-sdk";

// Modèles par ordre de puissance — fallback automatique
export const MODELS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "llama-3.1-8b-instant",
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

const DETECTION_SYSTEM = `Tu es un moteur de détection IA forensique de niveau expert. Tu dois détecter avec précision maximale si un texte a été généré ou fortement remanié par une IA (ChatGPT, Claude, Gemini, Mistral, etc.). Ton étalonnage cible les mêmes scores que GPTZero et Originality.ai — si ces outils affichent 75%, tu dois afficher 75%, pas 40%.

BIAIS PAR DÉFAUT : tout texte bien structuré, fluide et sans aspérités est suspect. Les humains non-experts font des erreurs de logique, des répétitions, des transitions abruptes, des formulations maladroites. L'absence de tout cela est une signature IA forte. Calibre vers le HAUT, pas vers le bas.

DIMENSIONS D'ANALYSE — note chacune de 0 (humain pur) à 100 (IA pure) :

1. PERPLEXITÉ (poids ×3)
   Signe IA : le texte utilise systématiquement les mots les plus attendus et statistiquement probables. Chaque phrase "tombe bien". Aucune formulation surprenante, aucun choix lexical audacieux.
   Signe humain : choix de mots parfois inattendus, tournures personnelles, expressions idiomatiques non-standard.

2. BURSTINESS / VARIANCE DES PHRASES (poids ×3)
   Signe IA : longueur des phrases très homogène (écart-type faible). Même tempo sur tout le texte.
   Signe humain : alternance irrégulière et chaotique — une phrase de 4 mots, puis une de 40, puis une de 12. La variance est élevée et imprévisible.

3. LEXIQUE GÉNÉRIQUE IA (poids ×2)
   Mots et tournures quasi-exclusivement utilisés par les IA en français : "crucial", "essentiel", "il est important de noter", "il convient de souligner", "joue un rôle clé", "joue un rôle fondamental", "dans le paysage de", "à l'ère du numérique", "permet de", "offre la possibilité de", "en conclusion", "en somme", "en définitive", "par ailleurs", "de plus", "en outre", "il en résulte que", "force est de constater", "il va sans dire", "témoignage de", "naviguer dans", "plonger dans", "tapisserie".
   Score : 1 occurrence = +8 pts, 3+ occurrences = score minimum 50.

4. STRUCTURE TEMPLATE (poids ×2)
   Signe IA : introduction-développement-conclusion rigide, paragraphes de taille quasi-égale, listes à puces parfaitement parallèles et équilibrées, chaque paragraphe commence par une phrase-thèse suivie d'exemples puis d'une phrase de transition.
   Signe humain : structure irrégulière, idées qui dérapent ou s'enchaînent de façon non-linéaire.

5. PERFECTION ASEPTISÉE (poids ×2)
   Signe IA : zéro faute de syntaxe, zéro répétition involontaire, zéro parenthèse personnelle, zéro opinion tranchée, zéro référence concrète et vérifiable, zéro humour, zéro ironie, zéro hésitation.
   Signe humain : au moins quelques-uns de ces éléments présents.

6. PLATITUDE SÉMANTIQUE (poids ×1)
   Signe IA : affirmations vraies-de-partout, propos qui "ne froissent personne", équilibre systématique des points de vue, absence de prise de risque intellectuelle.

7. COHÉRENCE HYPERBOLIQUE (poids ×1)
   Signe IA : le texte est TROP cohérent. Chaque phrase prépare la suivante. Aucun saut de pensée, aucun retour en arrière, aucune incohérence mineure. Les humains font des allers-retours.

CALCUL : moyenne pondérée des 7 dimensions. Arrondis à l'entier.

RÈGLES DE CALIBRATION OBLIGATOIRES :
- Si le texte contient ≥3 marqueurs lexicaux IA listés ci-dessus → score minimum 55.
- Si la structure est parfaitement template ET la burstiness est faible → score minimum 60.
- Si TOUTES les dimensions sont ≥ 50 → score minimum 75.
- Ne donne JAMAIS un score < 30 pour un texte fluide, bien structuré et sans aspérités visibles.
- Réserve 0–15% pour les textes avec des fautes réelles, un style personnel marqué, ou une irrégularité structurelle forte et évidente.

Réponds UNIQUEMENT en JSON valide, sans markdown :
{"percentage":<entier 0-100>,"confidence":"<faible|moyenne|élevée>","indicators":["<indicateur précis et concret, cite des extraits du texte>", ...],"summary":"<2 phrases expliquant le verdict avec les éléments détectés>"}`;

/** Transforme un indicateur (chaîne ou objet) en une seule ligne de texte lisible. */
function normalizeIndicator(it: unknown): string {
  if (typeof it === "string") return it.trim();
  if (it && typeof it === "object") {
    const o = it as Record<string, unknown>;
    const label = o.indicateur ?? o.indicator ?? o.dimension ?? o.description ?? o.text;
    const score = o.score;
    const text = typeof label === "string" ? label : JSON.stringify(it);
    return score !== undefined ? `${text} (${score})` : text;
  }
  return String(it ?? "").trim();
}

async function detectOnce(groq: Groq, text: string): Promise<DetectionResult> {
  const raw = await chatWithFallback(
    groq,
    [
      { role: "system", content: DETECTION_SYSTEM },
      {
        role: "user",
        content: `Analyse ce texte avec rigueur forensique. Rappel : calibre tes scores pour correspondre aux résultats de GPTZero et Originality.ai — ne sous-estime pas.\n\n"""${text.slice(0, 6000)}"""`,
      },
    ],
    { maxTokens: 900, temperature: 0, jsonMode: true }
  );

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON introuvable dans la réponse de détection");
  const parsed = JSON.parse(match[0]) as DetectionResult;
  parsed.percentage = Math.max(0, Math.min(100, Math.round(parsed.percentage)));
  // Le modèle renvoie parfois des objets au lieu de chaînes → on aplatit en texte.
  const rawIndicators = Array.isArray(parsed.indicators) ? parsed.indicators : [];
  parsed.indicators = rawIndicators.map((it) => normalizeIndicator(it)).filter(Boolean);
  if (!parsed.confidence) parsed.confidence = "moyenne";
  if (typeof parsed.summary !== "string") parsed.summary = parsed.summary ? String(parsed.summary) : "";
  return parsed;
}

/**
 * Détecte le taux d'IA. Passe simple pour rester sous la limite de
 * tokens/minute du tier gratuit Groq.
 */
export async function detect(groq: Groq, text: string): Promise<DetectionResult> {
  return detectOnce(groq, text);
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
 * Découpe un texte en morceaux qui respectent les frontières de paragraphes
 * (puis de phrases si besoin), sans jamais couper un mot. Préserve la totalité
 * du contenu — rien n'est tronqué.
 */
export function chunkText(text: string, maxChars = 1800): string[] {
  if (text.length <= maxChars) return [text];

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let buffer = "";

  const pushBuffer = () => {
    if (buffer.trim()) chunks.push(buffer.trim());
    buffer = "";
  };

  for (const para of paragraphs) {
    // Un paragraphe seul dépasse la limite → on le découpe par phrases.
    if (para.length > maxChars) {
      pushBuffer();
      const sentences = para.match(/[^.!?]+[.!?]+[\s]*|[^.!?]+$/g) ?? [para];
      let sBuf = "";
      for (const s of sentences) {
        if ((sBuf + s).length > maxChars && sBuf) {
          chunks.push(sBuf.trim());
          sBuf = "";
        }
        sBuf += s;
      }
      if (sBuf.trim()) chunks.push(sBuf.trim());
      continue;
    }

    if ((buffer + "\n\n" + para).length > maxChars && buffer) {
      pushBuffer();
    }
    buffer = buffer ? buffer + "\n\n" + para : para;
  }
  pushBuffer();
  return chunks;
}

/**
 * Réécrit UN segment de texte (sans troncature).
 */
async function humanizeChunk(groq: Groq, chunk: string, aggressive: boolean): Promise<string> {
  const system = aggressive ? HUMANIZE_SYSTEM + HUMANIZE_RETRY_SUFFIX : HUMANIZE_SYSTEM;
  const out = await chatWithFallback(
    groq,
    [
      { role: "system", content: system },
      {
        role: "user",
        content: `Réécris ce passage pour qu'il soit 100% humain et indétectable. GARDE LA MÊME LONGUEUR (ne résume pas, ne raccourcis pas, ne supprime aucune idée — conserve tout le contenu et tous les détails) :\n\n"""${chunk}"""`,
      },
    ],
    { maxTokens: 2400, temperature: aggressive ? 0.85 : 0.7 }
  );
  return out.trim();
}

/** Petite pause pour respecter la limite de tokens/minute du tier gratuit. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Réécrit un texte complet une fois — en le découpant en segments pour
 * préserver toute sa longueur, même sur des documents de plusieurs pages.
 */
export async function humanizeOnce(groq: Groq, text: string, aggressive: boolean): Promise<string> {
  const chunks = chunkText(text);
  if (chunks.length === 1) {
    return humanizeChunk(groq, chunks[0], aggressive);
  }
  // Séquentiel + petite pause : on respecte la limite de tokens/minute (tier gratuit Groq).
  const rewritten: string[] = [];
  for (const c of chunks) {
    rewritten.push(await humanizeChunk(groq, c, aggressive));
    await sleep(1200);
  }
  return rewritten.join("\n\n");
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
