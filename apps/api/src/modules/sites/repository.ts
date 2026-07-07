import { query, queryOne } from "../../shared/db.js";

type SiteRow = {
  id: string;
  code: string;
  name: string;
  site_type: string;
  status: string;
  devices: string;
  circuits: string;
  prefixes: string;
  incidents: string;
};

type SiteLocationRow = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
};

type SiteMapNodeRow = {
  id: string;
  code: string;
  name: string;
  site_type: string;
  status: string;
  latitude: string | null;
  longitude: string | null;
};

type SiteCodeRow = {
  code: string;
};

type DownstreamSiteRow = {
  code: string;
  name: string;
  site_type: string;
  status: string;
  depth: number;
};

type SiteTransportLinkRow = {
  id: string;
  a: string;
  z: string;
  status: string;
  link_type: string;
  capacity_mbps: number | null;
  label: string | null;
};

type SiteMapLinkRow = {
  id: string;
  a: string;
  z: string;
  status: string;
  link_type: string;
  capacity_mbps: number | null;
  label: string | null;
};

export type CreateSiteInput = {
  code: string;
  name: string;
  siteType: string;
  status?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type UpsertSiteInput = CreateSiteInput;

export type UpdateSiteLocationInput = {
  code: string;
  address?: string | null;
  latitude: number;
  longitude: number;
};

export type UpdateSiteInput = {
  code: string;
  name: string;
  siteType: string;
  status: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type CreateSiteTransportLinkInput = {
  aSiteCode: string;
  zSiteCode: string;
  providerCode?: string | null;
  circuitCode?: string | null;
  linkType: string;
  status?: string;
  capacityMbps?: number | null;
  label?: string | null;
};

function normalizeStatus(status: string) {
  if (status === "active") {
    return "healthy";
  }

  return status;
}

function mapSite(row: SiteRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.site_type,
    status: normalizeStatus(row.status),
    devices: Number(row.devices ?? 0),
    circuits: Number(row.circuits ?? 0),
    prefixes: Number(row.prefixes ?? 0),
    incidents: Number(row.incidents ?? 0)
  };
}

function normalizeMapStatus(status: string) {
  if (status === "active") {
    return "healthy";
  }

  return status;
}

function mapLocation(row: SiteLocationRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address,
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null
  };
}

function mapTransportLink(row: SiteTransportLinkRow) {
  return {
    id: row.id,
    a: row.a,
    z: row.z,
    status: row.status,
    type: row.link_type,
    capacityMbps: row.capacity_mbps,
    label: row.label ?? `${row.a} <> ${row.z}`
  };
}

function projectNodes(rows: SiteMapNodeRow[]) {
  const coordinates = rows
    .map((row) => ({
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null
    }))
    .filter((item): item is { latitude: number; longitude: number } => item.latitude !== null && item.longitude !== null);

  const minLat = Math.min(...coordinates.map((item) => item.latitude));
  const maxLat = Math.max(...coordinates.map((item) => item.latitude));
  const minLon = Math.min(...coordinates.map((item) => item.longitude));
  const maxLon = Math.max(...coordinates.map((item) => item.longitude));
  const latSpan = Math.max(maxLat - minLat, 0.001);
  const lonSpan = Math.max(maxLon - minLon, 0.001);

  return rows.map((row, index) => {
    const latitude = row.latitude ? Number(row.latitude) : null;
    const longitude = row.longitude ? Number(row.longitude) : null;
    const x = longitude === null ? 120 + index * 80 : 80 + ((longitude - minLon) / lonSpan) * 740;
    const y = latitude === null ? 270 : 70 + ((maxLat - latitude) / latSpan) * 390;

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.site_type,
      status: normalizeMapStatus(row.status),
      latitude,
      longitude,
      x: Math.round(x),
      y: Math.round(y)
    };
  });
}

export async function listSitesFromDb() {
  const rows = await query<SiteRow>(
    `SELECT
       s.id,
       s.code,
       s.name,
       s.site_type,
       s.status,
       COUNT(DISTINCT d.id) AS devices,
       COUNT(DISTINCT ce.circuit_id) AS circuits,
       COUNT(DISTINCT p.id) AS prefixes,
       0 AS incidents
     FROM sites s
     LEFT JOIN devices d ON d.site_id = s.id
     LEFT JOIN circuit_endpoints ce ON ce.site_id = s.id
     LEFT JOIN prefixes p ON p.site_id = s.id
     GROUP BY s.id
     ORDER BY s.code`
  );

  return rows?.map(mapSite) ?? null;
}

export async function listSiteCodesFromDb() {
  const rows = await query<SiteCodeRow>("SELECT code FROM sites ORDER BY code");

  return rows?.map((row) => row.code) ?? null;
}

