import formbody from "@fastify/formbody";
import Fastify from "fastify";
import { config } from "./config.js";
import { registerLtiRoutes } from "./lti/routes.js";
import { registerRoutes } from "./routes.js";

async function main(): Promise<void> {
  const app = Fastify({ logger: true });
  await app.register(formbody);
  registerRoutes(app);
  registerLtiRoutes(app);
  await app.listen({ host: config.host, port: config.port });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
