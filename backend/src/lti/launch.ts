import { createRemoteJWKSet, jwtVerify } from "jose";
import { lti } from "./config.js";

const CLAIM_DEPLOYMENT = "https://purl.imsglobal.org/spec/lti/claim/deployment_id";
const CLAIM_ROLES = "https://purl.imsglobal.org/spec/lti/claim/roles";
const CLAIM_CONTEXT = "https://purl.imsglobal.org/spec/lti/claim/context";

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function platformJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (remoteJwks === null) {
    remoteJwks = createRemoteJWKSet(new URL(lti.jwksUrl));
  }
  return remoteJwks;
}

export interface LtiLaunch {
  readonly sub: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly roles: readonly string[];
  readonly contextTitle: string | null;
  readonly isInstructor: boolean;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function verifyLaunch(idToken: string, expectedNonce: string): Promise<LtiLaunch> {
  const { payload } = await jwtVerify(idToken, platformJwks(), {
    issuer: lti.platformIssuer,
    audience: lti.clientId,
  });

  if (payload["nonce"] !== expectedNonce) {
    throw new Error("Nonce inválido en el id_token");
  }
  if (lti.deploymentId !== "" && payload[CLAIM_DEPLOYMENT] !== lti.deploymentId) {
    throw new Error("deployment_id no autorizado");
  }
  if (typeof payload.sub !== "string" || payload.sub === "") {
    throw new Error("El id_token no contiene sub");
  }

  const roles = asStringArray(payload[CLAIM_ROLES]);
  const context = payload[CLAIM_CONTEXT];
  const contextTitle =
    typeof context === "object" && context !== null && "title" in context
      ? String((context as { title: unknown }).title)
      : null;

  return {
    sub: payload.sub,
    name: typeof payload["name"] === "string" ? payload["name"] : null,
    email: typeof payload["email"] === "string" ? payload["email"] : null,
    roles,
    contextTitle,
    isInstructor: roles.some((role) => role.includes("Instructor") || role.includes("Teacher")),
  };
}
