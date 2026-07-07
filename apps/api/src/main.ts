import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerAuditRoutes } from "./modules/audit/routes.js";
import { registerBackupRoutes } from "./modules/backups/routes.js";
import { registerCircuitRoutes } from "./modules/circuits/routes.js";
import { registerChangeRoutes } from "./modules/changes/routes.js";
import { registerDocumentationRoutes } from "./modules/documentation/routes.js";
import { registerIdentityRoutes } from "./modules/identity/routes.js";
import { registerIncidentRoutes } from "./modules/incidents/routes.js";
import { registerInventoryRoutes } from "./modules/inventory/routes.js";
import { registerIpamRoutes } from "./modules/ipam/routes.js";
import { registerMonitoringRoutes } from "./modules/monitoring/routes.js";
import { registerNocRoutes } from "./modules/noc/routes.js";
import { registerProviderRoutes } from "./modules/providers/routes.js";
import { registerPhysicalRoutes } from "./modules/physical/routes.js";
import { registerSearchRoutes } from "./modules/search/routes.js";
import { registerSiteRoutes } from "./modules/sites/routes.js";
import { registerTopologyRoutes } from "./modules/topology/routes.js";
import { checkDatabase, dbMode } from "./shared/db.js";
import { registerAuth } from "./shared/auth.js";

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

await registerAuth(app);

app.get("/health", async () => ({
  ok: true,
  service: "isp-ops-api",
  mode: dbMode,
  database: await checkDatabase()
}));

await registerNocRoutes(app);
await registerIdentityRoutes(app);
await registerSearchRoutes(app);
await registerAuditRoutes(app);
await registerProviderRoutes(app);
await registerPhysicalRoutes(app);
await registerSiteRoutes(app);
await registerIpamRoutes(app);
await registerInventoryRoutes(app);
await registerIncidentRoutes(app);
await registerCircuitRoutes(app);
await registerChangeRoutes(app);
await registerTopologyRoutes(app);
await registerMonitoringRoutes(app);
await registerDocumentationRoutes(app);
await registerBackupRoutes(app);

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
