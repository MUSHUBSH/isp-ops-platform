import type { FastifyInstance } from "fastify";
import { circuits, devices, interfaces, ipAssignments, prefixes, providers, sites } from "../../shared/demo-data.js";

export async function registerSearchRoutes(app: FastifyInstance) {
  app.get("/search", async (request) => {
    const query = (request.query as { q?: string }).q?.toLowerCase() ?? "";
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
      query,
      results: index.filter((item) =>
        [item.type, item.label, item.context].join(" ").toLowerCase().includes(query)
      )
    };
  });
}
