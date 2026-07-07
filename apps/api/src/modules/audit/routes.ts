import type { FastifyInstance } from "fastify";
import { requirePermission } from "../../shared/auth.js";
import { listRecentAuditEventsFromDb } from "./repository.js";

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get("/audit/recent", { preHandler: requirePermission("audit.read") }, async () => ({
    events: (await listRecentAuditEventsFromDb()) ?? [
      {
        id: "aud-001",
        action: "ip.assigned",
        objectType: "ip_address",
        objectLabel: "190.0.2.10/32",
        actor: "network.engineer",
        reason: "Alta de interfaz de gestion",
        at: new Date().toISOString()
      }
    ]
  }));
}
