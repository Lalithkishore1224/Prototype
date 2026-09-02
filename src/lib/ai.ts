import type { Challenge, University } from "./workflow";
import { getAiConfigRow, setAiConfigRow } from "./db";

export type AiConfig = { provider: string; model: string; baseUrl: string; apiKey?: string; configured: boolean; updatedAt: string };
export type EvaluationResult = { university: University; solutionType: "SOFTWARE" | "HARDWARE"; teamSize: number; confidence: number; rationale: string; engine: "gemini" | "deterministic" };
const state = globalThis as typeof globalThis & { jannirmaanAiConfig?: AiConfig };

function envConfig(): AiConfig {
  return { provider: process.env.AI_PROVIDER ?? "Google Gemini", model: process.env.AI_MODEL ?? "gemini-3.6-flash", baseUrl: process.env.AI_BASE_URL ?? "", apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_AI_STUDIO_API_KEY ?? process.env.AI_API_KEY, configured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.AI_API_KEY), updatedAt: new Date().toISOString() };
}

export async function getAiConfig(): Promise<AiConfig> {
  if (state.jannirmaanAiConfig) return state.jannirmaanAiConfig;
  let stored: AiConfig | null = null;
  try { stored = await getAiConfigRow(); } catch { /* fall through to env config */ }
  const config = stored ?? envConfig();
  if (!stored) {
    try { await setAiConfigRow(config); } catch { /* best effort */ }
  }
  state.jannirmaanAiConfig = config;
  return config;
}

export async function setAiConfig(input: { provider: string; model: string; baseUrl?: string; apiKey?: string }): Promise<AiConfig> {
  const previous = await getAiConfig();
  const config: AiConfig = { provider: input.provider.trim(), model: input.model.trim(), baseUrl: input.baseUrl?.trim() ?? "", apiKey: input.apiKey?.trim() || previous.apiKey, configured: Boolean(input.apiKey?.trim() || previous.apiKey), updatedAt: new Date().toISOString() };
  state.jannirmaanAiConfig = config;
  try { await setAiConfigRow(config); } catch { /* fall back to in-memory for this request */ }
  return config;
}

type EvaluationInput = Pick<Challenge, "title" | "description" | "category"> & { solutionType?: "SOFTWARE" | "HARDWARE"; teamSize?: number; adminContext?: string };
function tokens(value: string) { return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2)); }
function compatible(university: University, solutionType: "SOFTWARE" | "HARDWARE", teamSize: number) { return (university.solutionTypes === "BOTH" || university.solutionTypes === solutionType) && university.teamCapacity >= teamSize; }
function localScore(challenge: EvaluationInput & { solutionType: "SOFTWARE" | "HARDWARE"; teamSize: number }, university: University) {
  const challengeTokens = tokens(`${challenge.title} ${challenge.description} ${challenge.category} ${challenge.adminContext ?? ""}`);
  const academyTokens = tokens(`${university.focus} ${university.description} ${university.name}`);
  const overlap = [...challengeTokens].filter((token) => academyTokens.has(token)).length;
  const typeMatch = university.solutionTypes === "BOTH" || university.solutionTypes === challenge.solutionType ? 30 : -45;
  const capacityMatch = university.teamCapacity >= challenge.teamSize ? 20 : -40;
  return 40 + Math.min(30, overlap * 5) + typeMatch + capacityMatch;
}
function parseJson(text: string) {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const source = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned;
  try {
    const value = JSON.parse(source) as Record<string, unknown>;
    return { universityId: typeof value.universityId === "string" ? value.universityId : undefined, confidence: Number(value.confidence), rationale: typeof value.rationale === "string" ? value.rationale.trim() : "" };
  } catch { return null; }
}

