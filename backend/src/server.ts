import Fastify from "fastify";
import { config } from "./config.js";
import { registerRoutes } from "./routes.js";

async function main(): Promise<void> {
  const app = Fastify({ logger: true });
  registerRoutes(app);
  await app.listen({ host: config.host, port: config.port });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
