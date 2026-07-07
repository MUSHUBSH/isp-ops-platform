import { query, queryOne } from "../../shared/db.js";

type ManufacturerRow = {
  id: string;
  name: string;
};

type DeviceModelRow = {
  id: string;
  manufacturer: string;
  model: string;
  device_type: string;
};

type DeviceRoleRow = {
  id: string;
  code: string;
  name: string;
};

type DeviceRow = {
  id: string;
  name: string;
  role: string | null;
  site_code: string;
  status: string;
  management_ip: string | null;
  interfaces: string;
  last_backup_at: string | null;
};

type InterfaceRow = {
  id: string;
  device: string;
  site_code: string;
  name: string;
  interface_type: string;
  status: string;
  speed_mbps: number | null;
  description: string | null;
};

type LinkRow = {
  id: string;
  a_interface_id: string;
  b_interface_id: string;
  a_device: string;
  b_device: string;
  circuit_code: string | null;
  status: string;
  capacity_mbps: number | null;
};

type RackRow = {
  id: string;
  site_code: string;
  code: string;
  name: string;
  height_u: number;
};

type RackDeviceRow = {
  rack_id: string;
  id: string;
  name: string;
  role: string | null;
  status: string;
  position_u: number | null;
  height_u: number;
  power_feed: string | null;
};

type PowerFeedRow = {
  id: string;
  site_code: string;
  name: string;
  feed_type: string;
  status: string;
  capacity_watts: number | null;
  load_watts: number | null;
  source: string | null;
};

type PowerAssetRow = {
  id: string;
  site_code: string;
  name: string;
  asset_type: string;
  status: string;
  capacity_watts: number | null;
  load_watts: number | null;
  autonomy_minutes: number | null;
  battery_health_percent: number | null;
  source_feed: string | null;
  notes: string | null;
};

export type CreateDeviceInput = {
  siteCode: string;
  name: string;
  status?: string;
  roleCode?: string | null;
  modelId?: string | null;
  managementIp?: string | null;
  serialNumber?: string | null;
};

export type UpdateDeviceInput = {
  id: string;
  siteCode?: string | null;
  name?: string;
  status?: string;
  roleCode?: string | null;
  managementIp?: string | null;
  serialNumber?: string | null;
};

export type CreateInterfaceInput = {
  deviceName: string;
  name: string;
  interfaceType: string;
  status?: string;
  speedMbps?: number | null;
  macAddress?: string | null;
  description?: string | null;
};

export type UpdateInterfaceInput = {
  id: string;
  name?: string;
  interfaceType?: string;
  status?: string;
  speedMbps?: number | null;
  description?: string | null;
};

export type CreateInterfaceLinkInput = {
  aInterfaceId: string;
  bInterfaceId: string;
  circuitCode?: string | null;
  linkType: string;
  status?: string;
  capacityMbps?: number | null;
};

export type CreateRackInput = {
  siteCode: string;
  code: string;
  name: string;
  heightU?: number;
};

export type UpdateRackInput = {
  id: string;
  code?: string;
  name?: string;
  heightU?: number;
};

export type CreatePowerFeedInput = {
  siteCode: string;
  name: string;
  feedType?: string;
  status?: string;
  capacityWatts?: number | null;
  loadWatts?: number | null;
  source?: string | null;
};

export type UpdatePowerFeedInput = {
  id: string;
  name?: string;
  feedType?: string;
  status?: string;
  capacityWatts?: number | null;
  loadWatts?: number | null;
  source?: string | null;
};

export type CreatePowerAssetInput = {
  siteCode: string;
  name: string;
  assetType: string;
  status?: string;
  capacityWatts?: number | null;
  loadWatts?: number | null;
  autonomyMinutes?: number | null;
  batteryHealthPercent?: number | null;
  sourceFeedId?: string | null;
  notes?: string | null;
};

export type UpdateDevicePlacementInput = {
  id: string;
  rackId: string;
  positionU: number;
  heightU: number;
  powerFeedId?: string | null;
};

