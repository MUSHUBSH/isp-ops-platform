import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import { ipAssignments, prefixes } from "../../shared/demo-data.js";
import {
  createIpInDb,
  createPrefixInDb,
  createVlanInDb,
  deleteIpInDb,
  deletePrefixInDb,
  deleteVlanInDb,
  listIpAssignmentsFromDb,
  listPrefixesFromDb,
  listVlansFromDb,
  updateIpInDb,
  updatePrefixInDb,
  updateVlanInDb
} from "./repository.js";

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
  deviceName: z.string().max(120).nullable().optional(),
  interfaceName: z.string().max(120).nullable().optional(),
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

const createVlanSchema = z.object({
  siteCode: z.string().max(32).nullable().optional(),
  vlanId: z.coerce.number().int().min(1).max(4094),
  name: z.string().min(2).max(120),
  purpose: z.string().max(500).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateVlanSchema = createVlanSchema.omit({ reason: true }).extend({
  reason: z.string().max(500).nullable().optional()
});

const importVlansSchema = z.object({
  vlans: z.array(createVlanSchema).min(1).max(1000),
  reason: z.string().max(500).nullable().optional()
});

const importIpsSchema = z.object({
  addresses: z.array(createIpSchema).min(1).max(2000),
  reason: z.string().max(500).nullable().optional()
});

export async function registerIpamRoutes(app: FastifyInstance) {
  app.get("/ipam/prefixes", async () => ({
    prefixes: (await listPrefixesFromDb()) ?? prefixes
  }));

  app.get("/ipam/addresses", async () => ({
    addresses: (await listIpAssignmentsFromDb()) ?? ipAssignments
  }));

  app.get("/ipam/vlans", async () => ({
    vlans: (await listVlansFromDb()) ?? []
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

  app.post("/ipam/addresses/import", { preHandler: requirePermission("ipam.write") }, async (request, reply) => {
    const parsed = importIpsSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid IP import payload", issues: parsed.error.issues });
    }

    const created = [];
    const errors: Array<{ row: number; label: string; message: string }> = [];

    for (const [index, input] of parsed.data.addresses.entries()) {
      try {
        const address = await createIpInDb(input);
        if (!address) {
          errors.push({ row: index + 1, label: input.address, message: "Prefix, interface reference or PostgreSQL unavailable" });
          continue;
        }

        await recordAuditEvent({
          actorId: actorId(request),
          action: "ip.imported",
          objectType: "ip_address",
          objectId: address.id,
          afterData: address,
          reason: input.reason ?? parsed.data.reason ?? "Importacion masiva de IPs"
        });
        created.push(address);
      } catch (error) {
        errors.push({ row: index + 1, label: input.address, message: error instanceof Error ? error.message : "Unknown import error" });
      }
    }

    return reply.code(errors.length > 0 ? 207 : 201).send({
      summary: { requested: parsed.data.addresses.length, created: created.length, failed: errors.length },
      addresses: created,
      errors
    });
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

  app.post("/ipam/vlans", { preHandler: requirePermission("ipam.write") }, async (request, reply) => {
    const parsed = createVlanSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid VLAN payload", issues: parsed.error.issues });
    }

    const vlan = await createVlanInDb(parsed.data);

    if (!vlan) {
      return reply.code(503).send({ message: "PostgreSQL is required and referenced site must exist to create VLANs" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "vlan.created",
      objectType: "vlan",
      objectId: vlan.id,
      afterData: vlan,
      reason: parsed.data.reason ?? "Alta de VLAN"
    });

    return reply.code(201).send({ vlan });
  });

  app.post("/ipam/vlans/import", { preHandler: requirePermission("ipam.write") }, async (request, reply) => {
    const parsed = importVlansSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid VLAN import payload", issues: parsed.error.issues });
    }

    const created = [];
    const errors: Array<{ row: number; label: string; message: string }> = [];

    for (const [index, input] of parsed.data.vlans.entries()) {
      try {
        const vlan = await createVlanInDb(input);
        if (!vlan) {
          errors.push({ row: index + 1, label: `${input.siteCode ?? "GLOBAL"} VLAN ${input.vlanId}`, message: "Referenced site invalid or PostgreSQL unavailable" });
          continue;
        }

        await recordAuditEvent({
          actorId: actorId(request),
          action: "vlan.imported",
          objectType: "vlan",
          objectId: vlan.id,
          afterData: vlan,
          reason: input.reason ?? parsed.data.reason ?? "Importacion masiva de VLANs"
        });
        created.push(vlan);
      } catch (error) {
        errors.push({ row: index + 1, label: `${input.siteCode ?? "GLOBAL"} VLAN ${input.vlanId}`, message: error instanceof Error ? error.message : "Unknown import error" });
      }
    }

    return reply.code(errors.length > 0 ? 207 : 201).send({
      summary: { requested: parsed.data.vlans.length, created: created.length, failed: errors.length },
      vlans: created,
      errors
    });
  });

  app.patch("/ipam/vlans/:id", { preHandler: requirePermission("ipam.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateVlanSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid VLAN update payload", issues: parsed.error.issues });
    }

    const before = ((await listVlansFromDb()) ?? []).find((item) => item.id === id) ?? null;
    const vlan = await updateVlanInDb({ id, ...parsed.data });

    if (!vlan) {
      return reply.code(404).send({ message: "VLAN not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "vlan.updated",
      objectType: "vlan",
      objectId: vlan.id,
      beforeData: before,
      afterData: vlan,
      reason: parsed.data.reason ?? "Actualizacion de VLAN"
    });

    return { vlan };
  });

  app.delete("/ipam/vlans/:id", { preHandler: requirePermission("ipam.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = ((await listVlansFromDb()) ?? []).find((item) => item.id === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "VLAN not found" });
    }

    const deleted = await deleteVlanInDb(id);

    if (!deleted) {
      return reply.code(409).send({ message: "VLAN has assigned interfaces or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "vlan.deleted",
      objectType: "vlan",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion controlada de VLAN"
    });

    return { deleted };
  });
}
