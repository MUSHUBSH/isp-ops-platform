import { query, queryOne } from "../../shared/db.js";

type PrefixRow = {
  id: string;
  prefix: string;
  role: string;
  status: string;
  site_code: string | null;
  vrf: string | null;
  source: string | null;
  assigned_ips: string;
};

type IpRow = {
  id: string;
  address: string;
  prefix: string;
  device: string | null;
  interface: string | null;
  site: string | null;
  service: string | null;
  status: string;
};

export type CreatePrefixInput = {
  prefix: string;
  family: 4 | 6;
  role: string;
  status?: string;
  siteCode?: string | null;
  vrf?: string | null;
  description?: string | null;
};

export type CreateIpInput = {
  address: string;
  prefix: string;
  role: string;
  status?: string;
  interfaceId?: string | null;
  description?: string | null;
};

export type UpdatePrefixInput = {
  id: string;
  role: string;
  status: string;
  siteCode?: string | null;
  vrf?: string | null;
  description?: string | null;
};

function mapPrefix(row: PrefixRow) {
  return {
    id: row.id,
    prefix: row.prefix,
    role: row.role,
    status: row.status,
    siteCode: row.site_code ?? "GLOBAL",
    vrf: row.vrf ?? "global",
    utilization: Number(row.assigned_ips ?? 0),
    source: row.source ?? "internal"
  };
}

function mapIp(row: IpRow) {
  return {
    id: row.id,
    address: row.address,
    prefix: row.prefix,
    device: row.device,
    interface: row.interface,
    site: row.site ?? "GLOBAL",
    service: row.service,
    status: row.status
  };
}

export async function listPrefixesFromDb() {
  const rows = await query<PrefixRow>(
    `SELECT
       p.id,
       p.prefix::text,
       p.role,
       p.status,
       s.code AS site_code,
       v.name AS vrf,
       ra.registry AS source,
       COUNT(ip.id) AS assigned_ips
     FROM prefixes p
     LEFT JOIN sites s ON s.id = p.site_id
     LEFT JOIN vrfs v ON v.id = p.vrf_id
     LEFT JOIN rir_allocations ra ON ra.id = p.rir_allocation_id
     LEFT JOIN ip_addresses ip ON ip.prefix_id = p.id
     GROUP BY p.id, s.code, v.name, ra.registry
     ORDER BY p.prefix`
  );

  return rows?.map(mapPrefix) ?? null;
}

export async function listIpAssignmentsFromDb() {
  const rows = await query<IpRow>(
    `SELECT
       ip.id,
       ip.address::text,
       p.prefix::text,
       d.name AS device,
       i.name AS interface,
       s.code AS site,
       svc.name AS service,
       ip.status
     FROM ip_addresses ip
     JOIN prefixes p ON p.id = ip.prefix_id
     LEFT JOIN interfaces i ON i.id = ip.interface_id
     LEFT JOIN devices d ON d.id = i.device_id
     LEFT JOIN sites s ON s.id = d.site_id OR s.id = p.site_id
     LEFT JOIN service_endpoints se ON se.ip_address_id = ip.id
     LEFT JOIN services svc ON svc.id = se.service_id
     ORDER BY ip.address`
  );

  return rows?.map(mapIp) ?? null;
}

export async function createPrefixInDb(input: CreatePrefixInput) {
  const row = await queryOne<PrefixRow>(
    `WITH selected_site AS (
       SELECT id FROM sites WHERE code = $4
     ),
     selected_vrf AS (
       SELECT id FROM vrfs WHERE name = COALESCE($5, 'global')
     )
     INSERT INTO prefixes (site_id, vrf_id, prefix, family, role, status, description)
     VALUES (
       (SELECT id FROM selected_site),
       (SELECT id FROM selected_vrf),
       $1::cidr,
       $2,
       $3,
       $6,
       $7
     )
     RETURNING
       id,
       prefix::text,
       role,
       status,
       $4::text AS site_code,
       COALESCE($5, 'global')::text AS vrf,
       'internal'::text AS source,
       0 AS assigned_ips`,
    [
      input.prefix,
      input.family,
      input.role,
      input.siteCode ?? null,
      input.vrf ?? "global",
      input.status ?? "active",
      input.description ?? null
    ]
  );

  return row ? mapPrefix(row) : null;
}

