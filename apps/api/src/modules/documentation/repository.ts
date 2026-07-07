import { query, queryOne } from "../../shared/db.js";

type DocumentRow = {
  id: string;
  object_type: string;
  object_id: string;
  title: string;
  body_md: string;
  created_by: string | null;
  updated_at: string;
};

type EvidenceRow = {
  id: string;
  object_type: string;
  object_id: string;
  filename: string;
  storage_key: string;
  content_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type CreateDocumentInput = {
  objectType: string;
  objectId: string;
  title: string;
  bodyMd: string;
  createdBy?: string | null;
};

export type CreateEvidenceInput = {
  objectType: string;
  objectId: string;
  filename: string;
  storageKey: string;
  contentType?: string | null;
  uploadedBy?: string | null;
};

export type UpdateDocumentInput = {
  id: string;
  title: string;
  bodyMd: string;
};

export type UpdateEvidenceInput = {
  id: string;
  filename: string;
  storageKey: string;
  contentType?: string | null;
};

function mapDocument(row: DocumentRow) {
  return {
    id: row.id,
    objectType: row.object_type,
    objectId: row.object_id,
    title: row.title,
    bodyMd: row.body_md,
    createdBy: row.created_by ?? "system",
    updatedAt: row.updated_at
  };
}

function mapEvidence(row: EvidenceRow) {
  return {
    id: row.id,
    objectType: row.object_type,
    objectId: row.object_id,
    filename: row.filename,
    storageKey: row.storage_key,
    contentType: row.content_type,
    uploadedBy: row.uploaded_by ?? "system",
    uploadedAt: row.uploaded_at
  };
}

export async function listDocumentsFromDb(objectType?: string, objectId?: string) {
  const rows = await query<DocumentRow>(
    `SELECT
       d.id,
       d.object_type,
       d.object_id::text,
       d.title,
       d.body_md,
       u.display_name AS created_by,
       d.updated_at::text
     FROM documents d
     LEFT JOIN users u ON u.id = d.created_by
     WHERE ($1::text IS NULL OR d.object_type = $1)
       AND ($2::text IS NULL OR d.object_id::text = $2)
     ORDER BY d.updated_at DESC`,
    [objectType ?? null, objectId ?? null]
  );

  return rows?.map(mapDocument) ?? null;
}

export async function createDocumentInDb(input: CreateDocumentInput) {
  const row = await queryOne<DocumentRow>(
    `INSERT INTO documents (object_type, object_id, title, body_md)
     VALUES ($1, $2::uuid, $3, $4)
     RETURNING id, object_type, object_id::text, title, body_md, NULL::text AS created_by, updated_at::text`,
    [input.objectType, input.objectId, input.title, input.bodyMd]
  );

  return row ? mapDocument(row) : null;
}

export async function getDocumentFromDb(id: string) {
  const row = await queryOne<DocumentRow>(
    `SELECT
       d.id,
       d.object_type,
       d.object_id::text,
       d.title,
       d.body_md,
       u.display_name AS created_by,
       d.updated_at::text
     FROM documents d
     LEFT JOIN users u ON u.id = d.created_by
     WHERE d.id::text = $1`,
    [id]
  );

  return row ? mapDocument(row) : null;
}

export async function updateDocumentInDb(input: UpdateDocumentInput) {
  const row = await queryOne<DocumentRow>(
    `UPDATE documents d
     SET title = $2,
         body_md = $3,
         updated_at = now()
     WHERE d.id::text = $1
     RETURNING d.id, d.object_type, d.object_id::text, d.title, d.body_md, NULL::text AS created_by, d.updated_at::text`,
    [input.id, input.title, input.bodyMd]
  );

  return row ? mapDocument(row) : null;
}

export async function deleteDocumentInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    "DELETE FROM documents WHERE id::text = $1 RETURNING id",
    [id]
  );

  return row;
}

export async function listEvidenceFromDb(objectType?: string, objectId?: string) {
  const rows = await query<EvidenceRow>(
    `SELECT
       e.id,
       e.object_type,
       e.object_id::text,
       e.filename,
       e.storage_key,
       e.content_type,
       u.display_name AS uploaded_by,
       e.uploaded_at::text
     FROM evidence_files e
     LEFT JOIN users u ON u.id = e.uploaded_by
     WHERE ($1::text IS NULL OR e.object_type = $1)
       AND ($2::text IS NULL OR e.object_id::text = $2)
     ORDER BY e.uploaded_at DESC`,
    [objectType ?? null, objectId ?? null]
  );

  return rows?.map(mapEvidence) ?? null;
}

export async function createEvidenceInDb(input: CreateEvidenceInput) {
  const row = await queryOne<EvidenceRow>(
    `INSERT INTO evidence_files (object_type, object_id, filename, storage_key, content_type)
     VALUES ($1, $2::uuid, $3, $4, $5)
     RETURNING id, object_type, object_id::text, filename, storage_key, content_type, NULL::text AS uploaded_by, uploaded_at::text`,
    [input.objectType, input.objectId, input.filename, input.storageKey, input.contentType ?? null]
  );

  return row ? mapEvidence(row) : null;
}

export async function getEvidenceFromDb(id: string) {
  const row = await queryOne<EvidenceRow>(
    `SELECT
       e.id,
       e.object_type,
       e.object_id::text,
       e.filename,
       e.storage_key,
       e.content_type,
       u.display_name AS uploaded_by,
       e.uploaded_at::text
     FROM evidence_files e
     LEFT JOIN users u ON u.id = e.uploaded_by
     WHERE e.id::text = $1`,
    [id]
  );

  return row ? mapEvidence(row) : null;
}

export async function updateEvidenceInDb(input: UpdateEvidenceInput) {
  const row = await queryOne<EvidenceRow>(
    `UPDATE evidence_files e
     SET filename = $2,
         storage_key = $3,
         content_type = $4
     WHERE e.id::text = $1
     RETURNING e.id, e.object_type, e.object_id::text, e.filename, e.storage_key, e.content_type, NULL::text AS uploaded_by, e.uploaded_at::text`,
    [input.id, input.filename, input.storageKey, input.contentType ?? null]
  );

  return row ? mapEvidence(row) : null;
}

export async function deleteEvidenceInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    "DELETE FROM evidence_files WHERE id::text = $1 RETURNING id",
    [id]
  );

  return row;
}
