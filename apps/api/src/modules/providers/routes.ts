import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import { contracts, providers } from "../../shared/demo-data.js";
import { createContractInDb, createProviderInDb, deleteContractInDb, deleteProviderInDb, getProviderFromDb, listContractsByProviderFromDb, listContractsFromDb, listProvidersFromDb, updateContractInDb, updateContractStatusInDb, updateProviderInDb, updateProviderStatusInDb } from "./repository.js";

const createProviderSchema = z.object({
  code: z.string().min(2).max(32).toUpperCase(),
  name: z.string().min(2).max(160),
  providerType: z.string().min(2).max(50),
  status: z.string().min(2).max(40).optional(),
  nocEmail: z.string().email().nullable().optional(),
  nocPhone: z.string().max(60).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const createContractSchema = z.object({
  providerCode: z.string().min(2).max(32).toUpperCase(),
  code: z.string().min(2).max(80).toUpperCase(),
  name: z.string().min(2).max(160),
  status: z.string().min(2).max(40).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  currency: z.string().min(3).max(3).nullable().optional(),
  monthlyCost: z.coerce.number().nullable().optional(),
  slaTarget: z.coerce.number().nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateContractStatusSchema = z.object({
  status: z.string().min(2).max(40),
  reason: z.string().max(500).nullable().optional()
});

const updateProviderSchema = createProviderSchema.partial().omit({ reason: true }).extend({
  reason: z.string().max(500).nullable().optional()
});

const updateContractSchema = createContractSchema.partial().omit({ reason: true }).extend({
  reason: z.string().max(500).nullable().optional()
});

const updateProviderStatusSchema = z.object({
  status: z.string().min(2).max(40),
  reason: z.string().max(500).nullable().optional()
});

export async function registerProviderRoutes(app: FastifyInstance) {
  app.get("/providers", async () => ({
    providers: (await listProvidersFromDb()) ?? providers
  }));

  app.get("/providers/contracts", async () => ({
    contracts: (await listContractsFromDb()) ?? contracts
  }));

  app.get("/providers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const provider = (await getProviderFromDb(id)) ?? providers.find((item) => item.id === id || item.code === id);

    if (!provider) {
      return reply.code(404).send({ message: "Provider not found" });
    }

    return {
      provider,
      contracts: (await listContractsByProviderFromDb(provider.code)) ?? contracts.filter((contract) => contract.providerCode === provider.code)
    };
  });

  app.post("/providers", { preHandler: requirePermission("providers.write") }, async (request, reply) => {
    const parsed = createProviderSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid provider payload", issues: parsed.error.issues });
    }

    const provider = await createProviderInDb(parsed.data);

    if (!provider) {
      return reply.code(503).send({ message: "PostgreSQL is required to create providers" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "provider.created",
      objectType: "provider",
      objectId: provider.id,
      afterData: provider,
      reason: parsed.data.reason ?? "Alta de proveedor"
    });

    return reply.code(201).send({ provider });
  });

  app.patch("/providers/:id", { preHandler: requirePermission("providers.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateProviderSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid provider payload", issues: parsed.error.issues });
    }

    const provider = await updateProviderInDb({ id, ...parsed.data });

    if (!provider) {
      return reply.code(409).send({ message: "Provider not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "provider.updated",
      objectType: "provider",
      objectId: provider.id,
      afterData: provider,
      reason: parsed.data.reason ?? "Actualizacion de proveedor"
    });

    return { provider };
  });

  app.patch("/providers/:id/status", { preHandler: requirePermission("providers.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateProviderStatusSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid provider status payload", issues: parsed.error.issues });
    }

    const provider = await updateProviderStatusInDb(id, parsed.data.status);

    if (!provider) {
      return reply.code(409).send({ message: "Provider not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "provider.status_updated",
      objectType: "provider",
      objectId: provider.id,
      afterData: provider,
      reason: parsed.data.reason ?? "Actualizacion de estado de proveedor"
    });

    return { provider };
  });

  app.delete("/providers/:id", { preHandler: requirePermission("providers.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = (await getProviderFromDb(id)) ?? providers.find((provider) => provider.id === id || provider.code === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Provider not found" });
    }

    const deleted = await deleteProviderInDb(id);

    if (!deleted) {
      return reply.code(409).send({ message: "Provider not found, has dependencies, or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "provider.deleted",
      objectType: "provider",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion segura de proveedor"
    });

    return { deleted };
  });

  app.post("/providers/contracts", { preHandler: requirePermission("providers.write") }, async (request, reply) => {
    const parsed = createContractSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid contract payload", issues: parsed.error.issues });
    }

    const contract = await createContractInDb(parsed.data);

    if (!contract) {
      return reply.code(503).send({ message: "PostgreSQL is required to create contracts" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "contract.created",
      objectType: "contract",
      objectId: contract.id,
      afterData: contract,
      reason: parsed.data.reason ?? "Alta de contrato"
    });

    return reply.code(201).send({ contract });
  });

  app.patch("/providers/contracts/:id", { preHandler: requirePermission("providers.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateContractSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid contract payload", issues: parsed.error.issues });
    }

    const contract = await updateContractInDb({ id, ...parsed.data });

    if (!contract) {
      return reply.code(409).send({ message: "Contract not found, provider not found, or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "contract.updated",
      objectType: "contract",
      objectId: contract.id,
      afterData: contract,
      reason: parsed.data.reason ?? "Actualizacion de contrato"
    });

    return { contract };
  });

  app.patch("/providers/contracts/:id/status", { preHandler: requirePermission("providers.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateContractStatusSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid contract status payload", issues: parsed.error.issues });
    }

    const contract = await updateContractStatusInDb(id, parsed.data.status);

    if (!contract) {
      return reply.code(409).send({ message: "Contract not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "contract.status_updated",
      objectType: "contract",
      objectId: contract.id,
      afterData: contract,
      reason: parsed.data.reason ?? "Actualizacion de estado de contrato"
    });

    return { contract };
  });

  app.delete("/providers/contracts/:id", { preHandler: requirePermission("providers.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = ((await listContractsFromDb()) ?? contracts).find((contract) => contract.id === id || contract.code === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Contract not found" });
    }

    const deleted = await deleteContractInDb(id);

    if (!deleted) {
      return reply.code(409).send({ message: "Contract not found, has dependencies, or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "contract.deleted",
      objectType: "contract",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion segura de contrato"
    });

    return { deleted };
  });
}
