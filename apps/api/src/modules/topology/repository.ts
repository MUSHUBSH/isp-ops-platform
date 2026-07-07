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

  if (!rows || rows.length === 0) {
    return null;
  }

  const nodeMap = new Map<string, { id: string; label: string; type: string; status: "healthy" | "degraded" | "down"; x: number; y: number }>();

  rows.forEach((row, index) => {
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
  });

  return {
    nodes: Array.from(nodeMap.values()),
    edges: rows.map((row) => ({
      id: row.link_id,
      source: row.a_device_id,
      target: row.b_device_id,
      status: normalizeStatus(row.status),
      label: row.circuit_code ?? `${row.capacity_mbps ?? "?"} Mbps`
    }))
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
