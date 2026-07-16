import { query, queryOne } from "../../shared/db.js";

type CircuitRow = {
  id: string;
  code: string;
  name: string;
  provider_code: string | null;
  provider_name: string | null;
  contract_code: string | null;
  status: string;
  capacity_mbps: number | null;
  a_site: string | null;
  z_site: string | null;
  sla_target: string | null;
  endpoint_count: string;
  linked_interfaces: string;
};

type EndpointRow = {
  id: string;
  circuit_code: string;
  site_code: string | null;
  device: string | null;
  interface: string | null;
  label: string;
  demarcation: string | null;
};

type CircuitImpactRow = {
  circuit_code: string;
  site_code: string | null;
  device: string | null;
  interface: string | null;
  interface_status: string | null;
};

export type CreateCircuitInput = {
  code: string;
  name: string;
  circuitType: string;
  providerCode?: string | null;
  contractCode?: string | null;
  status?: string;
  capacityMbps?: number | null;
  slaTarget?: number | null;
  installedAt?: string | null;
  notes?: string | null;
};

export type UpdateCircuitInput = Partial<CreateCircuitInput> & {
  codeOrId: string;
};

export type CreateCircuitEndpointInput = {
  circuitCode: string;
  siteCode?: string | null;
  deviceName?: string | null;
  interfaceName?: string | null;
  label: string;
  demarcation?: string | null;
};

export type UpdateCircuitEndpointInput = Partial<CreateCircuitEndpointInput> & {
  id: string;
};

function mapCircuit(row: CircuitRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    providerCode: row.provider_code ?? "OWN",
    providerName: row.provider_name ?? "Propio",
    contractCode: row.contract_code,
    status: row.status,
    capacityMbps: Number(row.capacity_mbps ?? 0),
    aSite: row.a_site ?? "pendiente",
    zSite: row.z_site ?? "pendiente",
    slaTarget: Number(row.sla_target ?? 0),
    endpointCount: Number(row.endpoint_count ?? 0),
    linkedInterfaces: Number(row.linked_interfaces ?? 0)
  };
}

function mapEndpoint(row: EndpointRow) {
  return {
    id: row.id,
    circuitCode: row.circuit_code,
    siteCode: row.site_code,
    device: row.device,
    interface: row.interface,
    label: row.label,
    demarcation: row.demarcation
  };
}

export async function listCircuitsFromDb() {
  const rows = await query<CircuitRow>(
    `WITH endpoint_rollup AS (
       SELECT
         ce.circuit_id,
         MAX(s.code) FILTER (WHERE ce.label IN ('A', 'a')) AS a_site,
         MAX(s.code) FILTER (WHERE ce.label IN ('Z', 'z', 'B', 'b')) AS z_site,
         COUNT(ce.id) AS endpoint_count,
         COUNT(ce.interface_id) AS linked_interfaces
       FROM circuit_endpoints ce
       LEFT JOIN sites s ON s.id = ce.site_id
       GROUP BY ce.circuit_id
     )
     SELECT
       c.id,
       c.code,
       c.name,
       p.code AS provider_code,
       p.name AS provider_name,
       ct.code AS contract_code,
       c.status,
       c.capacity_mbps,
       er.a_site,
       er.z_site,
       c.sla_target::text,
       COALESCE(er.endpoint_count, 0) AS endpoint_count,
       COALESCE(er.linked_interfaces, 0) AS linked_interfaces
     FROM circuits c
     LEFT JOIN providers p ON p.id = c.provider_id
     LEFT JOIN contracts ct ON ct.id = c.contract_id
     LEFT JOIN endpoint_rollup er ON er.circuit_id = c.id
     ORDER BY c.status DESC, c.code`
  );

  return rows?.map(mapCircuit) ?? null;
}

export async function getCircuitFromDb(code: string) {
  const circuits = await listCircuitsFromDb();
  return circuits?.find((item) => item.code === code || item.id === code) ?? null;
}

