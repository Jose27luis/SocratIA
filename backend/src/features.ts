import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import type { StudentProgress, StudentSummary } from "./types.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

function textOf(message: Anthropic.Message): string {
  const block = message.content.find((item) => item.type === "text");
  return block !== undefined && block.type === "text" ? block.text.trim() : "";
}

function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No se encontró un objeto JSON en la respuesta");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

export interface ReinforcementInput {
  readonly problem: string;
  readonly step: string;
  readonly studentAnswer: string;
}

export async function generateReinforcement(input: ReinforcementInput): Promise<string> {
  const message = await client.messages.create({
    model: config.model,
    max_tokens: 200,
    system:
      "Eres SócratIA, un tutor cálido. El estudiante acertó. Refuerza en 1-2 oraciones " +
      "POR QUÉ su respuesta es correcta, consolidando el concepto. Sé breve y alentador. " +
      "Responde en español, sin preámbulos.",
    messages: [
      {
        role: "user",
        content: `Problema: ${input.problem}\nPaso: ${input.step}\nRespuesta correcta del estudiante: ${input.studentAnswer}`,
      },
    ],
  });
  return textOf(message);
}

export interface MisconceptionInput {
  readonly problem: string;
  readonly step: string;
  readonly correctAnswer: string;
  readonly studentAnswer: string;
}

export interface Misconception {
  readonly category: string;
  readonly explanation: string;
}

export async function classifyMisconception(input: MisconceptionInput): Promise<Misconception> {
  const message = await client.messages.create({
    model: config.model,
    max_tokens: 300,
    system:
      "Eres un experto en didáctica. El estudiante se equivocó. Identifica el CONCEPTO ERRÓNEO " +
      "(misconception) detrás de su error, no solo que falló. Devuelve ÚNICAMENTE un objeto JSON " +
      '{"category": "<etiqueta corta del error, ej. error de signo>", "explanation": "<1 oración sobre el malentendido>"}. ' +
      "En español. Sin texto adicional.",
    messages: [
      {
        role: "user",
        content: `Problema: ${input.problem}\nPaso: ${input.step}\nRespuesta correcta: ${input.correctAnswer}\nRespuesta del estudiante: ${input.studentAnswer}`,
      },
    ],
  });
  const parsed = extractJson(textOf(message)) as Record<string, unknown>;
  return {
    category: typeof parsed["category"] === "string" ? parsed["category"] : "no identificado",
    explanation: typeof parsed["explanation"] === "string" ? parsed["explanation"] : "",
  };
}

export interface ChatTurn {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export async function* chatTutorStream(
  context: string,
  history: readonly ChatTurn[],
): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model: config.model,
    max_tokens: 500,
    system:
      "Eres SócratIA, un tutor socrático que conversa con el estudiante sobre el ejercicio actual. " +
      "Guía con preguntas, NUNCA des la respuesta final directamente. Sé claro, cálido y breve. " +
      "Responde en el idioma del estudiante.\n\nContexto del ejercicio:\n" +
      context,
    messages: history.map((turn) => ({ role: turn.role, content: turn.content })),
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

export async function diagnoseStudent(
  progress: StudentProgress,
  misconceptions: readonly { skill: string | null; category: string }[],
): Promise<string> {
  const masteryLines = progress.mastery
    .map((m) => `- ${m.skill}: dominio ${(m.mastery * 100).toFixed(0)}% (${m.attempts} intentos)`)
    .join("\n");
  const errorLines = misconceptions
    .map((m) => `- ${m.skill ?? "general"}: ${m.category}`)
    .join("\n");
  const message = await client.messages.create({
    model: config.model,
    max_tokens: 500,
    system:
      "Eres un asistente pedagógico. A partir de los datos de un estudiante, escribe para el DOCENTE " +
      "un diagnóstico breve en español con: 1) fortalezas, 2) debilidades, 3) una recomendación concreta. " +
      "Usa viñetas y un tono profesional. Máximo 150 palabras.",
    messages: [
      {
        role: "user",
        content:
          `Intentos: ${progress.attemptsTotal}, aciertos: ${progress.correctTotal}.\n` +
          `Dominio por habilidad:\n${masteryLines || "sin datos"}\n` +
          `Errores conceptuales recientes:\n${errorLines || "ninguno"}`,
      },
    ],
  });
  return textOf(message);
}

export async function classReport(students: readonly StudentSummary[]): Promise<string> {
  const lines = students
    .map(
      (s) =>
        `- ${s.externalId}: ${s.attemptsTotal} intentos, ${s.correctTotal} aciertos, dominio promedio ${
          s.avgMastery === null ? "N/D" : `${(s.avgMastery * 100).toFixed(0)}%`
        }`,
    )
    .join("\n");
  const message = await client.messages.create({
    model: config.model,
    max_tokens: 600,
    system:
      "Eres un asistente pedagógico. A partir del resumen del grupo, escribe para el DOCENTE un informe " +
      "breve en español: 1) panorama general, 2) alumnos en riesgo (bajo dominio o pocos aciertos), " +
      "3) recomendación para la clase. Usa viñetas. Máximo 180 palabras.",
    messages: [{ role: "user", content: `Resumen del grupo:\n${lines || "sin datos"}` }],
  });
  return textOf(message);
}

export interface GenerateProblemInput {
  readonly topic: string;
  readonly level: string;
  readonly language: string;
  readonly count: number;
}

export async function generateProblems(input: GenerateProblemInput): Promise<unknown> {
  const message = await client.messages.create({
    model: config.model,
    max_tokens: 2000,
    system:
      "Eres un autor de ejercicios para un tutor inteligente. Genera ejercicios de opción múltiple. " +
      "Devuelve ÚNICAMENTE un objeto JSON con esta forma exacta:\n" +
      '{"lesson": "<nombre de la lección>", "problems": [{"title": "<título>", "body": "<enunciado>", ' +
      '"skill": "<habilidad>", "stepTitle": "<pregunta>", "answer": "<respuesta correcta>", ' +
      '"choices": ["<opción correcta>", "<distractor1>", "<distractor2>", "<distractor3>"]}]}\n' +
      "Las opciones deben incluir la respuesta correcta. " +
      "ADAPTA AL NIVEL: si el nivel es secundaria o primaria alta (4°-6°), usa lenguaje normal con texto. " +
      "Si el nivel es INICIAL o PRIMARIA BAJA (1°-2°), son niños que recién aprenden a leer: usa un enunciado " +
      "muy corto y una sola idea, vocabulario simple, y haz que CADA opción sea un EMOJI grande y representativo " +
      "(por ejemplo contar objetos, colores o formas); si agregas palabra, que sea una sola. El campo 'answer' debe " +
      "ser exactamente igual a una de las opciones (mismo emoji y texto). Usa emojis distintos entre las opciones. " +
      "Sin texto adicional.",
    messages: [
      {
        role: "user",
        content: `Idioma: ${input.language}\nTema: ${input.topic}\nNivel: ${input.level}\nCantidad: ${input.count}`,
      },
    ],
  });
  return extractJson(textOf(message));
}
