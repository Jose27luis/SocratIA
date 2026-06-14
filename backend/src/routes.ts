import type { FastifyInstance } from "fastify";
import { config } from "./config.js";
import {
  ValidationError,
  parseAttempt,
  parseChat,
  parseDynamicHint,
  parseGenerate,
  parseHintRequest,
  parseMisconception,
  parseReinforcement,
  parseTranslate,
} from "./parse.js";
import {
  getMisconceptions,
  getProgress,
  listStudents,
  recordAttempt,
  recordMisconception,
} from "./repository.js";
import { generateHint, streamHintText } from "./tutor.js";
import { translateTexts } from "./translate.js";
import {
  chatTutorStream,
  classReport,
  classifyMisconception,
  diagnoseStudent,
  generateProblems,
  generateReinforcement,
} from "./features.js";

interface StudentParams {
  readonly student: string;
}

export function registerRoutes(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ValidationError) {
      void reply.status(400).send({ error: error.message });
      return;
    }
    app.log.error(error);
    void reply.status(500).send({ error: "Error interno del servidor" });
  });

  app.get("/health", async () => ({ status: "ok", model: config.model }));

  app.post("/hint", async (request) => generateHint(parseHintRequest(request.body)));

  app.post("/dynamic-hint", async (request, reply) => {
    const { message } = parseDynamicHint(request.body);
    reply.raw.setHeader("Content-Type", "text/plain; charset=utf-8");
    reply.hijack();
    try {
      for await (const chunk of streamHintText(message)) {
        reply.raw.write(chunk);
      }
    } catch (error) {
      app.log.error(error);
    } finally {
      reply.raw.end();
    }
  });

  app.post("/progress/attempt", async (request) => {
    await recordAttempt(parseAttempt(request.body));
    return { status: "ok" };
  });

  app.get<{ Params: StudentParams }>("/progress/:student", async (request) =>
    getProgress(request.params.student),
  );

  app.get("/students", async () => listStudents());

  app.post("/translate", async (request) => {
    const { texts, target } = parseTranslate(request.body);
    const translations = await translateTexts(texts, target);
    return { translations };
  });

  app.post("/feedback", async (request) => {
    const body = parseReinforcement(request.body);
    const text = await generateReinforcement({
      problem: body.problem,
      step: body.step,
      studentAnswer: body.studentAnswer,
    });
    return { feedback: text };
  });

  app.post("/misconception", async (request) => {
    const body = parseMisconception(request.body);
    const result = await classifyMisconception({
      problem: body.problem,
      step: body.step,
      correctAnswer: body.correctAnswer,
      studentAnswer: body.studentAnswer,
    });
    if (body.student !== null) {
      await recordMisconception(body.student, body.skill, result.category, result.explanation);
    }
    return result;
  });

  app.post("/chat", async (request, reply) => {
    const { context, history } = parseChat(request.body);
    reply.raw.setHeader("Content-Type", "text/plain; charset=utf-8");
    reply.hijack();
    try {
      for await (const chunk of chatTutorStream(context, history)) {
        reply.raw.write(chunk);
      }
    } catch (error) {
      app.log.error(error);
    } finally {
      reply.raw.end();
    }
  });

  app.get<{ Params: StudentParams }>("/diagnose/:student", async (request) => {
    const progress = await getProgress(request.params.student);
    const misconceptions = await getMisconceptions(request.params.student);
    const diagnosis = await diagnoseStudent(progress, misconceptions);
    return { diagnosis };
  });

  app.get("/class-report", async () => {
    const students = await listStudents();
    const report = await classReport(students);
    return { report };
  });

  app.post("/generate-problem", async (request) => {
    const body = parseGenerate(request.body);
    const generated = await generateProblems(body);
    return generated;
  });
}
