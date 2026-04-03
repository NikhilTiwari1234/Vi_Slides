const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const CANDIDATE_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
];

let _workingModel: string | null = null;

async function ask(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in .env");
  }

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
  });

  const modelsToTry = _workingModel
    ? [_workingModel, ...CANDIDATE_MODELS.filter((m) => m !== _workingModel)]
    : CANDIDATE_MODELS;

  let lastError = "";

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      if (res.status === 404) {
        lastError = `${model}: not found (404)`;
        continue;
      }

      if (res.status === 429) {
        lastError = `${model}: quota exceeded (429)`;
        if (_workingModel === model) _workingModel = null;
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        lastError = `${model}: error ${res.status}`;
        console.warn(`[AI] ${lastError}: ${body.slice(0, 200)}`);
        continue;
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        if (_workingModel !== model) {
          console.log(`[AI] Working model: ${model}`);
          _workingModel = model;
        }
        return text;
      }

      lastError = `${model}: empty response`;
    } catch (err) {
      lastError = `${model}: fetch error`;
    }
  }

  throw new Error(`All Gemini models failed. Last: ${lastError}`);
}
export async function processQuestion(
  questionText: string,
  existingQuestions: Array<{ id: number; text: string }>
): Promise<{ type: "simple" | "complex"; similarId: number | null }> {
  try {
    const hasPrevious = existingQuestions.length > 0;
    const questionsList = hasPrevious
      ? existingQuestions.map((q) => `[ID:${q.id}] ${q.text}`).join("\n")
      : "(none)";

    const prompt = `You are a classroom assistant. Analyze this new student question and respond in the exact JSON format shown below.

NEW QUESTION: "${questionText}"

EXISTING QUESTIONS IN SESSION:
${questionsList}

Instructions:
1. CLASSIFY: Is the new question 'simple' (factual, short answer, basic arithmetic, yes/no, definitions) or 'complex' (needs explanation, discussion, or teacher judgment)?
2. DUPLICATE: Is the new question essentially the same as any existing question? If yes, provide that question's ID number. If no, use null.

Respond with ONLY this JSON (no markdown, no explanation):
{"type":"simple","duplicateId":null}

Replace the values appropriately. type must be "simple" or "complex". duplicateId must be a number or null.`;

    const raw = await ask(prompt);

    const match = raw.match(/\{[^}]+\}/);
    if (!match) throw new Error(`Could not parse JSON from: ${raw}`);

    const parsed = JSON.parse(match[0]) as { type?: string; duplicateId?: number | null };

    const type = parsed.type === "simple" ? "simple" : "complex";
    const similarId =
      parsed.duplicateId != null && !isNaN(Number(parsed.duplicateId))
        ? Number(parsed.duplicateId)
        : null;

    return { type, similarId };
  } catch (err) {
    console.error("[AI] processQuestion failed:", err);
    return { type: "complex", similarId: null };
  }
}

export async function generateAnswer(questionText: string): Promise<string | null> {
  try {
    const result = await ask(
      `You are a helpful classroom assistant. Answer this student question clearly and concisely in 2-4 sentences. Be accurate and educational.\n\nQuestion: ${questionText}`
    );
    return result || null;
  } catch (err) {
    console.error("[AI] generateAnswer failed:", err);
    return null;
  }
}

export async function classifyQuestion(questionText: string): Promise<"simple" | "complex"> {
  const { type } = await processQuestion(questionText, []);
  return type;
}

export async function findSimilarQuestion(
  newQuestion: string,
  existingQuestions: Array<{ id: number; text: string }>
): Promise<number | null> {
  return null;
}
