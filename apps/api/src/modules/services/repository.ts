import { query, queryOne } from "../../shared/db.js";

type ServiceRow = {
  id: string;
  code: string;
  name: string;
  service_type: string;
  status: string;
  owner_team: string | null;
  description: string | null;
  endpoint_count: string;
  site_count: string;
};

type ServiceEndpointRow = {
  id: string;
  service_code: string;
  role: string;
  site_code: string | null;
  device: string | null;
  interface: string | null;
  ip_address: string | null;
  circuit_code: string | null;
};

export type CreateServiceInput = {
  code: string;
  name: string;
  serviceType: string;
  status?: string;
  ownerTeam?: string | null;
  description?: string | null;
};

export type UpdateServiceInput = Partial<CreateServiceInput> & {
  codeOrId: string;
};

export type CreateServiceEndpointInput = {
  serviceCode: string;
  role: string;
  siteCode?: string | null;
  deviceName?: string | null;
  interfaceName?: string | null;
  ipAddress?: string | null;
  circuitCode?: string | null;
};

export type UpdateServiceEndpointInput = Partial<CreateServiceEndpointInput> & {
  id: string;
};

function mapService(row: ServiceRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    serviceType: row.service_type,
    status: row.status,
    ownerTeam: row.owner_team,
    description: row.description,
    endpointCount: Number(row.endpoint_count ?? 0),
    siteCount: Number(row.site_count ?? 0)
  };
}

function mapEndpoint(row: ServiceEndpointRow) {
  return {
    id: row.id,
    serviceCode: row.service_code,
    role: row.role,
    siteCode: row.site_code,
    device: row.device,
    interface: row.interface,
    ipAddress: row.ip_address,
    circuitCode: row.circuit_code
  };
}

export async function listServicesFromDb() {
  const rows = await query<ServiceRow>(
    `SELECT
       svc.id,
       svc.code,
       svc.name,
       svc.service_type,
       svc.status,
       svc.owner_team,
       svc.description,
       COUNT(se.id) AS endpoint_count,
       COUNT(DISTINCT se.site_id) AS site_count
     FROM services svc
     LEFT JOIN service_endpoints se ON se.service_id = svc.id
     GROUP BY svc.id
     ORDER BY svc.status, svc.code`
  );

  return rows?.map(mapService) ?? null;
}

export async function getServiceFromDb(codeOrId: string) {
  const row = await queryOne<ServiceRow>(
    `SELECT
       svc.id,
       svc.code,
       svc.name,
       svc.service_type,
       svc.status,
       svc.owner_team,
       svc.description,
       COUNT(se.id) AS endpoint_count,
       COUNT(DISTINCT se.site_id) AS site_count
     FROM services svc
     LEFT JOIN service_endpoints se ON se.service_id = svc.id
     WHERE svc.code = $1 OR svc.id::text = $1
     GROUP BY svc.id`,
    [codeOrId]
  );

  return row ? mapService(row) : null;
}

export async function createServiceInDb(input: CreateServiceInput) {
  const row = await queryOne<ServiceRow>(
    `INSERT INTO services (code, name, service_type, status, owner_team, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, code, name, service_type, status, owner_team, description, 0 AS endpoint_count, 0 AS site_count`,
    [input.code, input.name, input.serviceType, input.status ?? "active", input.ownerTeam ?? null, input.description ?? null]
  );

  return row ? mapService(row) : null;
}

export async function updateServiceInDb(input: UpdateServiceInput) {
  const hasCode = Object.hasOwn(input, "code");
  const hasName = Object.hasOwn(input, "name");
  const hasServiceType = Object.hasOwn(input, "serviceType");
  const hasStatus = Object.hasOwn(input, "status");
  const hasOwnerTeam = Object.hasOwn(input, "ownerTeam");
  const hasDescription = Object.hasOwn(input, "description");
  const row = await queryOne<ServiceRow>(
    `WITH updated AS (
       UPDATE services svc
       SET
         code = CASE WHEN $8 THEN $2 ELSE svc.code END,
         name = CASE WHEN $9 THEN $3 ELSE svc.name END,
         service_type = CASE WHEN $10 THEN $4 ELSE svc.service_type END,
         status = CASE WHEN $11 THEN $5 ELSE svc.status END,
         owner_team = CASE WHEN $12 THEN $6 ELSE svc.owner_team END,
         description = CASE WHEN $13 THEN $7 ELSE svc.description END
       WHERE svc.code = $1 OR svc.id::text = $1
       RETURNING svc.*
     )
     SELECT
       u.id,
       u.code,
       u.name,
       u.service_type,
       u.status,
       u.owner_team,
       u.description,
       COUNT(se.id) AS endpoint_count,
       COUNT(DISTINCT se.site_id) AS site_count
     FROM updated u
     LEFT JOIN service_endpoints se ON se.service_id = u.id
     GROUP BY u.id, u.code, u.name, u.service_type, u.status, u.owner_team, u.description`,
    [
      input.codeOrId,
      input.code ?? null,
      input.name ?? null,
      input.serviceType ?? null,
      input.status ?? null,
      input.ownerTeam ?? null,
      input.description ?? null,
      hasCode,
      hasName,
      hasServiceType,
      hasStatus,
      hasOwnerTeam,
      hasDescription
    ]
  );

  return row ? mapService(row) : null;
}

