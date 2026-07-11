import { query } from "../../shared/db.js";

type ProviderCapacityRow = {
  id: string;
  provider_code: string;
  provider_name: string;
  contract_code: string | null;
  service_type: string;
  committed_mbps: number;
  burstable_mbps: number | null;
  delivered_mbps: number;
  used_mbps: number;
  billing_mode: string;
  status: string;
};

type FiberSpanRow = {
  id: string;
  code: string;
  a_site: string;
  z_site: string;
  provider_code: string | null;
  cable_type: string;
  fiber_count: number;
  used_fibers: number;
  distance_km: string | null;
  status: string;
  notes: string | null;
};

type FiberStrandRow = {
  id: string;
  span_code: string;
  strand_number: number;
  tube_color: string | null;
  fiber_color: string | null;
  status: string;
  service: string | null;
  circuit_code: string | null;
  a_termination: string | null;
  z_termination: string | null;
};

type TransceiverRow = {
  id: string;
  device: string;
  interface: string;
  site_code: string;
  vendor: string;
  part_number: string;
  serial_number: string | null;
  form_factor: string;
  speed_mbps: number;
  wavelength_nm: number | null;
  reach_km: string | null;
  connector_type: string;
  fiber_mode: string;
  tx_power_dbm: string | null;
  rx_power_dbm: string | null;
  status: string;
};

type PatchcordRow = {
  id: string;
  code: string;
  a_endpoint: string;
  z_endpoint: string;
  a_device: string | null;
  z_device: string | null;
  media_type: string;
  connector_a: string;
  connector_z: string;
  length_meters: string | null;
  fiber_mode: string | null;
  color: string | null;
  status: string;
  circuit_code: string | null;
};

type DatacenterAssetRow = {
  id: string;
  site_code: string;
  rack_code: string | null;
  name: string;
  asset_type: string;
  status: string;
  units: number | null;
  ports: number | null;
  notes: string | null;
};

export type PhysicalKind =
  | "datacenter-assets"
  | "fiber-spans"
  | "fiber-strands"
  | "patchcords"
  | "provider-capacities"
  | "transceivers";

const physicalTables: Record<PhysicalKind, { table: string; objectType: string }> = {
  "datacenter-assets": { table: "datacenter_assets", objectType: "datacenter_asset" },
  "fiber-spans": { table: "fiber_spans", objectType: "fiber_span" },
  "fiber-strands": { table: "fiber_strands", objectType: "fiber_strand" },
  patchcords: { table: "patchcords", objectType: "patchcord" },
  "provider-capacities": { table: "provider_capacities", objectType: "provider_capacity" },
  transceivers: { table: "transceivers", objectType: "transceiver" }
};

export type CreateProviderCapacityInput = {
  providerCode: string;
  contractCode?: string | null;
  serviceType: string;
  committedMbps: number;
  burstableMbps?: number | null;
  deliveredMbps: number;
  usedMbps?: number | null;
  billingMode: string;
  status?: string;
};

export type UpdateProviderCapacityInput = Partial<CreateProviderCapacityInput> & {
  id: string;
};

export type CreateFiberSpanInput = {
  code: string;
  aSite: string;
  zSite: string;
  providerCode?: string | null;
  cableType: string;
  fiberCount: number;
  usedFibers?: number | null;
  distanceKm?: number | null;
  status?: string;
  notes?: string | null;
};

export type UpdateFiberSpanInput = Partial<CreateFiberSpanInput> & {
  id: string;
};

export type CreateFiberStrandInput = {
  spanCode: string;
  circuitCode?: string | null;
  strandNumber: number;
  tubeColor?: string | null;
  fiberColor?: string | null;
  status?: string;
  service?: string | null;
  aTermination?: string | null;
  zTermination?: string | null;
};

export type UpdateFiberStrandInput = Partial<CreateFiberStrandInput> & {
  id: string;
};

export type CreateTransceiverInput = {
  deviceName: string;
  interfaceName: string;
  vendor: string;
  partNumber: string;
  serialNumber?: string | null;
  formFactor: string;
  speedMbps: number;
  wavelengthNm?: number | null;
  reachKm?: number | null;
  connectorType: string;
  fiberMode: string;
  txPowerDbm?: number | null;
  rxPowerDbm?: number | null;
  status?: string;
};

export type UpdateTransceiverInput = Partial<CreateTransceiverInput> & {
  id: string;
};

export type CreatePatchcordInput = {
  code: string;
  aDeviceName?: string | null;
  aInterfaceName?: string | null;
  zDeviceName?: string | null;
  zInterfaceName?: string | null;
  circuitCode?: string | null;
  aEndpoint: string;
  zEndpoint: string;
  mediaType: string;
  connectorA: string;
  connectorZ: string;
  lengthMeters?: number | null;
  fiberMode?: string | null;
  color?: string | null;
  status?: string;
};

export type UpdatePatchcordInput = Partial<CreatePatchcordInput> & {
  id: string;
};

export type CreateDatacenterAssetInput = {
  siteCode: string;
  rackCode?: string | null;
  name: string;
  assetType: string;
  status?: string;
  units?: number | null;
  ports?: number | null;
  notes?: string | null;
};

export type UpdateDatacenterAssetInput = Partial<CreateDatacenterAssetInput> & {
  id: string;
};

function numberOrNull(value: string | number | null) {
  return value === null ? null : Number(value);
}

export async function listProviderCapacitiesFromDb() {
  const rows = await query<ProviderCapacityRow>(
    `SELECT
       pc.id,
       p.code AS provider_code,
       p.name AS provider_name,
       c.code AS contract_code,
       pc.service_type,
       pc.committed_mbps,
       pc.burstable_mbps,
       pc.delivered_mbps,
       pc.used_mbps,
       pc.billing_mode,
       pc.status
     FROM provider_capacities pc
     JOIN providers p ON p.id = pc.provider_id
     LEFT JOIN contracts c ON c.id = pc.contract_id
     ORDER BY p.code, pc.service_type`
  );

  return rows?.map((row) => ({
    id: row.id,
    providerCode: row.provider_code,
    providerName: row.provider_name,
    contractCode: row.contract_code,
    serviceType: row.service_type,
    committedMbps: row.committed_mbps,
    burstableMbps: row.burstable_mbps,
    deliveredMbps: row.delivered_mbps,
    usedMbps: row.used_mbps,
    billingMode: row.billing_mode,
    status: row.status
  })) ?? null;
}

