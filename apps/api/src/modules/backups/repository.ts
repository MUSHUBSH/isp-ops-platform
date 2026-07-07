import { query, queryOne } from "../../shared/db.js";

type BackupRow = {
  id: string;
  device: string;
  site_code: string;
  storage_key: string;
  config_hash: string;
  collected_at: string;
  source: string;
};

type BackupSummaryRow = {
  total_devices: string;
  devices_with_backup: string;
  stale_backups: string;
};

export type CreateBackupInput = {
  deviceName: string;
  storageKey: string;
  configHash: string;
  source: string;
};

function mapBackup(row: BackupRow) {
  return {
    id: row.id,
    device: row.device,
    siteCode: row.site_code,
    storageKey: row.storage_key,
    configHash: row.config_hash,
    collectedAt: row.collected_at,
    source: row.source
  };
}

export async function listBackupsFromDb() {
  const rows = await query<BackupRow>(
    `SELECT
       cb.id,
       d.name AS device,
       s.code AS site_code,
       cb.storage_key,
       cb.config_hash,
       cb.collected_at::text,
       cb.source
     FROM config_backups cb
     JOIN devices d ON d.id = cb.device_id
     JOIN sites s ON s.id = d.site_id
     ORDER BY cb.collected_at DESC`
  );

  return rows?.map(mapBackup) ?? null;
}

export async function getBackupSummaryFromDb() {
  const row = await queryOne<BackupSummaryRow>(
    `WITH latest AS (
       SELECT device_id, MAX(collected_at) AS last_backup
       FROM config_backups
       GROUP BY device_id
     )
     SELECT
       COUNT(d.id) AS total_devices,
       COUNT(latest.device_id) AS devices_with_backup,
       COUNT(latest.device_id) FILTER (WHERE latest.last_backup < now() - interval '7 days') AS stale_backups
     FROM devices d
     LEFT JOIN latest ON latest.device_id = d.id`
  );

  if (!row) {
    return null;
  }

  return {
    totalDevices: Number(row.total_devices ?? 0),
    devicesWithBackup: Number(row.devices_with_backup ?? 0),
    staleBackups: Number(row.stale_backups ?? 0)
  };
}

export async function createBackupInDb(input: CreateBackupInput) {
  const row = await queryOne<BackupRow>(
    `INSERT INTO config_backups (device_id, storage_key, config_hash, source)
     SELECT d.id, $2, $3, $4
     FROM devices d
     WHERE d.name = $1
     RETURNING
       id,
       $1::text AS device,
       (SELECT s.code FROM devices rd JOIN sites s ON s.id = rd.site_id WHERE rd.name = $1) AS site_code,
       storage_key,
       config_hash,
       collected_at::text,
       source`,
    [input.deviceName, input.storageKey, input.configHash, input.source]
  );

  return row ? mapBackup(row) : null;
}

export async function getBackupFromDb(id: string) {
  const row = await queryOne<BackupRow>(
    `SELECT
       cb.id,
       d.name AS device,
       s.code AS site_code,
       cb.storage_key,
       cb.config_hash,
       cb.collected_at::text,
       cb.source
     FROM config_backups cb
     JOIN devices d ON d.id = cb.device_id
     JOIN sites s ON s.id = d.site_id
     WHERE cb.id::text = $1`,
    [id]
  );

  return row ? mapBackup(row) : null;
}

export async function deleteBackupInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    "DELETE FROM config_backups WHERE id::text = $1 RETURNING id",
    [id]
  );

  return row;
}
