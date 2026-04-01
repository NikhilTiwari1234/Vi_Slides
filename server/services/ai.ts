
import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      
      apiKey: process.env.OPENAI_API_KEY,

  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _openai;
}


export async function classifyQuestion(questionText: string): Promise<"simple" | "complex"> {
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gemini-1.5-flash", // affordable, fast model
      messages: [
        {
          role: "system",
          content: `You are a classifier for classroom questions.
Classify the question as either 'simple' or 'complex'.

SIMPLE: Factual questions with clear short answers (definitions, formulas, dates, yes/no)
COMPLEX: Questions needing deep explanation, teacher judgment, or class discussion

Respond with ONLY the word 'simple' or 'complex'.`,
        },
        { role: "user", content: questionText },
      ],
    });

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();
    if (result === "simple" || result === "complex") return result;
    return "complex"; 
  } catch (err) {
    console.error("[AI] Failed to classify question:", err);
    return "complex";
  }
}


export async function generateAnswer(questionText: string): Promise<string | null> {
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a helpful classroom assistant.
Answer the student's question clearly and concisely (2-4 sentences maximum).
Be accurate and educational.`,
        },
        { role: "user", content: questionText },
      ],
    });

    return response.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[AI] Failed to generate answer:", err);
    return null;
  }
}


export async function findSimilarQuestion(
  newQuestion: string,
  existingQuestions: Array<{ id: number; text: string }>
): Promise<number | null> {
  if (existingQuestions.length === 0) return null;

  try {
    const openai = getOpenAI();

    
    const questionsText = existingQuestions
      .map((q, i) => `${i + 1}. [ID:${q.id}] ${q.text}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: [
        {
          role: "system",
          content: `You check if a new question is essentially the same as an existing one.
If it is a duplicate, respond with just the ID number of the matching question.
If it is unique, respond with "none".
Only respond with a number or "none".`,
        },
        {
          role: "user",
          content: `New question: "${newQuestion}"\n\nExisting questions:\n${questionsText}\n\nIs the new question a duplicate? Reply with the ID number or "none".`,
        },
      ],
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (result && result !== "none") {
      const id = parseInt(result, 10);
      if (!isNaN(id)) return id;
    }
    return null;
  } catch (err) {
    console.error("[AI] Failed to find similar question:", err);
    return null; 
  }
}
