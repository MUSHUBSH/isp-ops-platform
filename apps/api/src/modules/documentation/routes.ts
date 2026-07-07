import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../../shared/audit-service.js";
import { actorId, requirePermission } from "../../shared/auth.js";
import { documents, evidenceFiles } from "../../shared/demo-data.js";
import {
  createDocumentInDb,
  createEvidenceInDb,
  deleteDocumentInDb,
  deleteEvidenceInDb,
  getDocumentFromDb,
  getEvidenceFromDb,
  listDocumentsFromDb,
  listEvidenceFromDb,
  updateDocumentInDb,
  updateEvidenceInDb
} from "./repository.js";

const objectQuerySchema = z.object({
  objectType: z.string().max(80).optional(),
  objectId: z.string().max(80).optional()
});

const createDocumentSchema = z.object({
  objectType: z.string().min(2).max(80),
  objectId: z.string().uuid(),
  title: z.string().min(3).max(180),
  bodyMd: z.string().min(1).max(20_000),
  reason: z.string().max(500).nullable().optional()
});

const createEvidenceSchema = z.object({
  objectType: z.string().min(2).max(80),
  objectId: z.string().uuid(),
  filename: z.string().min(3).max(240),
  storageKey: z.string().min(3).max(500),
  contentType: z.string().max(120).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

const updateDocumentSchema = z.object({
  title: z.string().min(3).max(180),
  bodyMd: z.string().min(1).max(20_000),
  reason: z.string().max(500).nullable().optional()
});

const updateEvidenceSchema = z.object({
  filename: z.string().min(3).max(240),
  storageKey: z.string().min(3).max(500),
  contentType: z.string().max(120).nullable().optional(),
  reason: z.string().max(500).nullable().optional()
});

export async function registerDocumentationRoutes(app: FastifyInstance) {
  app.get("/documentation/documents", async (request) => {
    const query = objectQuerySchema.parse(request.query);
    const dbDocuments = await listDocumentsFromDb(query.objectType, query.objectId);

    return {
      documents: dbDocuments ?? documents.filter((item) => matchesObjectFilter(item, query.objectType, query.objectId))
    };
  });

  app.post("/documentation/documents", { preHandler: requirePermission("documentation.write") }, async (request, reply) => {
    const parsed = createDocumentSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid document payload", issues: parsed.error.issues });
    }

    const document = await createDocumentInDb(parsed.data);

    if (!document) {
      return reply.code(503).send({ message: "PostgreSQL is required to create documents" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "document.created",
      objectType: "document",
      objectId: document.id,
      afterData: document,
      reason: parsed.data.reason ?? "Alta de documento"
    });

    return reply.code(201).send({ document });
  });

  app.patch("/documentation/documents/:id", { preHandler: requirePermission("documentation.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateDocumentSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid document update payload", issues: parsed.error.issues });
    }

    const before = (await getDocumentFromDb(id)) ?? documents.find((item) => item.id === id) ?? null;
    const document = await updateDocumentInDb({
      id,
      title: parsed.data.title,
      bodyMd: parsed.data.bodyMd
    });

    if (!document) {
      return reply.code(404).send({ message: "Document not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "document.updated",
      objectType: "document",
      objectId: document.id,
      beforeData: before,
      afterData: document,
      reason: parsed.data.reason ?? "Actualizacion de documento"
    });

    return { document };
  });

  app.delete("/documentation/documents/:id", { preHandler: requirePermission("documentation.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = (await getDocumentFromDb(id)) ?? documents.find((item) => item.id === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Document not found" });
    }

    const deleted = await deleteDocumentInDb(id);

    if (!deleted) {
      return reply.code(404).send({ message: "Document not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "document.deleted",
      objectType: "document",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion controlada de documento"
    });

    return { deleted };
  });

  app.get("/documentation/evidence", async (request) => {
    const query = objectQuerySchema.parse(request.query);
    const dbEvidence = await listEvidenceFromDb(query.objectType, query.objectId);

    return {
      evidence: dbEvidence ?? evidenceFiles.filter((item) => matchesObjectFilter(item, query.objectType, query.objectId))
    };
  });

  app.post("/documentation/evidence", { preHandler: requirePermission("documentation.write") }, async (request, reply) => {
    const parsed = createEvidenceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid evidence payload", issues: parsed.error.issues });
    }

    const evidence = await createEvidenceInDb(parsed.data);

    if (!evidence) {
      return reply.code(503).send({ message: "PostgreSQL is required to create evidence records" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "evidence.created",
      objectType: "evidence_file",
      objectId: evidence.id,
      afterData: evidence,
      reason: parsed.data.reason ?? "Alta de evidencia"
    });

    return reply.code(201).send({ evidence });
  });

  app.patch("/documentation/evidence/:id", { preHandler: requirePermission("documentation.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateEvidenceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid evidence update payload", issues: parsed.error.issues });
    }

    const before = (await getEvidenceFromDb(id)) ?? evidenceFiles.find((item) => item.id === id) ?? null;
    const evidence = await updateEvidenceInDb({
      id,
      filename: parsed.data.filename,
      storageKey: parsed.data.storageKey,
      contentType: parsed.data.contentType
    });

    if (!evidence) {
      return reply.code(404).send({ message: "Evidence not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "evidence.updated",
      objectType: "evidence_file",
      objectId: evidence.id,
      beforeData: before,
      afterData: evidence,
      reason: parsed.data.reason ?? "Actualizacion de evidencia"
    });

    return { evidence };
  });

  app.delete("/documentation/evidence/:id", { preHandler: requirePermission("documentation.write") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const before = (await getEvidenceFromDb(id)) ?? evidenceFiles.find((item) => item.id === id) ?? null;

    if (!before) {
      return reply.code(404).send({ message: "Evidence not found" });
    }

    const deleted = await deleteEvidenceInDb(id);

    if (!deleted) {
      return reply.code(404).send({ message: "Evidence not found or PostgreSQL is required" });
    }

    await recordAuditEvent({
      actorId: actorId(request),
      action: "evidence.deleted",
      objectType: "evidence_file",
      objectId: deleted.id,
      beforeData: before,
      reason: "Eliminacion controlada de evidencia"
    });

    return { deleted };
  });
}

function matchesObjectFilter(item: { objectType: string; objectId: string }, objectType?: string, objectId?: string) {
  return (!objectType || item.objectType === objectType) && (!objectId || item.objectId === objectId);
}
