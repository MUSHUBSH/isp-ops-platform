export type NocSummary = {
  healthScore: number;
  activeAlerts: {
    critical: number;
    major: number;
    minor: number;
  };
  sites: {
    total: number;
    degraded: number;
    down: number;
  };
  circuits: {
    total: number;
    degraded: number;
    down: number;
  };
  ipam: {
    publicIpv4Utilization: number;
    prefixesNearExhaustion: number;
    undocumentedIps: number;
  };
};

export type Alert = {
  id: string;
  severity: "critical" | "major" | "minor";
  status?: string;
  title: string;
  context: string;
  objectType: string;
  objectId: string;
  monitorSource?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  acknowledgedAt?: string | null;
};

export type Incident = {
  id: string;
  code: string;
  title: string;
  severity: string;
  status: string;
  startedAt: string;
  resolvedAt: string | null;
  ownerTeam: string | null;
  summary: string | null;
  impactCount: number;
  eventCount: number;
};

export type IncidentEvent = {
  id: string;
  eventType: string;
  message: string;
  createdAt: string;
  createdBy?: string | null;
};

export type MaintenanceWindow = {
  id: string;
  objectType: string;
  objectId: string;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
};

export type Site = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: "healthy" | "degraded" | "down";
  devices: number;
  circuits: number;
  prefixes: number;
  incidents: number;
};

export type SiteMap = {
  nodes: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    latitude: number | null;
    longitude: number | null;
    x: number;
    y: number;
  }>;
  links: Array<{
    id: string;
    a: string;
    z: string;
    status: string;
    type: string;
    capacityMbps: number | null;
    label: string;
    providerCode: string | null;
    circuitCode: string | null;
  }>;
};

export type DownstreamImpact = {
  siteCode: string;
  impactedCount: number;
  impactedSites: Array<{
    code: string;
    name: string;
    type: string;
    status: string;
    depth: number;
  }>;
};

export type Provider = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  nocEmail: string;
  nocPhone?: string;
  activeCircuits: number;
  availability30d: number;
  mttrHours30d: number;
};

export type ProviderContract = {
  id: string;
  providerCode: string;
  code: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  currency: string | null;
  monthlyCost: number | null;
  slaTarget: number | null;
};


export type ProviderCapacity = {
  id: string;
  providerCode: string;
  providerName: string;
  contractCode: string;
  serviceType: string;
  committedMbps: number;
  burstableMbps: number | null;
  deliveredMbps: number;
  usedMbps: number;
  billingMode: string;
  status: string;
};

export type FiberSpan = {
  id: string;
  code: string;
  aSite: string;
  zSite: string;
  providerCode: string | null;
  cableType: string;
  fiberCount: number;
  usedFibers: number;
  distanceKm: number | null;
  status: string;
  notes: string | null;
};

export type FiberStrand = {
  id: string;
  spanCode: string;
  strandNumber: number;
  tubeColor: string | null;
  fiberColor: string | null;
  status: string;
  service: string | null;
  circuitCode: string | null;
  aTermination: string | null;
  zTermination: string | null;
};

export type Transceiver = {
  id: string;
  device: string;
  interface: string;
  siteCode: string;
  vendor: string;
  partNumber: string;
  serialNumber: string | null;
  formFactor: string;
  speedMbps: number;
  wavelengthNm: number | null;
  reachKm: number | null;
  connectorType: string;
  fiberMode: string;
  txPowerDbm: number | null;
  rxPowerDbm: number | null;
  status: string;
};

export type Patchcord = {
  id: string;
  code: string;
  aEndpoint: string;
  zEndpoint: string;
  aDevice: string | null;
  zDevice: string | null;
  mediaType: string;
  connectorA: string;
  connectorZ: string;
  lengthMeters: number | null;
  fiberMode: string | null;
  color: string | null;
  status: string;
  circuitCode: string | null;
};

export type DatacenterAsset = {
  id: string;
  siteCode: string;
  rackCode: string | null;
  name: string;
  assetType: string;
  status: string;
  units: number | null;
  ports: number | null;
  notes: string | null;
};

