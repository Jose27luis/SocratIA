import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import { lti } from "./config.js";

const CLAIM_DEPLOYMENT = "https://purl.imsglobal.org/spec/lti/claim/deployment_id";
const CLAIM_ROLES = "https://purl.imsglobal.org/spec/lti/claim/roles";
const CLAIM_CONTEXT = "https://purl.imsglobal.org/spec/lti/claim/context";
const JWKS_TTL_MS = 5 * 60 * 1000;

interface Jwk {
  readonly kid?: string;
  readonly kty: string;
  readonly n: string;
  readonly e: string;
}

interface JwksCache {
  readonly keys: readonly Jwk[];
  readonly fetchedAt: number;
}

let jwksCache: JwksCache | null = null;

async function fetchJwks(): Promise<readonly Jwk[]> {
  const response = await fetch(lti.jwksUrl);
  if (!response.ok) {
    throw new Error(`No se pudo obtener el JWKS de la plataforma (${response.status})`);
  }
  const data = (await response.json()) as { keys?: readonly Jwk[] };
  const keys = data.keys ?? [];
  jwksCache = { keys, fetchedAt: Date.now() };
  return keys;
}

async function findKey(kid: string): Promise<Jwk> {
  const fresh = jwksCache !== null && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS;
  let keys = fresh && jwksCache !== null ? jwksCache.keys : await fetchJwks();
  let key = keys.find((candidate) => candidate.kid === kid);
  if (key === undefined && fresh) {
    keys = await fetchJwks();
    key = keys.find((candidate) => candidate.kid === kid);
  }
  if (key === undefined) {
    throw new Error("No se encontró la llave que firmó el id_token");
  }
  return key;
}

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export interface LtiLaunch {
  readonly sub: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly roles: readonly string[];
  readonly contextId: string | null;
  readonly contextTitle: string | null;
  readonly isInstructor: boolean;
}

export async function verifyLaunch(idToken: string, expectedNonce: string): Promise<LtiLaunch> {
  const [headerB64, payloadB64, signatureB64] = idToken.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error("id_token mal formado");
  }

  const header = decodeSegment(headerB64);
  if (header["alg"] !== "RS256") {
    throw new Error("Algoritmo de firma no soportado");
  }
  if (typeof header["kid"] !== "string") {
    throw new Error("El id_token no indica kid");
  }

  const jwk = await findKey(header["kid"]);
  const publicKey = createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: "jwk" });
  const valid = cryptoVerify(
    "RSA-SHA256",
    Buffer.from(`${headerB64}.${payloadB64}`),
    publicKey,
    Buffer.from(signatureB64, "base64url"),
  );
  if (!valid) {
    throw new Error("Firma del id_token inválida");
  }

  const payload = decodeSegment(payloadB64);
  const now = Math.floor(Date.now() / 1000);

  if (payload["iss"] !== lti.platformIssuer) {
    throw new Error("Issuer inválido");
  }
  const audience = payload["aud"];
  const audienceOk =
    audience === lti.clientId || (Array.isArray(audience) && audience.includes(lti.clientId));
  if (!audienceOk) {
    throw new Error("Audience inválido");
  }
  if (typeof payload["exp"] === "number" && payload["exp"] < now) {
    throw new Error("El id_token expiró");
  }
  if (payload["nonce"] !== expectedNonce) {
    throw new Error("Nonce inválido en el id_token");
  }
  if (lti.deploymentId !== "" && payload[CLAIM_DEPLOYMENT] !== lti.deploymentId) {
    throw new Error("deployment_id no autorizado");
  }
  if (typeof payload["sub"] !== "string" || payload["sub"] === "") {
    throw new Error("El id_token no contiene sub");
  }

  const roles = asStringArray(payload[CLAIM_ROLES]);
  const context = payload[CLAIM_CONTEXT];
  const contextId =
    typeof context === "object" && context !== null && "id" in context
      ? String((context as { id: unknown }).id)
      : null;
  const contextTitle =
    typeof context === "object" && context !== null && "title" in context
      ? String((context as { title: unknown }).title)
      : null;

  return {
    sub: payload["sub"],
    name: typeof payload["name"] === "string" ? payload["name"] : null,
    email: typeof payload["email"] === "string" ? payload["email"] : null,
    roles,
    contextId,
    contextTitle,
    isInstructor: roles.some((role) => role.includes("Instructor") || role.includes("Teacher")),
  };
}