export async function listCircuitEndpointsFromDb(circuitCode?: string) {
  const rows = await query<EndpointRow>(
    `SELECT
       ce.id,
       c.code AS circuit_code,
       s.code AS site_code,
       d.name AS device,
       i.name AS interface,
       ce.label,
       ce.demarcation
     FROM circuit_endpoints ce
     JOIN circuits c ON c.id = ce.circuit_id
     LEFT JOIN sites s ON s.id = ce.site_id
     LEFT JOIN devices d ON d.id = ce.device_id
     LEFT JOIN interfaces i ON i.id = ce.interface_id
     WHERE ($1::text IS NULL OR c.code = $1 OR c.id::text = $1)
     ORDER BY c.code, ce.label`,
    [circuitCode ?? null]
  );

  return rows?.map(mapEndpoint) ?? null;
}

export async function createCircuitInDb(input: CreateCircuitInput) {
  const row = await queryOne<CircuitRow>(
    `WITH selected_provider AS (
       SELECT id, code, name FROM providers WHERE code = $4
     ),
     selected_contract AS (
       SELECT id, code FROM contracts WHERE code = $5
     )
     INSERT INTO circuits
       (provider_id, contract_id, code, name, circuit_type, status, capacity_mbps, sla_target, installed_at, notes)
     VALUES (
       (SELECT id FROM selected_provider),
       (SELECT id FROM selected_contract),
       $1,
       $2,
       $3,
       $6,
       $7,
       $8,
       $9,
       $10
     )
     RETURNING
       id,
       code,
       name,
       (SELECT code FROM selected_provider) AS provider_code,
       (SELECT name FROM selected_provider) AS provider_name,
       (SELECT code FROM selected_contract) AS contract_code,
       status,
       capacity_mbps,
       NULL::text AS a_site,
       NULL::text AS z_site,
       sla_target::text,
       0 AS endpoint_count,
       0 AS linked_interfaces`,
    [
      input.code,
      input.name,
      input.circuitType,
      input.providerCode ?? null,
      input.contractCode ?? null,
      input.status ?? "planned",
      input.capacityMbps ?? null,
      input.slaTarget ?? null,
      input.installedAt ?? null,
      input.notes ?? null
    ]
  );

  return row ? mapCircuit(row) : null;
}

export async function updateCircuitStatusInDb(code: string, status: string) {
  const row = await queryOne<CircuitRow>(
    `WITH updated AS (
       UPDATE circuits
       SET status = $2
       WHERE id::text = $1 OR code = $1
       RETURNING *
     ),
     endpoint_rollup AS (
       SELECT
         ce.circuit_id,
         MAX(s.code) FILTER (WHERE ce.label IN ('A', 'a')) AS a_site,
         MAX(s.code) FILTER (WHERE ce.label IN ('Z', 'z', 'B', 'b')) AS z_site,
         COUNT(ce.id) AS endpoint_count,
         COUNT(ce.interface_id) AS linked_interfaces
       FROM circuit_endpoints ce
       LEFT JOIN sites s ON s.id = ce.site_id
       WHERE ce.circuit_id = (SELECT id FROM updated)
       GROUP BY ce.circuit_id
     )
     SELECT
       u.id,
       u.code,
       u.name,
       p.code AS provider_code,
       p.name AS provider_name,
       ct.code AS contract_code,
       u.status,
       u.capacity_mbps,
       er.a_site,
       er.z_site,
       u.sla_target::text,
       COALESCE(er.endpoint_count, 0) AS endpoint_count,
       COALESCE(er.linked_interfaces, 0) AS linked_interfaces
     FROM updated u
     LEFT JOIN providers p ON p.id = u.provider_id
     LEFT JOIN contracts ct ON ct.id = u.contract_id
     LEFT JOIN endpoint_rollup er ON er.circuit_id = u.id`,
    [code, status]
  );

  return row ? mapCircuit(row) : null;
}