export type Prefix = {
  id: string;
  prefix: string;
  role: string;
  status: string;
  siteCode: string;
  vrf: string;
  utilization: number;
  source: string;
};

export type IpAssignment = {
  id: string;
  address: string;
  prefix: string;
  device: string | null;
  interface: string | null;
  site: string;
  service: string | null;
  role: string;
  status: string;
  description: string | null;
};

export type Circuit = {
  id: string;
  code: string;
  name: string;
  providerCode: string;
  providerName?: string;
  contractCode?: string | null;
  status: "active" | "degraded" | "down" | "maintenance" | "planned" | "retired";
  capacityMbps: number;
  aSite: string;
  zSite: string;
  slaTarget: number;
  endpointCount?: number;
  linkedInterfaces?: number;
};

export type CircuitEndpoint = {
  id: string;
  circuitCode: string;
  siteCode: string | null;
  device: string | null;
  interface: string | null;
  label: string;
  demarcation: string | null;
};

export type RackView = {
  id: string;
  siteCode: string;
  code: string;
  name: string;
  heightU: number;
  utilizationU: number;
  devices: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    positionU: number | null;
    heightU: number;
    powerFeed: string | null;
  }>;
};

export type PowerFeed = {
  id: string;
  siteCode: string;
  name: string;
  feedType: string;
  status: string;
  capacityWatts: number | null;
  loadWatts: number | null;
  source: string | null;
};

export type PowerAsset = {
  id: string;
  siteCode: string;
  name: string;
  assetType: string;
  status: string;
  capacityWatts: number | null;
  loadWatts: number | null;
  autonomyMinutes: number | null;
  batteryHealthPercent: number | null;
  sourceFeed: string | null;
  notes: string | null;
};

export type Device = {
  id: string;
  name: string;
  role: string;
  siteCode: string;
  status: string;
  managementIp: string | null;
  interfaces: number;
  lastBackupAt: string | null;
};

export type NetworkInterface = {
  id: string;
  device: string;
  siteCode: string;
  name: string;
  type: string;
  status: string;
  speedMbps: number | null;
  description: string | null;
};

export type InterfaceLink = {
  id: string;
  aInterfaceId: string;
  bInterfaceId: string;
  aDevice: string;
  bDevice: string;
  linkType: string;
  circuitCode: string | null;
  status: string;
  capacityMbps: number | null;
};

export type TopologyGraph = {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    status: "healthy" | "degraded" | "down";
    x: number;
    y: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    status: "healthy" | "degraded" | "down";
    label: string;
  }>;
};

export type AuditEvent = {
  id: string;
  action: string;
  objectType: string;
  objectLabel: string;
  actor: string;
  reason: string | null;
  at: string;
};

export type TechnicalDocument = {
  id: string;
  objectType: string;
  objectId: string;
  title: string;
  bodyMd: string;
  createdBy: string;
  updatedAt: string;
};

export type EvidenceFile = {
  id: string;
  objectType: string;
  objectId: string;
  filename: string;
  storageKey: string;
  contentType: string | null;
  uploadedBy: string;
  uploadedAt: string;
};

export type ConfigBackup = {
  id: string;
  device: string;
  siteCode: string;
  storageKey: string;
  configHash: string;
  collectedAt: string;
  source: string;
};

export type BackupSummary = {
  totalDevices: number;
  devicesWithBackup: number;
  staleBackups: number;
};

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  siteScopes: string[];
};

export type ChangeRequest = {
  id: string;
  title: string;
  description: string;
  status: string;
  riskLevel: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  requestedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  impactCount: number;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const API_KEY = import.meta.env.VITE_API_KEY;

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: API_KEY ? { "x-api-key": API_KEY } : undefined
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function apiWrite<T>(method: "DELETE" | "PATCH" | "POST", path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(API_KEY ? { "x-api-key": API_KEY } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiWrite<T>("PATCH", path, body);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiWrite<T>("POST", path, body);
}


export async function apiDelete<T>(path: string): Promise<T> {
  return apiWrite<T>("DELETE", path);
}