export async function getSiteMapFromDb() {
  const nodes = await query<SiteMapNodeRow>(
    `SELECT DISTINCT
       s.id,
       s.code,
       s.name,
       s.site_type,
       s.status,
       s.latitude,
       s.longitude
     FROM sites s
     WHERE s.latitude IS NOT NULL
       AND s.longitude IS NOT NULL
       AND (
         s.code IN ('AQP-POP', 'LA-JOYA', 'MAJES', 'SANTA-RITA', 'CORIRE', 'APLAO', 'ESCALERILLAS', 'QUISCAY')
         OR EXISTS (
           SELECT 1
           FROM site_transport_links stl
           WHERE stl.a_site_id = s.id OR stl.z_site_id = s.id
         )
       )
     ORDER BY s.code`
  );

  if (!nodes?.length) {
    return null;
  }

  const links = await query<SiteMapLinkRow>(
    `SELECT
       stl.id,
       a.code AS a,
       z.code AS z,
       stl.status,
       stl.link_type,
       stl.capacity_mbps,
       stl.label
     FROM site_transport_links stl
     JOIN sites a ON a.id = stl.a_site_id
     JOIN sites z ON z.id = stl.z_site_id
     ORDER BY a.code, z.code`
  );

  return {
    nodes: projectNodes(nodes),
    links: (links ?? []).map((link) => ({
      id: link.id,
      a: link.a,
      z: link.z,
      status: link.status,
      type: link.link_type,
      capacityMbps: link.capacity_mbps,
      label: link.label ?? `${link.a} <> ${link.z}`
    }))
  };
}

export async function getSiteDownstreamImpactFromDb(code: string) {
  const rows = await query<DownstreamSiteRow>(
    `WITH RECURSIVE downstream AS (
       SELECT
         z.code,
         z.name,
         z.site_type,
         z.status,
         1 AS depth,
         ARRAY[a.code, z.code] AS path
       FROM site_transport_links stl
       JOIN sites a ON a.id = stl.a_site_id
       JOIN sites z ON z.id = stl.z_site_id
       WHERE a.code = $1

       UNION ALL

       SELECT
         next_z.code,
         next_z.name,
         next_z.site_type,
         next_z.status,
         d.depth + 1 AS depth,
         d.path || next_z.code AS path
       FROM downstream d
       JOIN sites current_site ON current_site.code = d.code
       JOIN site_transport_links next_link ON next_link.a_site_id = current_site.id
       JOIN sites next_z ON next_z.id = next_link.z_site_id
       WHERE NOT next_z.code = ANY(d.path)
     )
     SELECT DISTINCT ON (code) code, name, site_type, status, depth
     FROM downstream
     ORDER BY code, depth`,
    [code]
  );

  return rows?.map((row) => ({
    code: row.code,
    name: row.name,
    type: row.site_type,
    status: normalizeMapStatus(row.status),
    depth: Number(row.depth)
  })) ?? null;
}

export async function getSiteByCodeFromDb(code: string) {
  const row = await queryOne<SiteRow>(
    `SELECT
       s.id,
       s.code,
       s.name,
       s.site_type,
       s.status,
       COUNT(DISTINCT d.id) AS devices,
       COUNT(DISTINCT ce.circuit_id) AS circuits,
       COUNT(DISTINCT p.id) AS prefixes,
       0 AS incidents
     FROM sites s
     LEFT JOIN devices d ON d.site_id = s.id
     LEFT JOIN circuit_endpoints ce ON ce.site_id = s.id
     LEFT JOIN prefixes p ON p.site_id = s.id
     WHERE s.code = $1 OR s.id::text = $1
     GROUP BY s.id`,
    [code]
  );

  return row ? mapSite(row) : null;
}

export async function getSiteLocationFromDb(code: string) {
  const row = await queryOne<SiteLocationRow>(
    `SELECT id, code, name, address, latitude, longitude
     FROM sites
     WHERE code = $1 OR id::text = $1`,
    [code]
  );

  return row ? mapLocation(row) : null;
}

export async function updateSiteLocationInDb(input: UpdateSiteLocationInput) {
  const row = await queryOne<SiteLocationRow>(
    `UPDATE sites
     SET address = COALESCE($2, address),
         latitude = $3,
         longitude = $4,
         updated_at = now()
     WHERE code = $1 OR id::text = $1
     RETURNING id, code, name, address, latitude, longitude`,
    [input.code, input.address ?? null, input.latitude, input.longitude]
  );

  return row ? mapLocation(row) : null;
}

export async function updateSiteInDb(input: UpdateSiteInput) {
  const row = await queryOne<SiteRow>(
    `WITH updated AS (
       UPDATE sites
       SET name = $2,
           site_type = $3,
           status = $4,
           address = $5,
           latitude = $6,
           longitude = $7,
           updated_at = now()
       WHERE code = $1 OR id::text = $1
       RETURNING *
     )
     SELECT
       s.id,
       s.code,
       s.name,
       s.site_type,
       s.status,
       COUNT(DISTINCT d.id) AS devices,
       COUNT(DISTINCT ce.circuit_id) AS circuits,
       COUNT(DISTINCT p.id) AS prefixes,
       0 AS incidents
     FROM updated s
     LEFT JOIN devices d ON d.site_id = s.id
     LEFT JOIN circuit_endpoints ce ON ce.site_id = s.id
     LEFT JOIN prefixes p ON p.site_id = s.id
     GROUP BY s.id, s.code, s.name, s.site_type, s.status`,
    [
      input.code,
      input.name,
      input.siteType,
      input.status,
      input.address ?? null,
      input.latitude ?? null,
      input.longitude ?? null
    ]
  );

  return row ? mapSite(row) : null;
}