function mapDevice(row: DeviceRow) {
  return {
    id: row.id,
    name: row.name,
    role: row.role ?? "unknown",
    siteCode: row.site_code,
    status: row.status === "active" ? "healthy" : row.status,
    managementIp: row.management_ip,
    interfaces: Number(row.interfaces ?? 0),
    lastBackupAt: row.last_backup_at
  };
}

function mapInterface(row: InterfaceRow) {
  return {
    id: row.id,
    device: row.device,
    siteCode: row.site_code,
    name: row.name,
    type: row.interface_type,
    status: row.status,
    speedMbps: row.speed_mbps,
    description: row.description
  };
}

function mapLink(row: LinkRow) {
  return {
    id: row.id,
    aInterfaceId: row.a_interface_id,
    bInterfaceId: row.b_interface_id,
    aDevice: row.a_device,
    bDevice: row.b_device,
    circuitCode: row.circuit_code,
    status: row.status,
    capacityMbps: row.capacity_mbps
  };
}

function mapPowerFeed(row: PowerFeedRow) {
  return {
    id: row.id,
    siteCode: row.site_code,
    name: row.name,
    feedType: row.feed_type,
    status: row.status,
    capacityWatts: row.capacity_watts,
    loadWatts: row.load_watts,
    source: row.source
  };
}

function mapPowerAsset(row: PowerAssetRow) {
  return {
    id: row.id,
    siteCode: row.site_code,
    name: row.name,
    assetType: row.asset_type,
    status: row.status,
    capacityWatts: row.capacity_watts,
    loadWatts: row.load_watts,
    autonomyMinutes: row.autonomy_minutes,
    batteryHealthPercent: row.battery_health_percent,
    sourceFeed: row.source_feed,
    notes: row.notes
  };
}

export async function listManufacturersFromDb() {
  return await query<ManufacturerRow>("SELECT id, name FROM manufacturers ORDER BY name");
}

export async function listDeviceModelsFromDb() {
  return await query<DeviceModelRow>(
    `SELECT dm.id, m.name AS manufacturer, dm.model, dm.device_type
     FROM device_models dm
     JOIN manufacturers m ON m.id = dm.manufacturer_id
     ORDER BY m.name, dm.model`
  );
}

export async function listDeviceRolesFromDb() {
  return await query<DeviceRoleRow>("SELECT id, code, name FROM device_roles ORDER BY code");
}

export async function listDevicesFromDb() {
  const rows = await query<DeviceRow>(
    `SELECT
       d.id,
       d.name,
       dr.code AS role,
       s.code AS site_code,
       d.status,
       d.management_ip::text,
       COUNT(i.id) AS interfaces,
       MAX(cb.collected_at)::text AS last_backup_at
     FROM devices d
     JOIN sites s ON s.id = d.site_id
     LEFT JOIN device_roles dr ON dr.id = d.role_id
     LEFT JOIN interfaces i ON i.device_id = d.id
     LEFT JOIN config_backups cb ON cb.device_id = d.id
     GROUP BY d.id, dr.code, s.code
     ORDER BY s.code, d.name`
  );

  return rows?.map(mapDevice) ?? null;
}

export async function listInterfacesFromDb() {
  const rows = await query<InterfaceRow>(
    `SELECT
       i.id,
       d.name AS device,
       s.code AS site_code,
       i.name,
       i.interface_type,
       i.status,
       i.speed_mbps,
       i.description
     FROM interfaces i
     JOIN devices d ON d.id = i.device_id
     JOIN sites s ON s.id = d.site_id
     ORDER BY d.name, i.name`
  );

  return rows?.map(mapInterface) ?? null;
}

export async function listInterfaceLinksFromDb() {
  const rows = await query<LinkRow>(
    `SELECT
       il.id,
       il.a_interface_id::text,
       il.b_interface_id::text,
       ad.name AS a_device,
       bd.name AS b_device,
       c.code AS circuit_code,
       il.status,
       il.capacity_mbps
     FROM interface_links il
     JOIN interfaces ai ON ai.id = il.a_interface_id
     JOIN devices ad ON ad.id = ai.device_id
     JOIN interfaces bi ON bi.id = il.b_interface_id
     JOIN devices bd ON bd.id = bi.device_id
     LEFT JOIN circuits c ON c.id = il.circuit_id
     ORDER BY ad.name, bd.name`
  );

  return rows?.map(mapLink) ?? null;
}

