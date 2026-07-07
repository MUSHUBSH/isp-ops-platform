import { query, queryOne } from "../../shared/db.js";

type ChangeRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  risk_level: string;
  planned_start: string | null;
  planned_end: string | null;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  impact_count: string;
};

type ImpactRow = {
  id: string;
  object_type: string;
  object_id: string;
  impact_type: string;
  notes: string | null;
};

export type CreateChangeInput = {
  title: string;
  description: string;
  riskLevel?: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  requestedBy?: string | null;
  impacts?: Array<{
    objectType: string;
    objectId: string;
    impactType: string;
    notes?: string | null;
  }>;
};

function mapChange(row: ChangeRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    riskLevel: row.risk_level,
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    requestedBy: row.requested_by ?? "system",
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    impactCount: Number(row.impact_count ?? 0)
  };
}

function mapImpact(row: ImpactRow) {
  return {
    id: row.id,
    objectType: row.object_type,
    objectId: row.object_id,
    impactType: row.impact_type,
    notes: row.notes
  };
}

export async function listChangesFromDb() {
  const rows = await query<ChangeRow>(
    `SELECT
       cr.id,
       cr.title,
       cr.description,
       cr.status,
       cr.risk_level,
       cr.planned_start::text,
       cr.planned_end::text,
       requester.display_name AS requested_by,
       approver.display_name AS approved_by,
       cr.approved_at::text,
       COUNT(ci.id) AS impact_count
     FROM change_requests cr
     LEFT JOIN users requester ON requester.id = cr.requested_by
     LEFT JOIN users approver ON approver.id = cr.approved_by
     LEFT JOIN change_impacts ci ON ci.change_request_id = cr.id
     GROUP BY cr.id, requester.display_name, approver.display_name
     ORDER BY cr.created_at DESC`
  );

  return rows?.map(mapChange) ?? null;
}

export async function getChangeImpactsFromDb(changeId: string) {
  const rows = await query<ImpactRow>(
    `SELECT id, object_type, object_id::text, impact_type, notes
     FROM change_impacts
     WHERE change_request_id = $1::uuid
     ORDER BY impact_type, object_type`,
    [changeId]
  );

  return rows?.map(mapImpact) ?? null;
}

export async function createChangeInDb(input: CreateChangeInput) {
  const change = await queryOne<ChangeRow>(
    `INSERT INTO change_requests (title, description, status, risk_level, planned_start, planned_end, requested_by)
     VALUES ($1, $2, 'submitted', $3, $4::timestamptz, $5::timestamptz, $6::uuid)
     RETURNING
       id,
       title,
       description,
       status,
       risk_level,
       planned_start::text,
       planned_end::text,
       NULL::text AS requested_by,
       NULL::text AS approved_by,
       approved_at::text,
       0 AS impact_count`,
    [
      input.title,
      input.description,
      input.riskLevel ?? "medium",
      input.plannedStart ?? null,
      input.plannedEnd ?? null,
      input.requestedBy ?? null
    ]
  );

  if (!change) {
    return null;
  }

  for (const impact of input.impacts ?? []) {
    await query(
      `INSERT INTO change_impacts (change_request_id, object_type, object_id, impact_type, notes)
       VALUES ($1::uuid, $2, $3::uuid, $4, $5)`,
      [change.id, impact.objectType, impact.objectId, impact.impactType, impact.notes ?? null]
    );
  }

  return mapChange({
    ...change,
    impact_count: String(input.impacts?.length ?? 0)
  });
}

export async function approveChangeInDb(changeId: string, actorId: string | null) {
  const row = await queryOne<ChangeRow>(
    `UPDATE change_requests
     SET status = 'approved', approved_by = $2::uuid, approved_at = now(), updated_at = now()
     WHERE id = $1::uuid
     RETURNING
       id,
       title,
       description,
       status,
       risk_level,
       planned_start::text,
       planned_end::text,
       NULL::text AS requested_by,
       NULL::text AS approved_by,
       approved_at::text,
       (SELECT COUNT(*) FROM change_impacts WHERE change_request_id = change_requests.id) AS impact_count`,
    [changeId, actorId]
  );

  return row ? mapChange(row) : null;
}

export async function updateChangeStatusInDb(changeId: string, status: string) {
  const row = await queryOne<ChangeRow>(
    `UPDATE change_requests
     SET status = $2, updated_at = now()
     WHERE id = $1::uuid
     RETURNING
       id,
       title,
       description,
       status,
       risk_level,
       planned_start::text,
       planned_end::text,
       NULL::text AS requested_by,
       NULL::text AS approved_by,
       approved_at::text,
       (SELECT COUNT(*) FROM change_impacts WHERE change_request_id = change_requests.id) AS impact_count`,
    [changeId, status]
  );

  return row ? mapChange(row) : null;
}

export async function getChangeFromDb(changeId: string) {
  const row = await queryOne<ChangeRow>(
    `SELECT
       cr.id,
       cr.title,
       cr.description,
       cr.status,
       cr.risk_level,
       cr.planned_start::text,
       cr.planned_end::text,
       requester.display_name AS requested_by,
       approver.display_name AS approved_by,
       cr.approved_at::text,
       COUNT(ci.id) AS impact_count
     FROM change_requests cr
     LEFT JOIN users requester ON requester.id = cr.requested_by
     LEFT JOIN users approver ON approver.id = cr.approved_by
     LEFT JOIN change_impacts ci ON ci.change_request_id = cr.id
     WHERE cr.id::text = $1
     GROUP BY cr.id, requester.display_name, approver.display_name`,
    [changeId]
  );

  return row ? mapChange(row) : null;
}

export async function deleteChangeInDb(changeId: string) {
  const row = await queryOne<{ id: string }>(
    "DELETE FROM change_requests WHERE id::text = $1 RETURNING id",
    [changeId]
  );

  return row;
}