export async function listFiberSpansFromDb() {
  const rows = await query<FiberSpanRow>(
    `SELECT
       fs.id,
       fs.code,
       a.code AS a_site,
       z.code AS z_site,
       p.code AS provider_code,
       fs.cable_type,
       fs.fiber_count,
       fs.used_fibers,
       fs.distance_km,
       fs.status,
       fs.notes
     FROM fiber_spans fs
     JOIN sites a ON a.id = fs.a_site_id
     JOIN sites z ON z.id = fs.z_site_id
     LEFT JOIN providers p ON p.id = fs.provider_id
     ORDER BY fs.code`
  );

  return rows?.map((row) => ({
    id: row.id,
    code: row.code,
    aSite: row.a_site,
    zSite: row.z_site,
    providerCode: row.provider_code,
    cableType: row.cable_type,
    fiberCount: row.fiber_count,
    usedFibers: row.used_fibers,
    distanceKm: numberOrNull(row.distance_km),
    status: row.status,
    notes: row.notes
  })) ?? null;
}

export async function listFiberStrandsFromDb() {
  const rows = await query<FiberStrandRow>(
    `SELECT
       fst.id,
       fs.code AS span_code,
       fst.strand_number,
       fst.tube_color,
       fst.fiber_color,
       fst.status,
       fst.service,
       c.code AS circuit_code,
       fst.a_termination,
       fst.z_termination
     FROM fiber_strands fst
     JOIN fiber_spans fs ON fs.id = fst.span_id
     LEFT JOIN circuits c ON c.id = fst.circuit_id
     ORDER BY fs.code, fst.strand_number`
  );

  return rows?.map((row) => ({
    id: row.id,
    spanCode: row.span_code,
    strandNumber: row.strand_number,
    tubeColor: row.tube_color,
    fiberColor: row.fiber_color,
    status: row.status,
    service: row.service,
    circuitCode: row.circuit_code,
    aTermination: row.a_termination,
    zTermination: row.z_termination
  })) ?? null;
}

export async function listTransceiversFromDb() {
  const rows = await query<TransceiverRow>(
    `SELECT
       t.id,
       d.name AS device,
       i.name AS interface,
       s.code AS site_code,
       t.vendor,
       t.part_number,
       t.serial_number,
       t.form_factor,
       t.speed_mbps,
       t.wavelength_nm,
       t.reach_km,
       t.connector_type,
       t.fiber_mode,
       t.tx_power_dbm,
       t.rx_power_dbm,
       t.status
     FROM transceivers t
     JOIN interfaces i ON i.id = t.interface_id
     JOIN devices d ON d.id = i.device_id
     JOIN sites s ON s.id = d.site_id
     ORDER BY s.code, d.name, i.name`
  );

  return rows?.map((row) => ({
    id: row.id,
    device: row.device,
    interface: row.interface,
    siteCode: row.site_code,
    vendor: row.vendor,
    partNumber: row.part_number,
    serialNumber: row.serial_number,
    formFactor: row.form_factor,
    speedMbps: row.speed_mbps,
    wavelengthNm: row.wavelength_nm,
    reachKm: numberOrNull(row.reach_km),
    connectorType: row.connector_type,
    fiberMode: row.fiber_mode,
    txPowerDbm: numberOrNull(row.tx_power_dbm),
    rxPowerDbm: numberOrNull(row.rx_power_dbm),
    status: row.status
  })) ?? null;
}

export async function listPatchcordsFromDb() {
  const rows = await query<PatchcordRow>(
    `SELECT
       pc.id,
       pc.code,
       pc.a_endpoint,
       pc.z_endpoint,
       ad.name AS a_device,
       zd.name AS z_device,
       pc.media_type,
       pc.connector_a,
       pc.connector_z,
       pc.length_meters,
       pc.fiber_mode,
       pc.color,
       pc.status,
       c.code AS circuit_code
     FROM patchcords pc
     LEFT JOIN interfaces ai ON ai.id = pc.a_interface_id
     LEFT JOIN devices ad ON ad.id = ai.device_id
     LEFT JOIN interfaces zi ON zi.id = pc.z_interface_id
     LEFT JOIN devices zd ON zd.id = zi.device_id
     LEFT JOIN circuits c ON c.id = pc.circuit_id
     ORDER BY pc.code`
  );

  return rows?.map((row) => ({
    id: row.id,
    code: row.code,
    aEndpoint: row.a_endpoint,
    zEndpoint: row.z_endpoint,
    aDevice: row.a_device,
    zDevice: row.z_device,
    mediaType: row.media_type,
    connectorA: row.connector_a,
    connectorZ: row.connector_z,
    lengthMeters: numberOrNull(row.length_meters),
    fiberMode: row.fiber_mode,
    color: row.color,
    status: row.status,
    circuitCode: row.circuit_code
  })) ?? null;
}

export async function listDatacenterAssetsFromDb() {
  const rows = await query<DatacenterAssetRow>(
    `SELECT
       da.id,
       s.code AS site_code,
       r.code AS rack_code,
       da.name,
       da.asset_type,
       da.status,
       da.units,
       da.ports,
       da.notes
     FROM datacenter_assets da
     JOIN sites s ON s.id = da.site_id
     LEFT JOIN racks r ON r.id = da.rack_id
     ORDER BY s.code, da.asset_type, da.name`
  );

  return rows?.map((row) => ({
    id: row.id,
    siteCode: row.site_code,
    rackCode: row.rack_code,
    name: row.name,
    assetType: row.asset_type,
    status: row.status,
    units: row.units,
    ports: row.ports,
    notes: row.notes
  })) ?? null;
}

