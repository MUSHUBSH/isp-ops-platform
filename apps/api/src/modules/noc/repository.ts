import { queryOne } from "../../shared/db.js";
import { getAlertCountsFromDb } from "../monitoring/repository.js";

type NocDbRow = {
  sites_total: string;
  sites_degraded: string;
  sites_down: string;
  circuits_total: string;
  circuits_degraded: string;
  circuits_down: string;
  undocumented_ips: string;
  prefixes_near_exhaustion: string;
  devices_without_backup: string;
};

export async function getNocSummaryFromDb() {
  const counts = await getAlertCountsFromDb();
  const row = await queryOne<NocDbRow>(
    `WITH latest_backups AS (
       SELECT device_id, MAX(collected_at) AS last_backup
       FROM config_backups
       GROUP BY device_id
     ),
     prefix_usage AS (
       SELECT p.id, COUNT(ip.id) AS assigned_count
       FROM prefixes p
       LEFT JOIN ip_addresses ip ON ip.prefix_id = p.id
       GROUP BY p.id
     )
     SELECT
       (SELECT COUNT(*) FROM sites) AS sites_total,
       (SELECT COUNT(*) FROM sites WHERE status IN ('degraded', 'maintenance')) AS sites_degraded,
       (SELECT COUNT(*) FROM sites WHERE status = 'down') AS sites_down,
       (SELECT COUNT(*) FROM circuits) AS circuits_total,
       (SELECT COUNT(*) FROM circuits WHERE status = 'degraded') AS circuits_degraded,
       (SELECT COUNT(*) FROM circuits WHERE status = 'down') AS circuits_down,
       (SELECT COUNT(*) FROM ip_addresses WHERE interface_id IS NULL OR status = 'undocumented') AS undocumented_ips,
       (SELECT COUNT(*) FROM prefix_usage WHERE assigned_count >= 200) AS prefixes_near_exhaustion,
       (SELECT COUNT(*) FROM devices d LEFT JOIN latest_backups lb ON lb.device_id = d.id WHERE lb.device_id IS NULL) AS devices_without_backup`
  );

  if (!row || !counts) {
    return null;
  }

  const operationalDebt =
    Number(row.undocumented_ips ?? 0) +
    Number(row.devices_without_backup ?? 0) +
    Number(row.prefixes_near_exhaustion ?? 0);
  const outagePressure =
    counts.critical * 10 +
    counts.major * 5 +
    counts.minor * 1 +
    Number(row.circuits_down ?? 0) * 10 +
    Number(row.sites_down ?? 0) * 15 +
    operationalDebt;

  return {
    healthScore: Math.max(0, 100 - outagePressure),
    activeAlerts: counts,
    sites: {
      total: Number(row.sites_total ?? 0),
      degraded: Number(row.sites_degraded ?? 0),
      down: Number(row.sites_down ?? 0)
    },
    circuits: {
      total: Number(row.circuits_total ?? 0),
      degraded: Number(row.circuits_degraded ?? 0),
      down: Number(row.circuits_down ?? 0)
    },
    ipam: {
      publicIpv4Utilization: 0,
      prefixesNearExhaustion: Number(row.prefixes_near_exhaustion ?? 0),
      undocumentedIps: Number(row.undocumented_ips ?? 0)
    },
    backups: {
      devicesWithoutBackup: Number(row.devices_without_backup ?? 0)
    }
  };
}