export async function updateCircuitInDb(input: UpdateCircuitInput) {
  const hasCode = Object.hasOwn(input, "code");
  const hasName = Object.hasOwn(input, "name");
  const hasCircuitType = Object.hasOwn(input, "circuitType");
  const hasProviderCode = Object.hasOwn(input, "providerCode");
  const hasContractCode = Object.hasOwn(input, "contractCode");
  const hasStatus = Object.hasOwn(input, "status");
  const hasCapacityMbps = Object.hasOwn(input, "capacityMbps");
  const hasSlaTarget = Object.hasOwn(input, "slaTarget");
  const hasInstalledAt = Object.hasOwn(input, "installedAt");
  const hasNotes = Object.hasOwn(input, "notes");
  const row = await queryOne<CircuitRow>(
    `WITH selected AS (
       SELECT c.* FROM circuits c WHERE c.id::text = $1 OR c.code = $1
     ),
     target_provider AS (
       SELECT id FROM providers WHERE code = $5
     ),
     target_contract AS (
       SELECT id FROM contracts WHERE code = $6
     ),
     updated AS (
       UPDATE circuits c
       SET
         code = CASE WHEN $12 THEN $2 ELSE c.code END,
         name = CASE WHEN $13 THEN $3 ELSE c.name END,
         circuit_type = CASE WHEN $14 THEN $4 ELSE c.circuit_type END,
         provider_id = CASE
           WHEN $15 AND $5 IS NULL THEN NULL
           WHEN $15 THEN (SELECT id FROM target_provider)
           ELSE c.provider_id
         END,
         contract_id = CASE
           WHEN $16 AND $6 IS NULL THEN NULL
           WHEN $16 THEN (SELECT id FROM target_contract)
           ELSE c.contract_id
         END,
         status = CASE WHEN $17 THEN $7 ELSE c.status END,
         capacity_mbps = CASE WHEN $18 THEN $8 ELSE c.capacity_mbps END,
         sla_target = CASE WHEN $19 THEN $9 ELSE c.sla_target END,
         installed_at = CASE WHEN $20 THEN $10::date ELSE c.installed_at END,
         notes = CASE WHEN $21 THEN $11 ELSE c.notes END
       WHERE c.id = (SELECT id FROM selected)
         AND (NOT $15 OR $5 IS NULL OR EXISTS (SELECT 1 FROM target_provider))
         AND (NOT $16 OR $6 IS NULL OR EXISTS (SELECT 1 FROM target_contract))
       RETURNING c.*
     ),
     endpoint_rollup AS (
       SELECT
         ce.circuit_id,
         MAX(s.code) FILTER (WHERE ce.label IN ('A', 'a')) AS a_site,
         MAX(s.code) FILTER (WHERE ce.label IN ('Z', 'z', 'B', 'b')) AS z_site,
         COUNT(ce.id) AS endpoint_count,
         COUNT(ce.interface_id) AS linked_interfaces
       FROM circuit_endpoints ce
       LEFT JOIN sites s ON s.id = ce.site_id
       WHERE ce.circuit_id = (SELECT id FROM updated)
       GROUP BY ce.circuit_id
     )
     SELECT
       u.id,
       u.code,
       u.name,
       p.code AS provider_code,
       p.name AS provider_name,
       ct.code AS contract_code,
       u.status,
       u.capacity_mbps,
       er.a_site,
       er.z_site,
       u.sla_target::text,
       COALESCE(er.endpoint_count, 0) AS endpoint_count,
       COALESCE(er.linked_interfaces, 0) AS linked_interfaces
     FROM updated u
     LEFT JOIN providers p ON p.id = u.provider_id
     LEFT JOIN contracts ct ON ct.id = u.contract_id
     LEFT JOIN endpoint_rollup er ON er.circuit_id = u.id`,
    [
      input.codeOrId,
      input.code ?? null,
      input.name ?? null,
      input.circuitType ?? null,
      input.providerCode ?? null,
      input.contractCode ?? null,
      input.status ?? null,
      input.capacityMbps ?? null,
      input.slaTarget ?? null,
      input.installedAt ?? null,
      input.notes ?? null,
      hasCode,
      hasName,
      hasCircuitType,
      hasProviderCode,
      hasContractCode,
      hasStatus,
      hasCapacityMbps,
      hasSlaTarget,
      hasInstalledAt,
      hasNotes
    ]
  );

  return row ? mapCircuit(row) : null;
}