export async function deleteSiteInDb(code: string) {
  const row = await queryOne<{ id: string }>(
    `WITH selected AS (
       SELECT id FROM sites WHERE id::text = $1 OR code = $1
     ),
     dependency_counts AS (
       SELECT
         (SELECT COUNT(*) FROM devices WHERE site_id = selected.id) AS devices,
         (SELECT COUNT(*) FROM racks WHERE site_id = selected.id) AS racks,
         (SELECT COUNT(*) FROM power_feeds WHERE site_id = selected.id) AS power_feeds,
         (SELECT COUNT(*) FROM power_assets WHERE site_id = selected.id) AS power_assets,
         (SELECT COUNT(*) FROM prefixes WHERE site_id = selected.id) AS prefixes,
         (SELECT COUNT(*) FROM circuit_endpoints WHERE site_id = selected.id) AS circuit_endpoints,
         (SELECT COUNT(*) FROM site_transport_links WHERE a_site_id = selected.id OR z_site_id = selected.id) AS transport_links,
         (SELECT COUNT(*) FROM documents WHERE object_type = 'site' AND object_id = selected.id) AS documents,
         (SELECT COUNT(*) FROM evidence_files WHERE object_type = 'site' AND object_id = selected.id) AS evidence,
         (SELECT COUNT(*) FROM incident_impacts WHERE object_type = 'site' AND object_id = selected.id) AS incident_impacts
       FROM selected
     )
     DELETE FROM sites
     WHERE id = (SELECT id FROM selected)
       AND EXISTS (SELECT 1 FROM selected)
       AND EXISTS (
         SELECT 1
         FROM dependency_counts
         WHERE devices = 0
           AND racks = 0
           AND power_feeds = 0
           AND power_assets = 0
           AND prefixes = 0
           AND circuit_endpoints = 0
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

export async function createSiteTransportLinkInDb(input: CreateSiteTransportLinkInput) {
  const row = await queryOne<SiteTransportLinkRow>(
    `INSERT INTO site_transport_links
       (a_site_id, z_site_id, provider_id, circuit_id, link_type, status, capacity_mbps, label)
     SELECT
       a.id,
       z.id,
       p.id,
       c.id,
       $5,
       $6,
       $7,
       $8
     FROM sites a
     JOIN sites z ON z.code = $2
     LEFT JOIN providers p ON p.code = $3
     LEFT JOIN circuits c ON c.code = $4
     WHERE a.code = $1
     ON CONFLICT (a_site_id, z_site_id, link_type)
     DO UPDATE SET
       provider_id = EXCLUDED.provider_id,
       circuit_id = EXCLUDED.circuit_id,
       status = EXCLUDED.status,
       capacity_mbps = EXCLUDED.capacity_mbps,
       label = EXCLUDED.label
     RETURNING
       id,
       (SELECT code FROM sites WHERE id = a_site_id) AS a,
       (SELECT code FROM sites WHERE id = z_site_id) AS z,
       status,
       link_type,
       capacity_mbps,
       label`,
    [
      input.aSiteCode,
      input.zSiteCode,
      input.providerCode ?? null,
      input.circuitCode ?? null,
      input.linkType,
      input.status ?? "planned",
      input.capacityMbps ?? null,
      input.label ?? null
    ]
  );

  return row ? mapTransportLink(row) : null;
}

export async function createSiteInDb(input: CreateSiteInput) {
  const row = await queryOne<SiteRow>(
    `INSERT INTO sites (code, name, site_type, status, address, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, code, name, site_type, status, 0 AS devices, 0 AS circuits, 0 AS prefixes, 0 AS incidents`,
    [
      input.code,
      input.name,
      input.siteType,
      input.status ?? "planned",
      input.address ?? null,
      input.latitude ?? null,
      input.longitude ?? null
    ]
  );

  return row ? mapSite(row) : null;
}

export async function upsertSiteInDb(input: UpsertSiteInput) {
  const row = await queryOne<SiteRow>(
    `INSERT INTO sites (code, name, site_type, status, address, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (code)
     DO UPDATE SET
       name = EXCLUDED.name,
       site_type = EXCLUDED.site_type,
       status = EXCLUDED.status,
       address = COALESCE(EXCLUDED.address, sites.address),
       latitude = COALESCE(EXCLUDED.latitude, sites.latitude),
       longitude = COALESCE(EXCLUDED.longitude, sites.longitude),
       updated_at = now()
     RETURNING id, code, name, site_type, status, 0 AS devices, 0 AS circuits, 0 AS prefixes, 0 AS incidents`,
    [
      input.code,
      input.name,
      input.siteType,
      input.status ?? "planned",
      input.address ?? null,
      input.latitude ?? null,
      input.longitude ?? null
    ]
  );

  return row ? mapSite(row) : null;
}
