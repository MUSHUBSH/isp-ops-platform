import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import {
  createServiceEndpointInDb,
  createServiceInDb,
  deleteServiceEndpointInDb,
  deleteServiceInDb,
  getServiceFromDb,
  listServiceEndpointsFromDb,
  listServicesFromDb,
  updateServiceEndpointInDb,
  updateServiceInDb
} from "./repository.js";

const serviceSchema = z.object({
  code: z.string().min(2).max(80).toUpperCase(),
  name: z.string().min(3).max(180),
  serviceType: z.string().min(2).max(80),
  status: z.string().min(2).max(40).optional(),
  ownerTeam: z.string().max(80).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const endpointSchema = z.object({
  serviceCode: z.string().min(2).max(80).toUpperCase(),
  role: z.string().min(2).max(80),
  siteCode: z.string().max(32).nullable().optional(),
  deviceName: z.string().max(100).nullable().optional(),
  interfaceName: z.string().max(100).nullable().optional(),
  ipAddress: z.string().max(80).nullable().optional(),
  circuitCode: z.string().max(80).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateServiceSchema = serviceSchema.partial().omit({ reason: true }).extend({
  reason: z.string().max(500).nullable().optional()
});

const updateEndpointSchema = endpointSchema.partial().omit({ reason: true }).extend({
  reason: z.string().max(500).nullable().optional()
});

export async function registerServiceRoutes(app: FastifyInstance) {
  app.get("/services", async () => ({
    services: (await listServicesFromDb()) ?? []
  }));

  app.get("/services/endpoints", async (request, reply) => {
    const { serviceCode } = request.query as { serviceCode?: string };
    const endpoints = await listServiceEndpointsFromDb(serviceCode);

    if (!endpoints) {
      return reply.code(503).send({ message: "PostgreSQL is required to list service endpoints" });
    }

    return { endpoints };
  });

  app.get("/services/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    const service = await getServiceFromDb(code);

    if (!service) {
      return reply.code(404).send({ message: "Service not found" });
    }

    return {
      service,
      endpoints: (await listServiceEndpointsFromDb(code)) ?? []
    };
  });

  app.post("/services", { preHandler: requirePermission("services.write") }, async (request, reply) => {
    const parsed = serviceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid service payload", issues: parsed.error.issues });
    }

    const service = await createServiceInDb(parsed.data);

    if (!service) {
      return reply.code(503).send({ message: "PostgreSQL is required to create services" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "service.created",
      objectType: "service",
      objectId: service.id,
      afterData: service,
      reason: parsed.data.reason ?? "Alta de servicio"
    });

    return reply.code(201).send({ service });
  });

  app.patch("/services/:code", { preHandler: requirePermission("services.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = updateServiceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid service payload", issues: parsed.error.issues });
    }

    const before = await getServiceFromDb(code);
    const service = await updateServiceInDb({ codeOrId: code, ...parsed.data });

    if (!service) {
      return reply.code(404).send({ message: "Service not found or PostgreSQL unavailable" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "service.updated",
      objectType: "service",
      objectId: service.id,
      beforeData: before,
      afterData: service,
      reason: parsed.data.reason ?? "Actualizacion de servicio"
    });

    return { service };
  });

  app.delete("/services/:code", { preHandler: requirePermission("services.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const before = await getServiceFromDb(code);

    if (!before) {
      return reply.code(404).send({ message: "Service not found" });
    }

    const deleted = await deleteServiceInDb(code);

    if (!deleted) {
      return reply.code(409).send({ message: "Service not found, has endpoints/documents/evidence/incidents/changes/maintenance windows, or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "service.deleted",
      objectType: "service",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion controlada de servicio"
    });

    return { deleted };
  });

  app.post("/services/:code/endpoints", { preHandler: requirePermission("services.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const body = request.body && typeof request.body === "object" ? { ...(request.body as object), serviceCode: code } : { serviceCode: code };
    const parsed = endpointSchema.safeParse(body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid service endpoint payload", issues: parsed.error.issues });
    }

    const endpoint = await createServiceEndpointInDb(parsed.data);

    if (!endpoint) {
      return reply.code(409).send({ message: "Service endpoint references are invalid or PostgreSQL is unavailable" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "service_endpoint.created",
      objectType: "service_endpoint",
      objectId: endpoint.id,
      afterData: endpoint,
      reason: parsed.data.reason ?? "Alta de extremo de servicio"
    });

    return reply.code(201).send({ endpoint });
  });

  app.patch("/services/endpoints/:id", { preHandler: requirePermission("services.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateEndpointSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid service endpoint payload", issues: parsed.error.issues });
    }

    const endpoint = await updateServiceEndpointInDb({ id, ...parsed.data });

    if (!endpoint) {
      return reply.code(409).send({ message: "Endpoint not found, references invalid, or PostgreSQL is unavailable" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "service_endpoint.updated",
      objectType: "service_endpoint",
      objectId: endpoint.id,
      afterData: endpoint,
      reason: parsed.data.reason ?? "Actualizacion de extremo de servicio"
    });

    return { endpoint };
  });

  app.delete("/services/endpoints/:id", { preHandler: requirePermission("services.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteServiceEndpointInDb(id);

    if (!deleted) {
      return reply.code(404).send({ message: "Endpoint not found or PostgreSQL unavailable" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "service_endpoint.deleted",
      objectType: "service_endpoint",
      objectId: deleted.id,
      reason: "Eliminacion controlada de extremo de servicio"
    });

    return { deleted };
  });
}