export async function createDeviceInDb(input: CreateDeviceInput) {
  const row = await queryOne<DeviceRow>(
    `WITH selected_site AS (
       SELECT id FROM sites WHERE code = $1
     ),
     selected_role AS (
       SELECT id FROM device_roles WHERE code = $4
     )
     INSERT INTO devices (site_id, model_id, role_id, name, status, serial_number, management_ip)
     VALUES (
       (SELECT id FROM selected_site),
       $5::uuid,
       (SELECT id FROM selected_role),
       $2,
       $3,
       $6,
       $7::inet
     )
     RETURNING
       id,
       name,
       $4::text AS role,
       $1::text AS site_code,
       status,
       management_ip::text,
       0 AS interfaces,
       NULL::text AS last_backup_at`,
    [
      input.siteCode,
      input.name,
      input.status ?? "planned",
      input.roleCode ?? null,
      input.modelId ?? null,
      input.serialNumber ?? null,
      input.managementIp ?? null
    ]
  );

  return row ? mapDevice(row) : null;
}

export async function updateDeviceInDb(input: UpdateDeviceInput) {
  const row = await queryOne<DeviceRow>(
    `WITH selected_site AS (
       SELECT id FROM sites WHERE code = $2
     ), selected_role AS (
       SELECT id FROM device_roles WHERE code = $5
     )
     UPDATE devices d
     SET site_id = COALESCE((SELECT id FROM selected_site), site_id),
         name = COALESCE($3, name),
         status = COALESCE($4, status),
         role_id = CASE WHEN $5::text IS NULL THEN role_id ELSE (SELECT id FROM selected_role) END,
         management_ip = $6::inet,
         serial_number = COALESCE($7, serial_number),
         updated_at = now()
     WHERE d.id = $1::uuid
     RETURNING
       d.id,
       d.name,
       (SELECT dr.code FROM device_roles dr WHERE dr.id = d.role_id) AS role,
       (SELECT s.code FROM sites s WHERE s.id = d.site_id) AS site_code,
       d.status,
       d.management_ip::text,
       (SELECT COUNT(*)::text FROM interfaces i WHERE i.device_id = d.id) AS interfaces,
       (SELECT MAX(cb.collected_at)::text FROM config_backups cb WHERE cb.device_id = d.id) AS last_backup_at`,
    [input.id, input.siteCode ?? null, input.name ?? null, input.status ?? null, input.roleCode ?? null, input.managementIp ?? null, input.serialNumber ?? null]
  );

  return row ? mapDevice(row) : null;
}

