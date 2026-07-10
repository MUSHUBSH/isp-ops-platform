import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import {
  datacenterAssets,
  fiberSpans,
  fiberStrands,
  patchcords,
  providerCapacities,
  transceivers
} from "../../shared/demo-data.js";
import {
  createDatacenterAssetInDb,
  createFiberSpanInDb,
  createFiberStrandInDb,
  createPatchcordInDb,
  createProviderCapacityInDb,
  createTransceiverInDb,
  deletePhysicalRecordInDb,
  listDatacenterAssetsFromDb,
  listFiberSpansFromDb,
  listFiberStrandsFromDb,
  listPatchcordsFromDb,
  listProviderCapacitiesFromDb,
  listTransceiversFromDb,
  resolvePhysicalKind,
  updateFiberSpanInDb,
  updateProviderCapacityInDb,
  updatePhysicalStatusInDb
} from "./repository.js";

const nullableString = z.string().trim().min(1).nullable().optional();
const nullableNumber = z.coerce.number().nullable().optional();

const providerCapacitySchema = z.object({
  providerCode: z.string().trim().min(2).max(32).toUpperCase(),
  contractCode: nullableString,
  serviceType: z.string().trim().min(2).max(80),
  committedMbps: z.coerce.number().int().positive(),
  burstableMbps: nullableNumber,
  deliveredMbps: z.coerce.number().int().positive(),
  usedMbps: nullableNumber,
  billingMode: z.string().trim().min(2).max(80),
  status: z.string().trim().min(2).max(40).optional(),
  reason: nullableString
});

const updateProviderCapacitySchema = providerCapacitySchema.partial().omit({ reason: true }).extend({
  reason: nullableString
});

const fiberSpanSchema = z.object({
  code: z.string().trim().min(3).max(80).toUpperCase(),
  aSite: z.string().trim().min(2).max(32).toUpperCase(),
  zSite: z.string().trim().min(2).max(32).toUpperCase(),
  providerCode: nullableString,
  cableType: z.string().trim().min(2).max(80),
  fiberCount: z.coerce.number().int().positive(),
  usedFibers: nullableNumber,
  distanceKm: nullableNumber,
  status: z.string().trim().min(2).max(40).optional(),
  notes: nullableString,
  reason: nullableString
});

const updateFiberSpanSchema = fiberSpanSchema.partial().omit({ reason: true }).extend({
  reason: nullableString
});

const fiberStrandSchema = z.object({
  spanCode: z.string().trim().min(3).max(80).toUpperCase(),
  circuitCode: nullableString,
  strandNumber: z.coerce.number().int().positive(),
  tubeColor: nullableString,
  fiberColor: nullableString,
  status: z.string().trim().min(2).max(40).optional(),
  service: nullableString,
  aTermination: nullableString,
  zTermination: nullableString,
  reason: nullableString
});

const transceiverSchema = z.object({
  deviceName: z.string().trim().min(2).max(120),
  interfaceName: z.string().trim().min(1).max(80),
  vendor: z.string().trim().min(2).max(80),
  partNumber: z.string().trim().min(2).max(120),
  serialNumber: nullableString,
  formFactor: z.string().trim().min(2).max(40),
  speedMbps: z.coerce.number().int().positive(),
  wavelengthNm: nullableNumber,
  reachKm: nullableNumber,
  connectorType: z.string().trim().min(2).max(40),
  fiberMode: z.string().trim().min(1).max(40),
  txPowerDbm: nullableNumber,
  rxPowerDbm: nullableNumber,
  status: z.string().trim().min(2).max(40).optional(),
  reason: nullableString
});

