import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  exportJWK,
  exportPKCS8,
  generateKeyPair,
  importPKCS8,
  type CryptoKey,
  type JWK,
} from "jose";

const KEY_DIR = resolve(process.cwd(), "keys");
const PRIVATE_PATH = resolve(KEY_DIR, "lti-private.pem");
const PUBLIC_PATH = resolve(KEY_DIR, "lti-public.json");
const ALG = "RS256";
const KID = "socrateai-lti-1";

export interface ToolKeys {
  readonly signingKey: CryptoKey;
  readonly publicJwk: JWK;
}

let cached: ToolKeys | null = null;

async function createKeys(): Promise<void> {
  const { privateKey, publicKey } = await generateKeyPair(ALG, { extractable: true });
  const pem = await exportPKCS8(privateKey);
  const jwk = await exportJWK(publicKey);
  const publicJwk: JWK = { ...jwk, kid: KID, alg: ALG, use: "sig" };
  await writeFile(PRIVATE_PATH, pem, { mode: 0o600 });
  await writeFile(PUBLIC_PATH, JSON.stringify(publicJwk), { mode: 0o644 });
}

export async function getToolKeys(): Promise<ToolKeys> {
  if (cached !== null) {
    return cached;
  }
  await mkdir(KEY_DIR, { recursive: true });
  if (!existsSync(PRIVATE_PATH) || !existsSync(PUBLIC_PATH)) {
    await createKeys();
  }
  const pem = await readFile(PRIVATE_PATH, "utf8");
  const publicJwk = JSON.parse(await readFile(PUBLIC_PATH, "utf8")) as JWK;
  const signingKey = await importPKCS8(pem, ALG, { extractable: false });
  cached = { signingKey, publicJwk };
  return cached;
}
