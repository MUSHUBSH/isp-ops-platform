import { query, queryOne } from "../../shared/db.js";

type IncidentRow = {
  id: string;
  code: string;
  title: string;
  severity: string;
  status: string;
  started_at: string;
  resolved_at: string | null;
  owner_team: string | null;
  summary: string | null;
  impact_count: string;
  event_count: string;
};

type IncidentEventRow = {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
  created_by: string | null;
};

type IncidentImpactRow = {
  id: string;
  object_type: string;
  object_label: string;
  impact_type: string;
  notes: string | null;
};

export type CreateIncidentInput = {
  code: string;
  title: string;
  severity: string;
  status?: string;
  ownerTeam?: string | null;
  summary?: string | null;
  createdBy?: string | null;
  impacts?: Array<{
    objectType: string;
    objectId: string;
    impactType: string;
    notes?: string | null;
  }>;
};

function mapIncident(row: IncidentRow) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    severity: row.severity,
    status: row.status,
    startedAt: row.started_at,
    resolvedAt: row.resolved_at,
    ownerTeam: row.owner_team,
    summary: row.summary,
    impactCount: Number(row.impact_count ?? 0),
    eventCount: Number(row.event_count ?? 0)
  };
}

export async function listIncidentsFromDb(status?: string) {
  const params = status ? [status] : [];
  const rows = await query<IncidentRow>(
    `SELECT
       i.id,
       i.code,
       i.title,
       i.severity,
       i.status,
       i.started_at,
       i.resolved_at,
       i.owner_team,
       i.summary,
       COUNT(DISTINCT ii.id) AS impact_count,
       COUNT(DISTINCT ie.id) AS event_count
     FROM incidents i
     LEFT JOIN incident_impacts ii ON ii.incident_id = i.id
     LEFT JOIN incident_events ie ON ie.incident_id = i.id
     WHERE ($1::text IS NULL OR i.status = $1)
     GROUP BY i.id
     ORDER BY i.started_at DESC`,
    [status ?? null]
  );

  return rows?.map(mapIncident) ?? null;
}

export async function getIncidentByCodeFromDb(code: string) {
  const row = await queryOne<IncidentRow>(
    `SELECT
       i.id,
       i.code,
       i.title,
       i.severity,
       i.status,
       i.started_at,
       i.resolved_at,
       i.owner_team,
       i.summary,
       COUNT(DISTINCT ii.id) AS impact_count,
       COUNT(DISTINCT ie.id) AS event_count
     FROM incidents i
     LEFT JOIN incident_impacts ii ON ii.incident_id = i.id
     LEFT JOIN incident_events ie ON ie.incident_id = i.id
     WHERE i.code = $1 OR i.id::text = $1
     GROUP BY i.id`,
    [code]
  );

  return row ? mapIncident(row) : null;
}

export async function listIncidentEventsFromDb(code: string) {
  const rows = await query<IncidentEventRow>(
    `SELECT ie.id, ie.event_type, ie.message, ie.created_at, u.display_name AS created_by
     FROM incident_events ie
     JOIN incidents i ON i.id = ie.incident_id
     LEFT JOIN users u ON u.id = ie.created_by
     WHERE i.code = $1 OR i.id::text = $1
     ORDER BY ie.created_at DESC`,
    [code]
  );

  return rows?.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    message: row.message,
    createdAt: row.created_at,
    createdBy: row.created_by
  })) ?? null;
}

export async function listIncidentImpactsFromDb(code: string) {
  const rows = await query<IncidentImpactRow>(
    `SELECT
       ii.id,
       ii.object_type,
       COALESCE(s.code, c.code, d.name, ii.object_id::text) AS object_label,
       ii.impact_type,
       ii.notes
     FROM incident_impacts ii
     JOIN incidents i ON i.id = ii.incident_id
     LEFT JOIN sites s ON ii.object_type = 'site' AND s.id = ii.object_id
     LEFT JOIN circuits c ON ii.object_type = 'circuit' AND c.id = ii.object_id
     LEFT JOIN devices d ON ii.object_type = 'device' AND d.id = ii.object_id
     WHERE i.code = $1 OR i.id::text = $1
     ORDER BY ii.object_type, object_label`,
    [code]
  );

  return rows?.map((row) => ({
    id: row.id,
    objectType: row.object_type,
    objectLabel: row.object_label,
    impactType: row.impact_type,
    notes: row.notes
  })) ?? null;
}

export async function createIncidentInDb(input: CreateIncidentInput) {
  const incident = await queryOne<IncidentRow>(
    `INSERT INTO incidents (code, title, severity, status, owner_team, summary, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, code, title, severity, status, started_at, resolved_at, owner_team, summary, 0 AS impact_count, 0 AS event_count`,
    [input.code, input.title, input.severity, input.status ?? "open", input.ownerTeam ?? null, input.summary ?? null, input.createdBy ?? null]
  );

  if (!incident) {
    return null;
  }

  for (const impact of input.impacts ?? []) {
    await query(
      `INSERT INTO incident_impacts (incident_id, object_type, object_id, impact_type, notes)
       VALUES ($1, $2, $3::uuid, $4, $5)`,
      [incident.id, impact.objectType, impact.objectId, impact.impactType, impact.notes ?? null]
    );
  }

  await query(
    `INSERT INTO incident_events (incident_id, event_type, message, created_by)
     VALUES ($1, 'created', $2, $3)`,
    [incident.id, input.summary ?? "Incidencia creada", input.createdBy ?? null]
  );

  return mapIncident(incident);
}

export async function addIncidentEventInDb(code: string, eventType: string, message: string, createdBy?: string | null) {
  const row = await queryOne<IncidentEventRow>(
    `INSERT INTO incident_events (incident_id, event_type, message, created_by)
     SELECT id, $2, $3, $4
     FROM incidents
     WHERE code = $1 OR id::text = $1
     RETURNING id, event_type, message, created_at, NULL AS created_by`,
    [code, eventType, message, createdBy ?? null]
  );

  return row ? {
    id: row.id,
    eventType: row.event_type,
    message: row.message,
    createdAt: row.created_at,
    createdBy: row.created_by
  } : null;
}

export async function updateIncidentStatusInDb(code: string, status: string, createdBy?: string | null) {
  const incident = await queryOne<IncidentRow>(
    `UPDATE incidents
     SET status = $2,
         resolved_at = CASE WHEN $2 IN ('resolved', 'closed') THEN COALESCE(resolved_at, now()) ELSE NULL END
     WHERE code = $1 OR id::text = $1
     RETURNING id, code, title, severity, status, started_at, resolved_at, owner_team, summary, 0 AS impact_count, 0 AS event_count`,
    [code, status]
  );

  if (!incident) {
    return null;
  }

  await query(
    `INSERT INTO incident_events (incident_id, event_type, message, created_by)
     VALUES ($1, 'status', $2, $3)`,
    [incident.id, `Estado actualizado a ${status}`, createdBy ?? null]
  );

  return mapIncident(incident);
}

export async function deleteIncidentInDb(code: string) {
  const incident = await getIncidentByCodeFromDb(code);

  if (!incident) {
    return null;
  }

  await query("DELETE FROM incidents WHERE id = $1", [incident.id]);

  return incident;
}
