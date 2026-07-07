export const nocSummary = {
  healthScore: 94,
  activeAlerts: {
    critical: 1,
    major: 3,
    minor: 8
  },
  sites: {
    total: 18,
    degraded: 2,
    down: 0
  },
  circuits: {
    total: 42,
    degraded: 4,
    down: 1
  },
  ipam: {
    publicIpv4Utilization: 71,
    prefixesNearExhaustion: 3,
    undocumentedIps: 12
  },
  recentChanges: [
    {
      id: "chg-001",
      object: "PE-LIMA-01",
      action: "interface.updated",
      actor: "noc",
      at: "2026-07-04T14:00:00.000Z"
    }
  ]
};

export const providers = [
  {
    id: "prov-andean-fiber",
    code: "ANDEAN",
    name: "Andean Fiber",
    type: "transport",
    status: "active",
    nocEmail: "noc@andeanfiber.example",
    activeCircuits: 9,
    availability30d: 99.71,
    mttrHours30d: 3.4
  },
  {
    id: "prov-pacific-transit",
    code: "PACIFIC",
    name: "Pacific Transit",
    type: "internet_transit",
    status: "active",
    nocEmail: "noc@pacifictransit.example",
    activeCircuits: 4,
    availability30d: 99.96,
    mttrHours30d: 1.1
  }
];

export const contracts = [
  {
    id: "ctr-andean-transport-2026",
    providerCode: "ANDEAN",
    code: "AF-TRANS-2026",
    name: "Transporte regional sur/norte",
    status: "active",
    startDate: null,
    endDate: null,
    slaTarget: 99.7,
    monthlyCost: 8200,
    currency: "USD"
  },
  {
    id: "ctr-pacific-transit-2026",
    providerCode: "PACIFIC",
    code: "PT-IPT-2026",
    name: "Transito IP 20G Lima",
    status: "active",
    startDate: null,
    endDate: null,
    slaTarget: 99.9,
    monthlyCost: 14500,
    currency: "USD"
  }
];

export const sites = [
  {
    id: "site-lim-core",
    code: "LIM-CORE",
    name: "POP Lima Centro",
    type: "pop",
    status: "healthy",
    devices: 42,
    circuits: 12,
    prefixes: 18,
    incidents: 0
  },
  {
    id: "site-aqp-pop",
    code: "AQP-POP",
    name: "POP Arequipa",
    type: "pop",
    status: "degraded",
    devices: 18,
    circuits: 5,
    prefixes: 7,
    incidents: 2
  },
  {
    id: "site-tru-nodo",
    code: "TRU-NODO",
    name: "Nodo Trujillo Norte",
    type: "node",
    status: "healthy",
    devices: 11,
    circuits: 3,
    prefixes: 5,
    incidents: 0
  }
];

