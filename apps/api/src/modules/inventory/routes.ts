import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import { devices, interfaceLinks, interfaces, powerAssets, powerFeeds, rackViews } from "../../shared/demo-data.js";
import {
  createDeviceInDb,
  createInterfaceInDb,
  createInterfaceLinkInDb,
  createPowerAssetInDb,
  createPowerFeedInDb,
  createRackInDb,
  deleteDeviceInDb,
  deleteInterfaceInDb,
  deleteInterfaceLinkInDb,
  deletePowerAssetInDb,
  deletePowerFeedInDb,
  deleteRackInDb,
  listDeviceModelsFromDb,
  listDeviceRolesFromDb,
  listDevicesFromDb,
  listInterfaceLinksFromDb,
  listInterfacesFromDb,
  listPowerAssetsBySiteFromDb,
  listPowerFeedsBySiteFromDb,
  listRacksBySiteFromDb,
  updateDeviceInDb,
  updateInterfaceInDb,
  updateInterfaceLinkInDb,
  updatePowerAssetInDb,
  updatePowerFeedInDb,
  updateRackInDb,
  updateDevicePlacementInDb,
  listManufacturersFromDb
} from "./repository.js";

const createDeviceSchema = z.object({
  siteCode: z.string().min(2).max(32).toUpperCase(),
  name: z.string().min(2).max(100),
  status: z.string().min(2).max(40).optional(),
  roleCode: z.string().max(60).nullable().optional(),
  modelId: z.string().uuid().nullable().optional(),
  managementIp: z.string().max(64).nullable().optional(),
  serialNumber: z.string().max(120).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateDeviceSchema = createDeviceSchema.partial().omit({ reason: true }).extend({
  reason: z.string().max(500).nullable().optional()
});

const createInterfaceSchema = z.object({
  deviceName: z.string().min(2).max(100),
  name: z.string().min(1).max(100),
  interfaceType: z.string().min(2).max(50),
  status: z.string().min(2).max(40).optional(),
  speedMbps: z.number().int().positive().nullable().optional(),
  macAddress: z.string().max(32).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateInterfaceSchema = createInterfaceSchema.omit({ deviceName: true, macAddress: true, reason: true }).partial().extend({
  reason: z.string().max(500).nullable().optional()
});

const createRackSchema = z.object({
  code: z.string().min(2).max(40).toUpperCase(),
  name: z.string().min(2).max(120),
  heightU: z.number().int().min(6).max(52).optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateRackSchema = createRackSchema.partial().omit({ reason: true }).extend({
  reason: z.string().max(500).nullable().optional()
});

const createPowerFeedSchema = z.object({
  name: z.string().min(2).max(80),
  feedType: z.string().min(2).max(40).optional(),
  status: z.string().min(2).max(40).optional(),
  capacityWatts: z.number().int().positive().nullable().optional(),
  loadWatts: z.number().int().nonnegative().nullable().optional(),
  source: z.string().max(200).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updatePowerFeedSchema = createPowerFeedSchema.partial().omit({ reason: true }).extend({
  reason: z.string().max(500).nullable().optional()
});

const createPowerAssetSchema = z.object({
  name: z.string().min(2).max(120),
  assetType: z.string().min(2).max(40),
  status: z.string().min(2).max(40).optional(),
  capacityWatts: z.number().int().positive().nullable().optional(),
  loadWatts: z.number().int().nonnegative().nullable().optional(),
  autonomyMinutes: z.number().int().nonnegative().nullable().optional(),
  batteryHealthPercent: z.number().int().min(0).max(100).nullable().optional(),
  sourceFeedId: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updatePowerAssetSchema = createPowerAssetSchema.partial().omit({ reason: true }).extend({
  reason: z.string().max(500).nullable().optional()
});

const updateDevicePlacementSchema = z.object({
  rackId: z.string().uuid(),
  positionU: z.number().int().min(1).max(52),
  heightU: z.number().int().min(1).max(12).default(1),
  powerFeedId: z.string().uuid().nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const createInterfaceLinkSchema = z.object({
  aInterfaceId: z.string().uuid(),
  bInterfaceId: z.string().uuid(),
  circuitCode: z.string().max(80).nullable().optional(),
  linkType: z.string().min(2).max(50),
  status: z.string().min(2).max(40).optional(),
  capacityMbps: z.number().int().positive().nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateInterfaceLinkSchema = createInterfaceLinkSchema
  .omit({ aInterfaceId: true, bInterfaceId: true, reason: true })
  .partial()
  .extend({
    reason: z.string().max(500).nullable().optional()
  });

export async function registerInventoryRoutes(app: FastifyInstance) {
  app.get("/inventory/manufacturers", async () => ({
    manufacturers: (await listManufacturersFromDb()) ?? []
  }));

  app.get("/inventory/device-models", async () => ({
    models: (await listDeviceModelsFromDb()) ?? []
  }));

  app.get("/inventory/device-roles", async () => ({
    roles: (await listDeviceRolesFromDb()) ?? []
  }));

  app.get("/sites/:code/racks", async (request) => {
    const { code } = request.params as { code: string };
    return { racks: (await listRacksBySiteFromDb(code)) ?? rackViews.filter((rack) => rack.siteCode === code) };
  });

  app.post("/sites/:code/racks", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = createRackSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid rack payload", issues: parsed.error.issues });
    }

    const rack = await createRackInDb({ siteCode: code, ...parsed.data });

    if (!rack) {
      return reply.code(503).send({ message: "PostgreSQL is required and referenced site must exist" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "rack.created",
      objectType: "rack",
      objectId: rack.id,
      afterData: rack,
      reason: parsed.data.reason ?? "Alta de rack"
    });

    return reply.code(201).send({ rack });
  });

  app.patch("/sites/:code/racks/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateRackSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid rack payload", issues: parsed.error.issues });
    }

    const rack = await updateRackInDb({ id, ...parsed.data });

    if (!rack) {
      return reply.code(404).send({ message: "Rack not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "rack.updated",
      objectType: "rack",
      objectId: rack.id,
      afterData: rack,
      reason: parsed.data.reason ?? "Actualizacion de rack"
    });

    return { rack };
  });

  app.delete("/sites/:code/racks/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { code, id } = request.params as { code: string; id: string };
    const before = ((await listRacksBySiteFromDb(code)) ?? rackViews.filter((rack) => rack.siteCode === code)).find((rack) => rack.id === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Rack not found" });
    }

    const deleted = await deleteRackInDb(id);

    if (!deleted) {
      return reply.code(409).send({ message: "Rack not found, has mounted devices, or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "rack.deleted",
      objectType: "rack",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion de rack"
    });

    return { deleted };
  });

  app.get("/sites/:code/power", async (request) => {
    const { code } = request.params as { code: string };
    return { feeds: (await listPowerFeedsBySiteFromDb(code)) ?? powerFeeds.filter((feed) => feed.siteCode === code) };
  });

  app.get("/sites/:code/power-assets", async (request) => {
    const { code } = request.params as { code: string };
    return { assets: (await listPowerAssetsBySiteFromDb(code)) ?? powerAssets.filter((asset) => asset.siteCode === code) };
  });

  app.post("/sites/:code/power-assets", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = createPowerAssetSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid power asset payload", issues: parsed.error.issues });
    }

    const asset = await createPowerAssetInDb({ siteCode: code, ...parsed.data });

    if (!asset) {
      return reply.code(503).send({ message: "PostgreSQL is required and referenced site/feed must exist" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "power_asset.created",
      objectType: "power_asset",
      objectId: asset.id,
      afterData: asset,
      reason: parsed.data.reason ?? "Alta de activo electrico"
    });

    return reply.code(201).send({ asset });
  });

  app.patch("/sites/:code/power-assets/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updatePowerAssetSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid power asset payload", issues: parsed.error.issues });
    }

    const asset = await updatePowerAssetInDb({ id, ...parsed.data });

    if (!asset) {
      return reply.code(404).send({ message: "Power asset not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "power_asset.updated",
      objectType: "power_asset",
      objectId: asset.id,
      afterData: asset,
      reason: parsed.data.reason ?? "Actualizacion de activo electrico"
    });

    return { asset };
  });

  app.delete("/sites/:code/power-assets/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { code, id } = request.params as { code: string; id: string };
    const before = ((await listPowerAssetsBySiteFromDb(code)) ?? powerAssets.filter((asset) => asset.siteCode === code)).find((asset) => asset.id === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Power asset not found" });
    }

    const deleted = await deletePowerAssetInDb(id);

    if (!deleted) {
      return reply.code(404).send({ message: "Power asset not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "power_asset.deleted",
      objectType: "power_asset",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion de activo electrico"
    });

    return { deleted };
  });

  app.post("/sites/:code/power-feeds", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = createPowerFeedSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid power feed payload", issues: parsed.error.issues });
    }

    const feed = await createPowerFeedInDb({ siteCode: code, ...parsed.data });

    if (!feed) {
      return reply.code(503).send({ message: "PostgreSQL is required and referenced site must exist" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "power_feed.created",
      objectType: "power_feed",
      objectId: feed.id,
      afterData: feed,
      reason: parsed.data.reason ?? "Alta de alimentacion electrica"
    });

    return reply.code(201).send({ feed });
  });

  app.patch("/sites/:code/power-feeds/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updatePowerFeedSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid power feed payload", issues: parsed.error.issues });
    }

    const feed = await updatePowerFeedInDb({ id, ...parsed.data });

    if (!feed) {
      return reply.code(404).send({ message: "Power feed not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "power_feed.updated",
      objectType: "power_feed",
      objectId: feed.id,
      afterData: feed,
      reason: parsed.data.reason ?? "Actualizacion de alimentacion electrica"
    });

    return { feed };
  });

  app.delete("/sites/:code/power-feeds/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { code, id } = request.params as { code: string; id: string };
    const before = ((await listPowerFeedsBySiteFromDb(code)) ?? powerFeeds.filter((feed) => feed.siteCode === code)).find((feed) => feed.id === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Power feed not found" });
    }

    const deleted = await deletePowerFeedInDb(id);

    if (!deleted) {
      return reply.code(409).send({ message: "Power feed not found, is assigned to devices, or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "power_feed.deleted",
      objectType: "power_feed",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion de alimentacion electrica"
    });

    return { deleted };
  });

  app.get("/inventory/devices", async () => ({
    devices: (await listDevicesFromDb()) ?? devices
  }));

  app.post("/inventory/devices", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const parsed = createDeviceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid device payload", issues: parsed.error.issues });
    }

    const device = await createDeviceInDb(parsed.data);

    if (!device) {
      return reply.code(503).send({ message: "PostgreSQL is required and referenced site/role/model must exist" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "device.created",
      objectType: "device",
      objectId: device.id,
      afterData: device,
      reason: parsed.data.reason ?? "Alta de equipo"
    });

    return reply.code(201).send({ device });
  });

  app.patch("/inventory/devices/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateDeviceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid device payload", issues: parsed.error.issues });
    }

    const device = await updateDeviceInDb({ id, ...parsed.data });

    if (!device) {
      return reply.code(404).send({ message: "Device not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "device.updated",
      objectType: "device",
      objectId: device.id,
      afterData: device,
      reason: parsed.data.reason ?? "Actualizacion de equipo"
    });

    return { device };
  });

  app.delete("/inventory/devices/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = ((await listDevicesFromDb()) ?? devices).find((device) => device.id === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Device not found" });
    }

    const deleted = await deleteDeviceInDb(id);

    if (!deleted) {
      return reply.code(409).send({ message: "Device not found, has interfaces/service endpoints/backups/docs/evidence/impacts, or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "device.deleted",
      objectType: "device",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion segura de equipo"
    });

    return { deleted };
  });

  app.patch("/inventory/devices/:id/placement", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateDevicePlacementSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid device placement payload", issues: parsed.error.issues });
    }

    const device = await updateDevicePlacementInDb({ id, ...parsed.data });

    if (!device) {
      return reply.code(409).send({ message: "Device/rack not found, RU overlap detected, invalid feed, or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "device.placement.updated",
      objectType: "device",
      objectId: device.id,
      afterData: { ...device, placement: parsed.data },
      reason: parsed.data.reason ?? "Asignacion fisica de equipo a rack"
    });

    return { device };
  });

  app.get("/inventory/interfaces", async () => ({
    interfaces: (await listInterfacesFromDb()) ?? interfaces
  }));

  app.post("/inventory/interfaces", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const parsed = createInterfaceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid interface payload", issues: parsed.error.issues });
    }

    const networkInterface = await createInterfaceInDb(parsed.data);

    if (!networkInterface) {
      return reply.code(503).send({ message: "PostgreSQL is required and referenced device must exist" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "interface.created",
      objectType: "interface",
      objectId: networkInterface.id,
      afterData: networkInterface,
      reason: parsed.data.reason ?? "Alta de interfaz"
    });

    return reply.code(201).send({ interface: networkInterface });
  });

  app.patch("/inventory/interfaces/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateInterfaceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid interface payload", issues: parsed.error.issues });
    }

    const networkInterface = await updateInterfaceInDb({ id, ...parsed.data });

    if (!networkInterface) {
      return reply.code(404).send({ message: "Interface not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "interface.updated",
      objectType: "interface",
      objectId: networkInterface.id,
      afterData: networkInterface,
      reason: parsed.data.reason ?? "Actualizacion de interfaz"
    });

    return { interface: networkInterface };
  });

  app.delete("/inventory/interfaces/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = ((await listInterfacesFromDb()) ?? interfaces).find((networkInterface) => networkInterface.id === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Interface not found" });
    }

    const deleted = await deleteInterfaceInDb(id);

    if (!deleted) {
      return reply.code(409).send({ message: "Interface not found, has IPs/links/circuit endpoints/service endpoints, or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "interface.deleted",
      objectType: "interface",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion segura de interfaz"
    });

    return { deleted };
  });

  app.get("/inventory/interface-links", async () => ({
    links: (await listInterfaceLinksFromDb()) ?? interfaceLinks
  }));

  app.post("/inventory/interface-links", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const parsed = createInterfaceLinkSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid interface link payload", issues: parsed.error.issues });
    }

    const link = await createInterfaceLinkInDb(parsed.data);

    if (!link) {
      return reply.code(503).send({ message: "PostgreSQL is required and referenced interfaces must exist" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "interface_link.created",
      objectType: "interface_link",
      objectId: link.id,
      afterData: link,
      reason: parsed.data.reason ?? "Alta de enlace entre interfaces"
    });

    return reply.code(201).send({ link });
  });

  app.patch("/inventory/interface-links/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateInterfaceLinkSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid interface link payload", issues: parsed.error.issues });
    }

    const link = await updateInterfaceLinkInDb({ id, ...parsed.data });

    if (!link) {
      return reply.code(404).send({ message: "Interface link not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "interface_link.updated",
      objectType: "interface_link",
      objectId: link.id,
      afterData: link,
      reason: parsed.data.reason ?? "Actualizacion de enlace entre interfaces"
    });

    return { link };
  });

  app.delete("/inventory/interface-links/:id", { preHandler: requirePermission("inventory.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = ((await listInterfaceLinksFromDb()) ?? interfaceLinks).find((link) => link.id === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Interface link not found" });
    }

    const deleted = await deleteInterfaceLinkInDb(id);

    if (!deleted) {
      return reply.code(404).send({ message: "Interface link not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "interface_link.deleted",
      objectType: "interface_link",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion de enlace entre interfaces"
    });

    return { deleted };
  });
}