export async function deleteCircuitInDb(code: string) {
  const row = await queryOne<{ id: string }>(
    `WITH selected AS (
       SELECT id FROM circuits WHERE id::text = $1 OR code = $1
     ),
     dependency_counts AS (
       SELECT
         (SELECT COUNT(*) FROM circuit_endpoints WHERE circuit_id = selected.id) AS endpoints,
         (SELECT COUNT(*) FROM interface_links WHERE circuit_id = selected.id) AS interface_links,
         (SELECT COUNT(*) FROM fiber_strands WHERE circuit_id = selected.id) AS fiber_strands,
         (SELECT COUNT(*) FROM patchcords WHERE circuit_id = selected.id) AS patchcords,
         (SELECT COUNT(*) FROM site_transport_links WHERE circuit_id = selected.id) AS transport_links,
         (SELECT COUNT(*) FROM documents WHERE object_type = 'circuit' AND object_id = selected.id) AS documents,
         (SELECT COUNT(*) FROM evidence_files WHERE object_type = 'circuit' AND object_id = selected.id) AS evidence,
         (SELECT COUNT(*) FROM incident_impacts WHERE object_type = 'circuit' AND object_id = selected.id) AS incident_impacts
       FROM selected
     )
     DELETE FROM circuits
     WHERE id = (SELECT id FROM selected)
       AND EXISTS (SELECT 1 FROM selected)
       AND EXISTS (
         SELECT 1
         FROM dependency_counts
         WHERE endpoints = 0
           AND interface_links = 0
           AND fiber_strands = 0
           AND patchcords = 0
           AND transport_links = 0
           AND documents = 0
           AND evidence = 0
           AND incident_impacts = 0
       )
     RETURNING id`,
    [code]
  );

  return row;
}

export async function getCircuitImpactFromDb(code: string) {
  const rows = await query<CircuitImpactRow>(
    `SELECT
       c.code AS circuit_code,
       s.code AS site_code,
       d.name AS device,
       i.name AS interface,
       i.status AS interface_status
     FROM circuit_endpoints ce
     JOIN circuits c ON c.id = ce.circuit_id
     LEFT JOIN sites s ON s.id = ce.site_id
     LEFT JOIN devices d ON d.id = ce.device_id
     LEFT JOIN interfaces i ON i.id = ce.interface_id
     WHERE c.code = $1 OR c.id::text = $1
     ORDER BY s.code, d.name, i.name`,
    [code]
  );

  if (!rows) {
    return null;
  }

  const sites = unique(rows.map((row) => row.site_code).filter(Boolean));
  const devices = unique(rows.map((row) => row.device).filter(Boolean));
  const interfaces = rows
    .filter((row) => row.interface)
    .map((row) => ({
      device: row.device,
      name: row.interface,
      status: row.interface_status
    }));

  return {
    circuitCode: rows[0]?.circuit_code ?? code,
    sites,
    devices,
    interfaces,
    risk: sites.length > 1 ? "inter_site_dependency" : "local_dependency"
  };
}

function unique<T>(items: Array<T | null | undefined>): T[] {
  return Array.from(new Set(items.filter((item): item is T => item !== null && item !== undefined)));
}

export async function createCircuitEndpointInDb(input: CreateCircuitEndpointInput) {
  const row = await queryOne<EndpointRow>(
    `WITH selected_circuit AS (
       SELECT id, code FROM circuits WHERE code = $1
     ),
     selected_site AS (
       SELECT id, code FROM sites WHERE code = $2
     ),
     selected_device AS (
       SELECT d.id, d.name
       FROM devices d
       WHERE d.name = $3
     ),
     selected_interface AS (
       SELECT i.id, i.name
       FROM interfaces i
       JOIN devices d ON d.id = i.device_id
       WHERE d.name = $3 AND i.name = $4
     )
     INSERT INTO circuit_endpoints (circuit_id, site_id, device_id, interface_id, label, demarcation)
     VALUES (
       (SELECT id FROM selected_circuit),
       (SELECT id FROM selected_site),
       (SELECT id FROM selected_device),
       (SELECT id FROM selected_interface),
       $5,
       $6
     )
     RETURNING
       id,
       (SELECT code FROM selected_circuit) AS circuit_code,
       (SELECT code FROM selected_site) AS site_code,
       (SELECT name FROM selected_device) AS device,
       (SELECT name FROM selected_interface) AS interface,
       label,
       demarcation`,
    [
      input.circuitCode,
      input.siteCode ?? null,
      input.deviceName ?? null,
      input.interfaceName ?? null,
      input.label,
      input.demarcation ?? null
    ]
  );

  return row ? mapEndpoint(row) : null;
}

