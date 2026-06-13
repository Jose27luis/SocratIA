import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export interface Config {
  readonly host: string;
  readonly port: number;
  readonly model: string;
  readonly anthropicApiKey: string;
  readonly databaseUrl: string;
}

export const config: Config = {
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 8001),
  model: process.env.MODEL ?? "claude-haiku-4-5",
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  databaseUrl: required("DATABASE_URL"),
};
