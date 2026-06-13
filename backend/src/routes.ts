import type { FastifyInstance } from "fastify";
import { config } from "./config.js";
import { ValidationError, parseAttempt, parseDynamicHint, parseHintRequest } from "./parse.js";
import { getProgress, listStudents, recordAttempt } from "./repository.js";
import { generateHint, streamHintText } from "./tutor.js";

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
}