export async function updateCircuitEndpointInDb(input: UpdateCircuitEndpointInput) {
  const hasCircuitCode = Object.hasOwn(input, "circuitCode");
  const hasSiteCode = Object.hasOwn(input, "siteCode");
  const hasDeviceName = Object.hasOwn(input, "deviceName");
  const hasInterfaceName = Object.hasOwn(input, "interfaceName");
  const hasLabel = Object.hasOwn(input, "label");
  const hasDemarcation = Object.hasOwn(input, "demarcation");
  const row = await queryOne<EndpointRow>(
    `WITH current_endpoint AS (
       SELECT ce.* FROM circuit_endpoints ce WHERE ce.id = $1::uuid
     ),
     selected_circuit AS (
       SELECT id, code FROM circuits WHERE code = $2
     ),
     selected_site AS (
       SELECT id, code FROM sites WHERE code = $3
     ),
     selected_device AS (
       SELECT d.id, d.name FROM devices d WHERE d.name = $4
     ),
     selected_interface AS (
       SELECT i.id, i.name
       FROM interfaces i
       JOIN devices d ON d.id = i.device_id
       WHERE d.name = $4 AND i.name = $5
     ),
     updated AS (
       UPDATE circuit_endpoints ce
       SET
         circuit_id = CASE WHEN $8 THEN (SELECT id FROM selected_circuit) ELSE ce.circuit_id END,
         site_id = CASE
           WHEN $9 AND $3 IS NULL THEN NULL
           WHEN $9 THEN (SELECT id FROM selected_site)
           ELSE ce.site_id
         END,
         device_id = CASE
           WHEN $10 AND $4 IS NULL THEN NULL
           WHEN $10 THEN (SELECT id FROM selected_device)
           ELSE ce.device_id
         END,
         interface_id = CASE
           WHEN $11 AND $5 IS NULL THEN NULL
           WHEN $11 THEN (SELECT id FROM selected_interface)
           ELSE ce.interface_id
         END,
         label = CASE WHEN $12 THEN $6 ELSE ce.label END,
         demarcation = CASE WHEN $13 THEN $7 ELSE ce.demarcation END
       WHERE ce.id = (SELECT id FROM current_endpoint)
         AND (NOT $8 OR EXISTS (SELECT 1 FROM selected_circuit))
         AND (NOT $9 OR $3 IS NULL OR EXISTS (SELECT 1 FROM selected_site))
         AND (NOT $10 OR $4 IS NULL OR EXISTS (SELECT 1 FROM selected_device))
         AND (NOT $11 OR $5 IS NULL OR EXISTS (SELECT 1 FROM selected_interface))
       RETURNING ce.*
     )
     SELECT
       u.id,
       c.code AS circuit_code,
       s.code AS site_code,
       d.name AS device,
       i.name AS interface,
       u.label,
       u.demarcation
     FROM updated u
     JOIN circuits c ON c.id = u.circuit_id
     LEFT JOIN sites s ON s.id = u.site_id
     LEFT JOIN devices d ON d.id = u.device_id
     LEFT JOIN interfaces i ON i.id = u.interface_id`,
    [
      input.id,
      input.circuitCode ?? null,
      input.siteCode ?? null,
      input.deviceName ?? null,
      input.interfaceName ?? null,
      input.label ?? null,
      input.demarcation ?? null,
      hasCircuitCode,
      hasSiteCode,
      hasDeviceName,
      hasInterfaceName,
      hasLabel,
      hasDemarcation
    ]
  );

  return row ? mapEndpoint(row) : null;
}

export async function deleteCircuitEndpointInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    "DELETE FROM circuit_endpoints WHERE id = $1::uuid RETURNING id",
    [id]
  );

  return row;
}