export async function deleteServiceInDb(codeOrId: string) {
  const row = await queryOne<{ id: string }>(
    "DELETE FROM services WHERE code = $1 OR id::text = $1 RETURNING id",
    [codeOrId]
  );

  return row;
}

export async function listServiceEndpointsFromDb(serviceCode?: string) {
  const rows = await query<ServiceEndpointRow>(
    `SELECT
       se.id,
       svc.code AS service_code,
       se.role,
       s.code AS site_code,
       d.name AS device,
       i.name AS interface,
       ip.address::text AS ip_address,
       c.code AS circuit_code
     FROM service_endpoints se
     JOIN services svc ON svc.id = se.service_id
     LEFT JOIN sites s ON s.id = se.site_id
     LEFT JOIN devices d ON d.id = se.device_id
     LEFT JOIN interfaces i ON i.id = se.interface_id
     LEFT JOIN ip_addresses ip ON ip.id = se.ip_address_id
     LEFT JOIN circuits c ON c.id = se.circuit_id
     WHERE ($1::text IS NULL OR svc.code = $1 OR svc.id::text = $1)
     ORDER BY svc.code, se.role, s.code, d.name, i.name`,
    [serviceCode ?? null]
  );

  return rows?.map(mapEndpoint) ?? null;
}

export async function createServiceEndpointInDb(input: CreateServiceEndpointInput) {
  const row = await queryOne<ServiceEndpointRow>(
    `WITH selected_service AS (
       SELECT id, code FROM services WHERE code = $1
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
     selected_ip AS (
       SELECT id, address FROM ip_addresses WHERE address::text = $6 OR host(address)::text = $6
     ),
     selected_circuit AS (
       SELECT id, code FROM circuits WHERE code = $7
     )
     INSERT INTO service_endpoints (service_id, role, site_id, device_id, interface_id, ip_address_id, circuit_id)
     SELECT
       selected_service.id,
       $2,
       (SELECT id FROM selected_site),
       (SELECT id FROM selected_device),
       (SELECT id FROM selected_interface),
       (SELECT id FROM selected_ip),
       (SELECT id FROM selected_circuit)
     FROM selected_service
     WHERE ($3::text IS NULL OR EXISTS (SELECT 1 FROM selected_site))
       AND ($4::text IS NULL OR EXISTS (SELECT 1 FROM selected_device))
       AND ($5::text IS NULL OR EXISTS (SELECT 1 FROM selected_interface))
       AND ($6::text IS NULL OR EXISTS (SELECT 1 FROM selected_ip))
       AND ($7::text IS NULL OR EXISTS (SELECT 1 FROM selected_circuit))
     RETURNING
       id,
       (SELECT code FROM selected_service) AS service_code,
       role,
       (SELECT code FROM selected_site) AS site_code,
       (SELECT name FROM selected_device) AS device,
       (SELECT name FROM selected_interface) AS interface,
       (SELECT address::text FROM selected_ip) AS ip_address,
       (SELECT code FROM selected_circuit) AS circuit_code`,
    [
      input.serviceCode,
      input.role,
      input.siteCode ?? null,
      input.deviceName ?? null,
      input.interfaceName ?? null,
      input.ipAddress ?? null,
      input.circuitCode ?? null
    ]
  );

  return row ? mapEndpoint(row) : null;
}

