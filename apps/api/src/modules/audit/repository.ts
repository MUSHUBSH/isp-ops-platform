import { query } from "../../shared/db.js";

type AuditRow = {
  id: string;
  action: string;
  object_type: string;
  object_id: string;
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
      objectLabel: row.object_id,
      actor: row.actor ?? "system",
      reason: row.reason,
      at: row.created_at
    })) ?? null
  );
}