export async function deleteDeviceInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM devices
     WHERE id = $1::uuid
       AND NOT EXISTS (SELECT 1 FROM interfaces WHERE device_id = devices.id)
       AND NOT EXISTS (SELECT 1 FROM config_backups WHERE device_id = devices.id)
       AND NOT EXISTS (SELECT 1 FROM incident_impacts WHERE object_type = 'device' AND object_id = devices.id)
       AND NOT EXISTS (SELECT 1 FROM maintenance_windows WHERE object_type = 'device' AND object_id = devices.id)
       AND NOT EXISTS (SELECT 1 FROM documents WHERE object_type = 'device' AND object_id = devices.id)
       AND NOT EXISTS (SELECT 1 FROM evidence_files WHERE object_type = 'device' AND object_id = devices.id)
     RETURNING id`,
    [id]
  );

  return row ?? null;
}

export async function createInterfaceInDb(input: CreateInterfaceInput) {
  const row = await queryOne<InterfaceRow>(
    `INSERT INTO interfaces (device_id, name, interface_type, status, mac_address, speed_mbps, description)
     SELECT d.id, $2, $3, $4, $5::macaddr, $6, $7
     FROM devices d
     WHERE d.name = $1
     RETURNING
       id,
       $1::text AS device,
       (SELECT s.code FROM devices rd JOIN sites s ON s.id = rd.site_id WHERE rd.name = $1) AS site_code,
       name,
       interface_type,
       status,
       speed_mbps,
       description`,
    [
      input.deviceName,
      input.name,
      input.interfaceType,
      input.status ?? "unknown",
      input.macAddress ?? null,
      input.speedMbps ?? null,
      input.description ?? null
    ]
  );

  return row ? mapInterface(row) : null;
}

export async function updateInterfaceInDb(input: UpdateInterfaceInput) {
  const row = await queryOne<InterfaceRow>(
    `UPDATE interfaces i
     SET name = COALESCE($2, name),
         interface_type = COALESCE($3, interface_type),
         status = COALESCE($4, status),
         speed_mbps = $5,
         description = COALESCE($6, description)
     WHERE i.id = $1::uuid
     RETURNING
       i.id,
       (SELECT d.name FROM devices d WHERE d.id = i.device_id) AS device,
       (SELECT s.code FROM devices d JOIN sites s ON s.id = d.site_id WHERE d.id = i.device_id) AS site_code,
       i.name,
       i.interface_type,
       i.status,
       i.speed_mbps,
       i.description`,
    [input.id, input.name ?? null, input.interfaceType ?? null, input.status ?? null, input.speedMbps ?? null, input.description ?? null]
  );

  return row ? mapInterface(row) : null;
}

export async function deleteInterfaceInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM interfaces
     WHERE id = $1::uuid
       AND NOT EXISTS (SELECT 1 FROM ip_addresses WHERE interface_id = interfaces.id)
       AND NOT EXISTS (SELECT 1 FROM interface_links WHERE a_interface_id = interfaces.id OR b_interface_id = interfaces.id)
       AND NOT EXISTS (SELECT 1 FROM circuit_endpoints WHERE interface_id = interfaces.id)
     RETURNING id`,
    [id]
  );

  return row ?? null;
}

export async function createInterfaceLinkInDb(input: CreateInterfaceLinkInput) {
  const row = await queryOne<LinkRow>(
    `WITH selected_circuit AS (
       SELECT id, code FROM circuits WHERE code = $3
     )
     INSERT INTO interface_links (a_interface_id, b_interface_id, circuit_id, link_type, status, capacity_mbps)
     VALUES ($1::uuid, $2::uuid, (SELECT id FROM selected_circuit), $4, $5, $6)
     RETURNING
       id,
       a_interface_id::text,
       b_interface_id::text,
       (SELECT d.name FROM interfaces i JOIN devices d ON d.id = i.device_id WHERE i.id = $1::uuid) AS a_device,
       (SELECT d.name FROM interfaces i JOIN devices d ON d.id = i.device_id WHERE i.id = $2::uuid) AS b_device,
       (SELECT code FROM selected_circuit) AS circuit_code,
       status,
       capacity_mbps`,
    [
      input.aInterfaceId,
      input.bInterfaceId,
      input.circuitCode ?? null,
      input.linkType,
      input.status ?? "active",
      input.capacityMbps ?? null
    ]
  );

  return row ? mapLink(row) : null;
}


export async function listRacksBySiteFromDb(siteCode: string) {
  const racks = await query<RackRow>(
    `SELECT r.id, s.code AS site_code, r.code, r.name, r.height_u
     FROM racks r
     JOIN sites s ON s.id = r.site_id
     WHERE s.code = $1
     ORDER BY r.code`,
    [siteCode]
  );

  if (!racks) {
    return null;
  }

  const devices = await query<RackDeviceRow>(
    `SELECT
       r.id AS rack_id,
       d.id,
       d.name,
       dr.code AS role,
       d.status,
       d.position_u,
       d.height_u,
       pf.name AS power_feed
     FROM racks r
     JOIN sites s ON s.id = r.site_id
     LEFT JOIN devices d ON d.rack_id = r.id
     LEFT JOIN device_roles dr ON dr.id = d.role_id
     LEFT JOIN power_feeds pf ON pf.id = d.power_feed_id
     WHERE s.code = $1
     ORDER BY r.code, d.position_u DESC NULLS LAST`,
    [siteCode]
  );

  return racks.map((rack) => {
    const rackDevices = (devices ?? []).filter((device) => device.rack_id === rack.id && device.id);
    const utilizationU = rackDevices.reduce((sum, device) => sum + Number(device.height_u ?? 1), 0);

    return {
      id: rack.id,
      siteCode: rack.site_code,
      code: rack.code,
      name: rack.name,
      heightU: Number(rack.height_u),
      utilizationU,
      devices: rackDevices.map((device) => ({
        id: device.id,
        name: device.name,
        role: device.role ?? "unknown",
        status: device.status === "active" ? "healthy" : device.status,
        positionU: device.position_u,
        heightU: Number(device.height_u ?? 1),
        powerFeed: device.power_feed
      }))
    };
  });
}