const patchcordSchema = z.object({
  code: z.string().trim().min(3).max(80).toUpperCase(),
  aDeviceName: nullableString,
  aInterfaceName: nullableString,
  zDeviceName: nullableString,
  zInterfaceName: nullableString,
  circuitCode: nullableString,
  aEndpoint: z.string().trim().min(2).max(160),
  zEndpoint: z.string().trim().min(2).max(160),
  mediaType: z.string().trim().min(2).max(40),
  connectorA: z.string().trim().min(2).max(40),
  connectorZ: z.string().trim().min(2).max(40),
  lengthMeters: nullableNumber,
  fiberMode: nullableString,
  color: nullableString,
  status: z.string().trim().min(2).max(40).optional(),
  reason: nullableString
});

const datacenterAssetSchema = z.object({
  siteCode: z.string().trim().min(2).max(32).toUpperCase(),
  rackCode: nullableString,
  name: z.string().trim().min(2).max(120),
  assetType: z.string().trim().min(2).max(80),
  status: z.string().trim().min(2).max(40).optional(),
  units: nullableNumber,
  ports: nullableNumber,
  notes: nullableString,
  reason: nullableString
});

const statusSchema = z.object({
  status: z.string().trim().min(2).max(40),
  reason: nullableString
});

function invalid(reply: FastifyReply, issues: unknown) {
  return reply.code(400).send({ message: "Invalid physical payload", issues });
}

async function auditCreated(request: FastifyRequest, action: string, objectType: string, object: { id: string }, afterData: unknown, reason?: string | null) {
  await recordAuditEvent({
    actorId: actorId(request),
    action,
    objectType,
    objectId: object.id,
    afterData,
    reason: reason ?? `Alta ${objectType}`
  });
}

async function auditMutation(request: FastifyRequest, action: string, objectType: string, objectId: string, afterData?: unknown, reason?: string | null) {
  await recordAuditEvent({
    actorId: actorId(request),
    action,
    objectType,
    objectId,
    afterData,
    reason: reason ?? action
  });
}