export async function updatePrefixInDb(input: UpdatePrefixInput) {
  const row = await queryOne<PrefixRow>(
    `WITH selected_site AS (
       SELECT id, code FROM sites WHERE code = $4
     ),
     selected_vrf AS (
       SELECT id, name FROM vrfs WHERE name = COALESCE($5, 'global')
     ),
     updated AS (
       UPDATE prefixes
       SET site_id = (SELECT id FROM selected_site),
           vrf_id = (SELECT id FROM selected_vrf),
           role = $2,
           status = $3,
           description = $6
       WHERE id::text = $1 OR prefix::text = $1
       RETURNING *
     )
     SELECT
       updated.id,
       updated.prefix::text,
       updated.role,
       updated.status,
       (SELECT code FROM selected_site) AS site_code,
       (SELECT name FROM selected_vrf) AS vrf,
       ra.registry AS source,
       COUNT(ip.id) AS assigned_ips
     FROM updated
     LEFT JOIN rir_allocations ra ON ra.id = updated.rir_allocation_id
     LEFT JOIN ip_addresses ip ON ip.prefix_id = updated.id
     GROUP BY updated.id, updated.prefix, updated.role, updated.status, ra.registry`,
    [
      input.id,
      input.role,
      input.status,
      input.siteCode ?? null,
      input.vrf ?? "global",
      input.description ?? null
    ]
  );

  return row ? mapPrefix(row) : null;
}

export async function deletePrefixInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    `WITH selected AS (
       SELECT id FROM prefixes WHERE id::text = $1 OR prefix::text = $1
     ),
     dependency_counts AS (
       SELECT
         (SELECT COUNT(*) FROM prefixes child WHERE child.parent_prefix_id = selected.id) AS child_prefixes,
         (SELECT COUNT(*) FROM ip_addresses WHERE prefix_id = selected.id) AS ip_addresses,
         (SELECT COUNT(*) FROM documents WHERE object_type = 'prefix' AND object_id = selected.id) AS documents,
         (SELECT COUNT(*) FROM evidence_files WHERE object_type = 'prefix' AND object_id = selected.id) AS evidence,
         (SELECT COUNT(*) FROM incident_impacts WHERE object_type = 'prefix' AND object_id = selected.id) AS incident_impacts
       FROM selected
     )
     DELETE FROM prefixes
     WHERE id = (SELECT id FROM selected)
       AND EXISTS (SELECT 1 FROM selected)
       AND EXISTS (
         SELECT 1
         FROM dependency_counts
         WHERE child_prefixes = 0
           AND ip_addresses = 0
           AND documents = 0
           AND evidence = 0
           AND incident_impacts = 0
       )
     RETURNING id`,
    [id]
  );

  return row;
}

export async function createIpInDb(input: CreateIpInput) {
  const row = await queryOne<IpRow>(
    `WITH inserted AS (
       INSERT INTO ip_addresses (prefix_id, interface_id, address, status, role, description)
       SELECT p.id, $4::uuid, $1::inet, $2, $3, $5
       FROM prefixes p
       WHERE p.prefix = $6::cidr
       RETURNING id, prefix_id, interface_id, address, status
     )
     SELECT
       inserted.id,
       inserted.address::text,
       p.prefix::text,
       d.name AS device,
       i.name AS interface,
       COALESCE(ds.code, ps.code) AS site,
       NULL::text AS service,
       inserted.status
     FROM inserted
     JOIN prefixes p ON p.id = inserted.prefix_id
     LEFT JOIN sites ps ON ps.id = p.site_id
     LEFT JOIN interfaces i ON i.id = inserted.interface_id
     LEFT JOIN devices d ON d.id = i.device_id
     LEFT JOIN sites ds ON ds.id = d.site_id`,
    [
      input.address,
      input.status ?? "reserved",
      input.role,
      input.interfaceId ?? null,
      input.description ?? null,
      input.prefix
    ]
  );

  return row ? mapIp(row) : null;
}