export const siteMap = {
  nodes: [
    {
      id: "site-aqp-pop",
      code: "AQP-POP",
      name: "POP Arequipa",
      type: "provider_hub",
      status: "degraded",
      latitude: -16.409047,
      longitude: -71.537451,
      x: 120,
      y: 210
    },
    {
      id: "site-la-joya",
      code: "LA-JOYA",
      name: "Hub La Joya",
      type: "hub",
      status: "healthy",
      latitude: -16.423,
      longitude: -71.818,
      x: 255,
      y: 245
    },
    {
      id: "site-majes",
      code: "MAJES",
      name: "Hub Majes",
      type: "hub",
      status: "healthy",
      latitude: -16.35,
      longitude: -72.19,
      x: 430,
      y: 250
    },
    {
      id: "site-santa-rita",
      code: "SANTA-RITA",
      name: "Sede Santa Rita",
      type: "access_site",
      status: "healthy",
      latitude: -16.49,
      longitude: -72.1,
      x: 500,
      y: 365
    },
    {
      id: "site-corire",
      code: "CORIRE",
      name: "Sede Corire",
      type: "access_site",
      status: "healthy",
      latitude: -16.22,
      longitude: -72.47,
      x: 610,
      y: 185
    },
    {
      id: "site-aplao",
      code: "APLAO",
      name: "Sede Aplao",
      type: "access_site",
      status: "healthy",
      latitude: -16.08,
      longitude: -72.49,
      x: 630,
      y: 320
    },
    {
      id: "site-escalerillas",
      code: "ESCALERILLAS",
      name: "Sede Escalerillas",
      type: "access_site",
      status: "planned",
      latitude: -16.18,
      longitude: -72.57,
      x: 760,
      y: 145
    },
    {
      id: "site-quiscay",
      code: "QUISCAY",
      name: "Sede Quiscay",
      type: "access_site",
      status: "planned",
      latitude: -16.05,
      longitude: -72.6,
      x: 780,
      y: 355
    }
  ],
  links: [
    { id: "map-aqp-la-joya", a: "AQP-POP", z: "LA-JOYA", status: "active", type: "transport", capacityMbps: 10000, label: "Arequipa <> La Joya" },
    { id: "map-la-joya-majes", a: "LA-JOYA", z: "MAJES", status: "active", type: "transport", capacityMbps: 10000, label: "La Joya <> Majes" },
    { id: "map-majes-santa-rita", a: "MAJES", z: "SANTA-RITA", status: "active", type: "distribution", capacityMbps: 2000, label: "Majes <> Santa Rita" },
    { id: "map-majes-corire", a: "MAJES", z: "CORIRE", status: "active", type: "distribution", capacityMbps: 2000, label: "Majes <> Corire" },
    { id: "map-majes-aplao", a: "MAJES", z: "APLAO", status: "active", type: "distribution", capacityMbps: 2000, label: "Majes <> Aplao" },
    { id: "map-corire-escalerillas", a: "CORIRE", z: "ESCALERILLAS", status: "planned", type: "last_mile", capacityMbps: 1000, label: "Corire <> Escalerillas" },
    { id: "map-aplao-quiscay", a: "APLAO", z: "QUISCAY", status: "planned", type: "last_mile", capacityMbps: 1000, label: "Aplao <> Quiscay" }
  ]
};


export const rackViews = [
  {
    id: "rack-aqp-01",
    siteCode: "AQP-POP",
    code: "RACK-AQP-01",
    name: "Rack principal Arequipa",
    heightU: 45,
    utilizationU: 7,
    devices: [
      { id: "dev-pe-aqp-01", name: "PE-AQP-01", role: "edge_router", status: "degraded", positionU: 38, heightU: 1, powerFeed: "DC-48V" },
      { id: "dev-olt-aqp-01", name: "OLT-AQP-01", role: "olt", status: "healthy", positionU: 32, heightU: 2, powerFeed: "AC-A" },
      { id: "dev-sw-aqp-01", name: "SW-AQP-01", role: "switch", status: "healthy", positionU: 35, heightU: 1, powerFeed: "AC-A" }
    ]
  },
  {
    id: "rack-majes-01",
    siteCode: "MAJES",
    code: "RACK-MAJES-01",
    name: "Rack transporte Majes",
    heightU: 45,
    utilizationU: 4,
    devices: [
      { id: "dev-rtr-majes-01", name: "RTR-MAJES-01", role: "edge_router", status: "healthy", positionU: 39, heightU: 1, powerFeed: "AC-A" },
      { id: "dev-sw-majes-01", name: "SW-MAJES-01", role: "switch", status: "healthy", positionU: 36, heightU: 1, powerFeed: "AC-A" }
    ]
  }
];

export const powerFeeds = [
  { id: "pf-aqp-ac-a", siteCode: "AQP-POP", name: "AC-A", feedType: "ac", status: "active", capacityWatts: 3000, loadWatts: 1420, source: "Red comercial + UPS" },
  { id: "pf-aqp-dc", siteCode: "AQP-POP", name: "DC-48V", feedType: "dc", status: "active", capacityWatts: 2500, loadWatts: 980, source: "Rectificador 48V" },
  { id: "pf-majes-ac-a", siteCode: "MAJES", name: "AC-A", feedType: "ac", status: "active", capacityWatts: 2200, loadWatts: 860, source: "Red comercial + inversor" }
];

export const powerAssets = [
  { id: "pa-aqp-ups-01", siteCode: "AQP-POP", name: "UPS AQP 6kVA", assetType: "ups", status: "active", capacityWatts: 5400, loadWatts: 1420, autonomyMinutes: 38, batteryHealthPercent: 91, sourceFeed: "AC-A", notes: "Protege router, switch core y OLT" },
  { id: "pa-aqp-rect-48", siteCode: "AQP-POP", name: "Rectificador 48V", assetType: "rectifier", status: "active", capacityWatts: 2500, loadWatts: 980, autonomyMinutes: 120, batteryHealthPercent: 86, sourceFeed: "DC-48V", notes: "Banco 48V para transporte" },
  { id: "pa-majes-ups-01", siteCode: "MAJES", name: "UPS Majes 3kVA", assetType: "ups", status: "active", capacityWatts: 2700, loadWatts: 860, autonomyMinutes: 44, batteryHealthPercent: 88, sourceFeed: "AC-A", notes: "Nodo de distribucion" }
];

