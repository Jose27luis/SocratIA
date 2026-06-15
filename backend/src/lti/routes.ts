import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { upsertCourseMember, upsertStudent } from "../repository.js";
import { lti, ltiEnabled } from "./config.js";
import { verifyLaunch } from "./launch.js";
import { getToolKeys } from "./keys.js";
import { consumeState, saveState } from "./store.js";

interface LoginParams {
  readonly login_hint?: string;
  readonly lti_message_hint?: string;
}

interface LaunchBody {
  readonly state?: string;
  readonly id_token?: string;
}

function safeJson(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function bridgePage(studentId: string, name: string | null, destination: string): string {
  const setName = name !== null ? `localStorage.setItem('socrateai_name', ${safeJson(name)});` : "";
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>SócratIA</title></head>
<body><p>Cargando SócratIA…</p>
<script>
localStorage.setItem('socrateai_student', ${safeJson(studentId)});
${setName}
location.replace(${safeJson(destination)});
</script></body></html>`;
}

async function handleLogin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!ltiEnabled()) {
    await reply.status(503).send("LTI no configurado");
    return;
  }
  const params = { ...(request.query as LoginParams), ...(request.body as LoginParams) };
  const state = randomUUID();
  const nonce = randomUUID();
  saveState(state, nonce);

  const url = new URL(lti.authUrl);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("response_type", "id_token");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("prompt", "none");
  url.searchParams.set("client_id", lti.clientId);
  url.searchParams.set("redirect_uri", `${lti.toolBaseUrl}/lti/launch`);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  if (params.login_hint !== undefined) {
    url.searchParams.set("login_hint", params.login_hint);
  }
  if (params.lti_message_hint !== undefined) {
    url.searchParams.set("lti_message_hint", params.lti_message_hint);
  }
  await reply.redirect(url.toString());
}

export function registerLtiRoutes(app: FastifyInstance): void {
  app.get("/lti/jwks", async () => {
    const keys = await getToolKeys();
    return { keys: [keys.publicJwk] };
  });

  app.get("/lti/login", handleLogin);
  app.post("/lti/login", handleLogin);

  app.post("/lti/launch", async (request, reply) => {
    const body = request.body as LaunchBody;
    const nonce = consumeState(body.state ?? "");
    if (nonce === null) {
      await reply.status(400).send("Estado LTI inválido o expirado");
      return;
    }
    const launch = await verifyLaunch(body.id_token ?? "", nonce);
    const personId = `canvas:${launch.sub}`;
    const role = launch.isInstructor ? "instructor" : "student";
    if (launch.contextId !== null) {
      await upsertCourseMember(launch.contextId, personId, launch.name, role);
    }
    if (!launch.isInstructor) {
      await upsertStudent(personId, launch.name);
    }
    const destination =
      launch.isInstructor && launch.contextId !== null
        ? `/docente/?course=${encodeURIComponent(launch.contextId)}`
        : launch.isInstructor
          ? "/docente/"
          : "/";
    await reply
      .header("Content-Type", "text/html; charset=utf-8")
      .send(bridgePage(personId, launch.name, destination));
  });
}
