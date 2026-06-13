import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import type { HintRequest, HintResponse } from "./types.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const MAX_TOKENS = 300;

const SYSTEM_PROMPT = [
  "Eres SócratIA, un tutor inteligente que enseña con el método socrático.",
  "Tu objetivo es guiar al estudiante para que descubra la respuesta por sí mismo; NUNCA se la des.",
  "",
  "Reglas:",
  "1. NUNCA reveles ni calcules la respuesta correcta.",
  "2. Entrega UNA sola pista o pregunta guía, breve (1 a 3 oraciones).",
  "3. Parte del error específico que cometió el estudiante.",
  "4. Ajusta la ayuda al nivel de dominio (0 a 1): si es alto (mayor a 0.7) da una pista sutil; si es bajo (menor a 0.4) ofrece más andamiaje y un paso concreto.",
  "5. No repitas las pistas ya entregadas.",
  "6. Usa un tono cálido y alentador.",
  "7. Responde en el idioma indicado.",
  "Devuelve solo la pista, sin preámbulos ni despedidas.",
].join("\n");

function buildUserPrompt(req: HintRequest): string {
  const previas = req.previousHints.length > 0
    ? req.previousHints.map((hint) => `- ${hint}`).join("\n")
    : "ninguna";
  return [
    `Idioma de respuesta: ${req.language}`,
    `Problema: ${req.problem}`,
    `Paso actual: ${req.step}`,
    `Respuesta correcta (NO la reveles): ${req.correctAnswer}`,
    `Respuesta del estudiante: ${req.studentAnswer}`,
    `Nivel de dominio del estudiante (0 a 1): ${req.mastery}`,
    `Pistas ya entregadas:\n${previas}`,
    "",
    "Genera la siguiente pista socrática.",
  ].join("\n");
}

export async function generateHint(req: HintRequest): Promise<HintResponse> {
  const message = await client.messages.create({
    model: config.model,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(req) }],
  });
  const block = message.content.find((item) => item.type === "text");
  const hint = block !== undefined && block.type === "text" ? block.text.trim() : "";
  return { hint, model: message.model };
}

export async function* streamHintText(message: string): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model: config.model,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: message }],
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}