export const devices = [
  {
    id: "dev-pe-lima-01",
    name: "PE-LIMA-01",
    role: "core_router",
    siteCode: "LIM-CORE",
    status: "healthy",
    managementIp: "190.0.2.2",
    interfaces: 64,
    lastBackupAt: "2026-07-04T09:20:00.000Z"
  },
  {
    id: "dev-pe-aqp-01",
    name: "PE-AQP-01",
    role: "edge_router",
    siteCode: "AQP-POP",
    status: "degraded",
    managementIp: "190.0.2.18",
    interfaces: 48,
    lastBackupAt: "2026-07-03T22:12:00.000Z"
  },
  {
    id: "dev-olt-lim-03",
    name: "OLT-LIM-03",
    role: "olt",
    siteCode: "LIM-CORE",
    status: "healthy",
    managementIp: "10.10.12.3",
    interfaces: 16,
    lastBackupAt: "2026-07-04T08:01:00.000Z"
  }
];

export const interfaces = [
  {
    id: "if-pe-lim-lo0",
    device: "PE-LIMA-01",
    siteCode: "LIM-CORE",
    name: "lo0",
    type: "loopback",
    status: "active",
    speedMbps: null,
    description: "Loopback BGP/router-id"
  },
  {
    id: "if-pe-lim-xe002",
    device: "PE-LIMA-01",
    siteCode: "LIM-CORE",
    name: "xe-0/0/2",
    type: "ethernet",
    status: "degraded",
    speedMbps: 10000,
    description: "Transporte hacia AQP-POP"
  },
  {
    id: "if-pe-aqp-xe001",
    device: "PE-AQP-01",
    siteCode: "AQP-POP",
    name: "xe-0/0/1",
    type: "ethernet",
    status: "down",
    speedMbps: 10000,
    description: "Transporte hacia LIM-CORE"
  }
];

export const interfaceLinks = [
  {
    id: "lnk-lim-aqp",
    aInterfaceId: "if-pe-lim-xe002",
    bInterfaceId: "if-pe-aqp-xe001",
    aDevice: "PE-LIMA-01",
    bDevice: "PE-AQP-01",
    circuitCode: "TR-LIM-ARE-10G",
    status: "down",
    capacityMbps: 10000
  }
];

export const prefixes = [
  {
    id: "pfx-public-lim",
    prefix: "190.0.2.0/24",
    role: "public_customers",
    status: "active",
    siteCode: "LIM-CORE",
    vrf: "global",
    utilization: 86,
    source: "LACNIC"
  },
  {
    id: "pfx-mgmt-core",
    prefix: "10.10.0.0/20",
    role: "management",
    status: "active",
    siteCode: "LIM-CORE",
    vrf: "mgmt",
    utilization: 48,
    source: "internal"
  },
  {
    id: "pfx-aqp-access",
    prefix: "100.64.20.0/22",
    role: "cgnat_access",
    status: "active",
    siteCode: "AQP-POP",
    vrf: "access",
    utilization: 73,
    source: "internal"
  }
];

export const ipAssignments = [
  {
    id: "ip-pe-lim-loopback",
    address: "190.0.2.2/32",
    prefix: "190.0.2.0/24",
    device: "PE-LIMA-01",
    interface: "lo0",
    site: "LIM-CORE",
    service: "BGP edge",
    status: "assigned"
  },
  {
    id: "ip-aqp-uplink",
    address: "190.0.2.18/32",
    prefix: "190.0.2.0/24",
    device: "PE-AQP-01",
    interface: "lo0",
    site: "AQP-POP",
    service: "Regional POP",
    status: "assigned"
  },
  {
    id: "ip-undoc-001",
    address: "190.0.2.210/32",
    prefix: "190.0.2.0/24",
    device: null,
    interface: null,
    site: "LIM-CORE",
    service: null,
    status: "undocumented"
  }
];