export async function listPowerFeedsBySiteFromDb(siteCode: string) {
  const rows = await query<PowerFeedRow>(
    `SELECT pf.id, s.code AS site_code, pf.name, pf.feed_type, pf.status, pf.capacity_watts, pf.load_watts, pf.source
     FROM power_feeds pf
     JOIN sites s ON s.id = pf.site_id
     WHERE s.code = $1
     ORDER BY pf.name`,
    [siteCode]
  );

  return rows?.map(mapPowerFeed) ?? null;
}

export async function listPowerAssetsBySiteFromDb(siteCode: string) {
  const rows = await query<PowerAssetRow>(
    `SELECT pa.id, s.code AS site_code, pa.name, pa.asset_type, pa.status, pa.capacity_watts, pa.load_watts,
            pa.autonomy_minutes, pa.battery_health_percent, pf.name AS source_feed, pa.notes
     FROM power_assets pa
     JOIN sites s ON s.id = pa.site_id
     LEFT JOIN power_feeds pf ON pf.id = pa.source_feed_id
     WHERE s.code = $1
     ORDER BY pa.asset_type, pa.name`,
    [siteCode]
  );

  return rows?.map(mapPowerAsset) ?? null;
}

export async function createPowerAssetInDb(input: CreatePowerAssetInput) {
  const row = await queryOne<PowerAssetRow>(
    `INSERT INTO power_assets (site_id, source_feed_id, name, asset_type, status, capacity_watts, load_watts, autonomy_minutes, battery_health_percent, notes)
     SELECT s.id, $9::uuid, $2, $3, $4, $5, $6, $7, $8, $10
     FROM sites s
     WHERE s.code = $1
     RETURNING id, $1::text AS site_code, name, asset_type, status, capacity_watts, load_watts, autonomy_minutes, battery_health_percent,
       (SELECT name FROM power_feeds WHERE id = source_feed_id) AS source_feed, notes`,
    [
      input.siteCode,
      input.name,
      input.assetType,
      input.status ?? "active",
      input.capacityWatts ?? null,
      input.loadWatts ?? null,
      input.autonomyMinutes ?? null,
      input.batteryHealthPercent ?? null,
      input.sourceFeedId ?? null,
      input.notes ?? null
    ]
  );

  return row ? mapPowerAsset(row) : null;
}

export async function createRackInDb(input: CreateRackInput) {
  const row = await queryOne<RackRow>(
    `INSERT INTO racks (site_id, code, name, height_u)
     SELECT id, $2, $3, $4
     FROM sites
     WHERE code = $1
     RETURNING id, $1::text AS site_code, code, name, height_u`,
    [input.siteCode, input.code, input.name, input.heightU ?? 45]
  );

  return row ? { ...row, siteCode: row.site_code, heightU: Number(row.height_u), utilizationU: 0, devices: [] } : null;
}

export async function createPowerFeedInDb(input: CreatePowerFeedInput) {
  const row = await queryOne<PowerFeedRow>(
    `INSERT INTO power_feeds (site_id, name, feed_type, status, capacity_watts, load_watts, source)
     SELECT id, $2, $3, $4, $5, $6, $7
     FROM sites
     WHERE code = $1
     RETURNING id, $1::text AS site_code, name, feed_type, status, capacity_watts, load_watts, source`,
    [
      input.siteCode,
      input.name,
      input.feedType ?? "ac",
      input.status ?? "active",
      input.capacityWatts ?? null,
      input.loadWatts ?? null,
      input.source ?? null
    ]
  );

  return row ? mapPowerFeed(row) : null;
}


