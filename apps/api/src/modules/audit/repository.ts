import { query } from "../../shared/db.js";

type AuditRow = {
  id: string;
  action: string;
  object_type: string;
  object_id: string;
  object_label: string;
  actor: string | null;
  reason: string | null;
  created_at: string;
};

export async function listRecentAuditEventsFromDb() {
  const rows = await query<AuditRow>(
    `SELECT
       ae.id,
       ae.action,
       ae.object_type,
       ae.object_id::text,
       COALESCE(
         ae.after_data->>'code',
         ae.after_data->>'name',
         ae.after_data->>'title',
         ae.after_data->>'address',
         ae.after_data->>'serviceCode',
         ae.after_data->>'circuitCode',
         ae.after_data->>'label',
         ae.after_data->>'role',
         ae.after_data->>'device',
         ae.after_data->>'interface',
         ae.after_data->>'ipAddress',
         ae.after_data->>'siteCode',
         ae.after_data->>'rackCode',
         ae.after_data->>'aDevice',
         ae.after_data->>'zDevice',
         ae.after_data->>'aEndpoint',
         ae.after_data->>'zEndpoint',
         ae.after_data->>'serialNumber',
         ae.after_data->>'sourceFeed',
         ae.after_data->>'storageKey',
         ae.after_data->>'filename',
         ae.before_data->>'code',
         ae.before_data->>'name',
         ae.before_data->>'title',
         ae.before_data->>'address',
         ae.before_data->>'serviceCode',
         ae.before_data->>'circuitCode',
         ae.before_data->>'label',
         ae.before_data->>'role',
         ae.before_data->>'device',
         ae.before_data->>'interface',
         ae.before_data->>'ipAddress',
         ae.before_data->>'siteCode',
         ae.before_data->>'rackCode',
         ae.before_data->>'aDevice',
         ae.before_data->>'zDevice',
         ae.before_data->>'aEndpoint',
         ae.before_data->>'zEndpoint',
         ae.before_data->>'serialNumber',
         ae.before_data->>'sourceFeed',
         ae.before_data->>'storageKey',
         ae.before_data->>'filename',
         ae.object_id::text
       ) AS object_label,
       u.display_name AS actor,
       ae.reason,
       ae.created_at::text
     FROM audit_events ae
     LEFT JOIN users u ON u.id = ae.actor_id
     ORDER BY ae.created_at DESC
     LIMIT 50`
  );

  return (
    rows?.map((row) => ({
      id: row.id,
      action: row.action,
      objectType: row.object_type,
      objectLabel: row.object_label,
      actor: row.actor ?? "system",
      reason: row.reason,
      at: row.created_at
    })) ?? null
  );
}