export async function updateServiceEndpointInDb(input: UpdateServiceEndpointInput) {
  const hasServiceCode = Object.hasOwn(input, "serviceCode");
  const hasRole = Object.hasOwn(input, "role");
  const hasSiteCode = Object.hasOwn(input, "siteCode");
  const hasDeviceName = Object.hasOwn(input, "deviceName");
  const hasInterfaceName = Object.hasOwn(input, "interfaceName");
  const hasIpAddress = Object.hasOwn(input, "ipAddress");
  const hasCircuitCode = Object.hasOwn(input, "circuitCode");
  const row = await queryOne<ServiceEndpointRow>(
    `WITH selected_service AS (
       SELECT id, code FROM services WHERE code = $2
     ),
     selected_site AS (
       SELECT id, code FROM sites WHERE code = $4
     ),
     selected_device AS (
       SELECT d.id, d.name FROM devices d WHERE d.name = $5
     ),
     selected_interface AS (
       SELECT i.id, i.name
       FROM interfaces i
       JOIN devices d ON d.id = i.device_id
       WHERE d.name = $5 AND i.name = $6
     ),
     selected_ip AS (
       SELECT id, address FROM ip_addresses WHERE address::text = $7 OR host(address)::text = $7
     ),
     selected_circuit AS (
       SELECT id, code FROM circuits WHERE code = $8
     ),
     updated AS (
       UPDATE service_endpoints se
       SET
         service_id = CASE WHEN $9 THEN (SELECT id FROM selected_service) ELSE se.service_id END,
         role = CASE WHEN $10 THEN $3 ELSE se.role END,
         site_id = CASE WHEN $11 AND $4 IS NULL THEN NULL WHEN $11 THEN (SELECT id FROM selected_site) ELSE se.site_id END,
         device_id = CASE WHEN $12 AND $5 IS NULL THEN NULL WHEN $12 THEN (SELECT id FROM selected_device) ELSE se.device_id END,
         interface_id = CASE WHEN $13 AND $6 IS NULL THEN NULL WHEN $13 THEN (SELECT id FROM selected_interface) ELSE se.interface_id END,
         ip_address_id = CASE WHEN $14 AND $7 IS NULL THEN NULL WHEN $14 THEN (SELECT id FROM selected_ip) ELSE se.ip_address_id END,
         circuit_id = CASE WHEN $15 AND $8 IS NULL THEN NULL WHEN $15 THEN (SELECT id FROM selected_circuit) ELSE se.circuit_id END
       WHERE se.id = $1::uuid
         AND (NOT $9 OR EXISTS (SELECT 1 FROM selected_service))
         AND (NOT $11 OR $4 IS NULL OR EXISTS (SELECT 1 FROM selected_site))
         AND (NOT $12 OR $5 IS NULL OR EXISTS (SELECT 1 FROM selected_device))
         AND (NOT $13 OR $6 IS NULL OR EXISTS (SELECT 1 FROM selected_interface))
         AND (NOT $14 OR $7 IS NULL OR EXISTS (SELECT 1 FROM selected_ip))
         AND (NOT $15 OR $8 IS NULL OR EXISTS (SELECT 1 FROM selected_circuit))
       RETURNING se.*
     )
     SELECT
       u.id,
       svc.code AS service_code,
       u.role,
       s.code AS site_code,
       d.name AS device,
       i.name AS interface,
       ip.address::text AS ip_address,
       c.code AS circuit_code
     FROM updated u
     JOIN services svc ON svc.id = u.service_id
     LEFT JOIN sites s ON s.id = u.site_id
     LEFT JOIN devices d ON d.id = u.device_id
     LEFT JOIN interfaces i ON i.id = u.interface_id
     LEFT JOIN ip_addresses ip ON ip.id = u.ip_address_id
     LEFT JOIN circuits c ON c.id = u.circuit_id`,
    [
      input.id,
      input.serviceCode ?? null,
      input.role ?? null,
      input.siteCode ?? null,
      input.deviceName ?? null,
      input.interfaceName ?? null,
      input.ipAddress ?? null,
      input.circuitCode ?? null,
      hasServiceCode,
      hasRole,
      hasSiteCode,
      hasDeviceName,
      hasInterfaceName,
      hasIpAddress,
      hasCircuitCode
    ]
  );

  return row ? mapEndpoint(row) : null;
}

export async function deleteServiceEndpointInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    "DELETE FROM service_endpoints WHERE id = $1::uuid RETURNING id",
    [id]
  );

  return row;
}
