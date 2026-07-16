import { useCallback, useEffect, useState } from "react";
import type {
  Alert,
  ApiHealth,
  AuditEvent,
  BackupSummary,
  ChangeRequest,
  Circuit,
  ConfigBackup,
  DatacenterAsset,
  CurrentUser,
  Device,
  EvidenceFile,
  FiberSpan,
  FiberStrand,
  InterfaceLink,
  Incident,
  IpAssignment,
  MaintenanceWindow,
  NetworkInterface,
  NocSummary,
  Patchcord,
  PowerAsset,
  PowerFeed,
  Prefix,
  RackView,
  Provider,
  ProviderCapacity,
  ProviderContract,
  ServiceEndpoint,
  ServiceRecord,
  Site,
  Transceiver,
  SiteMap,
  TechnicalDocument,
  TopologyGraph
} from "../shared/api";
import { apiGet } from "../shared/api";
import {
  fallbackAlerts,
  fallbackAudit,
  fallbackBackups,
  fallbackBackupSummary,
  fallbackChanges,
  fallbackCircuits,
  fallbackDatacenterAssets,
  fallbackDevices,
  fallbackDocuments,
  fallbackEvidence,
  fallbackFiberSpans,
  fallbackFiberStrands,
  fallbackInterfaceLinks,
  fallbackInterfaces,
  fallbackIncidents,
  fallbackIps,
  fallbackMaintenanceWindows,
  fallbackNoc,
  fallbackPrefixes,
  fallbackPatchcords,
  fallbackPowerAssets,
  fallbackPowerFeeds,
  fallbackProviderCapacities,
  fallbackProviderContracts,
  fallbackProviders,
  fallbackRackViews,
  fallbackServiceEndpoints,
  fallbackServices,
  fallbackSiteMap,
  fallbackSites,
  fallbackTopology,
  fallbackTransceivers
} from "../shared/fallback-data";

type PlatformDataState = {
  noc: NocSummary;
  alerts: Alert[];
  maintenanceWindows: MaintenanceWindow[];
  incidents: Incident[];
  sites: Site[];
  siteMap: SiteMap;
  providerCapacities: ProviderCapacity[];
  providerContracts: ProviderContract[];
  providers: Provider[];
  services: ServiceRecord[];
  serviceEndpoints: ServiceEndpoint[];
  prefixes: Prefix[];
  ips: IpAssignment[];
  circuits: Circuit[];
  datacenterAssets: DatacenterAsset[];
  devices: Device[];
  racks: RackView[];
  powerAssets: PowerAsset[];
  patchcords: Patchcord[];
  powerFeeds: PowerFeed[];
  fiberSpans: FiberSpan[];
  fiberStrands: FiberStrand[];
  interfaces: NetworkInterface[];
  interfaceLinks: InterfaceLink[];
  topology: TopologyGraph;
  transceivers: Transceiver[];
  audit: AuditEvent[];
  documents: TechnicalDocument[];
  evidence: EvidenceFile[];
  backups: ConfigBackup[];
  backupSummary: BackupSummary;
  changes: ChangeRequest[];
  currentUser: CurrentUser | null;
  apiHealth: ApiHealth | null;
  apiState: "live" | "fallback";
};

export type PlatformData = PlatformDataState & {
  reload: () => Promise<void>;
};

