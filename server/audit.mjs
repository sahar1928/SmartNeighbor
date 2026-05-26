import { dbEnabled, query } from "./db.mjs";

export const auditEvents = [];

export async function recordAudit({ actorId = null, action, entityType, entityId, metadata = {} }) {
  const event = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    actorId,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: new Date().toISOString()
  };

  if (dbEnabled) {
    await query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorId, action, entityType, entityId, metadata]
    );
  } else {
    auditEvents.push(event);
  }

  return event;
}

export async function listAuditEvents() {
  if (!dbEnabled) return auditEvents.slice().reverse();
  const result = await query(
    `SELECT id, actor_id AS "actorId", action, entity_type AS "entityType",
            entity_id AS "entityId", metadata, created_at AS "createdAt"
     FROM audit_log
     ORDER BY created_at DESC
     LIMIT 100`
  );
  return result.rows;
}