export async function registerPhysicalRoutes(app: FastifyInstance) {
  app.get("/physical/provider-capacities", async () => ({
    capacities: (await listProviderCapacitiesFromDb()) ?? providerCapacities
  }));

  app.get("/physical/fiber-spans", async () => ({
    spans: (await listFiberSpansFromDb()) ?? fiberSpans
  }));

  app.get("/physical/fiber-strands", async () => ({
    strands: (await listFiberStrandsFromDb()) ?? fiberStrands
  }));

  app.get("/physical/transceivers", async () => ({
    transceivers: (await listTransceiversFromDb()) ?? transceivers
  }));

  app.get("/physical/patchcords", async () => ({
    patchcords: (await listPatchcordsFromDb()) ?? patchcords
  }));

  app.get("/physical/datacenter-assets", async () => ({
    assets: (await listDatacenterAssetsFromDb()) ?? datacenterAssets
  }));

  app.post("/physical/provider-capacities", { preHandler: requirePermission("physical.write") }, async (request, reply) => {
    const parsed = providerCapacitySchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    const capacity = await createProviderCapacityInDb(parsed.data);
    if (!capacity) return reply.code(503).send({ message: "PostgreSQL is required to create provider capacities" });
    await auditCreated(request, "physical.provider_capacity.created", "provider_capacity", capacity, capacity, parsed.data.reason);
    return reply.code(201).send({ capacity });
  });

  app.patch("/physical/provider-capacities/:id", { preHandler: requirePermission("physical.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateProviderCapacitySchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);

    const capacity = await updateProviderCapacityInDb({ id, ...parsed.data });
    if (!capacity) return reply.code(409).send({ message: "Capacity not found, provider/contract invalid, or PostgreSQL is required" });

    await auditMutation(request, "physical.provider_capacity.updated", "provider_capacity", capacity.id, capacity, parsed.data.reason);
    return { capacity };
  });

  app.post("/physical/fiber-spans", { preHandler: requirePermission("physical.write") }, async (request, reply) => {
    const parsed = fiberSpanSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    const span = await createFiberSpanInDb(parsed.data);
    if (!span) return reply.code(503).send({ message: "PostgreSQL is required to create fiber spans" });
    await auditCreated(request, "physical.fiber_span.created", "fiber_span", span, span, parsed.data.reason);
    return reply.code(201).send({ span });
  });

  app.patch("/physical/fiber-spans/:id", { preHandler: requirePermission("physical.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateFiberSpanSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);

    const span = await updateFiberSpanInDb({ id, ...parsed.data });
    if (!span) return reply.code(409).send({ message: "Fiber span not found, references invalid, or PostgreSQL is required" });

    await auditMutation(request, "physical.fiber_span.updated", "fiber_span", span.id, span, parsed.data.reason);
    return { span };
  });

  app.post("/physical/fiber-strands", { preHandler: requirePermission("physical.write") }, async (request, reply) => {
    const parsed = fiberStrandSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    const strand = await createFiberStrandInDb(parsed.data);
    if (!strand) return reply.code(503).send({ message: "PostgreSQL is required to create fiber strands" });
    await auditCreated(request, "physical.fiber_strand.created", "fiber_strand", strand, strand, parsed.data.reason);
    return reply.code(201).send({ strand });
  });

  app.post("/physical/transceivers", { preHandler: requirePermission("physical.write") }, async (request, reply) => {
    const parsed = transceiverSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    const transceiver = await createTransceiverInDb(parsed.data);
    if (!transceiver) return reply.code(503).send({ message: "PostgreSQL is required to create transceivers" });
    await auditCreated(request, "physical.transceiver.created", "transceiver", transceiver, transceiver, parsed.data.reason);
    return reply.code(201).send({ transceiver });
  });

  app.post("/physical/patchcords", { preHandler: requirePermission("physical.write") }, async (request, reply) => {
    const parsed = patchcordSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    const patchcord = await createPatchcordInDb(parsed.data);
    if (!patchcord) return reply.code(503).send({ message: "PostgreSQL is required to create patchcords" });
    await auditCreated(request, "physical.patchcord.created", "patchcord", patchcord, patchcord, parsed.data.reason);
    return reply.code(201).send({ patchcord });
  });

  app.post("/physical/datacenter-assets", { preHandler: requirePermission("physical.write") }, async (request, reply) => {
    const parsed = datacenterAssetSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);
    const asset = await createDatacenterAssetInDb(parsed.data);
    if (!asset) return reply.code(503).send({ message: "PostgreSQL is required to create datacenter assets" });
    await auditCreated(request, "physical.datacenter_asset.created", "datacenter_asset", asset, asset, parsed.data.reason);
    return reply.code(201).send({ asset });
  });

  app.patch("/physical/:kind/:id/status", { preHandler: requirePermission("physical.write") }, async (request, reply) => {
    const { kind, id } = request.params as { kind: string; id: string };
    const config = resolvePhysicalKind(kind);

    if (!config) {
      return reply.code(404).send({ message: "Physical entity not found" });
    }

    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.issues);

    const updated = await updatePhysicalStatusInDb(kind as never, id, parsed.data.status);
    if (!updated) return reply.code(409).send({ message: "Record not found or PostgreSQL is required" });

    await auditMutation(request, `physical.${config.objectType}.status_updated`, config.objectType, updated.id, updated, parsed.data.reason);
    return { updated };
  });

  app.delete("/physical/:kind/:id", { preHandler: requirePermission("physical.write") }, async (request, reply) => {
    const { kind, id } = request.params as { kind: string; id: string };
    const config = resolvePhysicalKind(kind);

    if (!config) {
      return reply.code(404).send({ message: "Physical entity not found" });
    }

    const deleted = await deletePhysicalRecordInDb(kind as never, id);
    if (!deleted) {
      return reply.code(409).send({ message: "Record not found, has dependencies, or PostgreSQL is required" });
    }

    await auditMutation(request, `physical.${config.objectType}.deleted`, config.objectType, deleted.id, undefined, "Eliminacion desde modulo Datacenter");
    return { deleted };
  });
}
