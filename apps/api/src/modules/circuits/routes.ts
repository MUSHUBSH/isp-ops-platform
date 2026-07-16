import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import { circuits } from "../../shared/demo-data.js";
import {
  createCircuitEndpointInDb,
  createCircuitInDb,
  deleteCircuitEndpointInDb,
  deleteCircuitInDb,
  getCircuitEndpointFromDb,
  getCircuitFromDb,
  getCircuitImpactFromDb,
  listCircuitEndpointsFromDb,
  listCircuitsFromDb,
  updateCircuitEndpointInDb,
  updateCircuitInDb,
  updateCircuitStatusInDb
} from "./repository.js";

const createCircuitSchema = z.object({
  code: z.string().min(2).max(80).toUpperCase(),
  name: z.string().min(3).max(180),
  circuitType: z.string().min(2).max(60),
  providerCode: z.string().max(32).nullable().optional(),
  contractCode: z.string().max(80).nullable().optional(),
  status: z.string().min(2).max(40).optional(),
  capacityMbps: z.number().int().positive().nullable().optional(),
  slaTarget: z.number().min(0).max(100).nullable().optional(),
  installedAt: z.string().max(40).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const createEndpointSchema = z.object({
  circuitCode: z.string().min(2).max(80).toUpperCase(),
  siteCode: z.string().max(32).nullable().optional(),
  deviceName: z.string().max(100).nullable().optional(),
  interfaceName: z.string().max(100).nullable().optional(),
  label: z.string().min(1).max(20),
  demarcation: z.string().max(300).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateCircuitStatusSchema = z.object({
  status: z.string().min(2).max(40),
  reason: z.string().max(500).nullable().optional()
});

const updateCircuitSchema = createCircuitSchema.partial().omit({ reason: true }).extend({
  reason: z.string().max(500).nullable().optional()
});

const updateEndpointSchema = createEndpointSchema.partial().omit({ reason: true }).extend({
  reason: z.string().max(500).nullable().optional()
});

export async function registerCircuitRoutes(app: FastifyInstance) {
  app.get("/circuits", async () => ({
    circuits: (await listCircuitsFromDb()) ?? circuits
  }));

  app.get("/circuits/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    const circuit = (await getCircuitFromDb(code)) ?? circuits.find((item) => item.code === code || item.id === code);

    if (!circuit) {
      return reply.code(404).send({ message: "Circuit not found" });
    }

    return {
      circuit,
      endpoints: (await listCircuitEndpointsFromDb(code)) ?? []
    };
  });

  app.post("/circuits", { preHandler: requirePermission("circuits.write") }, async (request, reply) => {
    const parsed = createCircuitSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid circuit payload", issues: parsed.error.issues });
    }

    const circuit = await createCircuitInDb(parsed.data);

    if (!circuit) {
      return reply.code(503).send({ message: "PostgreSQL is required and referenced provider/contract must exist if provided" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "circuit.created",
      objectType: "circuit",
      objectId: circuit.id,
      afterData: circuit,
      reason: parsed.data.reason ?? "Alta de circuito"
    });

    return reply.code(201).send({ circuit });
  });

  app.patch("/circuits/:code", { preHandler: requirePermission("circuits.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = updateCircuitSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid circuit payload", issues: parsed.error.issues });
    }

    const before = await getCircuitFromDb(code);
    const circuit = await updateCircuitInDb({ codeOrId: code, ...parsed.data });

    if (!circuit) {
      return reply.code(409).send({ message: "Circuit not found, references invalid, or PostgreSQL unavailable" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "circuit.updated",
      objectType: "circuit",
      objectId: circuit.id,
      beforeData: before,
      afterData: circuit,
      reason: parsed.data.reason ?? "Actualizacion de circuito"
    });

    return { circuit };
  });

  app.patch("/circuits/:code/status", { preHandler: requirePermission("circuits.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = updateCircuitStatusSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid circuit status payload", issues: parsed.error.issues });
    }

    const before = await getCircuitFromDb(code);
    const circuit = await updateCircuitStatusInDb(code, parsed.data.status);

    if (!circuit) {
      return reply.code(404).send({ message: "Circuit not found or PostgreSQL unavailable" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "circuit.status_updated",
      objectType: "circuit",
      objectId: circuit.id,
      beforeData: before,
      afterData: circuit,
      reason: parsed.data.reason ?? "Actualizacion de estado de circuito"
    });

    return { circuit };
  });

  app.delete("/circuits/:code", { preHandler: requirePermission("circuits.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const before = await getCircuitFromDb(code);

    if (!before) {
      return reply.code(404).send({ message: "Circuit not found" });
    }

    const deleted = await deleteCircuitInDb(code);

    if (!deleted) {
      return reply.code(409).send({
        message: "Circuit has dependencies. Remove circuit/service endpoints, transport links, fiber strands, patchcords, documents, evidence and incident impacts first."
      });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "circuit.deleted",
      objectType: "circuit",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion controlada de circuito"
    });

    return { deleted };
  });

  app.get("/circuits/:code/endpoints", async (request, reply) => {
    const { code } = request.params as { code: string };
    const endpoints = await listCircuitEndpointsFromDb(code);

    if (!endpoints) {
      return reply.code(503).send({ message: "PostgreSQL is required to list circuit endpoints" });
    }

    return { endpoints };
  });

  app.get("/circuits/:code/impact", async (request, reply) => {
    const { code } = request.params as { code: string };
    const impact = await getCircuitImpactFromDb(code);

    if (!impact) {
      const circuit = circuits.find((item) => item.code === code || item.id === code);

      if (!circuit) {
        return reply.code(404).send({ message: "Circuit not found" });
      }

      return {
        impact: {
          circuitCode: circuit.code,
          sites: [circuit.aSite, circuit.zSite],
          devices: [],
          interfaces: [],
          risk: circuit.status === "down" ? "active_outage" : "documented_dependency"
        }
      };
    }

    return { impact };
  });

  app.post("/circuits/:code/endpoints", { preHandler: requirePermission("circuits.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const body = request.body && typeof request.body === "object" ? { ...(request.body as object), circuitCode: code } : { circuitCode: code };
    const parsed = createEndpointSchema.safeParse(body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid circuit endpoint payload", issues: parsed.error.issues });
    }

    const endpoint = await createCircuitEndpointInDb(parsed.data);

    if (!endpoint) {
      return reply.code(503).send({ message: "PostgreSQL is required and referenced circuit/site/device/interface must exist" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "circuit_endpoint.created",
      objectType: "circuit_endpoint",
      objectId: endpoint.id,
      afterData: endpoint,
      reason: parsed.data.reason ?? "Alta de extremo de circuito"
    });

    return reply.code(201).send({ endpoint });
  });

  app.patch("/circuits/:code/endpoints/:id", { preHandler: requirePermission("circuits.write") }, async (request, reply) => {
    const { code, id } = request.params as { code: string; id: string };
    const body = request.body && typeof request.body === "object" ? { ...(request.body as object), circuitCode: code } : { circuitCode: code };
    const parsed = updateEndpointSchema.safeParse(body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid circuit endpoint payload", issues: parsed.error.issues });
    }

    const before = await getCircuitEndpointFromDb(id);
    const endpoint = await updateCircuitEndpointInDb({ id, ...parsed.data });

    if (!endpoint) {
      return reply.code(409).send({ message: "Endpoint not found, references invalid, or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "circuit_endpoint.updated",
      objectType: "circuit_endpoint",
      objectId: endpoint.id,
      beforeData: before,
      afterData: endpoint,
      reason: parsed.data.reason ?? "Actualizacion de extremo de circuito"
    });

    return { endpoint };
  });

  app.delete("/circuits/:code/endpoints/:id", { preHandler: requirePermission("circuits.write") }, async (request, reply) => {
    const { id } = request.params as { code: string; id: string };
    const before = await getCircuitEndpointFromDb(id);

    if (!before) {
      return reply.code(404).send({ message: "Endpoint not found or PostgreSQL unavailable" });
    }

    const deleted = await deleteCircuitEndpointInDb(id);

    if (!deleted) {
      return reply.code(404).send({ message: "Endpoint not found or PostgreSQL unavailable" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "circuit_endpoint.deleted",
      objectType: "circuit_endpoint",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion controlada de extremo de circuito"
    });

    return { deleted };
  });
}
