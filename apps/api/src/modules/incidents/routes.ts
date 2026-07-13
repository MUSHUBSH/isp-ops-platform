import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import { incidentEvents, incidents } from "../../shared/demo-data.js";
import {
  addIncidentEventInDb,
  createIncidentInDb,
  deleteIncidentInDb,
  getIncidentByCodeFromDb,
  listIncidentEventsFromDb,
  listIncidentImpactsFromDb,
  listIncidentsFromDb,
  updateIncidentInDb,
  updateIncidentStatusInDb
} from "./repository.js";

const impactSchema = z.object({
  objectType: z.string().min(2).max(40),
  objectId: z.string().uuid(),
  impactType: z.string().min(2).max(40),
  notes: z.string().max(500).nullable().optional()
});

const createIncidentSchema = z.object({
  code: z.string().min(3).max(60).toUpperCase(),
  title: z.string().min(5).max(200),
  severity: z.enum(["critical", "major", "minor"]),
  status: z.string().min(2).max(40).optional(),
  ownerTeam: z.string().max(60).nullable().optional(),
  summary: z.string().max(1000).nullable().optional(),
  impacts: z.array(impactSchema).max(100).optional(),
  reason: z.string().max(500).nullable().optional()
});

const addEventSchema = z.object({
  eventType: z.string().min(2).max(40).default("update"),
  message: z.string().min(3).max(1000),
  reason: z.string().max(500).nullable().optional()
});

const updateIncidentStatusSchema = z.object({
  status: z.string().min(2).max(40),
  reason: z.string().max(500).nullable().optional()
});

const updateIncidentSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  severity: z.enum(["critical", "major", "minor"]).optional(),
  status: z.string().min(2).max(40).optional(),
  ownerTeam: z.string().max(60).nullable().optional(),
  summary: z.string().max(1000).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

export async function registerIncidentRoutes(app: FastifyInstance) {
  app.get("/incidents", async (request) => {
    const { status } = request.query as { status?: string };
    return { incidents: (await listIncidentsFromDb(status)) ?? incidents };
  });

  app.get("/incidents/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    const incident = await getIncidentByCodeFromDb(code) ?? incidents.find((item) => item.code === code || item.id === code);

    if (!incident) {
      return reply.code(404).send({ message: "Incident not found" });
    }

    return {
      incident,
      events: (await listIncidentEventsFromDb(code)) ?? incidentEvents.filter((event) => event.incidentCode === incident.code),
      impacts: (await listIncidentImpactsFromDb(code)) ?? []
    };
  });

  app.post("/incidents", { preHandler: requirePermission("incidents.write") }, async (request, reply) => {
    const parsed = createIncidentSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid incident payload", issues: parsed.error.issues });
    }

    const incident = await createIncidentInDb({ ...parsed.data, createdBy: actorId(request) });

    if (!incident) {
      return reply.code(503).send({ message: "PostgreSQL is required to create incidents" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "incident.created",
      objectType: "incident",
      objectId: incident.id,
      afterData: incident,
      reason: parsed.data.reason ?? "Alta de incidencia operativa"
    });

    return reply.code(201).send({ incident });
  });

  app.post("/incidents/:code/events", { preHandler: requirePermission("incidents.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = addEventSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid incident event payload", issues: parsed.error.issues });
    }

    const event = await addIncidentEventInDb(code, parsed.data.eventType, parsed.data.message, actorId(request));

    if (!event) {
      return reply.code(404).send({ message: "Incident not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "incident.event.created",
      objectType: "incident",
      objectId: code,
      afterData: event,
      reason: parsed.data.reason ?? "Actualizacion de incidencia"
    });

    return reply.code(201).send({ event });
  });

  app.patch("/incidents/:code", { preHandler: requirePermission("incidents.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = updateIncidentSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid incident update payload", issues: parsed.error.issues });
    }

    const before = await getIncidentByCodeFromDb(code) ?? incidents.find((item) => item.code === code || item.id === code) ?? null;
    const incident = await updateIncidentInDb({
      code,
      ...parsed.data,
      updatedBy: actorId(request)
    });

    if (!incident) {
      return reply.code(404).send({ message: "Incident not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "incident.updated",
      objectType: "incident",
      objectId: incident.id,
      beforeData: before,
      afterData: incident,
      reason: parsed.data.reason ?? "Edicion de incidencia operativa"
    });

    return { incident };
  });

  app.patch("/incidents/:code/status", { preHandler: requirePermission("incidents.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = updateIncidentStatusSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid incident status payload", issues: parsed.error.issues });
    }

    const before = await getIncidentByCodeFromDb(code) ?? incidents.find((item) => item.code === code || item.id === code) ?? null;
    const incident = await updateIncidentStatusInDb(code, parsed.data.status, actorId(request));

    if (!incident) {
      return reply.code(404).send({ message: "Incident not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "incident.status_updated",
      objectType: "incident",
      objectId: incident.id,
      beforeData: before,
      afterData: incident,
      reason: parsed.data.reason ?? "Cambio de estado de incidencia"
    });

    return { incident };
  });

  app.delete("/incidents/:code", { preHandler: requirePermission("incidents.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const incident = await deleteIncidentInDb(code);

    if (!incident) {
      return reply.code(404).send({ message: "Incident not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "incident.deleted",
      objectType: "incident",
      objectId: incident.id,
      beforeData: incident,
      reason: "Eliminacion de incidencia operativa"
    });

    return reply.code(204).send();
  });
}
