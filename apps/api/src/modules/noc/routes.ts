import type { FastifyInstance } from "fastify";
import { alerts, nocSummary } from "../../shared/demo-data.js";
import { listAlertsFromDb } from "../monitoring/repository.js";
import { getNocSummaryFromDb } from "./repository.js";

export async function registerNocRoutes(app: FastifyInstance) {
  app.get("/noc/summary", async () => (await getNocSummaryFromDb()) ?? nocSummary);

  app.get("/noc/workbench", async () => ({
    summary: (await getNocSummaryFromDb()) ?? nocSummary,
    priorityAlerts: (await listAlertsFromDb("active")) ?? alerts
  }));
}