export const circuits = [
  {
    id: "ckt-lim-aqp-10g",
    code: "TR-LIM-ARE-10G",
    name: "Transporte Lima <> Arequipa",
    providerCode: "ANDEAN",
    providerName: "Andean Fiber",
    contractCode: "AF-TRANS-2026",
    status: "down",
    capacityMbps: 10000,
    aSite: "LIM-CORE",
    zSite: "AQP-POP",
    slaTarget: 99.7,
    endpointCount: 2,
    linkedInterfaces: 2
  },
  {
    id: "ckt-lim-tru-2g",
    code: "TR-LIM-TRU-2G",
    name: "Transporte Lima <> Trujillo",
    providerCode: "ANDEAN",
    providerName: "Andean Fiber",
    contractCode: "AF-TRANS-2026",
    status: "active",
    capacityMbps: 2000,
    aSite: "LIM-CORE",
    zSite: "TRU-NODO",
    slaTarget: 99.5,
    endpointCount: 2,
    linkedInterfaces: 0
  },
  {
    id: "ckt-transit-pacific",
    code: "IPT-PACIFIC-20G",
    name: "Transito IP principal",
    providerCode: "PACIFIC",
    providerName: "Pacific Transit",
    contractCode: "PT-IPT-2026",
    status: "active",
    capacityMbps: 20000,
    aSite: "LIM-CORE",
    zSite: "UPSTREAM",
    slaTarget: 99.9,
    endpointCount: 1,
    linkedInterfaces: 0
  }
];


export const incidents = [
  {
    id: "inc-aqp-majes-001",
    code: "INC-AQP-MAJES-001",
    title: "Degradacion transporte Majes y sedes derivadas",
    severity: "major",
    status: "investigating",
    startedAt: "2026-07-05T02:15:00.000Z",
    resolvedAt: null,
    ownerTeam: "noc",
    summary: "Perdida intermitente en transporte regional hacia Majes.",
    impactCount: 4,
    eventCount: 1
  }
];

export const incidentEvents = [
  {
    id: "iev-aqp-majes-001",
    incidentCode: "INC-AQP-MAJES-001",
    eventType: "update",
    message: "NOC valida perdida y latencia hacia sedes derivadas de Majes.",
    createdAt: "2026-07-05T02:25:00.000Z"
  }
];

export const alerts = [
  {
    id: "al-001",
    severity: "critical",
    title: "Circuito TR-LIM-ARE-10G caido",
    context: "Proveedor Andean Fiber - POP Arequipa",
    objectType: "circuit",
    objectId: "ckt-lim-aqp-10g"
  },
  {
    id: "al-002",
    severity: "major",
    title: "PE-LIMA-01 uplink saturado",
    context: "Interfaz xe-0/0/2 - 92% promedio 15m",
    objectType: "interface",
    objectId: "if-pe-lim-xe002"
  },
  {
    id: "al-003",
    severity: "minor",
    title: "Prefijo 190.0.2.0/24 al 86%",
    context: "Pool clientes empresariales Lima",
    objectType: "prefix",
    objectId: "pfx-public-lim"
  }
];

export const documents = [
  {
    id: "doc-circuit-runbook",
    objectType: "circuit",
    objectId: "ckt-lim-aqp-10g",
    title: "Procedimiento de escalamiento TR-LIM-ARE-10G",
    bodyMd: "Escalar primero a NOC Andean Fiber. Adjuntar pruebas de perdida y estado de interfaz.",
    createdBy: "noc",
    updatedAt: "2026-07-04T11:30:00.000Z"
  },
  {
    id: "doc-pop-lima",
    objectType: "site",
    objectId: "site-lim-core",
    title: "Notas operativas POP Lima Centro",
    bodyMd: "Core principal, transito IP y transporte regional. Revisar ventanas de mantenimiento.",
    createdBy: "infra",
    updatedAt: "2026-07-03T18:10:00.000Z"
  }
];

export const evidenceFiles = [
  {
    id: "ev-af-contract",
    objectType: "provider",
    objectId: "prov-andean-fiber",
    filename: "contrato-andean-2026.pdf",
    storageKey: "providers/andean/contrato-2026.pdf",
    contentType: "application/pdf",
    uploadedBy: "admin",
    uploadedAt: "2026-07-01T15:00:00.000Z"
  },
  {
    id: "ev-aqp-odf-photo",
    objectType: "circuit",
    objectId: "ckt-lim-aqp-10g",
    filename: "odf-aqp-extremo-z.jpg",
    storageKey: "circuits/tr-lim-are-10g/odf-aqp.jpg",
    contentType: "image/jpeg",
    uploadedBy: "field",
    uploadedAt: "2026-07-02T10:20:00.000Z"
  }
];

