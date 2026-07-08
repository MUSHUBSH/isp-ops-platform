import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import { ipAssignments, prefixes } from "../../shared/demo-data.js";
import { createIpInDb, createPrefixInDb, deleteIpInDb, deletePrefixInDb, listIpAssignmentsFromDb, listPrefixesFromDb, updateIpInDb, updatePrefixInDb } from "./repository.js";

const createPrefixSchema = z.object({
  prefix: z.string().min(3).max(64),
  family: z.union([z.literal(4), z.literal(6)]),
  role: z.string().min(2).max(80),
  status: z.string().min(2).max(40).optional(),
  siteCode: z.string().max(32).nullable().optional(),
  vrf: z.string().max(64).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const createIpSchema = z.object({
  address: z.string().min(3).max(64),
  prefix: z.string().min(3).max(64),
  role: z.string().min(2).max(80),
  status: z.string().min(2).max(40).optional(),
  interfaceId: z.string().uuid().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateIpSchema = createIpSchema
  .omit({ address: true, prefix: true, reason: true })
  .partial()
  .extend({
    reason: z.string().max(500).nullable().optional()
  });

const updatePrefixSchema = z.object({
  role: z.string().min(2).max(80),
  status: z.string().min(2).max(40),
  siteCode: z.string().max(32).nullable().optional(),
  vrf: z.string().max(64).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

export async function registerIpamRoutes(app: FastifyInstance) {
  app.get("/ipam/prefixes", async () => ({
    prefixes: (await listPrefixesFromDb()) ?? prefixes
  }));

  app.get("/ipam/addresses", async () => ({
    addresses: (await listIpAssignmentsFromDb()) ?? ipAssignments
  }));

  app.get("/ipam/debt", async () => {
    const dbIps = await listIpAssignmentsFromDb();
    const dbPrefixes = await listPrefixesFromDb();
    const effectiveIps = dbIps ?? ipAssignments;
    const effectivePrefixes = dbPrefixes ?? prefixes;

    return {
      undocumentedIps: effectiveIps.filter((item) => item.status === "undocumented" || !item.device || !item.interface),
      prefixesNearExhaustion: effectivePrefixes.filter((item) => item.utilization >= 80)
    };
  });

  app.post("/ipam/prefixes", { preHandler: requirePermission("ipam.write") }, async (request, reply) => {
    const parsed = createPrefixSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid prefix payload", issues: parsed.error.issues });
    }

    const prefix = await createPrefixInDb(parsed.data);

    if (!prefix) {
      return reply.code(503).send({ message: "PostgreSQL is required to create prefixes" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "prefix.created",
      objectType: "prefix",
      objectId: prefix.id,
      afterData: prefix,
      reason: parsed.data.reason ?? "Alta de prefijo"
    });

    return reply.code(201).send({ prefix });
  });

  app.patch("/ipam/prefixes/:id", { preHandler: requirePermission("ipam.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updatePrefixSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid prefix update payload", issues: parsed.error.issues });
    }

    const before = ((await listPrefixesFromDb()) ?? prefixes).find((item) => item.id === id || item.prefix === id) ?? null;
    const prefix = await updatePrefixInDb({
      id,
      role: parsed.data.role,
      status: parsed.data.status,
      siteCode: parsed.data.siteCode,
      vrf: parsed.data.vrf,
      description: parsed.data.description
    });

    if (!prefix) {
      return reply.code(404).send({ message: "Prefix not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "prefix.updated",
      objectType: "prefix",
      objectId: prefix.id,
      beforeData: before,
      afterData: prefix,
      reason: parsed.data.reason ?? "Actualizacion de prefijo"
    });

    return { prefix };
  });

  app.delete("/ipam/prefixes/:id", { preHandler: requirePermission("ipam.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = ((await listPrefixesFromDb()) ?? prefixes).find((item) => item.id === id || item.prefix === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Prefix not found" });
    }

    const deleted = await deletePrefixInDb(id);

    if (!deleted) {
      return reply.code(409).send({
        message: "Prefix has dependencies. Remove child prefixes, IP addresses, documents, evidence and incident impacts first."
      });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "prefix.deleted",
      objectType: "prefix",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion controlada de prefijo"
    });

    return { deleted };
  });

  app.post("/ipam/addresses", { preHandler: requirePermission("ipam.write") }, async (request, reply) => {
    const parsed = createIpSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid IP payload", issues: parsed.error.issues });
    }

    const address = await createIpInDb(parsed.data);

    if (!address) {
      return reply.code(503).send({ message: "PostgreSQL is required and prefix must exist to create IP addresses" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "ip.created",
      objectType: "ip_address",
      objectId: address.id,
      afterData: address,
      reason: parsed.data.reason ?? "Alta de direccion IP"
    });

    return reply.code(201).send({ address });
  });

  app.patch("/ipam/addresses/:id", { preHandler: requirePermission("ipam.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateIpSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid IP update payload", issues: parsed.error.issues });
    }

    const before = ((await listIpAssignmentsFromDb()) ?? ipAssignments).find((item) => item.id === id || item.address === id) ?? null;
    const address = await updateIpInDb({ id, ...parsed.data });

    if (!address) {
      return reply.code(404).send({ message: "IP address not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "ip.updated",
      objectType: "ip_address",
      objectId: address.id,
      beforeData: before,
      afterData: address,
      reason: parsed.data.reason ?? "Actualizacion de direccion IP"
    });

    return { address };
  });

  app.delete("/ipam/addresses/:id", { preHandler: requirePermission("ipam.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = ((await listIpAssignmentsFromDb()) ?? ipAssignments).find((item) => item.id === id || item.address === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "IP address not found" });
    }

    const deleted = await deleteIpInDb(id);

    if (!deleted) {
      return reply.code(409).send({ message: "IP address has dependencies or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "ip.deleted",
      objectType: "ip_address",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion controlada de direccion IP"
    });

    return { deleted };
  });
}
