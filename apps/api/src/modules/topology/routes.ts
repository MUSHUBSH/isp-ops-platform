import type { FastifyInstance } from "fastify";
import { topology } from "../../shared/demo-data.js";
import { buildTopologyFromDb } from "./repository.js";

export async function registerTopologyRoutes(app: FastifyInstance) {
  app.get("/topology/graph", async () => (await buildTopologyFromDb()) ?? topology);
}
