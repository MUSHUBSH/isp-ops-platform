import { query } from "../../shared/db.js";

type TopologyRow = {
  link_id: string;
  status: string;
  capacity_mbps: number | null;
  circuit_code: string | null;
  a_device_id: string;
  a_device: string;
  a_site: string;
  a_status: string;
  b_device_id: string;
  b_device: string;
  b_site: string;
  b_status: string;
};

type ServiceTopologyRow = {
  endpoint_id: string;
  service_id: string;
  service_code: string;
  service_name: string;
  service_status: string;
  role: string;
  site_id: string | null;
  site_code: string | null;
  site_status: string | null;
  device_id: string | null;
  device_name: string | null;
  device_status: string | null;
  circuit_code: string | null;
};

export async function buildTopologyFromDb() {
  const rows = await query<TopologyRow>(
    `SELECT
       il.id AS link_id,
       il.status,
       il.capacity_mbps,
       c.code AS circuit_code,
       ad.id::text AS a_device_id,
       ad.name AS a_device,
       asite.code AS a_site,
       ad.status AS a_status,
       bd.id::text AS b_device_id,
       bd.name AS b_device,
       bsite.code AS b_site,
       bd.status AS b_status
     FROM interface_links il
     JOIN interfaces ai ON ai.id = il.a_interface_id
     JOIN devices ad ON ad.id = ai.device_id
     JOIN sites asite ON asite.id = ad.site_id
     JOIN interfaces bi ON bi.id = il.b_interface_id
     JOIN devices bd ON bd.id = bi.device_id
     JOIN sites bsite ON bsite.id = bd.site_id
     LEFT JOIN circuits c ON c.id = il.circuit_id
     ORDER BY ad.name, bd.name`
  );

  const serviceRows = await query<ServiceTopologyRow>(
    `SELECT
       se.id::text AS endpoint_id,
       svc.id::text AS service_id,
       svc.code AS service_code,
       svc.name AS service_name,
       svc.status AS service_status,
       se.role,
       s.id::text AS site_id,
       s.code AS site_code,
       s.status AS site_status,
       d.id::text AS device_id,
       d.name AS device_name,
       d.status AS device_status,
       c.code AS circuit_code
     FROM service_endpoints se
     JOIN services svc ON svc.id = se.service_id
     LEFT JOIN sites s ON s.id = se.site_id
     LEFT JOIN devices d ON d.id = se.device_id
     LEFT JOIN circuits c ON c.id = se.circuit_id
     ORDER BY svc.code, se.role`
  );

  if ((!rows || rows.length === 0) && (!serviceRows || serviceRows.length === 0)) {
    return null;
  }

  const nodeMap = new Map<string, { id: string; label: string; type: string; status: "healthy" | "degraded" | "down"; x: number; y: number }>();
  const edges: Array<{ id: string; source: string; target: string; status: "healthy" | "degraded" | "down"; label: string }> = [];

  rows?.forEach((row, index) => {
    const baseY = 90 + (index % 4) * 70;
    nodeMap.set(row.a_device_id, {
      id: row.a_device_id,
      label: row.a_device,
      type: row.a_site,
      status: normalizeStatus(row.a_status),
      x: 130,
      y: baseY
    });
    nodeMap.set(row.b_device_id, {
      id: row.b_device_id,
      label: row.b_device,
      type: row.b_site,
      status: normalizeStatus(row.b_status),
      x: 610,
      y: baseY + 35
    });

    edges.push({
      id: row.link_id,
      source: row.a_device_id,
      target: row.b_device_id,
      status: normalizeStatus(row.status),
      label: row.circuit_code ?? `${row.capacity_mbps ?? "?"} Mbps`
    });
  });

  serviceRows?.forEach((row, index) => {
    const serviceNodeId = `service:${row.service_id}`;
    const targetNodeId = row.device_id ?? (row.site_id ? `site:${row.site_id}` : null);
    const baseY = 70 + (index % 5) * 62;

    nodeMap.set(serviceNodeId, {
      id: serviceNodeId,
      label: row.service_code,
      type: "service",
      status: normalizeStatus(row.service_status),
      x: 370,
      y: baseY
    });

    if (row.device_id && row.device_name) {
      nodeMap.set(row.device_id, {
        id: row.device_id,
        label: row.device_name,
        type: row.site_code ?? "device",
        status: normalizeStatus(row.device_status ?? "unknown"),
        x: 610,
        y: baseY + 24
      });
    } else if (row.site_id && row.site_code) {
      nodeMap.set(`site:${row.site_id}`, {
        id: `site:${row.site_id}`,
        label: row.site_code,
        type: "site",
        status: normalizeStatus(row.site_status ?? "unknown"),
        x: 610,
        y: baseY + 24
      });
    }

    if (targetNodeId) {
      edges.push({
        id: `service-edge:${row.endpoint_id}`,
        source: serviceNodeId,
        target: targetNodeId,
        status: normalizeStatus(row.service_status),
        label: row.circuit_code ?? row.role
      });
    }
  });

  return {
    nodes: Array.from(nodeMap.values()),
    edges
  };
}

function normalizeStatus(status: string): "healthy" | "degraded" | "down" {
  if (status === "active" || status === "healthy") {
    return "healthy";
  }

  if (status === "down") {
    return "down";
  }

  return "degraded";
}
