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
  role: string;
  status: string;
  description: string | null;
};

type VlanRow = {
  id: string;
  site_code: string | null;
  vlan_id: number;
  name: string;
  purpose: string | null;
  interfaces: string;
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
  deviceName?: string | null;
  interfaceName?: string | null;
  description?: string | null;
};

export type UpdateIpInput = {
  id: string;
  role?: string;
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

export type CreateVlanInput = {
  siteCode?: string | null;
  vlanId: number;
  name: string;
  purpose?: string | null;
};

export type UpdateVlanInput = CreateVlanInput & {
  id: string;
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
    role: row.role,
    status: row.status,
    description: row.description
  };
}

function mapVlan(row: VlanRow) {
  return {
    id: row.id,
    siteCode: row.site_code ?? "GLOBAL",
    vlanId: row.vlan_id,
    name: row.name,
    purpose: row.purpose,
    interfaces: Number(row.interfaces ?? 0)
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
       ip.role,
       ip.status,
       ip.description
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

export async function listVlansFromDb() {
  const rows = await query<VlanRow>(
    `SELECT
       v.id,
       s.code AS site_code,
       v.vlan_id,
       v.name,
       v.purpose,
       COUNT(i.id) AS interfaces
     FROM vlans v
     LEFT JOIN sites s ON s.id = v.site_id
     LEFT JOIN interfaces i ON i.vlan_id = v.id
     GROUP BY v.id, s.code
     ORDER BY s.code NULLS FIRST, v.vlan_id`
  );

  return rows?.map(mapVlan) ?? null;
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
    `WITH selected_interface AS (
       SELECT i.id
       FROM interfaces i
       JOIN devices d ON d.id = i.device_id
       WHERE ($4::uuid IS NOT NULL AND i.id = $4::uuid)
          OR ($7::text IS NOT NULL AND $8::text IS NOT NULL AND upper(d.name) = upper($7) AND i.name = $8)
       LIMIT 1
     ),
     inserted AS (
       INSERT INTO ip_addresses (prefix_id, interface_id, address, status, role, description)
       SELECT p.id, (SELECT id FROM selected_interface), $1::inet, $2, $3, $5
       FROM prefixes p
       WHERE p.prefix = $6::cidr
         AND ($4::uuid IS NULL OR EXISTS (SELECT 1 FROM selected_interface))
         AND ($7::text IS NULL OR EXISTS (SELECT 1 FROM selected_interface))
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
       $3::text AS role,
       inserted.status,
       $5::text AS description
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
      input.prefix,
      input.deviceName ?? null,
      input.interfaceName ?? null
    ]
  );

  return row ? mapIp(row) : null;
}

export async function updateIpInDb(input: UpdateIpInput) {
  const row = await queryOne<IpRow>(
    `WITH updated AS (
       UPDATE ip_addresses
       SET interface_id = $2::uuid,
           role = COALESCE($3, role),
           status = COALESCE($4, status),
           description = $5
       WHERE id::text = $1 OR address::text = $1
       RETURNING id, prefix_id, interface_id, address, role, status, description
     )
     SELECT
       updated.id,
       updated.address::text,
       p.prefix::text,
       d.name AS device,
       i.name AS interface,
       COALESCE(ds.code, ps.code) AS site,
       svc.name AS service,
       updated.role,
       updated.status,
       updated.description
     FROM updated
     JOIN prefixes p ON p.id = updated.prefix_id
     LEFT JOIN sites ps ON ps.id = p.site_id
     LEFT JOIN interfaces i ON i.id = updated.interface_id
     LEFT JOIN devices d ON d.id = i.device_id
     LEFT JOIN sites ds ON ds.id = d.site_id
     LEFT JOIN service_endpoints se ON se.ip_address_id = updated.id
     LEFT JOIN services svc ON svc.id = se.service_id`,
    [input.id, input.interfaceId ?? null, input.role ?? null, input.status ?? null, input.description ?? null]
  );

  return row ? mapIp(row) : null;
}

export async function deleteIpInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM ip_addresses
     WHERE (id::text = $1 OR address::text = $1)
       AND NOT EXISTS (SELECT 1 FROM service_endpoints WHERE ip_address_id = ip_addresses.id)
       AND NOT EXISTS (SELECT 1 FROM documents WHERE object_type = 'ip_address' AND object_id = ip_addresses.id)
       AND NOT EXISTS (SELECT 1 FROM evidence_files WHERE object_type = 'ip_address' AND object_id = ip_addresses.id)
       AND NOT EXISTS (SELECT 1 FROM incident_impacts WHERE object_type = 'ip_address' AND object_id = ip_addresses.id)
     RETURNING id`,
    [id]
  );

  return row ?? null;
}

export async function createVlanInDb(input: CreateVlanInput) {
  const row = await queryOne<VlanRow>(
    `WITH input_site AS (
       SELECT $1::text AS code
     ),
     selected_site AS (
       SELECT id, code FROM sites WHERE code = $1
     )
     INSERT INTO vlans (site_id, vlan_id, name, purpose)
     SELECT (SELECT id FROM selected_site), $2, $3, $4
     FROM input_site
     WHERE input_site.code IS NULL OR EXISTS (SELECT 1 FROM selected_site)
     RETURNING
       id,
       (SELECT code FROM selected_site) AS site_code,
       vlan_id,
       name,
       purpose,
       0 AS interfaces`,
    [input.siteCode ?? null, input.vlanId, input.name, input.purpose ?? null]
  );

  return row ? mapVlan(row) : null;
}

export async function updateVlanInDb(input: UpdateVlanInput) {
  const row = await queryOne<VlanRow>(
    `WITH input_site AS (
       SELECT $2::text AS code
     ),
     selected_site AS (
       SELECT id, code FROM sites WHERE code = $2
     ),
     updated AS (
       UPDATE vlans
       SET site_id = (SELECT id FROM selected_site),
           vlan_id = $3,
           name = $4,
           purpose = $5
       WHERE id::text = $1
         AND ((SELECT code FROM input_site) IS NULL OR EXISTS (SELECT 1 FROM selected_site))
       RETURNING *
     )
     SELECT
       updated.id,
       (SELECT code FROM selected_site) AS site_code,
       updated.vlan_id,
       updated.name,
       updated.purpose,
       COUNT(i.id) AS interfaces
     FROM updated
     LEFT JOIN interfaces i ON i.vlan_id = updated.id
     GROUP BY updated.id, updated.vlan_id, updated.name, updated.purpose`,
    [input.id, input.siteCode ?? null, input.vlanId, input.name, input.purpose ?? null]
  );

  return row ? mapVlan(row) : null;
}

export async function deleteVlanInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM vlans
     WHERE id::text = $1
       AND NOT EXISTS (SELECT 1 FROM interfaces WHERE vlan_id = vlans.id)
     RETURNING id`,
    [id]
  );

  return row ?? null;
}