export async function updateRackInDb(input: UpdateRackInput) {
  const row = await queryOne<RackRow>(
    `UPDATE racks
     SET code = COALESCE($2, code),
         name = COALESCE($3, name),
         height_u = COALESCE($4, height_u)
     WHERE id = $1::uuid
     RETURNING id, (SELECT code FROM sites WHERE id = site_id) AS site_code, code, name, height_u`,
    [input.id, input.code ?? null, input.name ?? null, input.heightU ?? null]
  );

  return row ? { id: row.id, siteCode: row.site_code, code: row.code, name: row.name, heightU: Number(row.height_u), utilizationU: 0, devices: [] } : null;
}

export async function deleteRackInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM racks
     WHERE id = $1::uuid
       AND NOT EXISTS (SELECT 1 FROM devices WHERE rack_id = racks.id)
     RETURNING id`,
    [id]
  );

  return row ?? null;
}

export async function updatePowerFeedInDb(input: UpdatePowerFeedInput) {
  const row = await queryOne<PowerFeedRow>(
    `UPDATE power_feeds
     SET name = COALESCE($2, name),
         feed_type = COALESCE($3, feed_type),
         status = COALESCE($4, status),
         capacity_watts = COALESCE($5, capacity_watts),
         load_watts = COALESCE($6, load_watts),
         source = COALESCE($7, source)
     WHERE id = $1::uuid
     RETURNING id, (SELECT code FROM sites WHERE id = site_id) AS site_code, name, feed_type, status, capacity_watts, load_watts, source`,
    [input.id, input.name ?? null, input.feedType ?? null, input.status ?? null, input.capacityWatts ?? null, input.loadWatts ?? null, input.source ?? null]
  );

  return row ? mapPowerFeed(row) : null;
}

export async function deletePowerFeedInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM power_feeds
     WHERE id = $1::uuid
       AND NOT EXISTS (SELECT 1 FROM devices WHERE power_feed_id = power_feeds.id)
     RETURNING id`,
    [id]
  );

  return row ?? null;
}


export async function updateDevicePlacementInDb(input: UpdateDevicePlacementInput) {
  const row = await queryOne<DeviceRow>(
    `WITH target_rack AS (
       SELECT id, site_id, height_u FROM racks WHERE id = $2::uuid
     ), selected_feed AS (
       SELECT id FROM power_feeds
       WHERE id = $5::uuid
         AND site_id = (SELECT site_id FROM target_rack)
     )
     UPDATE devices d
     SET rack_id = (SELECT id FROM target_rack),
         position_u = $3,
         height_u = $4,
         power_feed_id = CASE
           WHEN $5::uuid IS NULL THEN NULL
           ELSE (SELECT id FROM selected_feed)
         END
     WHERE d.id = $1::uuid
       AND d.site_id = (SELECT site_id FROM target_rack)
       AND $3 <= (SELECT height_u FROM target_rack)
       AND ($3 - $4 + 1) >= 1
       AND NOT EXISTS (
         SELECT 1
         FROM devices other
         WHERE other.rack_id = (SELECT id FROM target_rack)
           AND other.id <> d.id
           AND other.position_u IS NOT NULL
           AND int4range(other.position_u - other.height_u + 1, other.position_u + 1, '[)') && int4range($3 - $4 + 1, $3 + 1, '[)')
       )
     RETURNING
       d.id,
       d.name,
       (SELECT dr.code FROM device_roles dr WHERE dr.id = d.role_id) AS role,
       (SELECT s.code FROM sites s WHERE s.id = d.site_id) AS site_code,
       d.status,
       d.management_ip::text,
       (SELECT COUNT(*)::text FROM interfaces i WHERE i.device_id = d.id) AS interfaces,
       (SELECT MAX(cb.collected_at)::text FROM config_backups cb WHERE cb.device_id = d.id) AS last_backup_at`,
    [input.id, input.rackId, input.positionU, input.heightU, input.powerFeedId ?? null]
  );

  return row ? mapDevice(row) : null;
}
