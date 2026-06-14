import type {
  AttemptRequest,
  DynamicHintRequest,
  HintRequest,
  TranslateRequest,
} from "./types.js";

export class ValidationError extends Error {}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new ValidationError("El cuerpo debe ser un objeto JSON");
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`Campo invalido o ausente: ${field}`);
  }
  return value;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseAttempt(body: unknown): AttemptRequest {
  const obj = asObject(body);
  return {
    student: asString(obj["student"], "student"),
    problemId: nullableString(obj["problem_id"]),
    stepId: nullableString(obj["step_id"]),
    skill: nullableString(obj["skill"]),
    correct: obj["correct"] === true,
    answer: nullableString(obj["answer"]),
    mastery: nullableNumber(obj["mastery"]),
  };
}

export function parseDynamicHint(body: unknown): DynamicHintRequest {
  const obj = asObject(body);
  const role = obj["role"];
  return {
    role: typeof role === "string" ? role : "user",
    message: asString(obj["message"], "message"),
  };
}

export function parseTranslate(body: unknown): TranslateRequest {
  const obj = asObject(body);
  const texts = obj["texts"];
  if (!Array.isArray(texts)) {
    throw new ValidationError("Campo invalido o ausente: texts");
  }
  const target = obj["target"];
  return {
    texts: texts.map((item) => (typeof item === "string" ? item : "")),
    target: typeof target === "string" && target !== "" ? target : "es",
  };
}

export function parseHintRequest(body: unknown): HintRequest {
  const obj = asObject(body);
  const previous = obj["previous_hints"];
  const language = obj["language"];
  return {
    problem: asString(obj["problem"], "problem"),
    step: asString(obj["step"], "step"),
    correctAnswer: asString(obj["correct_answer"], "correct_answer"),
    studentAnswer: asString(obj["student_answer"], "student_answer"),
    mastery: nullableNumber(obj["mastery"]) ?? 0,
    previousHints: Array.isArray(previous)
      ? previous.filter((item): item is string => typeof item === "string")
      : [],
    language: typeof language === "string" ? language : "es",
  };
}