export async function createProviderCapacityInDb(input: CreateProviderCapacityInput) {
  const rows = await query<ProviderCapacityRow>(
    `INSERT INTO provider_capacities (provider_id, contract_id, service_type, committed_mbps, burstable_mbps, delivered_mbps, used_mbps, billing_mode, status)
     SELECT p.id, c.id, $3, $4, $5, $6, $7, $8, $9
     FROM providers p
     LEFT JOIN contracts c ON c.provider_id = p.id AND c.code = $2
     WHERE p.code = $1
     ON CONFLICT (provider_id, contract_id, service_type) DO UPDATE
       SET committed_mbps = EXCLUDED.committed_mbps,
           burstable_mbps = EXCLUDED.burstable_mbps,
           delivered_mbps = EXCLUDED.delivered_mbps,
           used_mbps = EXCLUDED.used_mbps,
           billing_mode = EXCLUDED.billing_mode,
           status = EXCLUDED.status
     RETURNING
       id,
       $1::text AS provider_code,
       (SELECT name FROM providers WHERE code = $1) AS provider_name,
       $2::text AS contract_code,
       service_type,
       committed_mbps,
       burstable_mbps,
       delivered_mbps,
       used_mbps,
       billing_mode,
       status`,
    [
      input.providerCode,
      input.contractCode ?? null,
      input.serviceType,
      input.committedMbps,
      input.burstableMbps ?? null,
      input.deliveredMbps,
      input.usedMbps ?? 0,
      input.billingMode,
      input.status ?? "active"
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        providerCode: row.provider_code,
        providerName: row.provider_name,
        contractCode: row.contract_code,
        serviceType: row.service_type,
        committedMbps: row.committed_mbps,
        burstableMbps: row.burstable_mbps,
        deliveredMbps: row.delivered_mbps,
        usedMbps: row.used_mbps,
        billingMode: row.billing_mode,
        status: row.status
      }
    : null;
}

export async function updateProviderCapacityInDb(input: UpdateProviderCapacityInput) {
  const hasProviderCode = Object.hasOwn(input, "providerCode");
  const hasContractCode = Object.hasOwn(input, "contractCode");
  const hasServiceType = Object.hasOwn(input, "serviceType");
  const hasCommittedMbps = Object.hasOwn(input, "committedMbps");
  const hasBurstableMbps = Object.hasOwn(input, "burstableMbps");
  const hasDeliveredMbps = Object.hasOwn(input, "deliveredMbps");
  const hasUsedMbps = Object.hasOwn(input, "usedMbps");
  const hasBillingMode = Object.hasOwn(input, "billingMode");
  const hasStatus = Object.hasOwn(input, "status");
  const rows = await query<ProviderCapacityRow>(
    `WITH current_capacity AS (
       SELECT
         pc.*,
         CASE WHEN $11 THEN (SELECT p.id FROM providers p WHERE p.code = $2) ELSE pc.provider_id END AS target_provider_id
       FROM provider_capacities pc
       WHERE pc.id = $1::uuid
     )
     UPDATE provider_capacities pc
     SET
       provider_id = CASE WHEN $11 THEN current_capacity.target_provider_id ELSE pc.provider_id END,
       contract_id = CASE
         WHEN $12 AND $3 IS NULL THEN NULL
         WHEN $12 THEN (SELECT c.id FROM contracts c WHERE c.provider_id = current_capacity.target_provider_id AND c.code = $3)
         ELSE pc.contract_id
       END,
       service_type = CASE WHEN $13 THEN $4 ELSE pc.service_type END,
       committed_mbps = CASE WHEN $14 THEN $5 ELSE pc.committed_mbps END,
       burstable_mbps = CASE WHEN $15 THEN $6 ELSE pc.burstable_mbps END,
       delivered_mbps = CASE WHEN $16 THEN $7 ELSE pc.delivered_mbps END,
       used_mbps = CASE WHEN $17 THEN $8 ELSE pc.used_mbps END,
       billing_mode = CASE WHEN $18 THEN $9 ELSE pc.billing_mode END,
       status = CASE WHEN $19 THEN $10 ELSE pc.status END
     FROM current_capacity
     WHERE pc.id = current_capacity.id
       AND current_capacity.target_provider_id IS NOT NULL
       AND (
         NOT $12
         OR $3 IS NULL
         OR EXISTS (SELECT 1 FROM contracts c WHERE c.provider_id = current_capacity.target_provider_id AND c.code = $3)
       )
     RETURNING
       pc.id,
       (SELECT p.code FROM providers p WHERE p.id = pc.provider_id) AS provider_code,
       (SELECT p.name FROM providers p WHERE p.id = pc.provider_id) AS provider_name,
       (SELECT c.code FROM contracts c WHERE c.id = pc.contract_id) AS contract_code,
       pc.service_type,
       pc.committed_mbps,
       pc.burstable_mbps,
       pc.delivered_mbps,
       pc.used_mbps,
       pc.billing_mode,
       pc.status`,
    [
      input.id,
      input.providerCode ?? null,
      input.contractCode ?? null,
      input.serviceType ?? null,
      input.committedMbps ?? null,
      input.burstableMbps ?? null,
      input.deliveredMbps ?? null,
      input.usedMbps ?? null,
      input.billingMode ?? null,
      input.status ?? null,
      hasProviderCode,
      hasContractCode,
      hasServiceType,
      hasCommittedMbps,
      hasBurstableMbps,
      hasDeliveredMbps,
      hasUsedMbps,
      hasBillingMode,
      hasStatus
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        providerCode: row.provider_code,
        providerName: row.provider_name,
        contractCode: row.contract_code,
        serviceType: row.service_type,
        committedMbps: row.committed_mbps,
        burstableMbps: row.burstable_mbps,
        deliveredMbps: row.delivered_mbps,
        usedMbps: row.used_mbps,
        billingMode: row.billing_mode,
        status: row.status
      }
    : null;
}

export async function createFiberSpanInDb(input: CreateFiberSpanInput) {
  const rows = await query<FiberSpanRow>(
    `INSERT INTO fiber_spans (code, a_site_id, z_site_id, provider_id, cable_type, fiber_count, used_fibers, distance_km, status, notes)
     SELECT $1, a.id, z.id, p.id, $5, $6, $7, $8, $9, $10
     FROM sites a
     JOIN sites z ON z.code = $3
     LEFT JOIN providers p ON p.code = $4
     WHERE a.code = $2
     RETURNING id, code, $2::text AS a_site, $3::text AS z_site, $4::text AS provider_code, cable_type, fiber_count, used_fibers, distance_km, status, notes`,
    [
      input.code,
      input.aSite,
      input.zSite,
      input.providerCode ?? null,
      input.cableType,
      input.fiberCount,
      input.usedFibers ?? 0,
      input.distanceKm ?? null,
      input.status ?? "planned",
      input.notes ?? null
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        code: row.code,
        aSite: row.a_site,
        zSite: row.z_site,
        providerCode: row.provider_code,
        cableType: row.cable_type,
        fiberCount: row.fiber_count,
        usedFibers: row.used_fibers,
        distanceKm: numberOrNull(row.distance_km),
        status: row.status,
        notes: row.notes
      }
    : null;
}

export async function updateFiberSpanInDb(input: UpdateFiberSpanInput) {
  const hasCode = Object.hasOwn(input, "code");
  const hasASite = Object.hasOwn(input, "aSite");
  const hasZSite = Object.hasOwn(input, "zSite");
  const hasProviderCode = Object.hasOwn(input, "providerCode");
  const hasCableType = Object.hasOwn(input, "cableType");
  const hasFiberCount = Object.hasOwn(input, "fiberCount");
  const hasUsedFibers = Object.hasOwn(input, "usedFibers");
  const hasDistanceKm = Object.hasOwn(input, "distanceKm");
  const hasStatus = Object.hasOwn(input, "status");
  const hasNotes = Object.hasOwn(input, "notes");
  const rows = await query<FiberSpanRow>(
    `UPDATE fiber_spans fs
     SET
       code = CASE WHEN $11 THEN $2 ELSE fs.code END,
       a_site_id = CASE WHEN $12 THEN (SELECT id FROM sites WHERE code = $3) ELSE fs.a_site_id END,
       z_site_id = CASE WHEN $13 THEN (SELECT id FROM sites WHERE code = $4) ELSE fs.z_site_id END,
       provider_id = CASE
         WHEN $14 AND $5 IS NULL THEN NULL
         WHEN $14 THEN (SELECT id FROM providers WHERE code = $5)
         ELSE fs.provider_id
       END,
       cable_type = CASE WHEN $15 THEN $6 ELSE fs.cable_type END,
       fiber_count = CASE WHEN $16 THEN $7 ELSE fs.fiber_count END,
       used_fibers = CASE WHEN $17 THEN $8 ELSE fs.used_fibers END,
       distance_km = CASE WHEN $18 THEN $9 ELSE fs.distance_km END,
       status = CASE WHEN $19 THEN $10 ELSE fs.status END,
       notes = CASE WHEN $20 THEN $21 ELSE fs.notes END
     WHERE fs.id = $1::uuid
       AND (NOT $12 OR EXISTS (SELECT 1 FROM sites WHERE code = $3))
       AND (NOT $13 OR EXISTS (SELECT 1 FROM sites WHERE code = $4))
       AND (NOT $14 OR $5 IS NULL OR EXISTS (SELECT 1 FROM providers WHERE code = $5))
     RETURNING
       fs.id,
       fs.code,
       (SELECT s.code FROM sites s WHERE s.id = fs.a_site_id) AS a_site,
       (SELECT s.code FROM sites s WHERE s.id = fs.z_site_id) AS z_site,
       (SELECT p.code FROM providers p WHERE p.id = fs.provider_id) AS provider_code,
       fs.cable_type,
       fs.fiber_count,
       fs.used_fibers,
       fs.distance_km,
       fs.status,
       fs.notes`,
    [
      input.id,
      input.code ?? null,
      input.aSite ?? null,
      input.zSite ?? null,
      input.providerCode ?? null,
      input.cableType ?? null,
      input.fiberCount ?? null,
      input.usedFibers ?? null,
      input.distanceKm ?? null,
      input.status ?? null,
      hasCode,
      hasASite,
      hasZSite,
      hasProviderCode,
      hasCableType,
      hasFiberCount,
      hasUsedFibers,
      hasDistanceKm,
      hasStatus,
      hasNotes,
      input.notes ?? null
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        code: row.code,
        aSite: row.a_site,
        zSite: row.z_site,
        providerCode: row.provider_code,
        cableType: row.cable_type,
        fiberCount: row.fiber_count,
        usedFibers: row.used_fibers,
        distanceKm: numberOrNull(row.distance_km),
        status: row.status,
        notes: row.notes
      }
    : null;
}

export async function createFiberStrandInDb(input: CreateFiberStrandInput) {
  const rows = await query<FiberStrandRow>(
    `INSERT INTO fiber_strands (span_id, circuit_id, strand_number, tube_color, fiber_color, status, service, a_termination, z_termination)
     SELECT fs.id, c.id, $2, $3, $4, $5, $6, $7, $8
     FROM fiber_spans fs
     LEFT JOIN circuits c ON c.code = $9
     WHERE fs.code = $1
     RETURNING id, $1::text AS span_code, strand_number, tube_color, fiber_color, status, service, $9::text AS circuit_code, a_termination, z_termination`,
    [
      input.spanCode,
      input.strandNumber,
      input.tubeColor ?? null,
      input.fiberColor ?? null,
      input.status ?? "available",
      input.service ?? null,
      input.aTermination ?? null,
      input.zTermination ?? null,
      input.circuitCode ?? null
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        spanCode: row.span_code,
        strandNumber: row.strand_number,
        tubeColor: row.tube_color,
        fiberColor: row.fiber_color,
        status: row.status,
        service: row.service,
        circuitCode: row.circuit_code,
        aTermination: row.a_termination,
        zTermination: row.z_termination
      }
    : null;
}

export async function updateFiberStrandInDb(input: UpdateFiberStrandInput) {
  const hasSpanCode = Object.hasOwn(input, "spanCode");
  const hasCircuitCode = Object.hasOwn(input, "circuitCode");
  const hasStrandNumber = Object.hasOwn(input, "strandNumber");
  const hasTubeColor = Object.hasOwn(input, "tubeColor");
  const hasFiberColor = Object.hasOwn(input, "fiberColor");
  const hasStatus = Object.hasOwn(input, "status");
  const hasService = Object.hasOwn(input, "service");
  const hasATermination = Object.hasOwn(input, "aTermination");
  const hasZTermination = Object.hasOwn(input, "zTermination");
  const rows = await query<FiberStrandRow>(
    `UPDATE fiber_strands fst
     SET
       span_id = CASE WHEN $10 THEN (SELECT id FROM fiber_spans WHERE code = $2) ELSE fst.span_id END,
       circuit_id = CASE
         WHEN $11 AND $3 IS NULL THEN NULL
         WHEN $11 THEN (SELECT id FROM circuits WHERE code = $3)
         ELSE fst.circuit_id
       END,
       strand_number = CASE WHEN $12 THEN $4 ELSE fst.strand_number END,
       tube_color = CASE WHEN $13 THEN $5 ELSE fst.tube_color END,
       fiber_color = CASE WHEN $14 THEN $6 ELSE fst.fiber_color END,
       status = CASE WHEN $15 THEN $7 ELSE fst.status END,
       service = CASE WHEN $16 THEN $8 ELSE fst.service END,
       a_termination = CASE WHEN $17 THEN $9 ELSE fst.a_termination END,
       z_termination = CASE WHEN $18 THEN $19 ELSE fst.z_termination END
     WHERE fst.id = $1::uuid
       AND (NOT $10 OR EXISTS (SELECT 1 FROM fiber_spans WHERE code = $2))
       AND (NOT $11 OR $3 IS NULL OR EXISTS (SELECT 1 FROM circuits WHERE code = $3))
     RETURNING
       fst.id,
       (SELECT fs.code FROM fiber_spans fs WHERE fs.id = fst.span_id) AS span_code,
       fst.strand_number,
       fst.tube_color,
       fst.fiber_color,
       fst.status,
       fst.service,
       (SELECT c.code FROM circuits c WHERE c.id = fst.circuit_id) AS circuit_code,
       fst.a_termination,
       fst.z_termination`,
    [
      input.id,
      input.spanCode ?? null,
      input.circuitCode ?? null,
      input.strandNumber ?? null,
      input.tubeColor ?? null,
      input.fiberColor ?? null,
      input.status ?? null,
      input.service ?? null,
      input.aTermination ?? null,
      hasSpanCode,
      hasCircuitCode,
      hasStrandNumber,
      hasTubeColor,
      hasFiberColor,
      hasStatus,
      hasService,
      hasATermination,
      hasZTermination,
      input.zTermination ?? null
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        spanCode: row.span_code,
        strandNumber: row.strand_number,
        tubeColor: row.tube_color,
        fiberColor: row.fiber_color,
        status: row.status,
        service: row.service,
        circuitCode: row.circuit_code,
        aTermination: row.a_termination,
        zTermination: row.z_termination
      }
    : null;
}

export async function createTransceiverInDb(input: CreateTransceiverInput) {
  const rows = await query<TransceiverRow>(
    `INSERT INTO transceivers (interface_id, vendor, part_number, serial_number, form_factor, speed_mbps, wavelength_nm, reach_km, connector_type, fiber_mode, tx_power_dbm, rx_power_dbm, status)
     SELECT i.id, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
     FROM devices d
     JOIN interfaces i ON i.device_id = d.id AND i.name = $2
     WHERE d.name = $1
     ON CONFLICT (interface_id) DO UPDATE
       SET vendor = EXCLUDED.vendor,
           part_number = EXCLUDED.part_number,
           serial_number = EXCLUDED.serial_number,
           form_factor = EXCLUDED.form_factor,
           speed_mbps = EXCLUDED.speed_mbps,
           wavelength_nm = EXCLUDED.wavelength_nm,
           reach_km = EXCLUDED.reach_km,
           connector_type = EXCLUDED.connector_type,
           fiber_mode = EXCLUDED.fiber_mode,
           tx_power_dbm = EXCLUDED.tx_power_dbm,
           rx_power_dbm = EXCLUDED.rx_power_dbm,
           status = EXCLUDED.status
     RETURNING
       id,
       $1::text AS device,
       $2::text AS interface,
       (SELECT s.code FROM devices rd JOIN sites s ON s.id = rd.site_id WHERE rd.name = $1) AS site_code,
       vendor,
       part_number,
       serial_number,
       form_factor,
       speed_mbps,
       wavelength_nm,
       reach_km,
       connector_type,
       fiber_mode,
       tx_power_dbm,
       rx_power_dbm,
       status`,
    [
      input.deviceName,
      input.interfaceName,
      input.vendor,
      input.partNumber,
      input.serialNumber ?? null,
      input.formFactor,
      input.speedMbps,
      input.wavelengthNm ?? null,
      input.reachKm ?? null,
      input.connectorType,
      input.fiberMode,
      input.txPowerDbm ?? null,
      input.rxPowerDbm ?? null,
      input.status ?? "active"
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        device: row.device,
        interface: row.interface,
        siteCode: row.site_code,
        vendor: row.vendor,
        partNumber: row.part_number,
        serialNumber: row.serial_number,
        formFactor: row.form_factor,
        speedMbps: row.speed_mbps,
        wavelengthNm: row.wavelength_nm,
        reachKm: numberOrNull(row.reach_km),
        connectorType: row.connector_type,
        fiberMode: row.fiber_mode,
        txPowerDbm: numberOrNull(row.tx_power_dbm),
        rxPowerDbm: numberOrNull(row.rx_power_dbm),
        status: row.status
      }
    : null;
}

export async function updateTransceiverInDb(input: UpdateTransceiverInput) {
  const hasDeviceName = Object.hasOwn(input, "deviceName");
  const hasInterfaceName = Object.hasOwn(input, "interfaceName");
  const hasVendor = Object.hasOwn(input, "vendor");
  const hasPartNumber = Object.hasOwn(input, "partNumber");
  const hasSerialNumber = Object.hasOwn(input, "serialNumber");
  const hasFormFactor = Object.hasOwn(input, "formFactor");
  const hasSpeedMbps = Object.hasOwn(input, "speedMbps");
  const hasWavelengthNm = Object.hasOwn(input, "wavelengthNm");
  const hasReachKm = Object.hasOwn(input, "reachKm");
  const hasConnectorType = Object.hasOwn(input, "connectorType");
  const hasFiberMode = Object.hasOwn(input, "fiberMode");
  const hasTxPowerDbm = Object.hasOwn(input, "txPowerDbm");
  const hasRxPowerDbm = Object.hasOwn(input, "rxPowerDbm");
  const hasStatus = Object.hasOwn(input, "status");
  const rows = await query<TransceiverRow>(
    `WITH current_transceiver AS (
       SELECT
         t.*,
         d.name AS current_device,
         i.name AS current_interface,
         CASE
           WHEN $16 OR $17 THEN (
             SELECT ni.id
             FROM devices nd
             JOIN interfaces ni ON ni.device_id = nd.id
             WHERE nd.name = COALESCE($2, d.name)
               AND ni.name = COALESCE($3, i.name)
           )
           ELSE t.interface_id
         END AS target_interface_id
       FROM transceivers t
       JOIN interfaces i ON i.id = t.interface_id
       JOIN devices d ON d.id = i.device_id
       WHERE t.id = $1::uuid
     )
     UPDATE transceivers t
     SET
       interface_id = current_transceiver.target_interface_id,
       vendor = CASE WHEN $18 THEN $4 ELSE t.vendor END,
       part_number = CASE WHEN $19 THEN $5 ELSE t.part_number END,
       serial_number = CASE WHEN $20 THEN $6 ELSE t.serial_number END,
       form_factor = CASE WHEN $21 THEN $7 ELSE t.form_factor END,
       speed_mbps = CASE WHEN $22 THEN $8 ELSE t.speed_mbps END,
       wavelength_nm = CASE WHEN $23 THEN $9 ELSE t.wavelength_nm END,
       reach_km = CASE WHEN $24 THEN $10 ELSE t.reach_km END,
       connector_type = CASE WHEN $25 THEN $11 ELSE t.connector_type END,
       fiber_mode = CASE WHEN $26 THEN $12 ELSE t.fiber_mode END,
       tx_power_dbm = CASE WHEN $27 THEN $13 ELSE t.tx_power_dbm END,
       rx_power_dbm = CASE WHEN $28 THEN $14 ELSE t.rx_power_dbm END,
       status = CASE WHEN $29 THEN $15 ELSE t.status END
     FROM current_transceiver
     WHERE t.id = current_transceiver.id
       AND current_transceiver.target_interface_id IS NOT NULL
     RETURNING
       t.id,
       (SELECT d.name FROM interfaces i JOIN devices d ON d.id = i.device_id WHERE i.id = t.interface_id) AS device,
       (SELECT i.name FROM interfaces i WHERE i.id = t.interface_id) AS interface,
       (SELECT s.code FROM interfaces i JOIN devices d ON d.id = i.device_id JOIN sites s ON s.id = d.site_id WHERE i.id = t.interface_id) AS site_code,
       t.vendor,
       t.part_number,
       t.serial_number,
       t.form_factor,
       t.speed_mbps,
       t.wavelength_nm,
       t.reach_km,
       t.connector_type,
       t.fiber_mode,
       t.tx_power_dbm,
       t.rx_power_dbm,
       t.status`,
    [
      input.id,
      input.deviceName ?? null,
      input.interfaceName ?? null,
      input.vendor ?? null,
      input.partNumber ?? null,
      input.serialNumber ?? null,
      input.formFactor ?? null,
      input.speedMbps ?? null,
      input.wavelengthNm ?? null,
      input.reachKm ?? null,
      input.connectorType ?? null,
      input.fiberMode ?? null,
      input.txPowerDbm ?? null,
      input.rxPowerDbm ?? null,
      input.status ?? null,
      hasDeviceName,
      hasInterfaceName,
      hasVendor,
      hasPartNumber,
      hasSerialNumber,
      hasFormFactor,
      hasSpeedMbps,
      hasWavelengthNm,
      hasReachKm,
      hasConnectorType,
      hasFiberMode,
      hasTxPowerDbm,
      hasRxPowerDbm,
      hasStatus
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        device: row.device,
        interface: row.interface,
        siteCode: row.site_code,
        vendor: row.vendor,
        partNumber: row.part_number,
        serialNumber: row.serial_number,
        formFactor: row.form_factor,
        speedMbps: row.speed_mbps,
        wavelengthNm: row.wavelength_nm,
        reachKm: numberOrNull(row.reach_km),
        connectorType: row.connector_type,
        fiberMode: row.fiber_mode,
        txPowerDbm: numberOrNull(row.tx_power_dbm),
        rxPowerDbm: numberOrNull(row.rx_power_dbm),
        status: row.status
      }
    : null;
}

export async function createPatchcordInDb(input: CreatePatchcordInput) {
  const rows = await query<PatchcordRow>(
    `WITH selected_a AS (
       SELECT i.id FROM devices d JOIN interfaces i ON i.device_id = d.id
       WHERE d.name = $2 AND i.name = $3
     ), selected_z AS (
       SELECT i.id FROM devices d JOIN interfaces i ON i.device_id = d.id
       WHERE d.name = $4 AND i.name = $5
     ), selected_circuit AS (
       SELECT id, code FROM circuits WHERE code = $6
     )
     INSERT INTO patchcords (code, a_interface_id, z_interface_id, circuit_id, a_endpoint, z_endpoint, media_type, connector_a, connector_z, length_meters, fiber_mode, color, status)
     VALUES ($1, (SELECT id FROM selected_a), (SELECT id FROM selected_z), (SELECT id FROM selected_circuit), $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING id, code, a_endpoint, z_endpoint, $2::text AS a_device, $4::text AS z_device, media_type, connector_a, connector_z, length_meters, fiber_mode, color, status, (SELECT code FROM selected_circuit) AS circuit_code`,
    [
      input.code,
      input.aDeviceName ?? null,
      input.aInterfaceName ?? null,
      input.zDeviceName ?? null,
      input.zInterfaceName ?? null,
      input.circuitCode ?? null,
      input.aEndpoint,
      input.zEndpoint,
      input.mediaType,
      input.connectorA,
      input.connectorZ,
      input.lengthMeters ?? null,
      input.fiberMode ?? null,
      input.color ?? null,
      input.status ?? "active"
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        code: row.code,
        aEndpoint: row.a_endpoint,
        zEndpoint: row.z_endpoint,
        aDevice: row.a_device,
        zDevice: row.z_device,
        mediaType: row.media_type,
        connectorA: row.connector_a,
        connectorZ: row.connector_z,
        lengthMeters: numberOrNull(row.length_meters),
        fiberMode: row.fiber_mode,
        color: row.color,
        status: row.status,
        circuitCode: row.circuit_code
      }
    : null;
}

export async function updatePatchcordInDb(input: UpdatePatchcordInput) {
  const hasCode = Object.hasOwn(input, "code");
  const hasADeviceName = Object.hasOwn(input, "aDeviceName");
  const hasAInterfaceName = Object.hasOwn(input, "aInterfaceName");
  const hasZDeviceName = Object.hasOwn(input, "zDeviceName");
  const hasZInterfaceName = Object.hasOwn(input, "zInterfaceName");
  const hasCircuitCode = Object.hasOwn(input, "circuitCode");
  const hasAEndpoint = Object.hasOwn(input, "aEndpoint");
  const hasZEndpoint = Object.hasOwn(input, "zEndpoint");
  const hasMediaType = Object.hasOwn(input, "mediaType");
  const hasConnectorA = Object.hasOwn(input, "connectorA");
  const hasConnectorZ = Object.hasOwn(input, "connectorZ");
  const hasLengthMeters = Object.hasOwn(input, "lengthMeters");
  const hasFiberMode = Object.hasOwn(input, "fiberMode");
  const hasColor = Object.hasOwn(input, "color");
  const hasStatus = Object.hasOwn(input, "status");
  const rows = await query<PatchcordRow>(
    `WITH selected_a AS (
       SELECT i.id
       FROM devices d
       JOIN interfaces i ON i.device_id = d.id
       WHERE d.name = $3 AND i.name = $4
     ), selected_z AS (
       SELECT i.id
       FROM devices d
       JOIN interfaces i ON i.device_id = d.id
       WHERE d.name = $5 AND i.name = $6
     ), selected_circuit AS (
       SELECT id, code FROM circuits WHERE code = $7
     )
     UPDATE patchcords pc
     SET
       code = CASE WHEN $17 THEN $2 ELSE pc.code END,
       a_interface_id = CASE
         WHEN ($18 OR $19) AND $3 IS NULL THEN NULL
         WHEN ($18 OR $19) AND $4 IS NULL THEN NULL
         WHEN ($18 OR $19) THEN (SELECT id FROM selected_a)
         ELSE pc.a_interface_id
       END,
       z_interface_id = CASE
         WHEN ($20 OR $21) AND $5 IS NULL THEN NULL
         WHEN ($20 OR $21) AND $6 IS NULL THEN NULL
         WHEN ($20 OR $21) THEN (SELECT id FROM selected_z)
         ELSE pc.z_interface_id
       END,
       circuit_id = CASE
         WHEN $22 AND $7 IS NULL THEN NULL
         WHEN $22 THEN (SELECT id FROM selected_circuit)
         ELSE pc.circuit_id
       END,
       a_endpoint = CASE WHEN $23 THEN $8 ELSE pc.a_endpoint END,
       z_endpoint = CASE WHEN $24 THEN $9 ELSE pc.z_endpoint END,
       media_type = CASE WHEN $25 THEN $10 ELSE pc.media_type END,
       connector_a = CASE WHEN $26 THEN $11 ELSE pc.connector_a END,
       connector_z = CASE WHEN $27 THEN $12 ELSE pc.connector_z END,
       length_meters = CASE WHEN $28 THEN $13 ELSE pc.length_meters END,
       fiber_mode = CASE WHEN $29 THEN $14 ELSE pc.fiber_mode END,
       color = CASE WHEN $30 THEN $15 ELSE pc.color END,
       status = CASE WHEN $31 THEN $16 ELSE pc.status END
     WHERE pc.id = $1::uuid
       AND (NOT ($18 OR $19) OR $3 IS NULL OR $4 IS NULL OR EXISTS (SELECT 1 FROM selected_a))
       AND (NOT ($20 OR $21) OR $5 IS NULL OR $6 IS NULL OR EXISTS (SELECT 1 FROM selected_z))
       AND (NOT $22 OR $7 IS NULL OR EXISTS (SELECT 1 FROM selected_circuit))
     RETURNING
       pc.id,
       pc.code,
       pc.a_endpoint,
       pc.z_endpoint,
       (SELECT d.name FROM interfaces i JOIN devices d ON d.id = i.device_id WHERE i.id = pc.a_interface_id) AS a_device,
       (SELECT d.name FROM interfaces i JOIN devices d ON d.id = i.device_id WHERE i.id = pc.z_interface_id) AS z_device,
       pc.media_type,
       pc.connector_a,
       pc.connector_z,
       pc.length_meters,
       pc.fiber_mode,
       pc.color,
       pc.status,
       (SELECT c.code FROM circuits c WHERE c.id = pc.circuit_id) AS circuit_code`,
    [
      input.id,
      input.code ?? null,
      input.aDeviceName ?? null,
      input.aInterfaceName ?? null,
      input.zDeviceName ?? null,
      input.zInterfaceName ?? null,
      input.circuitCode ?? null,
      input.aEndpoint ?? null,
      input.zEndpoint ?? null,
      input.mediaType ?? null,
      input.connectorA ?? null,
      input.connectorZ ?? null,
      input.lengthMeters ?? null,
      input.fiberMode ?? null,
      input.color ?? null,
      input.status ?? null,
      hasCode,
      hasADeviceName,
      hasAInterfaceName,
      hasZDeviceName,
      hasZInterfaceName,
      hasCircuitCode,
      hasAEndpoint,
      hasZEndpoint,
      hasMediaType,
      hasConnectorA,
      hasConnectorZ,
      hasLengthMeters,
      hasFiberMode,
      hasColor,
      hasStatus
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        code: row.code,
        aEndpoint: row.a_endpoint,
        zEndpoint: row.z_endpoint,
        aDevice: row.a_device,
        zDevice: row.z_device,
        mediaType: row.media_type,
        connectorA: row.connector_a,
        connectorZ: row.connector_z,
        lengthMeters: numberOrNull(row.length_meters),
        fiberMode: row.fiber_mode,
        color: row.color,
        status: row.status,
        circuitCode: row.circuit_code
      }
    : null;
}

export async function createDatacenterAssetInDb(input: CreateDatacenterAssetInput) {
  const rows = await query<DatacenterAssetRow>(
    `INSERT INTO datacenter_assets (site_id, rack_id, name, asset_type, status, units, ports, notes)
     SELECT s.id, r.id, $3, $4, $5, $6, $7, $8
     FROM sites s
     LEFT JOIN racks r ON r.site_id = s.id AND r.code = $2
     WHERE s.code = $1
     RETURNING id, $1::text AS site_code, $2::text AS rack_code, name, asset_type, status, units, ports, notes`,
    [
      input.siteCode,
      input.rackCode ?? null,
      input.name,
      input.assetType,
      input.status ?? "active",
      input.units ?? null,
      input.ports ?? null,
      input.notes ?? null
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        siteCode: row.site_code,
        rackCode: row.rack_code,
        name: row.name,
        assetType: row.asset_type,
        status: row.status,
        units: row.units,
        ports: row.ports,
        notes: row.notes
      }
    : null;
}

export async function updateDatacenterAssetInDb(input: UpdateDatacenterAssetInput) {
  const hasSiteCode = Object.hasOwn(input, "siteCode");
  const hasRackCode = Object.hasOwn(input, "rackCode");
  const hasName = Object.hasOwn(input, "name");
  const hasAssetType = Object.hasOwn(input, "assetType");
  const hasStatus = Object.hasOwn(input, "status");
  const hasUnits = Object.hasOwn(input, "units");
  const hasPorts = Object.hasOwn(input, "ports");
  const hasNotes = Object.hasOwn(input, "notes");
  const rows = await query<DatacenterAssetRow>(
    `WITH current_asset AS (
       SELECT
         da.*,
         CASE WHEN $9 THEN (SELECT id FROM sites WHERE code = $2) ELSE da.site_id END AS target_site_id
       FROM datacenter_assets da
       WHERE da.id = $1::uuid
     )
     UPDATE datacenter_assets da
     SET
       site_id = CASE WHEN $9 THEN current_asset.target_site_id ELSE da.site_id END,
       rack_id = CASE
         WHEN $10 AND $3 IS NULL THEN NULL
         WHEN $10 THEN (SELECT r.id FROM racks r WHERE r.site_id = current_asset.target_site_id AND r.code = $3)
         ELSE da.rack_id
       END,
       name = CASE WHEN $11 THEN $4 ELSE da.name END,
       asset_type = CASE WHEN $12 THEN $5 ELSE da.asset_type END,
       status = CASE WHEN $13 THEN $6 ELSE da.status END,
       units = CASE WHEN $14 THEN $7 ELSE da.units END,
       ports = CASE WHEN $15 THEN $8 ELSE da.ports END,
       notes = CASE WHEN $16 THEN $17 ELSE da.notes END
     FROM current_asset
     WHERE da.id = current_asset.id
       AND current_asset.target_site_id IS NOT NULL
       AND (
         NOT $10
         OR $3 IS NULL
         OR EXISTS (SELECT 1 FROM racks r WHERE r.site_id = current_asset.target_site_id AND r.code = $3)
       )
     RETURNING
       da.id,
       (SELECT s.code FROM sites s WHERE s.id = da.site_id) AS site_code,
       (SELECT r.code FROM racks r WHERE r.id = da.rack_id) AS rack_code,
       da.name,
       da.asset_type,
       da.status,
       da.units,
       da.ports,
       da.notes`,
    [
      input.id,
      input.siteCode ?? null,
      input.rackCode ?? null,
      input.name ?? null,
      input.assetType ?? null,
      input.status ?? null,
      input.units ?? null,
      input.ports ?? null,
      hasSiteCode,
      hasRackCode,
      hasName,
      hasAssetType,
      hasStatus,
      hasUnits,
      hasPorts,
      hasNotes,
      input.notes ?? null
    ]
  );

  const row = rows?.[0];
  return row
    ? {
        id: row.id,
        siteCode: row.site_code,
        rackCode: row.rack_code,
        name: row.name,
        assetType: row.asset_type,
        status: row.status,
        units: row.units,
        ports: row.ports,
        notes: row.notes
      }
    : null;
}

export function resolvePhysicalKind(kind: string) {
  return physicalTables[kind as PhysicalKind] ?? null;
}

export async function updatePhysicalStatusInDb(kind: PhysicalKind, id: string, status: string) {
  const config = physicalTables[kind];
  const rows = await query<{ id: string; status: string }>(
    `UPDATE ${config.table}
     SET status = $2
     WHERE id = $1::uuid
     RETURNING id, status`,
    [id, status]
  );

  return rows?.[0] ?? null;
}

export async function deletePhysicalRecordInDb(kind: PhysicalKind, id: string) {
  const config = physicalTables[kind];
  const dependencyGuard =
    kind === "fiber-spans"
      ? "AND NOT EXISTS (SELECT 1 FROM fiber_strands WHERE span_id = fiber_spans.id)"
      : kind === "fiber-strands"
        ? ""
        : "";
  const rows = await query<{ id: string }>(
    `DELETE FROM ${config.table}
     WHERE id = $1::uuid
     ${dependencyGuard}
     RETURNING id`,
    [id]
  );

  return rows?.[0] ?? null;
}
