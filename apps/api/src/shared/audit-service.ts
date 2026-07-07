import { query } from "./db.js";

export type AuditInput = {
  actorId?: string | null;
  action: string;
  objectType: string;
  objectId: string;
  beforeData?: unknown;
  afterData?: unknown;
  reason?: string | null;
  externalTicket?: string | null;
};

export async function recordAuditEvent(input: AuditInput) {
  await query(
    `INSERT INTO audit_events
      (actor_id, action, object_type, object_id, before_data, after_data, reason, external_ticket)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
    [
      input.actorId ?? null,
      input.action,
      input.objectType,
      input.objectId,
      input.beforeData ? JSON.stringify(input.beforeData) : null,
      input.afterData ? JSON.stringify(input.afterData) : null,
      input.reason ?? null,
      input.externalTicket ?? null
    ]
  );
}