export const configBackups = [
  {
    id: "bkp-pe-lima-01",
    device: "PE-LIMA-01",
    siteCode: "LIM-CORE",
    storageKey: "backups/PE-LIMA-01/2026-07-04.conf",
    configHash: "sha256:demo-lima",
    collectedAt: "2026-07-04T09:20:00.000Z",
    source: "scheduled"
  },
  {
    id: "bkp-pe-aqp-01",
    device: "PE-AQP-01",
    siteCode: "AQP-POP",
    storageKey: "backups/PE-AQP-01/2026-07-03.conf",
    configHash: "sha256:demo-aqp",
    collectedAt: "2026-07-03T22:12:00.000Z",
    source: "scheduled"
  }
];

export const topology = {
  nodes: [
    { id: "site-lim-core", label: "LIM-CORE", type: "site", status: "healthy", x: 120, y: 210 },
    { id: "site-aqp-pop", label: "AQP-POP", type: "site", status: "degraded", x: 430, y: 290 },
    { id: "site-tru-nodo", label: "TRU-NODO", type: "site", status: "healthy", x: 680, y: 160 },
    { id: "upstream", label: "UPSTREAM", type: "provider", status: "healthy", x: 390, y: 90 }
  ],
  edges: [
    { id: "edge-upstream-lim", source: "upstream", target: "site-lim-core", status: "healthy", label: "20G transit" },
    { id: "edge-lim-aqp", source: "site-lim-core", target: "site-aqp-pop", status: "down", label: "10G transport" },
    { id: "edge-lim-tru", source: "site-lim-core", target: "site-tru-nodo", status: "healthy", label: "2G transport" },
    { id: "edge-aqp-tru", source: "site-aqp-pop", target: "site-tru-nodo", status: "degraded", label: "backup path" }
  ]
};


export const providerCapacities = [
  { id: "cap-andean-aqp", providerCode: "ANDEAN", providerName: "Andean Fiber", contractCode: "AF-TRANS-2026", serviceType: "transporte regional", committedMbps: 20000, burstableMbps: 40000, deliveredMbps: 20000, usedMbps: 12700, billingMode: "commit 20G", status: "active" },
  { id: "cap-pacific-ip", providerCode: "PACIFIC", providerName: "Pacific Transit", contractCode: "PT-IPT-2026", serviceType: "transito IP", committedMbps: 20000, burstableMbps: 30000, deliveredMbps: 20000, usedMbps: 15400, billingMode: "95th percentile", status: "active" }
];

export const fiberSpans = [
  { id: "span-aqp-joya", code: "FO-AQP-LJ-024", aSite: "AQP-POP", zSite: "LA-JOYA", providerCode: "ANDEAN", cableType: "ADSS monomodo", fiberCount: 24, usedFibers: 8, distanceKm: 62.4, status: "active", notes: "Ruta troncal hacia Majes" },
  { id: "span-joya-majes", code: "FO-LJ-MAJ-048", aSite: "LA-JOYA", zSite: "MAJES", providerCode: "ANDEAN", cableType: "ADSS monomodo", fiberCount: 48, usedFibers: 12, distanceKm: 84.2, status: "active", notes: "Cable principal con reserva para expansion" },
  { id: "span-majes-corire", code: "FO-MAJ-COR-012", aSite: "MAJES", zSite: "CORIRE", providerCode: null, cableType: "drop armado", fiberCount: 12, usedFibers: 4, distanceKm: 18.7, status: "active", notes: "Distribucion regional" }
];

