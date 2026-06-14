import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { getCachedTranslations, saveTranslations } from "./repository.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const SYSTEM_PROMPT = [
  "Eres un traductor experto de material educativo de matemáticas y ciencias.",
  "Recibes un arreglo JSON de cadenas y devuelves su traducción al idioma indicado.",
  "Reglas estrictas:",
  "1. Conserva intactas las expresiones matemáticas, LaTeX ($...$, \\(...\\), \\[...\\]), código, etiquetas HTML y los marcadores tipo {{x}}.",
  "2. No traduzcas nombres de variables ni símbolos (f, g, x, π, etc.).",
  "3. Traduce solo el texto en lenguaje natural.",
  "4. Devuelve ÚNICAMENTE un arreglo JSON de cadenas, del mismo largo y en el mismo orden. Sin texto adicional.",
].join("\n");

function hashOf(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function callClaude(texts: readonly string[], target: string): Promise<string[]> {
  const message = await client.messages.create({
    model: config.model,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Idioma destino: ${target}\nTraduce este arreglo:\n${JSON.stringify(texts)}`,
      },
    ],
  });
  const block = message.content.find((item) => item.type === "text");
  const raw = block !== undefined && block.type === "text" ? block.text.trim() : "";
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("La respuesta de traducción no es un arreglo JSON");
  }
  const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
  if (!Array.isArray(parsed) || parsed.length !== texts.length) {
    throw new Error("La traducción no coincide en cantidad de elementos");
  }
  return parsed.map((item) => (typeof item === "string" ? item : ""));
}

export async function translateTexts(
  texts: readonly string[],
  target: string,
): Promise<string[]> {
  const hashes = texts.map(hashOf);
  const cached = await getCachedTranslations(hashes, target);

  const missingIndexes: number[] = [];
  texts.forEach((text, index) => {
    const hash = hashes[index];
    if (hash !== undefined && text.trim() !== "" && !cached.has(hash)) {
      missingIndexes.push(index);
    }
  });

  if (missingIndexes.length > 0) {
    const missingTexts = missingIndexes.map((index) => texts[index] ?? "");
    try {
      const fresh = await callClaude(missingTexts, target);
      const toSave = missingIndexes.map((index, position) => ({
        hash: hashes[index] ?? "",
        translated: fresh[position] ?? "",
      }));
      await saveTranslations(toSave, target);
      missingIndexes.forEach((index, position) => {
        cached.set(hashes[index] ?? "", fresh[position] ?? "");
      });
    } catch {
      missingIndexes.forEach((index) => {
        cached.set(hashes[index] ?? "", texts[index] ?? "");
      });
    }
  }

  return texts.map((text, index) => {
    const hash = hashes[index] ?? "";
    return cached.get(hash) ?? text;
  });
}
