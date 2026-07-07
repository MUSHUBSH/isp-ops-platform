import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import { configBackups } from "../../shared/demo-data.js";
import { createBackupInDb, deleteBackupInDb, getBackupFromDb, getBackupSummaryFromDb, listBackupsFromDb } from "./repository.js";

const createBackupSchema = z.object({
  deviceName: z.string().min(2).max(100),
  storageKey: z.string().min(3).max(500),
  configHash: z.string().min(3).max(160),
  source: z.string().min(2).max(80),
  reason: z.string().max(500).nullable().optional()
});

export async function registerBackupRoutes(app: FastifyInstance) {
  app.get("/backups", async () => ({
    backups: (await listBackupsFromDb()) ?? configBackups
  }));

  app.get("/backups/summary", async () => {
    const summary = await getBackupSummaryFromDb();

    if (summary) {
      return summary;
    }

    return {
      totalDevices: 3,
      devicesWithBackup: configBackups.length,
      staleBackups: 0
    };
  });

  app.post("/backups", { preHandler: requirePermission("backups.write") }, async (request, reply) => {
    const parsed = createBackupSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid backup payload", issues: parsed.error.issues });
    }

    const backup = await createBackupInDb(parsed.data);

    if (!backup) {
      return reply.code(503).send({ message: "PostgreSQL is required and referenced device must exist" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "config_backup.created",
      objectType: "config_backup",
      objectId: backup.id,
      afterData: backup,
      reason: parsed.data.reason ?? "Registro de backup de configuracion"
    });

    return reply.code(201).send({ backup });
  });

  app.delete("/backups/:id", { preHandler: requirePermission("backups.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = (await getBackupFromDb(id)) ?? configBackups.find((backup) => backup.id === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Backup not found" });
    }

    const deleted = await deleteBackupInDb(id);

    if (!deleted) {
      return reply.code(404).send({ message: "Backup not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "config_backup.deleted",
      objectType: "config_backup",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion controlada de registro de backup"
    });

    return { deleted };
  });
}