export const fiberStrands = [
  { id: "strand-aqp-joya-01", spanCode: "FO-AQP-LJ-024", strandNumber: 1, tubeColor: "azul", fiberColor: "azul", status: "used", service: "Transporte 10G AQP-LA-JOYA", circuitCode: "TR-LIM-ARE-10G", aTermination: "ODF-AQP-01/P01", zTermination: "ODF-LJ-01/P01" },
  { id: "strand-aqp-joya-02", spanCode: "FO-AQP-LJ-024", strandNumber: 2, tubeColor: "azul", fiberColor: "naranja", status: "used", service: "Retorno 10G AQP-LA-JOYA", circuitCode: "TR-LIM-ARE-10G", aTermination: "ODF-AQP-01/P02", zTermination: "ODF-LJ-01/P02" },
  { id: "strand-joya-majes-07", spanCode: "FO-LJ-MAJ-048", strandNumber: 7, tubeColor: "verde", fiberColor: "rojo", status: "reserved", service: "Reserva OLT Majes", circuitCode: null, aTermination: "ODF-LJ-01/P07", zTermination: "ODF-MAJ-01/P07" }
];

export const transceivers = [
  { id: "tr-pe-aqp-xe001", device: "PE-AQP-01", interface: "xe-0/0/1", siteCode: "AQP-POP", vendor: "Finisar", partNumber: "FTLX1475D3BCL", serialNumber: "FNS-AQP-001", formFactor: "SFP+", speedMbps: 10000, wavelengthNm: 1310, reachKm: 10, connectorType: "LC", fiberMode: "SM", txPowerDbm: -1.8, rxPowerDbm: -6.2, status: "degraded" },
  { id: "tr-pe-lim-xe002", device: "PE-LIMA-01", interface: "xe-0/0/2", siteCode: "LIM-CORE", vendor: "Juniper", partNumber: "EX-SFP-10GE-LR", serialNumber: "JNP-LIM-002", formFactor: "SFP+", speedMbps: 10000, wavelengthNm: 1310, reachKm: 10, connectorType: "LC", fiberMode: "SM", txPowerDbm: -2.1, rxPowerDbm: -5.4, status: "active" },
  { id: "tr-olt-aqp-pon01", device: "OLT-AQP-01", interface: "PON0/1", siteCode: "AQP-POP", vendor: "Huawei", partNumber: "Class C+ GPON", serialNumber: "HW-GPON-01", formFactor: "SFP", speedMbps: 2500, wavelengthNm: 1490, reachKm: 20, connectorType: "SC/APC", fiberMode: "SM", txPowerDbm: 3.1, rxPowerDbm: -18.3, status: "active" }
];

export const patchcords = [
  { id: "pc-aqp-pe-odf-01", code: "PC-AQP-0001", aEndpoint: "PE-AQP-01 xe-0/0/1", zEndpoint: "ODF-AQP-01/P01", aDevice: "PE-AQP-01", zDevice: null, mediaType: "fiber", connectorA: "LC/UPC", connectorZ: "LC/UPC", lengthMeters: 3, fiberMode: "SM", color: "amarillo", status: "active", circuitCode: "TR-LIM-ARE-10G" },
  { id: "pc-aqp-olt-odf-pon1", code: "PC-AQP-0021", aEndpoint: "OLT-AQP-01 PON0/1", zEndpoint: "ODF-AQP-02/P12", aDevice: "OLT-AQP-01", zDevice: null, mediaType: "fiber", connectorA: "SC/APC", connectorZ: "SC/APC", lengthMeters: 5, fiberMode: "SM", color: "verde", status: "active", circuitCode: null },
  { id: "pc-aqp-sw-pe", code: "PC-AQP-0102", aEndpoint: "SW-AQP-01 xe1", zEndpoint: "PE-AQP-01 xe-0/0/3", aDevice: "SW-AQP-01", zDevice: "PE-AQP-01", mediaType: "dac", connectorA: "SFP+", connectorZ: "SFP+", lengthMeters: 1, fiberMode: null, color: "negro", status: "active", circuitCode: null }
];

export const datacenterAssets = [
  { id: "dc-aqp-odf-01", siteCode: "AQP-POP", rackCode: "RACK-AQP-01", name: "ODF-AQP-01", assetType: "ODF 48 LC", status: "active", units: 1, ports: 48, notes: "Troncal proveedor y transporte regional" },
  { id: "dc-aqp-pdu-a", siteCode: "AQP-POP", rackCode: "RACK-AQP-01", name: "PDU-AQP-A", assetType: "PDU monitoreable", status: "active", units: 1, ports: 16, notes: "Circuito AC-A" },
  { id: "dc-aqp-cabletray", siteCode: "AQP-POP", rackCode: null, name: "Bandeja fibra superior", assetType: "canalizacion", status: "active", units: null, ports: null, notes: "Ruta patchcords ODF/equipos" }
];
