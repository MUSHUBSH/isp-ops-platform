import type { FastifyInstance } from "fastify";
import { circuits, devices, interfaces, ipAssignments, prefixes, providers, services, sites } from "../../shared/demo-data.js";
import { query } from "../../shared/db.js";

type SearchRow = {
  type: string;
  label: string;
  context: string;
};

async function searchFromDb(searchTerm: string) {
  return query<SearchRow>(
    `WITH search_input AS (
       SELECT ('%' || $1::text || '%') AS pattern
     )
     SELECT type, label, context
     FROM (
       SELECT
         'site' AS type,
         s.code AS label,
         concat_ws(' - ', s.name, s.site_type, s.status) AS context
       FROM sites s, search_input si
       WHERE s.code ILIKE si.pattern OR s.name ILIKE si.pattern OR s.site_type ILIKE si.pattern OR s.status ILIKE si.pattern

       UNION ALL

       SELECT
         'provider' AS type,
         p.name AS label,
         concat_ws(' - ', p.code, p.provider_type, p.status, p.noc_email) AS context
       FROM providers p, search_input si
       WHERE p.code ILIKE si.pattern OR p.name ILIKE si.pattern OR p.provider_type ILIKE si.pattern OR p.status ILIKE si.pattern OR p.noc_email ILIKE si.pattern

       UNION ALL

       SELECT
         'device' AS type,
         d.name AS label,
         concat_ws(' - ', dr.code, s.code, d.status, d.management_ip::text) AS context
       FROM devices d
       LEFT JOIN sites s ON s.id = d.site_id
       LEFT JOIN device_roles dr ON dr.id = d.role_id
       CROSS JOIN search_input si
       WHERE d.name ILIKE si.pattern OR d.status ILIKE si.pattern OR d.management_ip::text ILIKE si.pattern OR s.code ILIKE si.pattern OR dr.code ILIKE si.pattern

       UNION ALL

       SELECT
         'interface' AS type,
         concat_ws(' ', d.name, i.name) AS label,
         concat_ws(' - ', i.interface_type, s.code, i.status, i.speed_mbps::text) AS context
       FROM interfaces i
       JOIN devices d ON d.id = i.device_id
       LEFT JOIN sites s ON s.id = d.site_id
       CROSS JOIN search_input si
       WHERE i.name ILIKE si.pattern OR i.interface_type ILIKE si.pattern OR i.status ILIKE si.pattern OR d.name ILIKE si.pattern OR s.code ILIKE si.pattern

       UNION ALL

       SELECT
         'prefix' AS type,
         pfx.prefix::text AS label,
         concat_ws(' - ', pfx.role, s.code, v.name, pfx.status) AS context
       FROM prefixes pfx
       LEFT JOIN sites s ON s.id = pfx.site_id
       LEFT JOIN vrfs v ON v.id = pfx.vrf_id
       CROSS JOIN search_input si
       WHERE pfx.prefix::text ILIKE si.pattern OR pfx.role ILIKE si.pattern OR pfx.status ILIKE si.pattern OR s.code ILIKE si.pattern OR v.name ILIKE si.pattern

       UNION ALL

       SELECT
         'ip' AS type,
         ip.address::text AS label,
         concat_ws(' - ', d.name, i.name, s.code, svc.name, ip.role, ip.status) AS context
       FROM ip_addresses ip
       LEFT JOIN interfaces i ON i.id = ip.interface_id
       LEFT JOIN devices d ON d.id = i.device_id
       LEFT JOIN sites s ON s.id = d.site_id
       LEFT JOIN service_endpoints se ON se.ip_address_id = ip.id
       LEFT JOIN services svc ON svc.id = se.service_id
       CROSS JOIN search_input si
       WHERE ip.address::text ILIKE si.pattern OR ip.role ILIKE si.pattern OR ip.status ILIKE si.pattern OR d.name ILIKE si.pattern OR i.name ILIKE si.pattern OR s.code ILIKE si.pattern OR svc.name ILIKE si.pattern

       UNION ALL

       SELECT
         'service' AS type,
         svc.code AS label,
         concat_ws(' - ', svc.name, svc.service_type, svc.status, svc.owner_team) AS context
       FROM services svc, search_input si
       WHERE svc.code ILIKE si.pattern OR svc.name ILIKE si.pattern OR svc.service_type ILIKE si.pattern OR svc.status ILIKE si.pattern OR svc.owner_team ILIKE si.pattern

       UNION ALL

       SELECT
         'circuit' AS type,
         c.code AS label,
         concat_ws(' - ', c.name, p.code, c.circuit_type, c.status, c.capacity_mbps::text) AS context
       FROM circuits c
       LEFT JOIN providers p ON p.id = c.provider_id
       CROSS JOIN search_input si
       WHERE c.code ILIKE si.pattern OR c.name ILIKE si.pattern OR c.circuit_type ILIKE si.pattern OR c.status ILIKE si.pattern OR p.code ILIKE si.pattern
     ) results
     ORDER BY type, label
     LIMIT 50`,
    [searchTerm]
  );
}

export async function registerSearchRoutes(app: FastifyInstance) {
  app.get("/search", async (request) => {
    const searchTerm = (request.query as { q?: string }).q?.trim() ?? "";
    const dbResults = await searchFromDb(searchTerm);

    if (dbResults) {
      return {
        query: searchTerm.toLowerCase(),
        results: dbResults
      };
    }

    const demoQuery = searchTerm.toLowerCase();
    const index = [
      ...devices.map((item) => ({
        type: "device",
        label: item.name,
        context: `${item.role} - ${item.siteCode}`
      })),
      ...interfaces.map((item) => ({
        type: "interface",
        label: `${item.device} ${item.name}`,
        context: `${item.type} - ${item.siteCode} - ${item.status}`
      })),
      ...prefixes.map((item) => ({
        type: "prefix",
        label: item.prefix,
        context: `${item.role} - ${item.siteCode} - ${item.utilization}%`
      })),
      ...ipAssignments.map((item) => ({
        type: "ip",
        label: item.address,
        context: `${item.device ?? "sin equipo"} - ${item.interface ?? "sin interfaz"} - ${item.service ?? "sin servicio"}`
      })),
      ...services.map((item) => ({
        type: "service",
        label: item.code,
        context: `${item.name} - ${item.serviceType} - ${item.status}`
      })),
      ...circuits.map((item) => ({
        type: "circuit",
        label: item.code,
        context: `${item.name} - ${item.providerCode} - ${item.status}`
      })),
      ...providers.map((item) => ({
        type: "provider",
        label: item.name,
        context: `${item.type} - ${item.availability30d}% 30d`
      })),
      ...sites.map((item) => ({
        type: "site",
        label: item.code,
        context: `${item.name} - ${item.status}`
      }))
    ];

    return {
      query: demoQuery,
      results: index.filter((item) =>
        [item.type, item.label, item.context].join(" ").toLowerCase().includes(demoQuery)
      )
    };
  });
}
