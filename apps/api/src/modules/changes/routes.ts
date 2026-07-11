import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import {
  approveChangeInDb,
  createChangeInDb,
  deleteChangeInDb,
  getChangeFromDb,
  getChangeImpactsFromDb,
  listChangesFromDb,
  updateChangeInDb,
  updateChangeStatusInDb
} from "./repository.js";

const createChangeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(2000),
  riskLevel: z.string().max(40).optional(),
  plannedStart: z.string().max(80).nullable().optional(),
  plannedEnd: z.string().max(80).nullable().optional(),
  impacts: z
    .array(
      z.object({
        objectType: z.string().min(2).max(80),
        objectId: z.string().uuid(),
        impactType: z.string().min(2).max(80),
        notes: z.string().max(500).nullable().optional()
      })
    )
    .optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateChangeStatusSchema = z.object({
  status: z.string().min(2).max(40),
  reason: z.string().max(500).nullable().optional()
});

const updateChangeSchema = createChangeSchema.partial().extend({
  reason: z.string().max(500).nullable().optional()
});

export async function registerChangeRoutes(app: FastifyInstance) {
  app.get("/changes", async () => ({
    changes: (await listChangesFromDb()) ?? []
  }));

  app.get("/changes/:id/impacts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const impacts = await getChangeImpactsFromDb(id);

    if (!impacts) {
      return reply.code(503).send({ message: "PostgreSQL is required to list change impacts" });
    }

    return { impacts };
  });

  app.post("/changes", { preHandler: requirePermission("changes.write") }, async (request, reply) => {
    const parsed = createChangeSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid change payload", issues: parsed.error.issues });
    }

    const change = await createChangeInDb({
      ...parsed.data,
      requestedBy: actorId(request)
    });

    if (!change) {
      return reply.code(503).send({ message: "PostgreSQL is required to create changes" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "change.created",
      objectType: "change_request",
      objectId: change.id,
      afterData: change,
      reason: parsed.data.reason ?? "Solicitud de cambio creada"
    });

    return reply.code(201).send({ change });
  });

  app.post("/changes/:id/approve", { preHandler: requirePermission("changes.approve") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const change = await approveChangeInDb(id, actorId(request));

    if (!change) {
      return reply.code(503).send({ message: "PostgreSQL is required and change must exist" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "change.approved",
      objectType: "change_request",
      objectId: change.id,
      afterData: change,
      reason: "Cambio aprobado"
    });

    return { change };
  });

  app.patch("/changes/:id", { preHandler: requirePermission("changes.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateChangeSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid change payload", issues: parsed.error.issues });
    }

    const before = await getChangeFromDb(id);
    const change = await updateChangeInDb({
      id,
      ...parsed.data
    });

    if (!change) {
      return reply.code(404).send({ message: "Change not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "change.updated",
      objectType: "change_request",
      objectId: change.id,
      beforeData: before,
      afterData: change,
      reason: parsed.data.reason ?? "Actualizacion de solicitud de cambio"
    });

    return { change };
  });

  app.patch("/changes/:id/status", { preHandler: requirePermission("changes.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateChangeStatusSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid change status payload", issues: parsed.error.issues });
    }

    const before = await getChangeFromDb(id);
    const change = await updateChangeStatusInDb(id, parsed.data.status);

    if (!change) {
      return reply.code(404).send({ message: "Change not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "change.status_updated",
      objectType: "change_request",
      objectId: change.id,
      beforeData: before,
      afterData: change,
      reason: parsed.data.reason ?? "Cambio de estado"
    });

    return { change };
  });

  app.delete("/changes/:id", { preHandler: requirePermission("changes.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = await getChangeFromDb(id);

    if (!before) {
      return reply.code(404).send({ message: "Change not found" });
    }

    const deleted = await deleteChangeInDb(id);

    if (!deleted) {
      return reply.code(404).send({ message: "Change not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "change.deleted",
      objectType: "change_request",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion controlada de solicitud de cambio"
    });

    return { deleted };
  });
}
