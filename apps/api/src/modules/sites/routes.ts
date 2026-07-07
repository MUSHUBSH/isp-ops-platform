import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import { circuits, devices, prefixes, siteMap, sites } from "../../shared/demo-data.js";
import {
  createSiteInDb,
  createSiteTransportLinkInDb,
  deleteSiteInDb,
  getSiteByCodeFromDb,
  getSiteDownstreamImpactFromDb,
  getSiteLocationFromDb,
  getSiteMapFromDb,
  listSiteCodesFromDb,
  listSitesFromDb,
  updateSiteInDb,
  updateSiteLocationInDb,
  upsertSiteInDb
} from "./repository.js";

const createSiteSchema = z.object({
  code: z.string().min(2).max(32).toUpperCase(),
  name: z.string().min(3).max(160),
  siteType: z.string().min(2).max(40),
  status: z.string().min(2).max(40).optional(),
  address: z.string().max(300).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateSiteLocationSchema = z.object({
  address: z.string().max(300).nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  reason: z.string().max(500).nullable().optional()
});

const updateSiteSchema = z.object({
  name: z.string().min(3).max(160),
  siteType: z.string().min(2).max(40),
  status: z.string().min(2).max(40),
  address: z.string().max(300).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const transportLinkBaseSchema = z.object({
  aSiteCode: z.string().min(2).max(32).toUpperCase(),
  zSiteCode: z.string().min(2).max(32).toUpperCase(),
  providerCode: z.string().min(2).max(32).toUpperCase().nullable().optional(),
  circuitCode: z.string().min(2).max(80).toUpperCase().nullable().optional(),
  linkType: z.string().min(2).max(40).default("transport"),
  status: z.string().min(2).max(40).optional(),
  capacityMbps: z.number().int().positive().nullable().optional(),
  label: z.string().max(160).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const createTransportLinkSchema = transportLinkBaseSchema.refine((value) => value.aSiteCode !== value.zSiteCode, {
  message: "aSiteCode and zSiteCode must be different",
  path: ["zSiteCode"]
});

const importSiteSchema = createSiteSchema.omit({ reason: true });
const importTransportLinkSchema = transportLinkBaseSchema.omit({ reason: true }).refine((value) => value.aSiteCode !== value.zSiteCode, {
  message: "aSiteCode and zSiteCode must be different",
  path: ["zSiteCode"]
});

const importMapSchema = z.object({
  preview: z.boolean().optional(),
  sites: z.array(importSiteSchema).max(500).default([]),
  links: z.array(importTransportLinkSchema).max(1000).default([]),
  reason: z.string().max(500).nullable().optional()
}).refine((value) => value.sites.length > 0 || value.links.length > 0, {
  message: "At least one site or link is required"
});

export async function registerSiteRoutes(app: FastifyInstance) {
  app.get("/sites", async () => ({
    sites: (await listSitesFromDb()) ?? sites
  }));

  app.get("/sites/map", async () => (await getSiteMapFromDb()) ?? siteMap);

  app.get("/sites/:code/downstream-impact", async (request, reply) => {
    const { code } = request.params as { code: string };
    const impactedSites = await getSiteDownstreamImpactFromDb(code);

    if (!impactedSites) {
      return reply.code(503).send({ message: "PostgreSQL is required for downstream impact" });
    }

    return {
      siteCode: code,
      impactedCount: impactedSites.length,
      impactedSites
    };
  });

  app.get("/sites/:code/operational-view", async (request, reply) => {
    const { code } = request.params as { code: string };
    const dbSite = await getSiteByCodeFromDb(code);
    const site = dbSite ?? sites.find((item) => item.code === code || item.id === code);

    if (!site) {
      return reply.code(404).send({ message: "Site not found" });
    }

    return {
      site,
      devices: devices.filter((device) => device.siteCode === site.code),
      prefixes: prefixes.filter((prefix) => prefix.siteCode === site.code),
      circuits: circuits.filter((circuit) => circuit.aSite === site.code || circuit.zSite === site.code)
    };
  });

  app.post("/sites", { preHandler: requirePermission("sites.write") }, async (request, reply) => {
    const parsed = createSiteSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid site payload", issues: parsed.error.issues });
    }

    const site = await createSiteInDb(parsed.data);

    if (!site) {
      return reply.code(503).send({ message: "PostgreSQL is required to create sites" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "site.created",
      objectType: "site",
      objectId: site.id,
      afterData: site,
      reason: parsed.data.reason ?? "Documentacion inicial de sede"
    });

    return reply.code(201).send({ site });
  });

  app.patch("/sites/:code", { preHandler: requirePermission("sites.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = updateSiteSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid site update payload", issues: parsed.error.issues });
    }

    const before = await getSiteByCodeFromDb(code);
    const site = await updateSiteInDb({
      code,
      name: parsed.data.name,
      siteType: parsed.data.siteType,
      status: parsed.data.status,
      address: parsed.data.address,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude
    });

    if (!site) {
      return reply.code(404).send({ message: "Site not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "site.updated",
      objectType: "site",
      objectId: site.id,
      beforeData: before,
      afterData: site,
      reason: parsed.data.reason ?? "Actualizacion operativa de sede"
    });

    return { site };
  });

  app.delete("/sites/:code", { preHandler: requirePermission("sites.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const before = await getSiteByCodeFromDb(code);

    if (!before) {
      return reply.code(404).send({ message: "Site not found" });
    }

    const deleted = await deleteSiteInDb(code);

    if (!deleted) {
      return reply.code(409).send({
        message: "Site has dependencies. Remove devices, racks, power, prefixes, circuit endpoints, transport links, documents, evidence and incident impacts first."
      });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "site.deleted",
      objectType: "site",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion controlada de sede"
    });

    return { deleted };
  });

  app.patch("/sites/:code/location", { preHandler: requirePermission("sites.write") }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = updateSiteLocationSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid site location payload", issues: parsed.error.issues });
    }

    const before = await getSiteLocationFromDb(code);
    const location = await updateSiteLocationInDb({
      code,
      address: parsed.data.address,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude
    });

    if (!location) {
      return reply.code(404).send({ message: "Site not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "site.location.updated",
      objectType: "site",
      objectId: location.id,
      beforeData: before,
      afterData: location,
      reason: parsed.data.reason ?? "Actualizacion de coordenadas de mapa"
    });

    return { location };
  });

  app.post("/sites/map/import", { preHandler: requirePermission("sites.write") }, async (request, reply) => {
    const parsed = importMapSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid map import payload", issues: parsed.error.issues });
    }

    const payload = parsed.data;

    if (payload.preview) {
      const existingCodes = new Set((await listSiteCodesFromDb()) ?? sites.map((site) => site.code));
      const importedCodes = new Set(payload.sites.map((site) => site.code));
      const missingLinkSites = Array.from(new Set(payload.links.flatMap((link) => [link.aSiteCode, link.zSiteCode])
        .filter((code) => !existingCodes.has(code) && !importedCodes.has(code))));

      return {
        preview: true,
        summary: {
          sites: payload.sites.length,
          links: payload.links.length,
          missingLinkSites: missingLinkSites.length
        },
        sites: payload.sites.map((site) => site.code),
        links: payload.links.map((link) => `${link.aSiteCode}<>${link.zSiteCode}`),
        missingLinkSites
      };
    }

    const importedSites = [];
    const importedLinks = [];
    const failedLinks = [];

    for (const siteInput of payload.sites) {
      const site = await upsertSiteInDb(siteInput);

      if (site) {
        importedSites.push(site);
        await recordAuditEvent({
          actorId: actorId(request),
          action: "site.imported",
          objectType: "site",
          objectId: site.id,
          afterData: site,
          reason: payload.reason ?? "Importacion masiva de mapa"
        });
      }
    }

    for (const linkInput of payload.links) {
      const link = await createSiteTransportLinkInDb(linkInput);

      if (!link) {
        failedLinks.push(linkInput);
        continue;
      }

      importedLinks.push(link);
      await recordAuditEvent({
        actorId: actorId(request),
        action: "site_transport_link.imported",
        objectType: "site_transport_link",
        objectId: link.id,
        afterData: link,
        reason: payload.reason ?? "Importacion masiva de mapa"
      });
    }

    return reply.code(failedLinks.length ? 207 : 201).send({
      summary: {
        sites: importedSites.length,
        links: importedLinks.length,
        failedLinks: failedLinks.length
      },
      sites: importedSites,
      links: importedLinks,
      failedLinks
    });
  });

  app.post("/sites/transport-links", { preHandler: requirePermission("sites.write") }, async (request, reply) => {
    const parsed = createTransportLinkSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid transport link payload", issues: parsed.error.issues });
    }

    const link = await createSiteTransportLinkInDb(parsed.data);

    if (!link) {
      return reply.code(404).send({ message: "Sites not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "site_transport_link.upserted",
      objectType: "site_transport_link",
      objectId: link.id,
      afterData: link,
      reason: parsed.data.reason ?? "Documentacion de transporte site-to-site"
    });

    return reply.code(201).send({ link });
  });
}
