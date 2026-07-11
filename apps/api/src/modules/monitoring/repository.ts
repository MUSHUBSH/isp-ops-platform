import { query, queryOne } from "../../shared/db.js";

type AlertRow = {
  id: string;
  severity: "critical" | "major" | "minor";
  status: string;
  title: string;
  context: string | null;
  object_type: string | null;
  object_id: string | null;
  monitor_source: string | null;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged_at: string | null;
};

type MaintenanceRow = {
  id: string;
  object_type: string;
  object_id: string;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
};

type AlertCountsRow = {
  critical: string;
  major: string;
  minor: string;
};

export type CreateAlertInput = {
  objectType: string;
  objectId: string;
  monitorSource: string;
  externalRef?: string | null;
  severity: "critical" | "major" | "minor";
  title: string;
  description?: string | null;
};

export type CreateMaintenanceInput = {
  objectType: string;
  objectId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status?: string;
};

export type UpdateMaintenanceInput = {
  id: string;
  title?: string;
  startsAt?: string;
  endsAt?: string;
  status?: string;
};

function mapAlert(row: AlertRow) {
  return {
    id: row.id,
    severity: row.severity,
    status: row.status,
    title: row.title,
    context: row.context ?? "",
    objectType: row.object_type ?? "unknown",
    objectId: row.object_id ?? "",
    monitorSource: row.monitor_source ?? "unknown",
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    acknowledgedAt: row.acknowledged_at
  };
}

function mapMaintenance(row: MaintenanceRow) {
  return {
    id: row.id,
    objectType: row.object_type,
    objectId: row.object_id,
    title: row.title,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at
  };
}

export async function listAlertsFromDb(status = "active") {
  const rows = await query<AlertRow>(
    `SELECT
       a.id,
       a.severity,
       a.status,
       a.title,
       a.description AS context,
       mo.object_type,
       mo.object_id::text,
       mo.monitor_source,
       a.first_seen_at::text,
       a.last_seen_at::text,
       a.acknowledged_at::text
     FROM alerts a
     LEFT JOIN monitored_objects mo ON mo.id = a.monitored_object_id
     WHERE ($1::text IS NULL OR a.status = $1)
     ORDER BY
       CASE a.severity WHEN 'critical' THEN 1 WHEN 'major' THEN 2 WHEN 'minor' THEN 3 ELSE 4 END,
       a.last_seen_at DESC`,
    [status === "all" ? null : status]
  );

  return rows?.map(mapAlert) ?? null;
}

export async function createAlertInDb(input: CreateAlertInput) {
  const row = await queryOne<AlertRow>(
     `WITH upserted_object AS (
       INSERT INTO monitored_objects (object_type, object_id, monitor_source, external_ref, status, last_seen_at)
       VALUES ($1, $2::uuid, $3, $4, 'active', now())
       RETURNING id, object_type, object_id, monitor_source
     )
     INSERT INTO alerts (monitored_object_id, severity, status, title, description)
     SELECT id, $5, 'active', $6, $7 FROM upserted_object
     RETURNING
       id,
       severity,
       status,
       title,
       description AS context,
       $1::text AS object_type,
       $2::text AS object_id,
       $3::text AS monitor_source,
       first_seen_at::text,
       last_seen_at::text,
       acknowledged_at::text`,
    [
      input.objectType,
      input.objectId,
      input.monitorSource,
      input.externalRef ?? null,
      input.severity,
      input.title,
      input.description ?? null
    ]
  );

  return row ? mapAlert(row) : null;
}

export async function acknowledgeAlertInDb(alertId: string) {
  const row = await queryOne<AlertRow>(
    `UPDATE alerts a
     SET status = 'acknowledged', acknowledged_at = now()
     FROM monitored_objects mo
     WHERE a.id = $1::uuid AND mo.id = a.monitored_object_id
     RETURNING
       a.id,
       a.severity,
       a.status,
       a.title,
       a.description AS context,
       mo.object_type,
       mo.object_id::text,
       mo.monitor_source,
       a.first_seen_at::text,
       a.last_seen_at::text,
       a.acknowledged_at::text`,
    [alertId]
  );

  return row ? mapAlert(row) : null;
}

export async function updateAlertStatusInDb(alertId: string, status: string) {
  const row = await queryOne<AlertRow>(
    `UPDATE alerts a
     SET status = $2,
         acknowledged_at = CASE WHEN $2 = 'acknowledged' THEN COALESCE(a.acknowledged_at, now()) ELSE a.acknowledged_at END,
         last_seen_at = now()
     FROM monitored_objects mo
     WHERE a.id = $1::uuid AND mo.id = a.monitored_object_id
     RETURNING
       a.id,
       a.severity,
       a.status,
       a.title,
       a.description AS context,
       mo.object_type,
       mo.object_id::text,
       mo.monitor_source,
       a.first_seen_at::text,
       a.last_seen_at::text,
       a.acknowledged_at::text`,
    [alertId, status]
  );

  return row ? mapAlert(row) : null;
}

export async function deleteAlertInDb(alertId: string) {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM alerts
     WHERE id = $1::uuid
     RETURNING id`,
    [alertId]
  );

  return row ?? null;
}

export async function listMaintenanceWindowsFromDb() {
  const rows = await query<MaintenanceRow>(
    `SELECT id, object_type, object_id::text, title, status, starts_at::text, ends_at::text
     FROM maintenance_windows
     WHERE ends_at >= now() - interval '24 hours'
     ORDER BY starts_at`
  );

  return rows?.map(mapMaintenance) ?? null;
}

export async function createMaintenanceWindowInDb(input: CreateMaintenanceInput) {
  const row = await queryOne<MaintenanceRow>(
    `INSERT INTO maintenance_windows (object_type, object_id, title, status, starts_at, ends_at)
     VALUES ($1, $2::uuid, $3, $4, $5::timestamptz, $6::timestamptz)
     RETURNING id, object_type, object_id::text, title, status, starts_at::text, ends_at::text`,
    [input.objectType, input.objectId, input.title, input.status ?? "scheduled", input.startsAt, input.endsAt]
  );

  return row ? mapMaintenance(row) : null;
}

export async function updateMaintenanceWindowInDb(input: UpdateMaintenanceInput) {
  const row = await queryOne<MaintenanceRow>(
    `UPDATE maintenance_windows
     SET title = COALESCE($2, title),
         status = COALESCE($3, status),
         starts_at = COALESCE($4::timestamptz, starts_at),
         ends_at = COALESCE($5::timestamptz, ends_at)
     WHERE id = $1::uuid
     RETURNING id, object_type, object_id::text, title, status, starts_at::text, ends_at::text`,
    [input.id, input.title ?? null, input.status ?? null, input.startsAt ?? null, input.endsAt ?? null]
  );

  return row ? mapMaintenance(row) : null;
}

export async function deleteMaintenanceWindowInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM maintenance_windows
     WHERE id = $1::uuid
     RETURNING id`,
    [id]
  );

  return row ?? null;
}

export async function getAlertCountsFromDb() {
  const row = await queryOne<AlertCountsRow>(
    `SELECT
       COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'active') AS critical,
       COUNT(*) FILTER (WHERE severity = 'major' AND status = 'active') AS major,
       COUNT(*) FILTER (WHERE severity = 'minor' AND status = 'active') AS minor
     FROM alerts`
  );

  if (!row) {
    return null;
  }

  return {
    critical: Number(row.critical ?? 0),
    major: Number(row.major ?? 0),
    minor: Number(row.minor ?? 0)
  };
}
