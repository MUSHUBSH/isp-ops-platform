import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import { alerts } from "../../shared/demo-data.js";
import {
  acknowledgeAlertInDb,
  createAlertInDb,
  createMaintenanceWindowInDb,
  deleteMaintenanceWindowInDb,
  listAlertsFromDb,
  listMaintenanceWindowsFromDb,
  updateMaintenanceWindowInDb,
  updateAlertStatusInDb
} from "./repository.js";

const alertQuerySchema = z.object({
  status: z.string().max(40).optional()
});

const createAlertSchema = z.object({
  objectType: z.string().min(2).max(80),
  objectId: z.string().uuid(),
  monitorSource: z.string().min(2).max(80),
  externalRef: z.string().max(200).nullable().optional(),
  severity: z.union([z.literal("critical"), z.literal("major"), z.literal("minor")]),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const createMaintenanceSchema = z.object({
  objectType: z.string().min(2).max(80),
  objectId: z.string().uuid(),
  title: z.string().min(3).max(200),
  startsAt: z.string().min(10).max(80),
  endsAt: z.string().min(10).max(80),
  status: z.string().max(40).optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateMaintenanceSchema = createMaintenanceSchema
  .omit({ objectType: true, objectId: true, reason: true })
  .partial()
  .extend({
    reason: z.string().max(500).nullable().optional()
  });

const updateAlertStatusSchema = z.object({
  status: z.string().min(2).max(40),
  reason: z.string().max(500).nullable().optional()
});

export async function registerMonitoringRoutes(app: FastifyInstance) {
  app.get("/monitoring/alerts", async (request) => {
    const query = alertQuerySchema.parse(request.query);

    return {
      alerts: (await listAlertsFromDb(query.status ?? "active")) ?? alerts
    };
  });

  app.post("/monitoring/alerts", { preHandler: requirePermission("alerts.write") }, async (request, reply) => {
    const parsed = createAlertSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid alert payload", issues: parsed.error.issues });
    }

    const alert = await createAlertInDb(parsed.data);

    if (!alert) {
      return reply.code(503).send({ message: "PostgreSQL is required and referenced object must exist" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "alert.created",
      objectType: "alert",
      objectId: alert.id,
      afterData: alert,
      reason: parsed.data.reason ?? "Alta de alerta normalizada"
    });

    return reply.code(201).send({ alert });
  });

  app.post("/monitoring/alerts/:id/ack", { preHandler: requirePermission("alerts.ack") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const alert = await acknowledgeAlertInDb(id);

    if (!alert) {
      return reply.code(503).send({ message: "PostgreSQL is required and alert must exist" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "alert.acknowledged",
      objectType: "alert",
      objectId: alert.id,
      afterData: alert,
      reason: "ACK operativo desde NOC"
    });

    return { alert };
  });

  app.patch("/monitoring/alerts/:id/status", { preHandler: requirePermission("alerts.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateAlertStatusSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid alert status payload", issues: parsed.error.issues });
    }

    const before = ((await listAlertsFromDb("all")) ?? alerts).find((item) => item.id === id) ?? null;
    const alert = await updateAlertStatusInDb(id, parsed.data.status);

    if (!alert) {
      return reply.code(404).send({ message: "Alert not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "alert.status_updated",
      objectType: "alert",
      objectId: alert.id,
      beforeData: before,
      afterData: alert,
      reason: parsed.data.reason ?? "Cambio de estado de alerta"
    });

    return { alert };
  });

  app.get("/monitoring/maintenance-windows", async () => ({
    maintenanceWindows: (await listMaintenanceWindowsFromDb()) ?? []
  }));

  app.post("/monitoring/maintenance-windows", { preHandler: requirePermission("maintenance.write") }, async (request, reply) => {
    const parsed = createMaintenanceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid maintenance payload", issues: parsed.error.issues });
    }

    const maintenanceWindow = await createMaintenanceWindowInDb(parsed.data);

    if (!maintenanceWindow) {
      return reply.code(503).send({ message: "PostgreSQL is required to create maintenance windows" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "maintenance_window.created",
      objectType: "maintenance_window",
      objectId: maintenanceWindow.id,
      afterData: maintenanceWindow,
      reason: parsed.data.reason ?? "Ventana de mantenimiento programada"
    });

    return reply.code(201).send({ maintenanceWindow });
  });

  app.patch("/monitoring/maintenance-windows/:id", { preHandler: requirePermission("maintenance.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateMaintenanceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid maintenance payload", issues: parsed.error.issues });
    }

    const before = ((await listMaintenanceWindowsFromDb()) ?? []).find((item) => item.id === id) ?? null;
    const maintenanceWindow = await updateMaintenanceWindowInDb({ id, ...parsed.data });

    if (!maintenanceWindow) {
      return reply.code(404).send({ message: "Maintenance window not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "maintenance_window.updated",
      objectType: "maintenance_window",
      objectId: maintenanceWindow.id,
      beforeData: before,
      afterData: maintenanceWindow,
      reason: parsed.data.reason ?? "Actualizacion de ventana de mantenimiento"
    });

    return { maintenanceWindow };
  });

  app.delete("/monitoring/maintenance-windows/:id", { preHandler: requirePermission("maintenance.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = ((await listMaintenanceWindowsFromDb()) ?? []).find((item) => item.id === id) ?? null;
    const deleted = await deleteMaintenanceWindowInDb(id);

    if (!deleted) {
      return reply.code(404).send({ message: "Maintenance window not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "maintenance_window.deleted",
      objectType: "maintenance_window",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion de ventana de mantenimiento"
    });

    return { deleted };
  });
}
