import type {
  AttemptRequest,
  ChatBody,
  DynamicHintRequest,
  GenerateBody,
  HintRequest,
  MisconceptionBody,
  ReinforcementBody,
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

export function parseReinforcement(body: unknown): ReinforcementBody {
  const obj = asObject(body);
  return {
    problem: asString(obj["problem"], "problem"),
    step: asString(obj["step"], "step"),
    studentAnswer: asString(obj["student_answer"], "student_answer"),
  };
}

export function parseMisconception(body: unknown): MisconceptionBody {
  const obj = asObject(body);
  return {
    student: nullableString(obj["student"]),
    skill: nullableString(obj["skill"]),
    problem: asString(obj["problem"], "problem"),
    step: asString(obj["step"], "step"),
    correctAnswer: asString(obj["correct_answer"], "correct_answer"),
    studentAnswer: asString(obj["student_answer"], "student_answer"),
  };
}

export function parseChat(body: unknown): ChatBody {
  const obj = asObject(body);
  const history = obj["history"];
  const turns = Array.isArray(history) ? history : [];
  return {
    context: typeof obj["context"] === "string" ? obj["context"] : "",
    history: turns.map((turn) => {
      const t = turn as Record<string, unknown>;
      const role = t["role"] === "assistant" ? "assistant" : "user";
      return { role, content: typeof t["content"] === "string" ? t["content"] : "" };
    }),
  };
}

export function parsePublish(body: unknown): {
  lesson: string;
  language: string;
  problems: { title: string; body: string; stepTitle: string; answer: string; choices: string[] }[];
} {
  const obj = asObject(body);
  const problemsRaw = obj["problems"];
  if (!Array.isArray(problemsRaw)) {
    throw new ValidationError("Campo invalido o ausente: problems");
  }
  return {
    lesson: typeof obj["lesson"] === "string" && obj["lesson"] !== "" ? obj["lesson"] : "Lección generada",
    language: typeof obj["language"] === "string" ? obj["language"] : "es",
    problems: problemsRaw.map((item) => {
      const p = item as Record<string, unknown>;
      const choices = Array.isArray(p["choices"])
        ? p["choices"].filter((c): c is string => typeof c === "string")
        : [];
      return {
        title: typeof p["title"] === "string" ? p["title"] : "",
        body: typeof p["body"] === "string" ? p["body"] : "",
        stepTitle: typeof p["stepTitle"] === "string" ? p["stepTitle"] : "",
        answer: typeof p["answer"] === "string" ? p["answer"] : "",
        choices,
      };
    }),
  };
}

export function parseGenerate(body: unknown): GenerateBody {
  const obj = asObject(body);
  const count = obj["count"];
  return {
    topic: asString(obj["topic"], "topic"),
    level: typeof obj["level"] === "string" ? obj["level"] : "básico",
    language: typeof obj["language"] === "string" ? obj["language"] : "es",
    count: typeof count === "number" && count > 0 && count <= 10 ? Math.floor(count) : 3,
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