export async function evaluateChallenge(challenge: EvaluationInput, universities: University[]): Promise<EvaluationResult> {
  const text = `${challenge.title} ${challenge.description} ${challenge.category} ${challenge.adminContext ?? ""}`.toLowerCase();
  const solutionType = challenge.solutionType ?? (/(sensor|device|machine|physical|hardware|water level|robot|solar|circuit)/.test(text) ? "HARDWARE" : "SOFTWARE");
  const teamSize = Math.max(1, Math.round(challenge.teamSize ?? (challenge.description.length > 180 ? 8 : challenge.description.length > 90 ? 5 : 3)));
  const normalized = { ...challenge, solutionType, teamSize };
  const eligible = universities.filter((item) => item.status === "APPROVED");
  if (!eligible.length) throw new Error("No approved universities are available for matching.");
  const ranked = [...eligible].sort((a, b) => localScore(normalized, b) - localScore(normalized, a));
  const best = ranked[0];
  const score = Math.max(52, Math.min(98, localScore(normalized, best)));
  const config = await getAiConfig();
  if (config.provider.toLowerCase().includes("gemini") && config.apiKey) {
    try {
      const requestBody = { contents: [{ parts: [{ text: ["Return JSON only with keys universityId, confidence, rationale.", "Choose exactly one universityId from the supplied list. Never invent an id.", `Solution type is ${solutionType}; estimated student team size is ${teamSize}. Prefer capability, focus overlap, and capacity.`, `Challenge: ${JSON.stringify({ ...challenge, solutionType, teamSize })}`, `Approved universities: ${JSON.stringify(eligible.map((item) => ({ id: item.id, name: item.name, description: item.description, focus: item.focus, solutionTypes: item.solutionTypes, teamCapacity: item.teamCapacity })))} `].join("\n") }] }], generationConfig: { responseMimeType: "application/json" } };
      const models = [config.model, ...(config.model === "gemini-2.0-flash" || config.model === "gemini-2.5-flash" ? ["gemini-3.6-flash"] : [])];
      let response: Response | null = null;
      for (const model of models) {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey }, body: JSON.stringify(requestBody), signal: AbortSignal.timeout(15000) });
        if (response.ok || response.status !== 404) break;
      }
      if (response?.ok) {
        const payload = await response.json();
        const raw = payload.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
        const result = parseJson(raw);
        const selected = eligible.find((item) => item.id === result?.universityId);
        if (selected && compatible(selected, solutionType, teamSize)) {
          const rawConfidence = result?.confidence ?? score / 100;
          const confidence = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;
          return { university: selected, solutionType, teamSize, confidence: Math.round(Math.max(0.52, Math.min(0.99, confidence)) * 100), rationale: result?.rationale || `Gemini matched this challenge to ${selected.name} using capability, focus, and student capacity.`, engine: "gemini" };
        }
      }
    } catch { /* Deterministic matching keeps intake available if Gemini is unavailable. */ }
  }
  return { university: best, solutionType, teamSize, confidence: score, rationale: `Deterministic fallback inferred a ${solutionType.toLowerCase()} solution for ${teamSize} students and matched ${best.name} using capability, focus, and capacity.`, engine: "deterministic" };
}

export async function testAiConnection() {
  const config = await getAiConfig();
  if (!config.apiKey) return { ok: false, configured: false, message: "No AI API key is configured. The deterministic evaluator is active." };
  if (!config.provider.toLowerCase().includes("gemini")) return { ok: false, configured: true, message: `${config.provider} is saved, but only Google Gemini is currently wired to the evaluator.` };
  const models = [config.model, ...(config.model === "gemini-2.0-flash" || config.model === "gemini-2.5-flash" ? ["gemini-3.6-flash"] : [])];
  let response: Response | null = null;
  for (const model of models) {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey }, body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with the single word READY." }] }] }), signal: AbortSignal.timeout(10000) });
    if (response.ok || response.status !== 404) break;
  }
  if (!response?.ok) {
    const providerError = response ? await response.text().catch(() => "") : "";
    let detail = "Check the model name, API key, and Gemini API access.";
    try {
      const parsed = JSON.parse(providerError) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch { }
    return { ok: false, configured: true, message: `Gemini rejected the request (${response?.status ?? "network error"}): ${detail}` };
  }
  return { ok: true, configured: true, message: `Gemini ${config.model} is reachable and ready for new evaluations.` };
}
