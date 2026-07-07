import type { FastifyInstance } from "fastify";
import { listPermissionsFromDb, listRolesFromDb } from "./repository.js";

export async function registerIdentityRoutes(app: FastifyInstance) {
  app.get("/identity/me", async (request) => ({
    user: request.authUser ?? null
  }));

  app.get("/identity/roles", async () => ({
    roles: (await listRolesFromDb()) ?? []
  }));

  app.get("/identity/permissions", async () => ({
    permissions: (await listPermissionsFromDb()) ?? []
  }));
}