export function usePlatformData(): PlatformData {
  const [data, setData] = useState<PlatformDataState>({
    noc: fallbackNoc,
    alerts: fallbackAlerts,
    maintenanceWindows: fallbackMaintenanceWindows,
    incidents: fallbackIncidents,
    sites: fallbackSites,
    siteMap: fallbackSiteMap,
    providerCapacities: fallbackProviderCapacities,
    providerContracts: fallbackProviderContracts,
    providers: fallbackProviders,
    services: fallbackServices,
    serviceEndpoints: fallbackServiceEndpoints,
    prefixes: fallbackPrefixes,
    ips: fallbackIps,
    circuits: fallbackCircuits,
    datacenterAssets: fallbackDatacenterAssets,
    devices: fallbackDevices,
    racks: fallbackRackViews,
    powerAssets: fallbackPowerAssets,
    patchcords: fallbackPatchcords,
    powerFeeds: fallbackPowerFeeds,
    fiberSpans: fallbackFiberSpans,
    fiberStrands: fallbackFiberStrands,
    interfaces: fallbackInterfaces,
    interfaceLinks: fallbackInterfaceLinks,
    topology: fallbackTopology,
    transceivers: fallbackTransceivers,
    audit: fallbackAudit,
    documents: fallbackDocuments,
    evidence: fallbackEvidence,
    backups: fallbackBackups,
    backupSummary: fallbackBackupSummary,
    changes: fallbackChanges,
    currentUser: null,
    apiHealth: null,
    apiState: "fallback"
  });

  const load = useCallback(async (cancelledRef?: { cancelled: boolean }) => {
    try {
      const [
        health,
        noc,
        alertsPayload,
        maintenancePayload,
        incidentsPayload,
        sitesPayload,
        siteMap,
        providersPayload,
        providerContractsPayload,
        providerCapacitiesPayload,
        servicesPayload,
        serviceEndpointsPayload,
        prefixesPayload,
        ipsPayload,
        circuitsPayload,
        datacenterAssetsPayload,
        devicesPayload,
        racksPayload,
        patchcordsPayload,
        powerPayload,
        powerAssetsPayload,
        fiberSpansPayload,
        fiberStrandsPayload,
        interfacesPayload,
        linksPayload,
        topology,
        transceiversPayload,
        auditPayload,
        documentsPayload,
        evidencePayload,
        backupsPayload,
        backupSummary,
        changesPayload,
        mePayload
      ] = await Promise.all([
        apiGet<ApiHealth>("/health"),
        apiGet<NocSummary>("/noc/summary"),
        apiGet<{ alerts: Alert[] }>("/monitoring/alerts"),
        apiGet<{ maintenanceWindows: MaintenanceWindow[] }>("/monitoring/maintenance-windows"),
        apiGet<{ incidents: Incident[] }>("/incidents"),
        apiGet<{ sites: Site[] }>("/sites"),
        apiGet<SiteMap>("/sites/map"),
        apiGet<{ providers: Provider[] }>("/providers"),
        apiGet<{ contracts: ProviderContract[] }>("/providers/contracts"),
        apiGet<{ capacities: ProviderCapacity[] }>("/physical/provider-capacities"),
        apiGet<{ services: ServiceRecord[] }>("/services"),
        apiGet<{ endpoints: ServiceEndpoint[] }>("/services/endpoints"),
        apiGet<{ prefixes: Prefix[] }>("/ipam/prefixes"),
        apiGet<{ addresses: IpAssignment[] }>("/ipam/addresses"),
        apiGet<{ circuits: Circuit[] }>("/circuits"),
        apiGet<{ assets: DatacenterAsset[] }>("/physical/datacenter-assets"),
        apiGet<{ devices: Device[] }>("/inventory/devices"),
        apiGet<{ racks: RackView[] }>("/sites/AQP-POP/racks"),
        apiGet<{ patchcords: Patchcord[] }>("/physical/patchcords"),
        apiGet<{ feeds: PowerFeed[] }>("/sites/AQP-POP/power"),
        apiGet<{ assets: PowerAsset[] }>("/sites/AQP-POP/power-assets"),
        apiGet<{ spans: FiberSpan[] }>("/physical/fiber-spans"),
        apiGet<{ strands: FiberStrand[] }>("/physical/fiber-strands"),
        apiGet<{ interfaces: NetworkInterface[] }>("/inventory/interfaces"),
        apiGet<{ links: InterfaceLink[] }>("/inventory/interface-links"),
        apiGet<TopologyGraph>("/topology/graph"),
        apiGet<{ transceivers: Transceiver[] }>("/physical/transceivers"),
        apiGet<{ events: AuditEvent[] }>("/audit/recent"),
        apiGet<{ documents: TechnicalDocument[] }>("/documentation/documents"),
        apiGet<{ evidence: EvidenceFile[] }>("/documentation/evidence"),
        apiGet<{ backups: ConfigBackup[] }>("/backups"),
        apiGet<BackupSummary>("/backups/summary"),
        apiGet<{ changes: ChangeRequest[] }>("/changes"),
        apiGet<{ user: CurrentUser | null }>("/identity/me")
      ]);

      const siteCodes = sitesPayload.sites.length > 0 ? sitesPayload.sites.map((site) => site.code) : ["AQP-POP"];
      const [allRacks, allPowerFeeds, allPowerAssets] = await Promise.all([
        Promise.all(siteCodes.map((code) => apiGet<{ racks: RackView[] }>(`/sites/${code}/racks`))).then((payloads) => payloads.flatMap((payload) => payload.racks)),
        Promise.all(siteCodes.map((code) => apiGet<{ feeds: PowerFeed[] }>(`/sites/${code}/power`))).then((payloads) => payloads.flatMap((payload) => payload.feeds)),
        Promise.all(siteCodes.map((code) => apiGet<{ assets: PowerAsset[] }>(`/sites/${code}/power-assets`))).then((payloads) => payloads.flatMap((payload) => payload.assets))
      ]);

      if (!cancelledRef?.cancelled) {
        setData({
          noc,
          alerts: alertsPayload.alerts,
          maintenanceWindows: maintenancePayload.maintenanceWindows,
          incidents: incidentsPayload.incidents,
          sites: sitesPayload.sites,
          siteMap,
          providerCapacities: providerCapacitiesPayload.capacities,
          providerContracts: providerContractsPayload.contracts,
          providers: providersPayload.providers,
          services: servicesPayload.services,
          serviceEndpoints: serviceEndpointsPayload.endpoints,
          prefixes: prefixesPayload.prefixes,
          ips: ipsPayload.addresses,
          circuits: circuitsPayload.circuits,
          datacenterAssets: datacenterAssetsPayload.assets,
          devices: devicesPayload.devices,
          racks: allRacks.length > 0 ? allRacks : racksPayload.racks,
          powerAssets: allPowerAssets.length > 0 ? allPowerAssets : powerAssetsPayload.assets,
          patchcords: patchcordsPayload.patchcords,
          powerFeeds: allPowerFeeds.length > 0 ? allPowerFeeds : powerPayload.feeds,
          fiberSpans: fiberSpansPayload.spans,
          fiberStrands: fiberStrandsPayload.strands,
          interfaces: interfacesPayload.interfaces,
          interfaceLinks: linksPayload.links,
          topology,
          transceivers: transceiversPayload.transceivers,
          audit: auditPayload.events,
          documents: documentsPayload.documents,
          evidence: evidencePayload.evidence,
          backups: backupsPayload.backups,
          backupSummary,
          changes: changesPayload.changes,
          currentUser: mePayload.user,
          apiHealth: health,
          apiState: "live"
        });
      }
    } catch {
      if (!cancelledRef?.cancelled) {
        setData((current) => ({ ...current, apiHealth: null, apiState: "fallback" }));
      }
    }
  }, []);

  useEffect(() => {
    const cancelledRef = { cancelled: false };
    void load(cancelledRef);

    return () => {
      cancelledRef.cancelled = true;
    };
  }, [load]);

  return { ...data, reload: () => load() };
}
