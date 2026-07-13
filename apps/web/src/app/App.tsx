import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Bell,
  Building2,
  Cable,
  CircuitBoard,
  Database,
  FileClock,
  GitBranch,
  GitPullRequest,
  HardDrive,
  Map as MapIcon,
  Network,
  RadioTower,
  Router,
  Search,
  Server,
  ShieldCheck
} from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  AuditEvent,
  Alert,
  BackupSummary,
  ChangeRequest,
  Circuit,
  CircuitEndpoint,
  ConfigBackup,
  DatacenterAsset,
  Device,
  EvidenceFile,
  FiberSpan,
  FiberStrand,
  Incident,
  IncidentEvent,
  InterfaceLink,
  IpAssignment,
  MaintenanceWindow,
  NetworkInterface,
  Patchcord,
  PowerAsset,
  PowerFeed,
  Prefix,
  RackView,
  Provider,
  ProviderCapacity,
  ProviderContract,
  Site,
  Transceiver,
  SiteMap,
  TechnicalDocument,
  DownstreamImpact
} from "../shared/api";
import { apiDelete, apiGet, apiPatch, apiPost } from "../shared/api";
import { TopologyMap } from "./TopologyMap";
import { usePlatformData } from "./usePlatformData";

type ModuleKey =
  | "noc"
  | "providers"
  | "resources"
  | "ipam"
  | "sites"
  | "map"
  | "racks"
  | "devices"
  | "interfaces"
  | "datacenter"
  | "circuits"
  | "topology"
  | "monitoring"
  | "incidents"
  | "docs"
  | "backups"
  | "changes"
  | "history";

const modules = [
  { key: "noc", label: "Dashboard NOC", icon: Activity },
  { key: "providers", label: "Proveedores", icon: Building2 },
  { key: "resources", label: "ASN / LACNIC", icon: ShieldCheck },
  { key: "ipam", label: "IPAM", icon: Database },
  { key: "sites", label: "Sedes", icon: RadioTower },
  { key: "map", label: "Mapa de red", icon: MapIcon },
  { key: "racks", label: "Racks / energia", icon: BatteryCharging },
  { key: "devices", label: "Equipos", icon: Router },
  { key: "interfaces", label: "Interfaces", icon: Cable },
  { key: "datacenter", label: "Datacenter", icon: CircuitBoard },
  { key: "circuits", label: "Circuitos", icon: GitBranch },
  { key: "topology", label: "Topologia", icon: Network },
  { key: "monitoring", label: "Monitoreo", icon: Bell },
  { key: "incidents", label: "Incidencias", icon: AlertTriangle },
  { key: "docs", label: "Documentacion", icon: FileClock },
  { key: "backups", label: "Backups", icon: HardDrive },
  { key: "changes", label: "Cambios", icon: GitPullRequest },
  { key: "history", label: "Historial", icon: Server }
] satisfies Array<{ key: ModuleKey; label: string; icon: typeof Activity }>;

export function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("noc");
  const [query, setQuery] = useState("");
  const data = usePlatformData();

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const index = [
      ...data.sites.map((item) => ({ type: "Sede", label: item.code, context: item.name })),
      ...data.providers.map((item) => ({ type: "Proveedor", label: item.name, context: item.nocEmail })),
      ...data.devices.map((item) => ({ type: "Equipo", label: item.name, context: `${item.role} - ${item.siteCode}` })),
      ...data.interfaces.map((item) => ({ type: "Interfaz", label: `${item.device} ${item.name}`, context: `${item.type} - ${item.status}` })),
      ...data.documents.map((item) => ({ type: "Documento", label: item.title, context: `${item.objectType} - ${item.createdBy}` })),
      ...data.evidence.map((item) => ({ type: "Evidencia", label: item.filename, context: `${item.objectType} - ${item.contentType ?? "archivo"}` })),
      ...data.prefixes.map((item) => ({ type: "Prefijo", label: item.prefix, context: `${item.role} - ${item.siteCode}` })),
      ...data.ips.map((item) => ({
        type: "IP",
        label: item.address,
        context: `${item.device ?? "sin equipo"} - ${item.interface ?? "sin interfaz"}`
      })),
      ...data.circuits.map((item) => ({ type: "Circuito", label: item.code, context: `${item.aSite} <> ${item.zSite}` }))
    ];

    return index
      .filter((item) => [item.type, item.label, item.context].join(" ").toLowerCase().includes(query.toLowerCase()))
      .slice(0, 6);
  }, [data, query]);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">IO</div>
          <div>
            <strong>ISP Ops</strong>
            <span>ERP tecnico</span>
          </div>
        </div>
        <nav className="nav">
          {modules.map((item) => (
            <button
              className={activeModule === item.key ? "navItem active" : "navItem"}
              key={item.key}
              onClick={() => setActiveModule(item.key)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="searchWrap">
            <div className="search">
              <Search size={18} />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar IP, equipo, circuito, proveedor, sede o servicio"
                value={query}
              />
            </div>
            {searchResults.length > 0 && (
              <div className="searchResults">
                {searchResults.map((item) => (
                  <button key={`${item.type}-${item.label}`}>
                    <span>{item.type}</span>
                    <strong>{item.label}</strong>
                    <small>{item.context}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="topbarActions">
            <span className={`apiState ${data.apiState}`}>{data.apiState === "live" ? "API live" : "demo local"}</span>
            {data.currentUser && <span className="apiState live">{data.currentUser.displayName}</span>}
            <button className="themeToggle">Claro / oscuro</button>
          </div>
        </header>

        {activeModule === "noc" && <NocView data={data} />}
        {activeModule === "providers" && <ProvidersView contracts={data.providerContracts} onReload={data.reload} providers={data.providers} />}
        {activeModule === "resources" && <ResourcesView onReload={data.reload} prefixes={data.prefixes} sites={data.sites} />}
        {activeModule === "ipam" && <IpamView circuits={data.circuits} interfaceLinks={data.interfaceLinks} interfaces={data.interfaces} ips={data.ips} onReload={data.reload} prefixes={data.prefixes} />}
        {activeModule === "sites" && (
          <SitesView
            circuits={data.circuits}
            devices={data.devices}
            fiberSpans={data.fiberSpans}
            incidents={data.incidents}
            onReload={data.reload}
            powerFeeds={data.powerFeeds}
            prefixes={data.prefixes}
            racks={data.racks}
            siteMap={data.siteMap}
            sites={data.sites}
          />
        )}
        {activeModule === "map" && <NetworkMapView siteMap={data.siteMap} />}
        {activeModule === "racks" && <RacksPowerView devices={data.devices} onReload={data.reload} powerAssets={data.powerAssets} racks={data.racks} powerFeeds={data.powerFeeds} sites={data.sites} />}
        {activeModule === "devices" && <DevicesView devices={data.devices} onReload={data.reload} sites={data.sites} />}
        {activeModule === "interfaces" && <InterfacesView circuits={data.circuits} devices={data.devices} interfaceLinks={data.interfaceLinks} interfaces={data.interfaces} onReload={data.reload} />}
        {activeModule === "datacenter" && <DatacenterView assets={data.datacenterAssets} capacities={data.providerCapacities} fiberSpans={data.fiberSpans} fiberStrands={data.fiberStrands} onReload={data.reload} patchcords={data.patchcords} transceivers={data.transceivers} />}
        {activeModule === "circuits" && (
          <CircuitsView
            circuits={data.circuits}
            contracts={data.providerContracts}
            devices={data.devices}
            interfaces={data.interfaces}
            onReload={data.reload}
            providers={data.providers}
            sites={data.sites}
          />
        )}
        {activeModule === "topology" && <TopologyView graph={data.topology} />}
        {activeModule === "monitoring" && (
          <MonitoringView
            alerts={data.alerts}
            circuits={data.circuits}
            devices={data.devices}
            maintenanceWindows={data.maintenanceWindows}
            onReload={data.reload}
            prefixes={data.prefixes}
            sites={data.sites}
          />
        )}
        {activeModule === "incidents" && (
          <IncidentsView
            circuits={data.circuits}
            devices={data.devices}
            incidents={data.incidents}
            onReload={data.reload}
            prefixes={data.prefixes}
            sites={data.sites}
          />
        )}
        {activeModule === "docs" && (
          <DocumentationView
            circuits={data.circuits}
            devices={data.devices}
            documents={data.documents}
            evidence={data.evidence}
            onReload={data.reload}
            prefixes={data.prefixes}
            sites={data.sites}
          />
        )}
        {activeModule === "backups" && <BackupsView backups={data.backups} devices={data.devices} onReload={data.reload} summary={data.backupSummary} />}
        {activeModule === "changes" && (
          <ChangesView
            changes={data.changes}
            circuits={data.circuits}
            devices={data.devices}
            onReload={data.reload}
            prefixes={data.prefixes}
            sites={data.sites}
          />
        )}
        {activeModule === "history" && <HistoryView audit={data.audit} />}
        {!["noc", "providers", "resources", "ipam", "sites", "map", "racks", "devices", "interfaces", "datacenter", "circuits", "topology", "monitoring", "incidents", "docs", "backups", "changes", "history"].includes(activeModule) && (
          <PlaceholderView module={modules.find((item) => item.key === activeModule)?.label ?? "Modulo"} />
        )}
      </section>
    </main>
  );
}

function NocView({ data }: { data: ReturnType<typeof usePlatformData> }) {
  return (
    <>
      <section className="nocHeader">
        <div>
          <p className="eyebrow">Dashboard NOC</p>
          <h1>Operacion de red multisede</h1>
        </div>
        <div className="healthScore">
          <span>Salud global</span>
          <strong>{data.noc.healthScore}%</strong>
        </div>
      </section>

      <section className="metricGrid">
        <Metric label="Alertas criticas" value={String(data.noc.activeAlerts.critical)} tone="critical" />
        <Metric label="Sedes degradadas" value={String(data.noc.sites.degraded)} tone="warning" />
        <Metric label="Circuitos caidos" value={String(data.noc.circuits.down)} tone="critical" />
        <Metric label="IPs sin contexto" value={String(data.noc.ipam.undocumentedIps)} tone="warning" />
      </section>

      <section className="mainGrid">
        <div className="panel wide">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Topologia operativa</p>
              <h2>Core, transporte y POPs</h2>
            </div>
            <MapIcon size={20} />
          </div>
          <TopologyMap graph={data.topology} />
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Alertas</p>
              <h2>Prioridad NOC</h2>
            </div>
            <Bell size={20} />
          </div>
          <div className="alertList">
            {data.alerts.map((alert) => (
              <article className={`alert ${alert.severity}`} key={alert.id}>
                <strong>{alert.title}</strong>
                <span>{alert.context}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SitesView sites={data.sites} compact />
    </>
  );
}

function ProvidersView({ contracts, onReload, providers }: { contracts: ProviderContract[]; onReload: () => Promise<void>; providers: Provider[] }) {
  const [contractForm, setContractForm] = useState({
    providerCode: providers[0]?.code ?? "",
    code: "",
    name: "",
    monthlyCost: "",
    currency: "USD",
    slaTarget: "99.9",
    status: "active"
  });
  const [providerForm, setProviderForm] = useState({
    code: "",
    name: "",
    providerType: "transport",
    nocEmail: "",
    nocPhone: "",
    status: "active"
  });
  const [operationForm, setOperationForm] = useState({
    contractId: contracts[0]?.id ?? "",
    status: contracts[0]?.status ?? "active"
  });
  const [contractEditForm, setContractEditForm] = useState({
    providerCode: contracts[0]?.providerCode ?? providers[0]?.code ?? "",
    code: contracts[0]?.code ?? "",
    name: contracts[0]?.name ?? "",
    monthlyCost: contracts[0]?.monthlyCost ? String(contracts[0].monthlyCost) : "",
    currency: contracts[0]?.currency ?? "USD",
    slaTarget: contracts[0]?.slaTarget ? String(contracts[0].slaTarget) : "99.9",
    status: contracts[0]?.status ?? "active",
    startDate: contracts[0]?.startDate?.slice(0, 10) ?? "",
    endDate: contracts[0]?.endDate?.slice(0, 10) ?? ""
  });
  const [providerOperationForm, setProviderOperationForm] = useState({
    providerId: providers[0]?.id ?? "",
    status: providers[0]?.status ?? "active"
  });
  const [providerEditForm, setProviderEditForm] = useState({
    code: providers[0]?.code ?? "",
    name: providers[0]?.name ?? "",
    providerType: providers[0]?.type ?? "transport",
    status: providers[0]?.status ?? "active",
    nocEmail: providers[0]?.nocEmail ?? "",
    nocPhone: providers[0]?.nocPhone ?? ""
  });
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const selectedContract = contracts.find((contract) => contract.id === operationForm.contractId);
  const selectedProvider = providers.find((provider) => provider.id === providerOperationForm.providerId);
  const totalCost = contracts.reduce((sum, contract) => sum + (contract.monthlyCost ?? 0), 0);
  const activeContracts = contracts.filter((contract) => contract.status === "active").length;

  useEffect(() => {
    if (selectedProvider) {
      setProviderEditForm({
        code: selectedProvider.code,
        name: selectedProvider.name,
        providerType: selectedProvider.type,
        status: selectedProvider.status,
        nocEmail: selectedProvider.nocEmail ?? "",
        nocPhone: selectedProvider.nocPhone ?? ""
      });
    }
  }, [selectedProvider]);

  useEffect(() => {
    if (selectedContract) {
      setContractEditForm({
        providerCode: selectedContract.providerCode,
        code: selectedContract.code,
        name: selectedContract.name,
        monthlyCost: selectedContract.monthlyCost ? String(selectedContract.monthlyCost) : "",
        currency: selectedContract.currency ?? "USD",
        slaTarget: selectedContract.slaTarget ? String(selectedContract.slaTarget) : "99.9",
        status: selectedContract.status,
        startDate: selectedContract.startDate?.slice(0, 10) ?? "",
        endDate: selectedContract.endDate?.slice(0, 10) ?? ""
      });
    }
  }, [selectedContract]);

  async function createContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("saving");

    try {
      await apiPost("/providers/contracts", {
        providerCode: contractForm.providerCode,
        code: contractForm.code,
        name: contractForm.name,
        monthlyCost: contractForm.monthlyCost ? Number(contractForm.monthlyCost) : null,
        currency: contractForm.currency || null,
        slaTarget: contractForm.slaTarget ? Number(contractForm.slaTarget) : null,
        status: contractForm.status,
        reason: "Alta desde modulo Proveedores"
      });
      setContractForm((current) => ({ ...current, code: "", name: "", monthlyCost: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function createProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("saving");

    try {
      await apiPost("/providers", {
        code: providerForm.code,
        name: providerForm.name,
        providerType: providerForm.providerType,
        status: providerForm.status,
        nocEmail: providerForm.nocEmail || null,
        nocPhone: providerForm.nocPhone || null,
        reason: "Alta desde modulo Proveedores"
      });
      setProviderForm((current) => ({ ...current, code: "", name: "", nocEmail: "", nocPhone: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContract) return;
    setFormState("saving");

    try {
      await apiPatch(`/providers/contracts/${selectedContract.id}`, {
        providerCode: contractEditForm.providerCode,
        code: contractEditForm.code,
        name: contractEditForm.name,
        monthlyCost: contractEditForm.monthlyCost ? Number(contractEditForm.monthlyCost) : null,
        currency: contractEditForm.currency || null,
        slaTarget: contractEditForm.slaTarget ? Number(contractEditForm.slaTarget) : null,
        status: contractEditForm.status,
        startDate: contractEditForm.startDate || null,
        endDate: contractEditForm.endDate || null,
        reason: "Edicion completa desde modulo Proveedores"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteContract() {
    if (!selectedContract) return;
    setFormState("saving");

    try {
      await apiDelete(`/providers/contracts/${selectedContract.id}`);
      setOperationForm({ contractId: "", status: "active" });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProvider) return;
    setFormState("saving");

    try {
      await apiPatch(`/providers/${selectedProvider.id}`, {
        code: providerEditForm.code,
        name: providerEditForm.name,
        providerType: providerEditForm.providerType,
        status: providerEditForm.status,
        nocEmail: providerEditForm.nocEmail || null,
        nocPhone: providerEditForm.nocPhone || null,
        reason: "Edicion completa desde modulo Proveedores"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteProvider() {
    if (!selectedProvider) return;
    setFormState("saving");

    try {
      await apiDelete(`/providers/${selectedProvider.id}`);
      setProviderOperationForm({ providerId: "", status: "active" });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="Proveedores" title="Contratos, NOC y desempeno">
      <section className="metricGrid compactMetrics">
        <Metric label="Proveedores" value={String(providers.length)} tone="neutral" />
        <Metric label="Contratos activos" value={String(activeContracts)} tone="neutral" />
        <Metric label="Costo mensual doc." value={`${Math.round(totalCost).toLocaleString()} USD`} tone="neutral" />
        <Metric label="Contratos vencidos" value={String(contracts.filter((contract) => contract.status === "expired").length)} tone="warning" />
      </section>
      <div className="cardsGrid">
        {providers.map((provider) => (
          <article className="entityCard" key={provider.id}>
            <div>
              <span className="entityType">{provider.type}</span>
              <h3>{provider.name}</h3>
            </div>
            <dl>
              <div><dt>NOC</dt><dd>{provider.nocEmail}</dd></div>
              <div><dt>Telefono</dt><dd>{provider.nocPhone ?? "N/D"}</dd></div>
              <div><dt>Circuitos</dt><dd>{provider.activeCircuits}</dd></div>
              <div><dt>Disponibilidad 30d</dt><dd>{provider.availability30d}%</dd></div>
              <div><dt>MTTR 30d</dt><dd>{provider.mttrHours30d}h</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <section className="providerWorkbench">
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Alta rapida</p><h2>Proveedor</h2></div></div>
          <form className="quickForm" onSubmit={createProvider}>
            <label>Codigo<input onChange={(event) => setProviderForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={providerForm.code} /></label>
            <label>Tipo<select onChange={(event) => setProviderForm((current) => ({ ...current, providerType: event.target.value }))} value={providerForm.providerType}>
              <option value="transport">transport</option>
              <option value="internet_transit">internet_transit</option>
              <option value="fiber_owner">fiber_owner</option>
              <option value="tower">tower</option>
              <option value="energy">energy</option>
            </select></label>
            <label className="wideField">Nombre<input onChange={(event) => setProviderForm((current) => ({ ...current, name: event.target.value }))} value={providerForm.name} /></label>
            <label className="wideField">NOC email<input onChange={(event) => setProviderForm((current) => ({ ...current, nocEmail: event.target.value }))} value={providerForm.nocEmail} /></label>
            <label>NOC telefono<input onChange={(event) => setProviderForm((current) => ({ ...current, nocPhone: event.target.value }))} value={providerForm.nocPhone} /></label>
            <label>Estado<select onChange={(event) => setProviderForm((current) => ({ ...current, status: event.target.value }))} value={providerForm.status}><option value="active">active</option><option value="planned">planned</option><option value="suspended">suspended</option><option value="retired">retired</option></select></label>
            <button disabled={!providerForm.code || !providerForm.name} type="submit">Crear proveedor</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Alta rapida</p><h2>Contrato proveedor</h2></div></div>
          <form className="quickForm" onSubmit={createContract}>
            <label>Proveedor<select onChange={(event) => setContractForm((current) => ({ ...current, providerCode: event.target.value }))} value={contractForm.providerCode}>
              {providers.map((provider) => <option key={provider.id} value={provider.code}>{provider.code} - {provider.name}</option>)}
            </select></label>
            <label>Codigo<input onChange={(event) => setContractForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={contractForm.code} /></label>
            <label className="wideField">Nombre<input onChange={(event) => setContractForm((current) => ({ ...current, name: event.target.value }))} value={contractForm.name} /></label>
            <label>Costo mensual<input inputMode="decimal" onChange={(event) => setContractForm((current) => ({ ...current, monthlyCost: event.target.value }))} value={contractForm.monthlyCost} /></label>
            <label>Moneda<input onChange={(event) => setContractForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} value={contractForm.currency} /></label>
            <label>SLA %<input inputMode="decimal" onChange={(event) => setContractForm((current) => ({ ...current, slaTarget: event.target.value }))} value={contractForm.slaTarget} /></label>
            <label>Estado<select onChange={(event) => setContractForm((current) => ({ ...current, status: event.target.value }))} value={contractForm.status}><option value="active">active</option><option value="draft">draft</option><option value="expired">expired</option><option value="cancelled">cancelled</option></select></label>
            <button disabled={!contractForm.providerCode || !contractForm.code || !contractForm.name} type="submit">Crear contrato</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Operacion</p><h2>Editar proveedor</h2></div></div>
          <form className="quickForm" onSubmit={updateProvider}>
            <label className="wideField">Proveedor<select onChange={(event) => {
              const provider = providers.find((item) => item.id === event.target.value);
              setProviderOperationForm({ providerId: event.target.value, status: provider?.status ?? "active" });
            }} value={providerOperationForm.providerId}>
              <option value="">Selecciona proveedor</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.code} - {provider.name}</option>)}
            </select></label>
            <label>Codigo<input onChange={(event) => setProviderEditForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={providerEditForm.code} /></label>
            <label>Tipo<select onChange={(event) => setProviderEditForm((current) => ({ ...current, providerType: event.target.value }))} value={providerEditForm.providerType}>
              <option value="transport">transport</option>
              <option value="internet_transit">internet_transit</option>
              <option value="fiber_owner">fiber_owner</option>
              <option value="tower">tower</option>
              <option value="energy">energy</option>
            </select></label>
            <label>Estado<select onChange={(event) => setProviderEditForm((current) => ({ ...current, status: event.target.value }))} value={providerEditForm.status}><option value="active">active</option><option value="planned">planned</option><option value="suspended">suspended</option><option value="retired">retired</option></select></label>
            <label className="wideField">Nombre<input onChange={(event) => setProviderEditForm((current) => ({ ...current, name: event.target.value }))} value={providerEditForm.name} /></label>
            <label className="wideField">NOC email<input onChange={(event) => setProviderEditForm((current) => ({ ...current, nocEmail: event.target.value }))} value={providerEditForm.nocEmail} /></label>
            <label>NOC telefono<input onChange={(event) => setProviderEditForm((current) => ({ ...current, nocPhone: event.target.value }))} value={providerEditForm.nocPhone} /></label>
            <button disabled={!selectedProvider || !providerEditForm.code || !providerEditForm.name} type="submit">Guardar proveedor</button>
            <button className="dangerButton" disabled={!selectedProvider} onClick={() => void deleteProvider()} type="button">Eliminar si no tiene dependencias</button>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Operacion</p><h2>Editar contrato</h2></div></div>
          <form className="quickForm" onSubmit={updateContract}>
            <label className="wideField">Contrato<select onChange={(event) => {
              const contract = contracts.find((item) => item.id === event.target.value);
              setOperationForm({ contractId: event.target.value, status: contract?.status ?? "active" });
            }} value={operationForm.contractId}>
              <option value="">Selecciona contrato</option>
              {contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.providerCode} - {contract.code}</option>)}
            </select></label>
            <label>Proveedor<select onChange={(event) => setContractEditForm((current) => ({ ...current, providerCode: event.target.value }))} value={contractEditForm.providerCode}>
              {providers.map((provider) => <option key={provider.id} value={provider.code}>{provider.code}</option>)}
            </select></label>
            <label>Codigo<input onChange={(event) => setContractEditForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={contractEditForm.code} /></label>
            <label className="wideField">Nombre<input onChange={(event) => setContractEditForm((current) => ({ ...current, name: event.target.value }))} value={contractEditForm.name} /></label>
            <label>Costo mensual<input inputMode="decimal" onChange={(event) => setContractEditForm((current) => ({ ...current, monthlyCost: event.target.value }))} value={contractEditForm.monthlyCost} /></label>
            <label>Moneda<input onChange={(event) => setContractEditForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} value={contractEditForm.currency} /></label>
            <label>SLA %<input inputMode="decimal" onChange={(event) => setContractEditForm((current) => ({ ...current, slaTarget: event.target.value }))} value={contractEditForm.slaTarget} /></label>
            <label>Inicio<input onChange={(event) => setContractEditForm((current) => ({ ...current, startDate: event.target.value }))} type="date" value={contractEditForm.startDate} /></label>
            <label>Fin<input onChange={(event) => setContractEditForm((current) => ({ ...current, endDate: event.target.value }))} type="date" value={contractEditForm.endDate} /></label>
            <label>Estado<select onChange={(event) => setContractEditForm((current) => ({ ...current, status: event.target.value }))} value={contractEditForm.status}><option value="active">active</option><option value="draft">draft</option><option value="expired">expired</option><option value="cancelled">cancelled</option></select></label>
            <button disabled={!selectedContract || !contractEditForm.providerCode || !contractEditForm.code || !contractEditForm.name} type="submit">Guardar contrato</button>
            <button className="dangerButton" disabled={!selectedContract} onClick={() => void deleteContract()} type="button">Eliminar si no tiene dependencias</button>
          </form>
        </div>
        <div className="panel wide">
          <div className="panelHeader"><div><p className="eyebrow">Contratos</p><h2>SLA, costo y vigencia</h2></div></div>
          <DataTable
            columns={["Proveedor", "Codigo", "Nombre", "Estado", "SLA", "Costo", "Moneda", "Inicio", "Fin"]}
            statusColumnIndex={3}
            rows={contracts.map((contract) => [
              contract.providerCode,
              contract.code,
              contract.name,
              contract.status,
              contract.slaTarget !== null ? `${contract.slaTarget}%` : "N/D",
              contract.monthlyCost !== null ? String(contract.monthlyCost) : "N/D",
              contract.currency ?? "",
              contract.startDate ?? "",
              contract.endDate ?? ""
            ])}
          />
        </div>
      </section>
    </ModulePage>
  );
}

function ResourcesView({ onReload, prefixes, sites }: { onReload: () => Promise<void>; prefixes: Prefix[]; sites: Site[] }) {
  const [prefixForm, setPrefixForm] = useState({
    prefix: "",
    family: "4",
    role: "customer_pool",
    status: "active",
    siteCode: "",
    vrf: "global",
    description: ""
  });
  const [selectedPrefixId, setSelectedPrefixId] = useState(prefixes[0]?.id ?? "");
  const selectedPrefix = prefixes.find((prefix) => prefix.id === selectedPrefixId);
  const [editForm, setEditForm] = useState({
    role: selectedPrefix?.role ?? "customer_pool",
    status: selectedPrefix?.status ?? "active",
    siteCode: selectedPrefix?.siteCode === "GLOBAL" ? "" : selectedPrefix?.siteCode ?? "",
    vrf: selectedPrefix?.vrf ?? "global",
    description: ""
  });
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const totalPrefixes = prefixes.length;
  const lacnicPrefixes = prefixes.filter((prefix) => prefix.source.toLowerCase().includes("lacnic")).length;
  const highUse = prefixes.filter((prefix) => prefix.utilization >= 80).length;

  useEffect(() => {
    const next = prefixes.find((prefix) => prefix.id === selectedPrefixId);
    setEditForm({
      role: next?.role ?? "customer_pool",
      status: next?.status ?? "active",
      siteCode: next?.siteCode === "GLOBAL" ? "" : next?.siteCode ?? "",
      vrf: next?.vrf ?? "global",
      description: ""
    });
  }, [prefixes, selectedPrefixId]);

  async function createPrefix(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("saving");

    try {
      await apiPost("/ipam/prefixes", {
        prefix: prefixForm.prefix,
        family: Number(prefixForm.family),
        role: prefixForm.role,
        status: prefixForm.status,
        siteCode: prefixForm.siteCode || null,
        vrf: prefixForm.vrf || "global",
        description: prefixForm.description || null,
        reason: "Alta desde modulo ASN/LACNIC"
      });
      setPrefixForm((current) => ({ ...current, prefix: "", description: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updatePrefix(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPrefix) return;
    setFormState("saving");

    try {
      await apiPatch(`/ipam/prefixes/${selectedPrefix.id}`, {
        role: editForm.role,
        status: editForm.status,
        siteCode: editForm.siteCode || null,
        vrf: editForm.vrf || "global",
        description: editForm.description || null,
        reason: "Edicion desde modulo ASN/LACNIC"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deletePrefix() {
    if (!selectedPrefix) return;
    setFormState("saving");

    try {
      await apiDelete(`/ipam/prefixes/${selectedPrefix.id}`);
      setSelectedPrefixId("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="ASN / LACNIC" title="Recursos de numeracion">
      <section className="metricGrid compactMetrics">
        <Metric label="Prefijos" value={String(totalPrefixes)} tone="neutral" />
        <Metric label="LACNIC" value={String(lacnicPrefixes)} tone="neutral" />
        <Metric label="Uso alto" value={String(highUse)} tone="warning" />
        <Metric label="Globales" value={String(prefixes.filter((prefix) => prefix.siteCode === "GLOBAL").length)} tone="neutral" />
      </section>
      <section className="resourceWorkbench">
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Alta rapida</p><h2>Bloque o prefijo</h2></div></div>
          <form className="quickForm" onSubmit={createPrefix}>
            <label>Prefijo<input onChange={(event) => setPrefixForm((current) => ({ ...current, prefix: event.target.value }))} placeholder="10.10.0.0/24" value={prefixForm.prefix} /></label>
            <label>Familia<select onChange={(event) => setPrefixForm((current) => ({ ...current, family: event.target.value }))} value={prefixForm.family}>
              <option value="4">IPv4</option><option value="6">IPv6</option>
            </select></label>
            <label>Rol<select onChange={(event) => setPrefixForm((current) => ({ ...current, role: event.target.value }))} value={prefixForm.role}>
              <option value="customer_pool">Pool clientes</option><option value="management">Gestion</option><option value="transport">Transporte</option><option value="loopback">Loopback</option><option value="public">Publico</option><option value="reserved">Reservado</option>
            </select></label>
            <label>Estado<select onChange={(event) => setPrefixForm((current) => ({ ...current, status: event.target.value }))} value={prefixForm.status}>
              <option value="active">active</option><option value="planned">planned</option><option value="reserved">reserved</option><option value="deprecated">deprecated</option><option value="retired">retired</option>
            </select></label>
            <label>Sede<select onChange={(event) => setPrefixForm((current) => ({ ...current, siteCode: event.target.value }))} value={prefixForm.siteCode}>
              <option value="">GLOBAL</option>
              {sites.map((site) => <option key={site.id} value={site.code}>{site.code} - {site.name}</option>)}
            </select></label>
            <label>VRF<input onChange={(event) => setPrefixForm((current) => ({ ...current, vrf: event.target.value }))} value={prefixForm.vrf} /></label>
            <label className="wideField">Descripcion<input onChange={(event) => setPrefixForm((current) => ({ ...current, description: event.target.value }))} value={prefixForm.description} /></label>
            <button disabled={!prefixForm.prefix || !prefixForm.role} type="submit">Crear prefijo</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Operacion</p><h2>Editar recurso</h2></div></div>
          <form className="quickForm" onSubmit={updatePrefix}>
            <label className="wideField">Prefijo<select onChange={(event) => setSelectedPrefixId(event.target.value)} value={selectedPrefixId}>
              <option value="">Seleccionar</option>
              {prefixes.map((prefix) => <option key={prefix.id} value={prefix.id}>{prefix.prefix} - {prefix.siteCode}</option>)}
            </select></label>
            <label>Rol<select disabled={!selectedPrefix} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))} value={editForm.role}>
              <option value="customer_pool">Pool clientes</option><option value="management">Gestion</option><option value="transport">Transporte</option><option value="loopback">Loopback</option><option value="public">Publico</option><option value="reserved">Reservado</option>
            </select></label>
            <label>Estado<select disabled={!selectedPrefix} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} value={editForm.status}>
              <option value="active">active</option><option value="planned">planned</option><option value="reserved">reserved</option><option value="deprecated">deprecated</option><option value="retired">retired</option>
            </select></label>
            <label>Sede<select disabled={!selectedPrefix} onChange={(event) => setEditForm((current) => ({ ...current, siteCode: event.target.value }))} value={editForm.siteCode}>
              <option value="">GLOBAL</option>
              {sites.map((site) => <option key={site.id} value={site.code}>{site.code} - {site.name}</option>)}
            </select></label>
            <label>VRF<input disabled={!selectedPrefix} onChange={(event) => setEditForm((current) => ({ ...current, vrf: event.target.value }))} value={editForm.vrf} /></label>
            <label className="wideField">Descripcion<input disabled={!selectedPrefix} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} value={editForm.description} /></label>
            <button disabled={!selectedPrefix} type="submit">Guardar prefijo</button>
            <button className="dangerButton" disabled={!selectedPrefix} onClick={() => void deletePrefix()} type="button">Eliminar sin IPs</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
      </section>
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Inventario</p><h2>Prefijos documentados</h2></div></div>
        <DataTable
          columns={["Prefijo", "Origen", "VRF", "Sede", "Rol", "Estado", "Uso"]}
          statusColumnIndex={5}
          rows={prefixes.map((prefix) => [
            prefix.prefix,
            prefix.source,
            prefix.vrf,
            prefix.siteCode,
            prefix.role,
            prefix.status,
            `${prefix.utilization}%`
          ])}
        />
      </section>
    </ModulePage>
  );
}

function IpamView({
  circuits,
  interfaceLinks,
  interfaces,
  ips,
  onReload,
  prefixes
}: {
  circuits: Circuit[];
  interfaceLinks: InterfaceLink[];
  interfaces: NetworkInterface[];
  ips: IpAssignment[];
  onReload: () => Promise<void>;
  prefixes: Prefix[];
}) {
  const [ipForm, setIpForm] = useState({ address: "", prefix: prefixes[0]?.prefix ?? "", interfaceId: interfaces[0]?.id ?? "", role: "management", status: "assigned", description: "" });
  const [selectedIpId, setSelectedIpId] = useState(ips[0]?.id ?? "");
  const selectedIp = ips.find((ip) => ip.id === selectedIpId) ?? ips[0];
  const selectedIpInterfaceId = selectedIp ? interfaces.find((item) => item.device === selectedIp.device && item.name === selectedIp.interface)?.id ?? "" : "";
  const selectedIpInterface = interfaces.find((item) => item.id === selectedIpInterfaceId);
  const selectedIpPrefix = selectedIp ? prefixes.find((prefix) => prefix.prefix === selectedIp.prefix) : undefined;
  const selectedInterfaceLinks = selectedIpInterface
    ? interfaceLinks.filter((link) => link.aInterfaceId === selectedIpInterface.id || link.bInterfaceId === selectedIpInterface.id)
    : [];
  const selectedCircuitCodes = Array.from(new Set(selectedInterfaceLinks.map((link) => link.circuitCode).filter((code): code is string => Boolean(code))));
  const selectedIpCircuits = circuits.filter((circuit) => selectedCircuitCodes.includes(circuit.code));
  const [ipEditForm, setIpEditForm] = useState({ interfaceId: selectedIpInterfaceId, role: selectedIp?.role ?? "management", status: selectedIp?.status ?? "assigned", description: selectedIp?.description ?? "" });
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (selectedIp) {
      const nextInterfaceId = interfaces.find((item) => item.device === selectedIp.device && item.name === selectedIp.interface)?.id ?? "";
      setIpEditForm({
        interfaceId: nextInterfaceId,
        role: selectedIp.role,
        status: selectedIp.status,
        description: selectedIp.description ?? ""
      });
    }
  }, [interfaces, selectedIp]);

  async function createIp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("saving");

    try {
      await apiPost("/ipam/addresses", {
        address: ipForm.address,
        prefix: ipForm.prefix,
        interfaceId: ipForm.interfaceId || null,
        role: ipForm.role,
        status: ipForm.status,
        description: ipForm.description || null,
        reason: "Asignacion IP desde modulo IPAM"
      });
      setIpForm((current) => ({ ...current, address: "", description: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateIp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedIp) return;
    setFormState("saving");

    try {
      await apiPatch(`/ipam/addresses/${selectedIp.id}`, {
        interfaceId: ipEditForm.interfaceId || null,
        role: ipEditForm.role,
        status: ipEditForm.status,
        description: ipEditForm.description || null,
        reason: "Edicion desde modulo IPAM"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteIp() {
    if (!selectedIp) return;
    setFormState("saving");

    try {
      await apiDelete(`/ipam/addresses/${selectedIp.id}`);
      setSelectedIpId("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="IPAM" title="Trazabilidad por IP, prefijo e interfaz">
      <section className="ipamWorkbench">
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Prefijos</p>
              <h2>Utilizacion</h2>
            </div>
          </div>
          <DataTable
            columns={["Prefijo", "Sede", "VRF", "Uso"]}
            statusColumnIndex={undefined}
            rows={prefixes.map((prefix) => [prefix.prefix, prefix.siteCode, prefix.vrf, `${prefix.utilization}%`])}
          />
        </div>
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Asignacion</p>
              <h2>Nueva IP con contexto</h2>
            </div>
          </div>
          <form className="quickForm" onSubmit={createIp}>
            <label>IP<input onChange={(event) => setIpForm((current) => ({ ...current, address: event.target.value }))} value={ipForm.address} /></label>
            <label>Prefijo<select onChange={(event) => setIpForm((current) => ({ ...current, prefix: event.target.value }))} value={ipForm.prefix}>
              {prefixes.map((prefix) => <option key={prefix.id} value={prefix.prefix}>{prefix.prefix} - {prefix.siteCode}</option>)}
            </select></label>
            <label className="wideField">Interfaz<select onChange={(event) => setIpForm((current) => ({ ...current, interfaceId: event.target.value }))} value={ipForm.interfaceId}>
              <option value="">Sin interfaz</option>
              {interfaces.map((networkInterface) => <option key={networkInterface.id} value={networkInterface.id}>{networkInterface.device} {networkInterface.name} - {networkInterface.siteCode}</option>)}
            </select></label>
            <label>Rol<select onChange={(event) => setIpForm((current) => ({ ...current, role: event.target.value }))} value={ipForm.role}>
              <option value="management">Gestion</option>
              <option value="loopback">Loopback</option>
              <option value="transport">Transporte</option>
              <option value="customer">Cliente</option>
              <option value="service">Servicio</option>
            </select></label>
            <label>Estado<select onChange={(event) => setIpForm((current) => ({ ...current, status: event.target.value }))} value={ipForm.status}>
              <option value="assigned">Asignada</option>
              <option value="reserved">Reservada</option>
              <option value="active">Activa</option>
              <option value="deprecated">Deprecada</option>
            </select></label>
            <label className="wideField">Descripcion<input onChange={(event) => setIpForm((current) => ({ ...current, description: event.target.value }))} value={ipForm.description} /></label>
            <button type="submit">Asignar IP</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel ipListPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Direcciones</p>
              <h2>Contexto obligatorio</h2>
            </div>
          </div>
          <DataTable
            columns={["IP", "Equipo", "Interfaz", "Rol", "Servicio", "Estado"]}
            statusColumnIndex={5}
            rows={ips.map((ip) => [
              ip.address,
              ip.device ?? "pendiente",
              ip.interface ?? "pendiente",
              ip.role,
              ip.service ?? "pendiente",
              ip.status
            ])}
          />
        </div>
        <div className="panel ipListPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Operacion</p>
              <h2>Editar IP</h2>
            </div>
          </div>
          <form className="quickForm" onSubmit={updateIp}>
            <label className="wideField">Direccion<select onChange={(event) => setSelectedIpId(event.target.value)} value={selectedIp?.id ?? ""}>
              <option value="">Seleccionar</option>
              {ips.map((ip) => <option key={ip.id} value={ip.id}>{ip.address} - {ip.device ?? ip.site}</option>)}
            </select></label>
            <label className="wideField">Interfaz<select disabled={!selectedIp} onChange={(event) => setIpEditForm((current) => ({ ...current, interfaceId: event.target.value }))} value={ipEditForm.interfaceId}>
              <option value="">Sin interfaz</option>
              {interfaces.map((networkInterface) => <option key={networkInterface.id} value={networkInterface.id}>{networkInterface.device} {networkInterface.name} - {networkInterface.siteCode}</option>)}
            </select></label>
            <label>Rol<select disabled={!selectedIp} onChange={(event) => setIpEditForm((current) => ({ ...current, role: event.target.value }))} value={ipEditForm.role}>
              <option value="management">Gestion</option>
              <option value="loopback">Loopback</option>
              <option value="transport">Transporte</option>
              <option value="customer">Cliente</option>
              <option value="service">Servicio</option>
              <option value="unknown">Desconocido</option>
            </select></label>
            <label>Estado<select disabled={!selectedIp} onChange={(event) => setIpEditForm((current) => ({ ...current, status: event.target.value }))} value={ipEditForm.status}>
              <option value="assigned">Asignada</option>
              <option value="reserved">Reservada</option>
              <option value="active">Activa</option>
              <option value="deprecated">Deprecada</option>
              <option value="undocumented">Sin documentar</option>
            </select></label>
            <label className="wideField">Descripcion<input disabled={!selectedIp} onChange={(event) => setIpEditForm((current) => ({ ...current, description: event.target.value }))} value={ipEditForm.description} /></label>
            <button disabled={!selectedIp} type="submit">Guardar IP</button>
            <button className="dangerButton" disabled={!selectedIp} onClick={() => void deleteIp()} type="button">Eliminar IP</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel ipTracePanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Trazabilidad</p>
              <h2>Contexto de IP</h2>
            </div>
          </div>
          {selectedIp ? (
            <div className="traceGrid">
              <div><span>Direccion</span><strong>{selectedIp.address}</strong></div>
              <div><span>Prefijo</span><strong>{selectedIp.prefix}</strong></div>
              <div><span>Sede</span><strong>{selectedIp.site}</strong></div>
              <div><span>Equipo</span><strong>{selectedIp.device ?? "sin equipo"}</strong></div>
              <div><span>Interfaz</span><strong>{selectedIp.interface ?? "sin interfaz"}</strong></div>
              <div><span>Velocidad</span><strong>{selectedIpInterface?.speedMbps ? formatMbps(selectedIpInterface.speedMbps) : "N/D"}</strong></div>
              <div><span>Rol</span><strong>{selectedIp.role}</strong></div>
              <div><span>Estado</span><strong className={`statusText ${selectedIp.status}`}>{selectedIp.status}</strong></div>
              <div><span>VRF</span><strong>{selectedIpPrefix?.vrf ?? "global"}</strong></div>
              <div><span>Uso prefijo</span><strong>{selectedIpPrefix ? `${selectedIpPrefix.utilization}%` : "N/D"}</strong></div>
            </div>
          ) : (
            <span className="mutedText">Selecciona una IP para ver su trazabilidad completa.</span>
          )}
          <div className="compactList">
            <p className="eyebrow">Enlaces y circuitos relacionados</p>
            {selectedInterfaceLinks.map((link) => (
              <article key={link.id}>
                <strong>{link.aDevice} - {link.bDevice}</strong>
                <span>{link.linkType} / {link.status} / {link.capacityMbps ? formatMbps(link.capacityMbps) : "sin capacidad"}</span>
              </article>
            ))}
            {selectedIpCircuits.map((circuit) => (
              <article key={circuit.id}>
                <strong>{circuit.code} - {circuit.name}</strong>
                <span>{circuit.providerCode} / {circuit.aSite} - {circuit.zSite} / {formatMbps(circuit.capacityMbps)}</span>
              </article>
            ))}
            {selectedInterfaceLinks.length === 0 && selectedIpCircuits.length === 0 && <span className="mutedText">Sin enlaces puerto-a-puerto o circuitos asociados.</span>}
          </div>
        </div>
      </section>
    </ModulePage>
  );
}

function SitesView({
  circuits = [],
  compact = false,
  devices = [],
  fiberSpans = [],
  incidents = [],
  onReload,
  powerFeeds = [],
  prefixes = [],
  racks = [],
  siteMap,
  sites
}: {
  circuits?: Circuit[];
  compact?: boolean;
  devices?: Device[];
  fiberSpans?: FiberSpan[];
  incidents?: Incident[];
  onReload?: () => Promise<void>;
  powerFeeds?: PowerFeed[];
  prefixes?: Prefix[];
  racks?: RackView[];
  siteMap?: SiteMap;
  sites: Site[];
}) {
  const [siteForm, setSiteForm] = useState({
    code: "",
    name: "",
    siteType: "pop",
    status: "planned",
    address: "",
    latitude: "",
    longitude: ""
  });
  const [selectedCode, setSelectedCode] = useState(sites[0]?.code ?? "");
  const selectedSite = sites.find((site) => site.code === selectedCode);
  const selectedMapNode = siteMap?.nodes.find((node) => node.code === selectedCode);
  const [editForm, setEditForm] = useState<{
    address: string;
    latitude: string;
    longitude: string;
    name: string;
    siteType: string;
    status: string;
  }>({
    name: selectedSite?.name ?? "",
    siteType: selectedSite?.type ?? "pop",
    status: selectedSite?.status ?? "healthy",
    address: "",
    latitude: selectedMapNode?.latitude?.toString() ?? "",
    longitude: selectedMapNode?.longitude?.toString() ?? ""
  });
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const selectedDevices = selectedSite ? devices.filter((device) => device.siteCode === selectedSite.code) : [];
  const selectedCircuits = selectedSite
    ? circuits.filter((circuit) => circuit.aSite === selectedSite.code || circuit.zSite === selectedSite.code)
    : [];
  const selectedPrefixes = selectedSite ? prefixes.filter((prefix) => prefix.siteCode === selectedSite.code) : [];
  const selectedRacks = selectedSite ? racks.filter((rack) => rack.siteCode === selectedSite.code) : [];
  const selectedPowerFeeds = selectedSite ? powerFeeds.filter((feed) => feed.siteCode === selectedSite.code) : [];
  const selectedFiberSpans = selectedSite ? fiberSpans.filter((span) => span.aSite === selectedSite.code || span.zSite === selectedSite.code) : [];
  const selectedMapLinks = selectedSite ? siteMap?.links.filter((link) => link.a === selectedSite.code || link.z === selectedSite.code) ?? [] : [];
  const selectedIncidentText = selectedSite ? `${selectedSite.code} ${selectedSite.name}`.toLowerCase() : "";
  const selectedIncidents = selectedSite
    ? incidents.filter((incident) => {
      const haystack = `${incident.code} ${incident.title} ${incident.summary ?? ""}`.toLowerCase();
      return selectedIncidentText.split(" ").some((part) => part.length > 2 && haystack.includes(part));
    })
    : [];
  const selectedCapacityMbps = selectedCircuits.reduce((sum, circuit) => sum + (circuit.capacityMbps ?? 0), 0);
  const selectedRackUtilization = selectedRacks.reduce((sum, rack) => sum + rack.utilizationU, 0);
  const selectedPowerLoad = selectedPowerFeeds.reduce((sum, feed) => sum + (feed.loadWatts ?? 0), 0);
  const selectedPowerCapacity = selectedPowerFeeds.reduce((sum, feed) => sum + (feed.capacityWatts ?? 0), 0);

  useEffect(() => {
    const nextSite = sites.find((site) => site.code === selectedCode);
    const nextNode = siteMap?.nodes.find((node) => node.code === selectedCode);
    setEditForm({
      name: nextSite?.name ?? "",
      siteType: nextSite?.type ?? "pop",
      status: nextSite?.status ?? "healthy",
      address: "",
      latitude: nextNode?.latitude?.toString() ?? "",
      longitude: nextNode?.longitude?.toString() ?? ""
    });
  }, [selectedCode, siteMap, sites]);

  async function createSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onReload) return;
    setFormState("saving");

    try {
      await apiPost("/sites", {
        code: siteForm.code,
        name: siteForm.name,
        siteType: siteForm.siteType,
        status: siteForm.status,
        address: siteForm.address || null,
        latitude: siteForm.latitude ? Number(siteForm.latitude) : null,
        longitude: siteForm.longitude ? Number(siteForm.longitude) : null,
        reason: "Alta desde modulo Sedes"
      });
      setSiteForm((current) => ({ ...current, code: "", name: "", address: "", latitude: "", longitude: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onReload || !selectedSite) return;
    setFormState("saving");

    try {
      await apiPatch(`/sites/${selectedSite.code}`, {
        name: editForm.name,
        siteType: editForm.siteType,
        status: editForm.status,
        address: editForm.address || null,
        latitude: editForm.latitude ? Number(editForm.latitude) : null,
        longitude: editForm.longitude ? Number(editForm.longitude) : null,
        reason: "Edicion desde modulo Sedes"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteSite() {
    if (!onReload || !selectedSite) return;
    setFormState("saving");

    try {
      await apiDelete(`/sites/${selectedSite.code}`);
      setSelectedCode("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  const content = (
    <DataTable
      columns={["Codigo", "Sede", "Estado", "Equipos", "Circuitos", "Prefijos", "Incidencias"]}
      statusColumnIndex={2}
      rows={sites.map((site) => [
        site.code,
        site.name,
        site.status,
        String(site.devices),
        String(site.circuits),
        String(site.prefixes),
        String(site.incidents)
      ])}
    />
  );

  if (compact) {
    return (
      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Sedes</p>
            <h2>Vista operacional</h2>
          </div>
        </div>
        {content}
      </section>
    );
  }

  return (
    <ModulePage eyebrow="Sedes" title="Inventario, topologia, enlaces e incidencias por POP">
      <section className="siteWorkbench">
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Alta rapida</p><h2>Sede, POP, hub o torre</h2></div></div>
          <form className="quickForm" onSubmit={createSite}>
            <label>Codigo<input onChange={(event) => setSiteForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={siteForm.code} /></label>
            <label>Tipo<select onChange={(event) => setSiteForm((current) => ({ ...current, siteType: event.target.value }))} value={siteForm.siteType}>
              <option value="pop">POP</option><option value="hub">Hub</option><option value="tower">Torre</option><option value="node">Nodo</option><option value="datacenter">Datacenter</option><option value="customer_hub">Hub cliente</option>
            </select></label>
            <label className="wideField">Nombre<input onChange={(event) => setSiteForm((current) => ({ ...current, name: event.target.value }))} value={siteForm.name} /></label>
            <label>Estado<select onChange={(event) => setSiteForm((current) => ({ ...current, status: event.target.value }))} value={siteForm.status}>
              <option value="planned">planned</option><option value="active">active</option><option value="degraded">degraded</option><option value="down">down</option><option value="retired">retired</option>
            </select></label>
            <label>Latitud<input inputMode="decimal" onChange={(event) => setSiteForm((current) => ({ ...current, latitude: event.target.value }))} value={siteForm.latitude} /></label>
            <label>Longitud<input inputMode="decimal" onChange={(event) => setSiteForm((current) => ({ ...current, longitude: event.target.value }))} value={siteForm.longitude} /></label>
            <label className="wideField">Direccion / referencia<input onChange={(event) => setSiteForm((current) => ({ ...current, address: event.target.value }))} value={siteForm.address} /></label>
            <button disabled={!siteForm.code || !siteForm.name} type="submit">Crear sede</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Operacion</p><h2>Editar sede existente</h2></div></div>
          <form className="quickForm" onSubmit={updateSite}>
            <label className="wideField">Sede<select onChange={(event) => setSelectedCode(event.target.value)} value={selectedCode}>
              <option value="">Seleccionar</option>
              {sites.map((site) => <option key={site.id} value={site.code}>{site.code} - {site.name}</option>)}
            </select></label>
            <label>Nombre<input disabled={!selectedSite} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} value={editForm.name} /></label>
            <label>Tipo<select disabled={!selectedSite} onChange={(event) => setEditForm((current) => ({ ...current, siteType: event.target.value }))} value={editForm.siteType}>
              <option value="pop">POP</option><option value="hub">Hub</option><option value="tower">Torre</option><option value="node">Nodo</option><option value="datacenter">Datacenter</option><option value="customer_hub">Hub cliente</option>
            </select></label>
            <label>Estado<select disabled={!selectedSite} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} value={editForm.status}>
              <option value="healthy">healthy</option><option value="active">active</option><option value="planned">planned</option><option value="degraded">degraded</option><option value="down">down</option><option value="retired">retired</option>
            </select></label>
            <label>Latitud<input disabled={!selectedSite} inputMode="decimal" onChange={(event) => setEditForm((current) => ({ ...current, latitude: event.target.value }))} value={editForm.latitude} /></label>
            <label>Longitud<input disabled={!selectedSite} inputMode="decimal" onChange={(event) => setEditForm((current) => ({ ...current, longitude: event.target.value }))} value={editForm.longitude} /></label>
            <label className="wideField">Direccion / referencia<input disabled={!selectedSite} onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))} value={editForm.address} /></label>
            <button disabled={!selectedSite || !editForm.name} type="submit">Guardar sede</button>
            <button className="dangerButton" disabled={!selectedSite} onClick={() => void deleteSite()} type="button">Eliminar sin dependencias</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
      </section>
      {selectedSite && (
        <section className="siteOpsPanel panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{selectedSite.code}</p>
              <h2>{selectedSite.name}</h2>
            </div>
            <span className={`status ${selectedSite.status}`}>{selectedSite.status}</span>
          </div>
          <div className="siteOpsMetrics">
            <Metric label="Equipos" value={String(selectedDevices.length || selectedSite.devices)} tone="neutral" />
            <Metric label="Circuitos" value={String(selectedCircuits.length || selectedSite.circuits)} tone="neutral" />
            <Metric label="Capacidad" value={`${formatMbps(selectedCapacityMbps)} agregados`} tone="neutral" />
            <Metric label="Incidencias" value={String(selectedIncidents.length || selectedSite.incidents)} tone={(selectedIncidents.length || selectedSite.incidents) > 0 ? "warning" : "neutral"} />
            <Metric label="Racks / RU" value={`${selectedRacks.length} / ${selectedRackUtilization}U`} tone="neutral" />
            <Metric label="Energia" value={`${selectedPowerLoad}W / ${selectedPowerCapacity}W`} tone={selectedPowerCapacity > 0 && selectedPowerLoad / selectedPowerCapacity > 0.8 ? "warning" : "neutral"} />
          </div>
          <div className="siteOpsGrid">
            <div>
              <p className="eyebrow">Equipos principales</p>
              <div className="compactList">
                {selectedDevices.slice(0, 8).map((device) => (
                  <article key={device.id}>
                    <strong>{device.name}</strong>
                    <span>{device.role} - {device.status}</span>
                  </article>
                ))}
                {selectedDevices.length === 0 && <span className="mutedText">Sin equipos asociados</span>}
              </div>
            </div>
            <div>
              <p className="eyebrow">Circuitos y transporte</p>
              <div className="compactList">
                {selectedCircuits.slice(0, 8).map((circuit) => (
                  <article key={circuit.id}>
                    <strong>{circuit.code}</strong>
                    <span>{circuit.aSite} - {circuit.zSite} | {formatMbps(circuit.capacityMbps)}</span>
                  </article>
                ))}
                {selectedCircuits.length === 0 && <span className="mutedText">Sin circuitos asociados</span>}
              </div>
            </div>
            <div>
              <p className="eyebrow">Prefijos</p>
              <div className="compactList">
                {selectedPrefixes.slice(0, 8).map((prefix) => (
                  <article key={prefix.id}>
                    <strong>{prefix.prefix}</strong>
                    <span>{prefix.role} - {prefix.status} - {prefix.utilization}%</span>
                  </article>
                ))}
                {selectedPrefixes.length === 0 && <span className="mutedText">Sin prefijos asociados</span>}
              </div>
            </div>
            <div>
              <p className="eyebrow">Incidencias relacionadas</p>
              <div className="compactList">
                {selectedIncidents.slice(0, 8).map((incident) => (
                  <article key={incident.id}>
                    <strong>{incident.code}</strong>
                    <span>{incident.severity} - {incident.status}</span>
                  </article>
                ))}
                {selectedIncidents.length === 0 && <span className="mutedText">Sin incidencias relacionadas</span>}
              </div>
            </div>
            <div>
              <p className="eyebrow">Racks y energia</p>
              <div className="compactList">
                {selectedRacks.slice(0, 8).map((rack) => (
                  <article key={rack.id}>
                    <strong>{rack.code}</strong>
                    <span>{rack.name} - {rack.utilizationU}/{rack.heightU}U</span>
                  </article>
                ))}
                {selectedPowerFeeds.slice(0, 4).map((feed) => (
                  <article key={feed.id}>
                    <strong>{feed.name}</strong>
                    <span>{feed.loadWatts ?? 0}W / {feed.capacityWatts ?? 0}W - {feed.status}</span>
                  </article>
                ))}
                {selectedRacks.length === 0 && selectedPowerFeeds.length === 0 && <span className="mutedText">Sin racks ni energia registrados</span>}
              </div>
            </div>
            <div>
              <p className="eyebrow">Transporte fisico</p>
              <div className="compactList">
                {selectedFiberSpans.slice(0, 6).map((span) => (
                  <article key={span.id}>
                    <strong>{span.code}</strong>
                    <span>{span.aSite} - {span.zSite} / {span.usedFibers}/{span.fiberCount} hilos</span>
                  </article>
                ))}
                {selectedMapLinks.slice(0, 6).map((link) => (
                  <article key={link.id}>
                    <strong>{link.label}</strong>
                    <span>{link.a} - {link.z} / {link.capacityMbps ? formatMbps(link.capacityMbps) : "sin capacidad"} / {link.status}</span>
                  </article>
                ))}
                {selectedFiberSpans.length === 0 && selectedMapLinks.length === 0 && <span className="mutedText">Sin tramos asociados</span>}
              </div>
            </div>
          </div>
        </section>
      )}
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Inventario</p><h2>Sedes documentadas</h2></div></div>
        {content}
      </section>
    </ModulePage>
  );
}

function NetworkMapView({ siteMap }: { siteMap: SiteMap }) {
  const [workingMap, setWorkingMap] = useState(siteMap);
  const [selectedCode, setSelectedCode] = useState(siteMap.nodes[0]?.code ?? "");
  const [locationDraft, setLocationDraft] = useState({ latitude: "", longitude: "", address: "" });
  const [linkDraft, setLinkDraft] = useState({
    aSiteCode: siteMap.nodes[0]?.code ?? "",
    zSiteCode: siteMap.nodes[1]?.code ?? "",
    linkType: "transport",
    status: "planned",
    capacityMbps: "",
    label: ""
  });
  const [selectedLinkId, setSelectedLinkId] = useState(siteMap.links[0]?.id ?? "");
  const [linkEditDraft, setLinkEditDraft] = useState({
    aSiteCode: siteMap.links[0]?.a ?? siteMap.nodes[0]?.code ?? "",
    zSiteCode: siteMap.links[0]?.z ?? siteMap.nodes[1]?.code ?? "",
    linkType: siteMap.links[0]?.type ?? "transport",
    status: siteMap.links[0]?.status ?? "planned",
    capacityMbps: siteMap.links[0]?.capacityMbps ? String(siteMap.links[0].capacityMbps) : "",
    label: siteMap.links[0]?.label ?? ""
  });
  const [siteDraft, setSiteDraft] = useState({
    code: "",
    name: "",
    siteType: "node",
    status: "planned",
    latitude: "",
    longitude: "",
    address: ""
  });
  const [importDraft, setImportDraft] = useState(defaultMapImportPayload);
  const [csvDraft, setCsvDraft] = useState(defaultMapCsvPayload);
  const [csvValidation, setCsvValidation] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState("");
  const [downstreamImpact, setDownstreamImpact] = useState<DownstreamImpact | null>(null);
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const activeLinks = workingMap.links.filter((link) => link.status === "active").length;
  const plannedLinks = workingMap.links.filter((link) => link.status === "planned").length;
  const nodeByCode = new Map(workingMap.nodes.map((node) => [node.code, node]));
  const selectedNode = nodeByCode.get(selectedCode) ?? workingMap.nodes[0];
  const selectedLinks = selectedNode
    ? workingMap.links.filter((link) => link.a === selectedNode.code || link.z === selectedNode.code)
    : [];
  const selectedTransportLink = workingMap.links.find((link) => link.id === selectedLinkId);

  useEffect(() => {
    setWorkingMap(siteMap);
    setSelectedCode((current) => current || siteMap.nodes[0]?.code || "");
    setSelectedLinkId((current) => current || siteMap.links[0]?.id || "");
  }, [siteMap]);

  useEffect(() => {
    if (!selectedNode) {
      return;
    }

    setLocationDraft({
      latitude: selectedNode.latitude?.toString() ?? "",
      longitude: selectedNode.longitude?.toString() ?? "",
      address: ""
    });
    setLinkDraft((current) => ({
      ...current,
      aSiteCode: selectedNode.code
    }));

    apiGet<DownstreamImpact>(`/sites/${selectedNode.code}/downstream-impact`)
      .then(setDownstreamImpact)
      .catch(() => setDownstreamImpact(null));
  }, [selectedNode?.code, selectedNode?.latitude, selectedNode?.longitude]);

  useEffect(() => {
    if (!selectedTransportLink) {
      return;
    }

    setLinkEditDraft({
      aSiteCode: selectedTransportLink.a,
      zSiteCode: selectedTransportLink.z,
      linkType: selectedTransportLink.type,
      status: selectedTransportLink.status,
      capacityMbps: selectedTransportLink.capacityMbps ? String(selectedTransportLink.capacityMbps) : "",
      label: selectedTransportLink.label
    });
  }, [selectedTransportLink]);

  async function refreshMap(nextSelectedCode = selectedNode?.code) {
    const nextMap = await apiGet<SiteMap>("/sites/map");
    setWorkingMap(nextMap);

    if (nextSelectedCode) {
      setSelectedCode(nextSelectedCode);
    }
  }

  async function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedNode) {
      return;
    }

    setFormState("saving");

    try {
      await apiPatch(`/sites/${selectedNode.code}/location`, {
        latitude: Number(locationDraft.latitude),
        longitude: Number(locationDraft.longitude),
        address: locationDraft.address || null,
        reason: "Ajuste desde mapa de red"
      });
      await refreshMap(selectedNode.code);
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function submitTransportLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (linkDraft.aSiteCode === linkDraft.zSiteCode) {
      setFormState("error");
      return;
    }

    setFormState("saving");

    try {
      await apiPost("/sites/transport-links", {
        ...linkDraft,
        capacityMbps: linkDraft.capacityMbps ? Number(linkDraft.capacityMbps) : null,
        label: linkDraft.label || null,
        reason: "Alta rapida desde mapa de red"
      });
      await refreshMap(linkDraft.aSiteCode);
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateTransportLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTransportLink || linkEditDraft.aSiteCode === linkEditDraft.zSiteCode) {
      setFormState("error");
      return;
    }

    setFormState("saving");

    try {
      await apiPatch(`/sites/transport-links/${selectedTransportLink.id}`, {
        ...linkEditDraft,
        capacityMbps: linkEditDraft.capacityMbps ? Number(linkEditDraft.capacityMbps) : null,
        label: linkEditDraft.label || null,
        reason: "Edicion desde mapa de red"
      });
      await refreshMap(linkEditDraft.aSiteCode);
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteTransportLink() {
    if (!selectedTransportLink) return;
    setFormState("saving");

    try {
      await apiDelete(`/sites/transport-links/${selectedTransportLink.id}`);
      setSelectedLinkId("");
      await refreshMap(selectedNode?.code);
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function submitMapIncident() {
    if (!selectedNode) {
      return;
    }

    setFormState("saving");

    try {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      await apiPost("/incidents", {
        code: `INC-${selectedNode.code}-${stamp}`,
        title: `Incidencia en ${selectedNode.name}`,
        severity: downstreamImpact?.impactedCount ? "major" : "minor",
        status: "open",
        ownerTeam: "noc",
        summary: `Creada desde mapa de red. Impacto aguas abajo estimado: ${downstreamImpact?.impactedCount ?? 0}.`,
        reason: "Incidencia creada desde mapa de red"
      });
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function submitSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("saving");

    try {
      await apiPost("/sites", {
        code: siteDraft.code,
        name: siteDraft.name,
        siteType: siteDraft.siteType,
        status: siteDraft.status,
        latitude: Number(siteDraft.latitude),
        longitude: Number(siteDraft.longitude),
        address: siteDraft.address || null,
        reason: "Alta rapida desde mapa de red"
      });
      await refreshMap(siteDraft.code.toUpperCase());
      setSiteDraft({
        code: "",
        name: "",
        siteType: "node",
        status: "planned",
        latitude: "",
        longitude: "",
        address: ""
      });
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  function convertCsvImport() {
    try {
      const validation = validateMapCsv(csvDraft);

      if (validation.length) {
        setCsvValidation(validation);
        setFormState("error");
        return;
      }

      const payload = parseMapCsv(csvDraft);
      setCsvValidation([]);
      setImportDraft(JSON.stringify(payload, null, 2));
      setImportSummary(`CSV convertido: ${payload.sites.length} sedes - ${payload.links.length} tramos`);
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function submitImport(preview: boolean) {
    setFormState("saving");

    try {
      const payload = JSON.parse(importDraft) as Record<string, unknown>;
      const response = await apiPost<{
        summary: { sites: number; links: number; failedLinks?: number; missingLinkSites?: number };
        missingLinkSites?: string[];
      }>("/sites/map/import", {
        ...payload,
        preview,
        reason: "Importacion desde mapa de red"
      });
      const missing = response.missingLinkSites?.length ? ` - Faltan: ${response.missingLinkSites.join(", ")}` : "";
      setImportSummary(`Sedes: ${response.summary.sites} - Tramos: ${response.summary.links}${response.summary.failedLinks ? ` - Fallidos: ${response.summary.failedLinks}` : ""}${missing}`);

      if (!preview) {
        await refreshMap();
      }

      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="Mapa de red" title="Transporte regional y sedes conectadas">
      <section className="mapLayout">
        <div className="panel networkMapPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Vista site-to-site</p>
              <h2>Arequipa, La Joya, Majes y sedes derivadas</h2>
            </div>
            <MapIcon size={20} />
          </div>
          <div className="networkMapStage">
            <svg aria-hidden="true" viewBox="0 0 900 520">
              <defs>
                <pattern height="42" id="mapGrid" patternUnits="userSpaceOnUse" width="42">
                  <path d="M 42 0 L 0 0 0 42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect fill="url(#mapGrid)" height="520" width="900" />
              {workingMap.links.map((link) => {
                const a = nodeByCode.get(link.a);
                const z = nodeByCode.get(link.z);

                if (!a || !z) {
                  return null;
                }

                const midX = (a.x + z.x) / 2;
                const midY = (a.y + z.y) / 2;

                return (
                  <g key={link.id} onClick={() => setSelectedLinkId(link.id)}>
                    <line className={`mapLine ${link.status} ${link.id === selectedLinkId ? "selected" : ""}`} x1={a.x} x2={z.x} y1={a.y} y2={z.y} />
                    <text className="mapLineLabel" x={midX} y={midY - 8}>{formatCapacity(link.capacityMbps)}</text>
                  </g>
                );
              })}
            </svg>
            {workingMap.nodes.map((node) => (
              <button
                className={`mapMarker ${node.type} ${node.status} ${node.code === selectedNode?.code ? "selected" : ""}`}
                key={node.id}
                onClick={() => setSelectedCode(node.code)}
                style={{ left: `${(node.x / 900) * 100}%`, top: `${(node.y / 520) * 100}%` }}
                title={`${node.name} - ${node.status}`}
              >
                <span>{node.code}</span>
                <small>{node.type.replace("_", " ")}</small>
              </button>
            ))}
          </div>
        </div>

        <aside className="panel mapSidePanel">
          <div className="mapStats">
            <div><span>Sedes</span><strong>{workingMap.nodes.length}</strong></div>
            <div><span>Activos</span><strong>{activeLinks}</strong></div>
            <div><span>Planificados</span><strong>{plannedLinks}</strong></div>
          </div>
          <div className="mapLegend">
            <span><i className="active" /> Activo</span>
            <span><i className="planned" /> Planificado</span>
            <span><i className="degraded" /> Degradado</span>
            <span><i className="down" /> Caido</span>
          </div>
          {selectedNode && (
            <div className="mapNodeDetail">
              <p className="eyebrow">Sede seleccionada</p>
              <h2>{selectedNode.name}</h2>
              <dl>
                <div><dt>Codigo</dt><dd>{selectedNode.code}</dd></div>
                <div><dt>Estado</dt><dd className={`statusText ${selectedNode.status}`}>{selectedNode.status}</dd></div>
                <div><dt>Latitud</dt><dd>{selectedNode.latitude ?? "N/D"}</dd></div>
                <div><dt>Longitud</dt><dd>{selectedNode.longitude ?? "N/D"}</dd></div>
              </dl>
              {downstreamImpact && (
                <div className="impactList">
                  <strong>Impacto aguas abajo: {downstreamImpact.impactedCount}</strong>
                  {downstreamImpact.impactedSites.slice(0, 6).map((site) => (
                    <span key={site.code}>{site.code} - nivel {site.depth}</span>
                  ))}
                  <button onClick={() => void submitMapIncident()} type="button">Crear incidencia</button>
                </div>
              )}
            </div>
          )}
          <div className="routeList">
            {(selectedLinks.length ? selectedLinks : workingMap.links).map((link) => (
              <article className={`routeItem ${link.id === selectedLinkId ? "selected" : ""}`} key={link.id} onClick={() => setSelectedLinkId(link.id)}>
                <div>
                  <strong>{link.label}</strong>
                  <span>{link.type} - {formatCapacity(link.capacityMbps)}</span>
                </div>
                <small className={`statusText ${link.status}`}>{link.status}</small>
              </article>
            ))}
          </div>
          <div className="mapQuickForms">
            <div className="importBox">
              <p className="eyebrow">CSV rapido</p>
              <textarea
                onChange={(event) => setCsvDraft(event.target.value)}
                spellCheck={false}
                value={csvDraft}
              />
              <div className="importActions">
                <button onClick={convertCsvImport} type="button">Convertir CSV</button>
                <button onClick={() => setCsvDraft(defaultMapCsvPayload)} type="button">Ejemplo</button>
              </div>
              <p className="importHint">Filas SITE y LINK separadas por coma. Luego previsualiza o aplica el JSON generado.</p>
              {csvValidation.length > 0 && (
                <div className="csvErrors">
                  {csvValidation.map((error) => <span key={error}>{error}</span>)}
                </div>
              )}

              <p className="eyebrow">Importacion masiva</p>
              <textarea
                onChange={(event) => setImportDraft(event.target.value)}
                spellCheck={false}
                value={importDraft}
              />
              <div className="importActions">
                <button onClick={() => void submitImport(true)} type="button">Previsualizar</button>
                <button onClick={() => void submitImport(false)} type="button">Aplicar</button>
              </div>
              {importSummary && <span className="formState saved">{importSummary}</span>}
            </div>

            <form className="quickForm" onSubmit={submitSite}>
              <p className="eyebrow">Nueva sede</p>
              <label>
                Codigo
                <input
                  onChange={(event) => setSiteDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                  placeholder="NUEVO-HUB"
                  required
                  value={siteDraft.code}
                />
              </label>
              <label>
                Nombre
                <input
                  onChange={(event) => setSiteDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Hub nuevo"
                  required
                  value={siteDraft.name}
                />
              </label>
              <label>
                Tipo
                <select
                  onChange={(event) => setSiteDraft((current) => ({ ...current, siteType: event.target.value }))}
                  value={siteDraft.siteType}
                >
                  <option value="pop">pop</option>
                  <option value="hub">hub</option>
                  <option value="node">node</option>
                  <option value="tower">tower</option>
                </select>
              </label>
              <label>
                Estado
                <select
                  onChange={(event) => setSiteDraft((current) => ({ ...current, status: event.target.value }))}
                  value={siteDraft.status}
                >
                  <option value="planned">planned</option>
                  <option value="active">active</option>
                  <option value="degraded">degraded</option>
                </select>
              </label>
              <label>
                Latitud
                <input
                  inputMode="decimal"
                  onChange={(event) => setSiteDraft((current) => ({ ...current, latitude: event.target.value }))}
                  required
                  value={siteDraft.latitude}
                />
              </label>
              <label>
                Longitud
                <input
                  inputMode="decimal"
                  onChange={(event) => setSiteDraft((current) => ({ ...current, longitude: event.target.value }))}
                  required
                  value={siteDraft.longitude}
                />
              </label>
              <label className="wideField">
                Direccion
                <input
                  onChange={(event) => setSiteDraft((current) => ({ ...current, address: event.target.value }))}
                  placeholder="Referencia o direccion"
                  value={siteDraft.address}
                />
              </label>
              <button type="submit">Crear sede</button>
            </form>

            <form className="quickForm" onSubmit={submitLocation}>
              <p className="eyebrow">Coordenadas</p>
              <label>
                Latitud
                <input
                  inputMode="decimal"
                  onChange={(event) => setLocationDraft((current) => ({ ...current, latitude: event.target.value }))}
                  required
                  value={locationDraft.latitude}
                />
              </label>
              <label>
                Longitud
                <input
                  inputMode="decimal"
                  onChange={(event) => setLocationDraft((current) => ({ ...current, longitude: event.target.value }))}
                  required
                  value={locationDraft.longitude}
                />
              </label>
              <label className="wideField">
                Direccion
                <input
                  onChange={(event) => setLocationDraft((current) => ({ ...current, address: event.target.value }))}
                  placeholder="Referencia de campo"
                  value={locationDraft.address}
                />
              </label>
              <button type="submit">Guardar punto</button>
            </form>

            <form className="quickForm" onSubmit={updateTransportLink}>
              <p className="eyebrow">Editar tramo</p>
              <label>
                Desde
                <select
                  disabled={!selectedTransportLink}
                  onChange={(event) => setLinkEditDraft((current) => ({ ...current, aSiteCode: event.target.value }))}
                  value={linkEditDraft.aSiteCode}
                >
                  {workingMap.nodes.map((node) => <option key={node.code} value={node.code}>{node.code}</option>)}
                </select>
              </label>
              <label>
                Hasta
                <select
                  disabled={!selectedTransportLink}
                  onChange={(event) => setLinkEditDraft((current) => ({ ...current, zSiteCode: event.target.value }))}
                  value={linkEditDraft.zSiteCode}
                >
                  {workingMap.nodes.map((node) => <option key={node.code} value={node.code}>{node.code}</option>)}
                </select>
              </label>
              <label>
                Tipo
                <select
                  disabled={!selectedTransportLink}
                  onChange={(event) => setLinkEditDraft((current) => ({ ...current, linkType: event.target.value }))}
                  value={linkEditDraft.linkType}
                >
                  <option value="transport">transport</option>
                  <option value="distribution">distribution</option>
                  <option value="last_mile">last_mile</option>
                  <option value="backup">backup</option>
                </select>
              </label>
              <label>
                Estado
                <select
                  disabled={!selectedTransportLink}
                  onChange={(event) => setLinkEditDraft((current) => ({ ...current, status: event.target.value }))}
                  value={linkEditDraft.status}
                >
                  <option value="active">active</option>
                  <option value="planned">planned</option>
                  <option value="degraded">degraded</option>
                  <option value="down">down</option>
                </select>
              </label>
              <label>
                Mbps
                <input
                  disabled={!selectedTransportLink}
                  inputMode="numeric"
                  onChange={(event) => setLinkEditDraft((current) => ({ ...current, capacityMbps: event.target.value }))}
                  value={linkEditDraft.capacityMbps}
                />
              </label>
              <label>
                Etiqueta
                <input
                  disabled={!selectedTransportLink}
                  onChange={(event) => setLinkEditDraft((current) => ({ ...current, label: event.target.value }))}
                  value={linkEditDraft.label}
                />
              </label>
              <button disabled={!selectedTransportLink || linkEditDraft.aSiteCode === linkEditDraft.zSiteCode} type="submit">Guardar tramo</button>
              <button className="dangerButton" disabled={!selectedTransportLink} onClick={() => void deleteTransportLink()} type="button">Eliminar tramo</button>
            </form>

            <form className="quickForm" onSubmit={submitTransportLink}>
              <p className="eyebrow">Nuevo tramo</p>
              <label>
                Desde
                <select
                  onChange={(event) => setLinkDraft((current) => ({ ...current, aSiteCode: event.target.value }))}
                  value={linkDraft.aSiteCode}
                >
                  {workingMap.nodes.map((node) => <option key={node.code} value={node.code}>{node.code}</option>)}
                </select>
              </label>
              <label>
                Hasta
                <select
                  onChange={(event) => setLinkDraft((current) => ({ ...current, zSiteCode: event.target.value }))}
                  value={linkDraft.zSiteCode}
                >
                  {workingMap.nodes.map((node) => <option key={node.code} value={node.code}>{node.code}</option>)}
                </select>
              </label>
              <label>
                Tipo
                <select
                  onChange={(event) => setLinkDraft((current) => ({ ...current, linkType: event.target.value }))}
                  value={linkDraft.linkType}
                >
                  <option value="transport">transport</option>
                  <option value="distribution">distribution</option>
                  <option value="last_mile">last_mile</option>
                  <option value="backup">backup</option>
                </select>
              </label>
              <label>
                Estado
                <select
                  onChange={(event) => setLinkDraft((current) => ({ ...current, status: event.target.value }))}
                  value={linkDraft.status}
                >
                  <option value="active">active</option>
                  <option value="planned">planned</option>
                  <option value="degraded">degraded</option>
                  <option value="down">down</option>
                </select>
              </label>
              <label>
                Mbps
                <input
                  inputMode="numeric"
                  onChange={(event) => setLinkDraft((current) => ({ ...current, capacityMbps: event.target.value }))}
                  value={linkDraft.capacityMbps}
                />
              </label>
              <label>
                Etiqueta
                <input
                  onChange={(event) => setLinkDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Majes <> nuevo nodo"
                  value={linkDraft.label}
                />
              </label>
              <button disabled={linkDraft.aSiteCode === linkDraft.zSiteCode} type="submit">Crear tramo</button>
            </form>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </div>
        </aside>
      </section>
    </ModulePage>
  );
}

function DatacenterView({
  assets,
  capacities,
  fiberSpans,
  fiberStrands,
  onReload,
  patchcords,
  transceivers
}: {
  assets: DatacenterAsset[];
  capacities: ProviderCapacity[];
  fiberSpans: FiberSpan[];
  fiberStrands: FiberStrand[];
  onReload: () => Promise<void>;
  patchcords: Patchcord[];
  transceivers: Transceiver[];
}) {
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [capacityForm, setCapacityForm] = useState({
    providerCode: "ANDEAN",
    contractCode: "AF-TRANS-2026",
    serviceType: "transporte regional",
    committedMbps: "10000",
    burstableMbps: "",
    deliveredMbps: "10000",
    usedMbps: "0",
    billingMode: "commit"
  });
  const [selectedCapacityId, setSelectedCapacityId] = useState(capacities[0]?.id ?? "");
  const selectedCapacity = capacities.find((capacity) => capacity.id === selectedCapacityId);
  const [capacityEditForm, setCapacityEditForm] = useState({
    providerCode: capacities[0]?.providerCode ?? "",
    contractCode: capacities[0]?.contractCode ?? "",
    serviceType: capacities[0]?.serviceType ?? "",
    committedMbps: capacities[0]?.committedMbps ? String(capacities[0].committedMbps) : "",
    burstableMbps: capacities[0]?.burstableMbps ? String(capacities[0].burstableMbps) : "",
    deliveredMbps: capacities[0]?.deliveredMbps ? String(capacities[0].deliveredMbps) : "",
    usedMbps: capacities[0]?.usedMbps ? String(capacities[0].usedMbps) : "0",
    billingMode: capacities[0]?.billingMode ?? "commit",
    status: capacities[0]?.status ?? "active"
  });
  const [spanForm, setSpanForm] = useState({
    code: "",
    aSite: "AQP-POP",
    zSite: "MAJES",
    providerCode: "ANDEAN",
    cableType: "ADSS monomodo",
    fiberCount: "24",
    usedFibers: "0",
    distanceKm: "",
    status: "planned"
  });
  const [selectedFiberSpanId, setSelectedFiberSpanId] = useState(fiberSpans[0]?.id ?? "");
  const selectedFiberSpan = fiberSpans.find((span) => span.id === selectedFiberSpanId);
  const [spanEditForm, setSpanEditForm] = useState({
    code: fiberSpans[0]?.code ?? "",
    aSite: fiberSpans[0]?.aSite ?? "",
    zSite: fiberSpans[0]?.zSite ?? "",
    providerCode: fiberSpans[0]?.providerCode ?? "",
    cableType: fiberSpans[0]?.cableType ?? "",
    fiberCount: fiberSpans[0]?.fiberCount ? String(fiberSpans[0].fiberCount) : "",
    usedFibers: fiberSpans[0]?.usedFibers ? String(fiberSpans[0].usedFibers) : "0",
    distanceKm: fiberSpans[0]?.distanceKm ? String(fiberSpans[0].distanceKm) : "",
    status: fiberSpans[0]?.status ?? "planned",
    notes: fiberSpans[0]?.notes ?? ""
  });
  const [strandForm, setStrandForm] = useState({
    spanCode: fiberSpans[0]?.code ?? "",
    strandNumber: "1",
    tubeColor: "",
    fiberColor: "",
    status: "available",
    service: "",
    circuitCode: "",
    aTermination: "",
    zTermination: ""
  });
  const [selectedFiberStrandId, setSelectedFiberStrandId] = useState(fiberStrands[0]?.id ?? "");
  const selectedFiberStrand = fiberStrands.find((strand) => strand.id === selectedFiberStrandId);
  const [strandEditForm, setStrandEditForm] = useState({
    spanCode: fiberStrands[0]?.spanCode ?? fiberSpans[0]?.code ?? "",
    strandNumber: fiberStrands[0]?.strandNumber ? String(fiberStrands[0].strandNumber) : "1",
    tubeColor: fiberStrands[0]?.tubeColor ?? "",
    fiberColor: fiberStrands[0]?.fiberColor ?? "",
    status: fiberStrands[0]?.status ?? "available",
    service: fiberStrands[0]?.service ?? "",
    circuitCode: fiberStrands[0]?.circuitCode ?? "",
    aTermination: fiberStrands[0]?.aTermination ?? "",
    zTermination: fiberStrands[0]?.zTermination ?? ""
  });
  const [opticForm, setOpticForm] = useState({
    deviceName: "PE-AQP-01",
    interfaceName: "ether1",
    vendor: "",
    partNumber: "",
    serialNumber: "",
    formFactor: "SFP+",
    speedMbps: "10000",
    wavelengthNm: "1310",
    reachKm: "10",
    connectorType: "LC",
    fiberMode: "SM",
    txPowerDbm: "",
    rxPowerDbm: "",
    status: "active"
  });
  const [selectedTransceiverId, setSelectedTransceiverId] = useState(transceivers[0]?.id ?? "");
  const selectedTransceiver = transceivers.find((transceiver) => transceiver.id === selectedTransceiverId);
  const [opticEditForm, setOpticEditForm] = useState({
    deviceName: transceivers[0]?.device ?? "",
    interfaceName: transceivers[0]?.interface ?? "",
    vendor: transceivers[0]?.vendor ?? "",
    partNumber: transceivers[0]?.partNumber ?? "",
    serialNumber: transceivers[0]?.serialNumber ?? "",
    formFactor: transceivers[0]?.formFactor ?? "SFP+",
    speedMbps: transceivers[0]?.speedMbps ? String(transceivers[0].speedMbps) : "10000",
    wavelengthNm: transceivers[0]?.wavelengthNm ? String(transceivers[0].wavelengthNm) : "",
    reachKm: transceivers[0]?.reachKm ? String(transceivers[0].reachKm) : "",
    connectorType: transceivers[0]?.connectorType ?? "LC",
    fiberMode: transceivers[0]?.fiberMode ?? "SM",
    txPowerDbm: transceivers[0]?.txPowerDbm ? String(transceivers[0].txPowerDbm) : "",
    rxPowerDbm: transceivers[0]?.rxPowerDbm ? String(transceivers[0].rxPowerDbm) : "",
    status: transceivers[0]?.status ?? "active"
  });
  const [patchForm, setPatchForm] = useState({
    code: "",
    aDeviceName: "",
    aInterfaceName: "",
    zDeviceName: "",
    zInterfaceName: "",
    circuitCode: "",
    aEndpoint: "",
    zEndpoint: "",
    mediaType: "fiber",
    connectorA: "LC/UPC",
    connectorZ: "LC/UPC",
    lengthMeters: "",
    fiberMode: "SM",
    color: "amarillo",
    status: "active"
  });
  const [selectedPatchcordId, setSelectedPatchcordId] = useState(patchcords[0]?.id ?? "");
  const selectedPatchcord = patchcords.find((patchcord) => patchcord.id === selectedPatchcordId);
  const [patchEditForm, setPatchEditForm] = useState({
    code: patchcords[0]?.code ?? "",
    aDeviceName: patchcords[0]?.aDevice ?? "",
    aInterfaceName: "",
    zDeviceName: patchcords[0]?.zDevice ?? "",
    zInterfaceName: "",
    circuitCode: patchcords[0]?.circuitCode ?? "",
    aEndpoint: patchcords[0]?.aEndpoint ?? "",
    zEndpoint: patchcords[0]?.zEndpoint ?? "",
    mediaType: patchcords[0]?.mediaType ?? "fiber",
    connectorA: patchcords[0]?.connectorA ?? "LC/UPC",
    connectorZ: patchcords[0]?.connectorZ ?? "LC/UPC",
    lengthMeters: patchcords[0]?.lengthMeters ? String(patchcords[0].lengthMeters) : "",
    fiberMode: patchcords[0]?.fiberMode ?? "SM",
    color: patchcords[0]?.color ?? "amarillo",
    status: patchcords[0]?.status ?? "active"
  });
  const [assetForm, setAssetForm] = useState({
    siteCode: "AQP-POP",
    rackCode: "RACK-AQP-01",
    name: "",
    assetType: "ODF",
    units: "1",
    ports: "",
    status: "active",
    notes: ""
  });
  const [selectedDatacenterAssetId, setSelectedDatacenterAssetId] = useState(assets[0]?.id ?? "");
  const selectedDatacenterAsset = assets.find((asset) => asset.id === selectedDatacenterAssetId);
  const [assetEditForm, setAssetEditForm] = useState({
    siteCode: assets[0]?.siteCode ?? "AQP-POP",
    rackCode: assets[0]?.rackCode ?? "",
    name: assets[0]?.name ?? "",
    assetType: assets[0]?.assetType ?? "ODF",
    units: assets[0]?.units ? String(assets[0].units) : "",
    ports: assets[0]?.ports ? String(assets[0].ports) : "",
    status: assets[0]?.status ?? "active",
    notes: assets[0]?.notes ?? ""
  });
  const physicalRecords = [
    ...capacities.map((item) => ({ id: item.id, kind: "provider-capacities", label: `${item.providerCode} ${item.serviceType}`, status: item.status })),
    ...fiberSpans.map((item) => ({ id: item.id, kind: "fiber-spans", label: `${item.code} ${item.aSite}-${item.zSite}`, status: item.status })),
    ...fiberStrands.map((item) => ({ id: item.id, kind: "fiber-strands", label: `${item.spanCode} hilo ${item.strandNumber}`, status: item.status })),
    ...transceivers.map((item) => ({ id: item.id, kind: "transceivers", label: `${item.device} ${item.interface}`, status: item.status })),
    ...patchcords.map((item) => ({ id: item.id, kind: "patchcords", label: `${item.code} ${item.aEndpoint}`, status: item.status })),
    ...assets.map((item) => ({ id: item.id, kind: "datacenter-assets", label: `${item.siteCode} ${item.name}`, status: item.status }))
  ];
  const [operationForm, setOperationForm] = useState({
    recordKey: physicalRecords[0] ? `${physicalRecords[0].kind}:${physicalRecords[0].id}` : "",
    status: physicalRecords[0]?.status ?? "active"
  });
  const selectedRecord = physicalRecords.find((item) => `${item.kind}:${item.id}` === operationForm.recordKey);
  const totalContracted = capacities.reduce((sum, item) => sum + item.committedMbps, 0);
  const totalUsed = capacities.reduce((sum, item) => sum + item.usedMbps, 0);
  const totalFibers = fiberSpans.reduce((sum, item) => sum + item.fiberCount, 0);
  const usedFibers = fiberSpans.reduce((sum, item) => sum + item.usedFibers, 0);
  const degradedOptics = transceivers.filter((item) => item.status !== "active").length;
  const utilization = totalContracted > 0 ? Math.round((totalUsed / totalContracted) * 100) : 0;

  useEffect(() => {
    const currentCapacityExists = capacities.some((capacity) => capacity.id === selectedCapacityId);
    if (!currentCapacityExists) {
      setSelectedCapacityId(capacities[0]?.id ?? "");
    }
  }, [capacities, selectedCapacityId]);

  useEffect(() => {
    if (selectedCapacity) {
      setCapacityEditForm({
        providerCode: selectedCapacity.providerCode,
        contractCode: selectedCapacity.contractCode ?? "",
        serviceType: selectedCapacity.serviceType,
        committedMbps: String(selectedCapacity.committedMbps),
        burstableMbps: selectedCapacity.burstableMbps ? String(selectedCapacity.burstableMbps) : "",
        deliveredMbps: String(selectedCapacity.deliveredMbps),
        usedMbps: String(selectedCapacity.usedMbps),
        billingMode: selectedCapacity.billingMode,
        status: selectedCapacity.status
      });
    }
  }, [selectedCapacity]);

  useEffect(() => {
    const currentSpanExists = fiberSpans.some((span) => span.id === selectedFiberSpanId);
    if (!currentSpanExists) {
      setSelectedFiberSpanId(fiberSpans[0]?.id ?? "");
    }
  }, [fiberSpans, selectedFiberSpanId]);

  useEffect(() => {
    if (selectedFiberSpan) {
      setSpanEditForm({
        code: selectedFiberSpan.code,
        aSite: selectedFiberSpan.aSite,
        zSite: selectedFiberSpan.zSite,
        providerCode: selectedFiberSpan.providerCode ?? "",
        cableType: selectedFiberSpan.cableType,
        fiberCount: String(selectedFiberSpan.fiberCount),
        usedFibers: String(selectedFiberSpan.usedFibers),
        distanceKm: selectedFiberSpan.distanceKm ? String(selectedFiberSpan.distanceKm) : "",
        status: selectedFiberSpan.status,
        notes: selectedFiberSpan.notes ?? ""
      });
    }
  }, [selectedFiberSpan]);

  useEffect(() => {
    const currentStrandExists = fiberStrands.some((strand) => strand.id === selectedFiberStrandId);
    if (!currentStrandExists) {
      setSelectedFiberStrandId(fiberStrands[0]?.id ?? "");
    }
  }, [fiberStrands, selectedFiberStrandId]);

  useEffect(() => {
    if (selectedFiberStrand) {
      setStrandEditForm({
        spanCode: selectedFiberStrand.spanCode,
        strandNumber: String(selectedFiberStrand.strandNumber),
        tubeColor: selectedFiberStrand.tubeColor ?? "",
        fiberColor: selectedFiberStrand.fiberColor ?? "",
        status: selectedFiberStrand.status,
        service: selectedFiberStrand.service ?? "",
        circuitCode: selectedFiberStrand.circuitCode ?? "",
        aTermination: selectedFiberStrand.aTermination ?? "",
        zTermination: selectedFiberStrand.zTermination ?? ""
      });
    }
  }, [selectedFiberStrand]);

  useEffect(() => {
    const currentTransceiverExists = transceivers.some((transceiver) => transceiver.id === selectedTransceiverId);
    if (!currentTransceiverExists) {
      setSelectedTransceiverId(transceivers[0]?.id ?? "");
    }
  }, [selectedTransceiverId, transceivers]);

  useEffect(() => {
    if (selectedTransceiver) {
      setOpticEditForm({
        deviceName: selectedTransceiver.device,
        interfaceName: selectedTransceiver.interface,
        vendor: selectedTransceiver.vendor,
        partNumber: selectedTransceiver.partNumber,
        serialNumber: selectedTransceiver.serialNumber ?? "",
        formFactor: selectedTransceiver.formFactor,
        speedMbps: String(selectedTransceiver.speedMbps),
        wavelengthNm: selectedTransceiver.wavelengthNm ? String(selectedTransceiver.wavelengthNm) : "",
        reachKm: selectedTransceiver.reachKm ? String(selectedTransceiver.reachKm) : "",
        connectorType: selectedTransceiver.connectorType,
        fiberMode: selectedTransceiver.fiberMode,
        txPowerDbm: selectedTransceiver.txPowerDbm ? String(selectedTransceiver.txPowerDbm) : "",
        rxPowerDbm: selectedTransceiver.rxPowerDbm ? String(selectedTransceiver.rxPowerDbm) : "",
        status: selectedTransceiver.status
      });
    }
  }, [selectedTransceiver]);

  useEffect(() => {
    const currentPatchcordExists = patchcords.some((patchcord) => patchcord.id === selectedPatchcordId);
    if (!currentPatchcordExists) {
      setSelectedPatchcordId(patchcords[0]?.id ?? "");
    }
  }, [patchcords, selectedPatchcordId]);

  useEffect(() => {
    if (selectedPatchcord) {
      setPatchEditForm({
        code: selectedPatchcord.code,
        aDeviceName: selectedPatchcord.aDevice ?? "",
        aInterfaceName: "",
        zDeviceName: selectedPatchcord.zDevice ?? "",
        zInterfaceName: "",
        circuitCode: selectedPatchcord.circuitCode ?? "",
        aEndpoint: selectedPatchcord.aEndpoint,
        zEndpoint: selectedPatchcord.zEndpoint,
        mediaType: selectedPatchcord.mediaType,
        connectorA: selectedPatchcord.connectorA,
        connectorZ: selectedPatchcord.connectorZ,
        lengthMeters: selectedPatchcord.lengthMeters ? String(selectedPatchcord.lengthMeters) : "",
        fiberMode: selectedPatchcord.fiberMode ?? "",
        color: selectedPatchcord.color ?? "",
        status: selectedPatchcord.status
      });
    }
  }, [selectedPatchcord]);

  useEffect(() => {
    const currentAssetExists = assets.some((asset) => asset.id === selectedDatacenterAssetId);
    if (!currentAssetExists) {
      setSelectedDatacenterAssetId(assets[0]?.id ?? "");
    }
  }, [assets, selectedDatacenterAssetId]);

  useEffect(() => {
    if (selectedDatacenterAsset) {
      setAssetEditForm({
        siteCode: selectedDatacenterAsset.siteCode,
        rackCode: selectedDatacenterAsset.rackCode ?? "",
        name: selectedDatacenterAsset.name,
        assetType: selectedDatacenterAsset.assetType,
        units: selectedDatacenterAsset.units ? String(selectedDatacenterAsset.units) : "",
        ports: selectedDatacenterAsset.ports ? String(selectedDatacenterAsset.ports) : "",
        status: selectedDatacenterAsset.status,
        notes: selectedDatacenterAsset.notes ?? ""
      });
    }
  }, [selectedDatacenterAsset]);

  async function savePhysical(event: FormEvent<HTMLFormElement>, path: string, payload: Record<string, unknown>, reset: () => void) {
    event.preventDefault();
    setFormState("saving");

    try {
      await apiPost(path, { ...payload, reason: "Alta desde modulo Datacenter" });
      reset();
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updatePhysicalStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRecord) return;
    setFormState("saving");

    try {
      await apiPatch(`/physical/${selectedRecord.kind}/${selectedRecord.id}/status`, {
        status: operationForm.status,
        reason: "Cambio de estado desde Datacenter"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateProviderCapacity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCapacity) return;
    setFormState("saving");

    try {
      await apiPatch(`/physical/provider-capacities/${selectedCapacity.id}`, {
        providerCode: capacityEditForm.providerCode,
        contractCode: capacityEditForm.contractCode || null,
        serviceType: capacityEditForm.serviceType,
        committedMbps: Number(capacityEditForm.committedMbps),
        burstableMbps: num(capacityEditForm.burstableMbps),
        deliveredMbps: Number(capacityEditForm.deliveredMbps),
        usedMbps: num(capacityEditForm.usedMbps),
        billingMode: capacityEditForm.billingMode,
        status: capacityEditForm.status,
        reason: "Edicion de capacidad contratada desde Datacenter"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateFiberSpan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFiberSpan) return;
    setFormState("saving");

    try {
      await apiPatch(`/physical/fiber-spans/${selectedFiberSpan.id}`, {
        code: spanEditForm.code,
        aSite: spanEditForm.aSite,
        zSite: spanEditForm.zSite,
        providerCode: spanEditForm.providerCode || null,
        cableType: spanEditForm.cableType,
        fiberCount: Number(spanEditForm.fiberCount),
        usedFibers: num(spanEditForm.usedFibers),
        distanceKm: num(spanEditForm.distanceKm),
        status: spanEditForm.status,
        notes: spanEditForm.notes || null,
        reason: "Edicion de tramo de fibra desde Datacenter"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateFiberStrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFiberStrand) return;
    setFormState("saving");

    try {
      await apiPatch(`/physical/fiber-strands/${selectedFiberStrand.id}`, {
        spanCode: strandEditForm.spanCode,
        strandNumber: Number(strandEditForm.strandNumber),
        tubeColor: strandEditForm.tubeColor || null,
        fiberColor: strandEditForm.fiberColor || null,
        status: strandEditForm.status,
        service: strandEditForm.service || null,
        circuitCode: strandEditForm.circuitCode || null,
        aTermination: strandEditForm.aTermination || null,
        zTermination: strandEditForm.zTermination || null,
        reason: "Edicion de hilo de fibra desde Datacenter"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateTransceiver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTransceiver) return;
    setFormState("saving");

    try {
      await apiPatch(`/physical/transceivers/${selectedTransceiver.id}`, {
        deviceName: opticEditForm.deviceName,
        interfaceName: opticEditForm.interfaceName,
        vendor: opticEditForm.vendor,
        partNumber: opticEditForm.partNumber,
        serialNumber: opticEditForm.serialNumber || null,
        formFactor: opticEditForm.formFactor,
        speedMbps: Number(opticEditForm.speedMbps),
        wavelengthNm: num(opticEditForm.wavelengthNm),
        reachKm: num(opticEditForm.reachKm),
        connectorType: opticEditForm.connectorType,
        fiberMode: opticEditForm.fiberMode,
        txPowerDbm: num(opticEditForm.txPowerDbm),
        rxPowerDbm: num(opticEditForm.rxPowerDbm),
        status: opticEditForm.status,
        reason: "Edicion de transceiver desde Datacenter"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updatePatchcord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatchcord) return;
    setFormState("saving");

    try {
      await apiPatch(`/physical/patchcords/${selectedPatchcord.id}`, {
        code: patchEditForm.code,
        aDeviceName: patchEditForm.aDeviceName || null,
        aInterfaceName: patchEditForm.aInterfaceName || null,
        zDeviceName: patchEditForm.zDeviceName || null,
        zInterfaceName: patchEditForm.zInterfaceName || null,
        circuitCode: patchEditForm.circuitCode || null,
        aEndpoint: patchEditForm.aEndpoint,
        zEndpoint: patchEditForm.zEndpoint,
        mediaType: patchEditForm.mediaType,
        connectorA: patchEditForm.connectorA,
        connectorZ: patchEditForm.connectorZ,
        lengthMeters: num(patchEditForm.lengthMeters),
        fiberMode: patchEditForm.fiberMode || null,
        color: patchEditForm.color || null,
        status: patchEditForm.status,
        reason: "Edicion de patchcord desde Datacenter"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateDatacenterAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDatacenterAsset) return;
    setFormState("saving");

    try {
      await apiPatch(`/physical/datacenter-assets/${selectedDatacenterAsset.id}`, {
        siteCode: assetEditForm.siteCode,
        rackCode: assetEditForm.rackCode || null,
        name: assetEditForm.name,
        assetType: assetEditForm.assetType,
        units: num(assetEditForm.units),
        ports: num(assetEditForm.ports),
        status: assetEditForm.status,
        notes: assetEditForm.notes || null,
        reason: "Edicion de activo datacenter desde Datacenter"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deletePhysicalRecord() {
    if (!selectedRecord) return;
    setFormState("saving");

    try {
      await apiDelete(`/physical/${selectedRecord.kind}/${selectedRecord.id}`);
      setOperationForm({ recordKey: "", status: "active" });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  const num = (value: string) => (value ? Number(value) : null);

  return (
    <ModulePage eyebrow="Datacenter / planta fisica" title="Capacidad, fibra, optica, patchcords y cross-connects">
      <section className="metricGrid compactMetrics">
        <Metric label="Contratado" value={`${formatCapacity(totalContracted)}`} tone="neutral" />
        <Metric label="Uso proveedor" value={`${utilization}%`} tone={utilization > 80 ? "warning" : "neutral"} />
        <Metric label="Hilos usados" value={`${usedFibers}/${totalFibers}`} tone="neutral" />
        <Metric label="Opticas alertadas" value={String(degradedOptics)} tone={degradedOptics > 0 ? "warning" : "neutral"} />
      </section>
      <section className="physicalForms">
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Alta rapida</p><h2>Capacidad proveedor</h2></div></div>
          <form className="quickForm" onSubmit={(event) => void savePhysical(event, "/physical/provider-capacities", {
            providerCode: capacityForm.providerCode,
            contractCode: capacityForm.contractCode || null,
            serviceType: capacityForm.serviceType,
            committedMbps: Number(capacityForm.committedMbps),
            burstableMbps: num(capacityForm.burstableMbps),
            deliveredMbps: Number(capacityForm.deliveredMbps),
            usedMbps: num(capacityForm.usedMbps),
            billingMode: capacityForm.billingMode
          }, () => setCapacityForm((current) => ({ ...current, usedMbps: "0" })))}>
            <label>Proveedor<input onChange={(event) => setCapacityForm((current) => ({ ...current, providerCode: event.target.value.toUpperCase() }))} value={capacityForm.providerCode} /></label>
            <label>Contrato<input onChange={(event) => setCapacityForm((current) => ({ ...current, contractCode: event.target.value }))} value={capacityForm.contractCode} /></label>
            <label className="wideField">Servicio<input onChange={(event) => setCapacityForm((current) => ({ ...current, serviceType: event.target.value }))} value={capacityForm.serviceType} /></label>
            <label>Commit Mbps<input inputMode="numeric" onChange={(event) => setCapacityForm((current) => ({ ...current, committedMbps: event.target.value }))} value={capacityForm.committedMbps} /></label>
            <label>Entregado Mbps<input inputMode="numeric" onChange={(event) => setCapacityForm((current) => ({ ...current, deliveredMbps: event.target.value }))} value={capacityForm.deliveredMbps} /></label>
            <label>Uso Mbps<input inputMode="numeric" onChange={(event) => setCapacityForm((current) => ({ ...current, usedMbps: event.target.value }))} value={capacityForm.usedMbps} /></label>
            <label>Billing<input onChange={(event) => setCapacityForm((current) => ({ ...current, billingMode: event.target.value }))} value={capacityForm.billingMode} /></label>
            <button type="submit">Guardar capacidad</button>
          </form>
          {selectedCapacity && (
            <form className="quickForm" onSubmit={updateProviderCapacity}>
              <p className="eyebrow">Editar capacidad</p>
              <label className="wideField">Registro<select onChange={(event) => setSelectedCapacityId(event.target.value)} value={selectedCapacityId}>
                {capacities.map((capacity) => <option key={capacity.id} value={capacity.id}>{capacity.providerCode} - {capacity.serviceType}</option>)}
              </select></label>
              <label>Proveedor<input onChange={(event) => setCapacityEditForm((current) => ({ ...current, providerCode: event.target.value.toUpperCase() }))} value={capacityEditForm.providerCode} /></label>
              <label>Contrato<input onChange={(event) => setCapacityEditForm((current) => ({ ...current, contractCode: event.target.value.toUpperCase() }))} value={capacityEditForm.contractCode} /></label>
              <label className="wideField">Servicio<input onChange={(event) => setCapacityEditForm((current) => ({ ...current, serviceType: event.target.value }))} value={capacityEditForm.serviceType} /></label>
              <label>Commit Mbps<input inputMode="numeric" onChange={(event) => setCapacityEditForm((current) => ({ ...current, committedMbps: event.target.value }))} value={capacityEditForm.committedMbps} /></label>
              <label>Burst Mbps<input inputMode="numeric" onChange={(event) => setCapacityEditForm((current) => ({ ...current, burstableMbps: event.target.value }))} value={capacityEditForm.burstableMbps} /></label>
              <label>Entregado Mbps<input inputMode="numeric" onChange={(event) => setCapacityEditForm((current) => ({ ...current, deliveredMbps: event.target.value }))} value={capacityEditForm.deliveredMbps} /></label>
              <label>Uso Mbps<input inputMode="numeric" onChange={(event) => setCapacityEditForm((current) => ({ ...current, usedMbps: event.target.value }))} value={capacityEditForm.usedMbps} /></label>
              <label>Billing<input onChange={(event) => setCapacityEditForm((current) => ({ ...current, billingMode: event.target.value }))} value={capacityEditForm.billingMode} /></label>
              <label>Estado<select onChange={(event) => setCapacityEditForm((current) => ({ ...current, status: event.target.value }))} value={capacityEditForm.status}>
                <option value="active">active</option>
                <option value="planned">planned</option>
                <option value="degraded">degraded</option>
                <option value="down">down</option>
                <option value="retired">retired</option>
              </select></label>
              <button disabled={!capacityEditForm.providerCode || !capacityEditForm.serviceType || !capacityEditForm.committedMbps || !capacityEditForm.deliveredMbps} type="submit">Guardar cambios</button>
            </form>
          )}
        </div>

        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Alta rapida</p><h2>Tramo de fibra</h2></div></div>
          <form className="quickForm" onSubmit={(event) => void savePhysical(event, "/physical/fiber-spans", {
            code: spanForm.code,
            aSite: spanForm.aSite,
            zSite: spanForm.zSite,
            providerCode: spanForm.providerCode || null,
            cableType: spanForm.cableType,
            fiberCount: Number(spanForm.fiberCount),
            usedFibers: num(spanForm.usedFibers),
            distanceKm: num(spanForm.distanceKm),
            status: spanForm.status
          }, () => setSpanForm((current) => ({ ...current, code: "", distanceKm: "" })))}>
            <label>Codigo<input onChange={(event) => setSpanForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={spanForm.code} /></label>
            <label>Proveedor<input onChange={(event) => setSpanForm((current) => ({ ...current, providerCode: event.target.value.toUpperCase() }))} value={spanForm.providerCode} /></label>
            <label>Sede A<input onChange={(event) => setSpanForm((current) => ({ ...current, aSite: event.target.value.toUpperCase() }))} value={spanForm.aSite} /></label>
            <label>Sede Z<input onChange={(event) => setSpanForm((current) => ({ ...current, zSite: event.target.value.toUpperCase() }))} value={spanForm.zSite} /></label>
            <label>Tipo cable<input onChange={(event) => setSpanForm((current) => ({ ...current, cableType: event.target.value }))} value={spanForm.cableType} /></label>
            <label>Hilos<input inputMode="numeric" onChange={(event) => setSpanForm((current) => ({ ...current, fiberCount: event.target.value }))} value={spanForm.fiberCount} /></label>
            <label>Usados<input inputMode="numeric" onChange={(event) => setSpanForm((current) => ({ ...current, usedFibers: event.target.value }))} value={spanForm.usedFibers} /></label>
            <label>Km<input inputMode="decimal" onChange={(event) => setSpanForm((current) => ({ ...current, distanceKm: event.target.value }))} value={spanForm.distanceKm} /></label>
            <button disabled={!spanForm.code} type="submit">Guardar tramo</button>
          </form>
          {selectedFiberSpan && (
            <form className="quickForm" onSubmit={updateFiberSpan}>
              <p className="eyebrow">Editar tramo</p>
              <label className="wideField">Tramo<select onChange={(event) => setSelectedFiberSpanId(event.target.value)} value={selectedFiberSpanId}>
                {fiberSpans.map((span) => <option key={span.id} value={span.id}>{span.code} - {span.aSite}/{span.zSite}</option>)}
              </select></label>
              <label>Codigo<input onChange={(event) => setSpanEditForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={spanEditForm.code} /></label>
              <label>Sede A<input onChange={(event) => setSpanEditForm((current) => ({ ...current, aSite: event.target.value.toUpperCase() }))} value={spanEditForm.aSite} /></label>
              <label>Sede Z<input onChange={(event) => setSpanEditForm((current) => ({ ...current, zSite: event.target.value.toUpperCase() }))} value={spanEditForm.zSite} /></label>
              <label>Proveedor<input onChange={(event) => setSpanEditForm((current) => ({ ...current, providerCode: event.target.value.toUpperCase() }))} value={spanEditForm.providerCode} /></label>
              <label className="wideField">Cable<input onChange={(event) => setSpanEditForm((current) => ({ ...current, cableType: event.target.value }))} value={spanEditForm.cableType} /></label>
              <label>Hilos<input inputMode="numeric" onChange={(event) => setSpanEditForm((current) => ({ ...current, fiberCount: event.target.value }))} value={spanEditForm.fiberCount} /></label>
              <label>Usados<input inputMode="numeric" onChange={(event) => setSpanEditForm((current) => ({ ...current, usedFibers: event.target.value }))} value={spanEditForm.usedFibers} /></label>
              <label>Km<input inputMode="decimal" onChange={(event) => setSpanEditForm((current) => ({ ...current, distanceKm: event.target.value }))} value={spanEditForm.distanceKm} /></label>
              <label>Estado<select onChange={(event) => setSpanEditForm((current) => ({ ...current, status: event.target.value }))} value={spanEditForm.status}>
                <option value="active">active</option>
                <option value="planned">planned</option>
                <option value="degraded">degraded</option>
                <option value="down">down</option>
                <option value="retired">retired</option>
              </select></label>
              <label className="wideField">Notas<input onChange={(event) => setSpanEditForm((current) => ({ ...current, notes: event.target.value }))} value={spanEditForm.notes} /></label>
              <button disabled={!spanEditForm.code || !spanEditForm.aSite || !spanEditForm.zSite || !spanEditForm.fiberCount} type="submit">Guardar tramo</button>
            </form>
          )}
        </div>

        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Alta rapida</p><h2>Hilo de fibra</h2></div></div>
          <form className="quickForm" onSubmit={(event) => void savePhysical(event, "/physical/fiber-strands", {
            spanCode: strandForm.spanCode,
            strandNumber: Number(strandForm.strandNumber),
            tubeColor: strandForm.tubeColor || null,
            fiberColor: strandForm.fiberColor || null,
            status: strandForm.status,
            service: strandForm.service || null,
            circuitCode: strandForm.circuitCode || null,
            aTermination: strandForm.aTermination || null,
            zTermination: strandForm.zTermination || null
          }, () => setStrandForm((current) => ({ ...current, strandNumber: "", service: "" })))}>
            <label className="wideField">Tramo<select onChange={(event) => setStrandForm((current) => ({ ...current, spanCode: event.target.value }))} value={strandForm.spanCode}>
              {fiberSpans.map((span) => <option key={span.id} value={span.code}>{span.code}</option>)}
            </select></label>
            <label>Hilo<input inputMode="numeric" onChange={(event) => setStrandForm((current) => ({ ...current, strandNumber: event.target.value }))} value={strandForm.strandNumber} /></label>
            <label>Estado<select onChange={(event) => setStrandForm((current) => ({ ...current, status: event.target.value }))} value={strandForm.status}><option value="available">available</option><option value="reserved">reserved</option><option value="used">used</option><option value="faulty">faulty</option></select></label>
            <label>Tubo<input onChange={(event) => setStrandForm((current) => ({ ...current, tubeColor: event.target.value }))} value={strandForm.tubeColor} /></label>
            <label>Color<input onChange={(event) => setStrandForm((current) => ({ ...current, fiberColor: event.target.value }))} value={strandForm.fiberColor} /></label>
            <label className="wideField">Servicio<input onChange={(event) => setStrandForm((current) => ({ ...current, service: event.target.value }))} value={strandForm.service} /></label>
            <label>A<input onChange={(event) => setStrandForm((current) => ({ ...current, aTermination: event.target.value }))} value={strandForm.aTermination} /></label>
            <label>Z<input onChange={(event) => setStrandForm((current) => ({ ...current, zTermination: event.target.value }))} value={strandForm.zTermination} /></label>
            <button disabled={!strandForm.spanCode || !strandForm.strandNumber} type="submit">Guardar hilo</button>
          </form>
          {selectedFiberStrand && (
            <form className="quickForm" onSubmit={updateFiberStrand}>
              <p className="eyebrow">Editar hilo</p>
              <label className="wideField">Hilo<select onChange={(event) => setSelectedFiberStrandId(event.target.value)} value={selectedFiberStrandId}>
                {fiberStrands.map((strand) => <option key={strand.id} value={strand.id}>{strand.spanCode} hilo {strand.strandNumber}</option>)}
              </select></label>
              <label className="wideField">Tramo<select onChange={(event) => setStrandEditForm((current) => ({ ...current, spanCode: event.target.value }))} value={strandEditForm.spanCode}>
                {fiberSpans.map((span) => <option key={span.id} value={span.code}>{span.code}</option>)}
              </select></label>
              <label>Hilo<input inputMode="numeric" onChange={(event) => setStrandEditForm((current) => ({ ...current, strandNumber: event.target.value }))} value={strandEditForm.strandNumber} /></label>
              <label>Estado<select onChange={(event) => setStrandEditForm((current) => ({ ...current, status: event.target.value }))} value={strandEditForm.status}>
                <option value="available">available</option>
                <option value="reserved">reserved</option>
                <option value="used">used</option>
                <option value="faulty">faulty</option>
              </select></label>
              <label>Tubo<input onChange={(event) => setStrandEditForm((current) => ({ ...current, tubeColor: event.target.value }))} value={strandEditForm.tubeColor} /></label>
              <label>Color<input onChange={(event) => setStrandEditForm((current) => ({ ...current, fiberColor: event.target.value }))} value={strandEditForm.fiberColor} /></label>
              <label>Circuito<input onChange={(event) => setStrandEditForm((current) => ({ ...current, circuitCode: event.target.value.toUpperCase() }))} value={strandEditForm.circuitCode} /></label>
              <label className="wideField">Servicio<input onChange={(event) => setStrandEditForm((current) => ({ ...current, service: event.target.value }))} value={strandEditForm.service} /></label>
              <label>A<input onChange={(event) => setStrandEditForm((current) => ({ ...current, aTermination: event.target.value }))} value={strandEditForm.aTermination} /></label>
              <label>Z<input onChange={(event) => setStrandEditForm((current) => ({ ...current, zTermination: event.target.value }))} value={strandEditForm.zTermination} /></label>
              <button disabled={!strandEditForm.spanCode || !strandEditForm.strandNumber} type="submit">Guardar hilo</button>
            </form>
          )}
        </div>

        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Alta rapida</p><h2>Optica por puerto</h2></div></div>
          <form className="quickForm" onSubmit={(event) => void savePhysical(event, "/physical/transceivers", {
            deviceName: opticForm.deviceName,
            interfaceName: opticForm.interfaceName,
            vendor: opticForm.vendor,
            partNumber: opticForm.partNumber,
            serialNumber: opticForm.serialNumber || null,
            formFactor: opticForm.formFactor,
            speedMbps: Number(opticForm.speedMbps),
            wavelengthNm: num(opticForm.wavelengthNm),
            reachKm: num(opticForm.reachKm),
            connectorType: opticForm.connectorType,
            fiberMode: opticForm.fiberMode,
            txPowerDbm: num(opticForm.txPowerDbm),
            rxPowerDbm: num(opticForm.rxPowerDbm),
            status: opticForm.status
          }, () => setOpticForm((current) => ({ ...current, vendor: "", partNumber: "", serialNumber: "" })))}>
            <label>Equipo<input onChange={(event) => setOpticForm((current) => ({ ...current, deviceName: event.target.value }))} value={opticForm.deviceName} /></label>
            <label>Puerto<input onChange={(event) => setOpticForm((current) => ({ ...current, interfaceName: event.target.value }))} value={opticForm.interfaceName} /></label>
            <label>Vendor<input onChange={(event) => setOpticForm((current) => ({ ...current, vendor: event.target.value }))} value={opticForm.vendor} /></label>
            <label>Parte<input onChange={(event) => setOpticForm((current) => ({ ...current, partNumber: event.target.value }))} value={opticForm.partNumber} /></label>
            <label>Factor<input onChange={(event) => setOpticForm((current) => ({ ...current, formFactor: event.target.value }))} value={opticForm.formFactor} /></label>
            <label>Mbps<input inputMode="numeric" onChange={(event) => setOpticForm((current) => ({ ...current, speedMbps: event.target.value }))} value={opticForm.speedMbps} /></label>
            <label>Rx dBm<input inputMode="decimal" onChange={(event) => setOpticForm((current) => ({ ...current, rxPowerDbm: event.target.value }))} value={opticForm.rxPowerDbm} /></label>
            <label>Estado<select onChange={(event) => setOpticForm((current) => ({ ...current, status: event.target.value }))} value={opticForm.status}><option value="active">active</option><option value="degraded">degraded</option><option value="faulty">faulty</option></select></label>
            <button disabled={!opticForm.deviceName || !opticForm.interfaceName || !opticForm.vendor || !opticForm.partNumber} type="submit">Guardar optica</button>
          </form>
          {selectedTransceiver && (
            <form className="quickForm" onSubmit={updateTransceiver}>
              <p className="eyebrow">Editar optica</p>
              <label className="wideField">Optica<select onChange={(event) => setSelectedTransceiverId(event.target.value)} value={selectedTransceiverId}>
                {transceivers.map((optic) => <option key={optic.id} value={optic.id}>{optic.device} - {optic.interface}</option>)}
              </select></label>
              <label>Equipo<input onChange={(event) => setOpticEditForm((current) => ({ ...current, deviceName: event.target.value }))} value={opticEditForm.deviceName} /></label>
              <label>Puerto<input onChange={(event) => setOpticEditForm((current) => ({ ...current, interfaceName: event.target.value }))} value={opticEditForm.interfaceName} /></label>
              <label>Vendor<input onChange={(event) => setOpticEditForm((current) => ({ ...current, vendor: event.target.value }))} value={opticEditForm.vendor} /></label>
              <label>Parte<input onChange={(event) => setOpticEditForm((current) => ({ ...current, partNumber: event.target.value }))} value={opticEditForm.partNumber} /></label>
              <label>Serial<input onChange={(event) => setOpticEditForm((current) => ({ ...current, serialNumber: event.target.value }))} value={opticEditForm.serialNumber} /></label>
              <label>Factor<input onChange={(event) => setOpticEditForm((current) => ({ ...current, formFactor: event.target.value }))} value={opticEditForm.formFactor} /></label>
              <label>Mbps<input inputMode="numeric" onChange={(event) => setOpticEditForm((current) => ({ ...current, speedMbps: event.target.value }))} value={opticEditForm.speedMbps} /></label>
              <label>nm<input inputMode="numeric" onChange={(event) => setOpticEditForm((current) => ({ ...current, wavelengthNm: event.target.value }))} value={opticEditForm.wavelengthNm} /></label>
              <label>Km<input inputMode="decimal" onChange={(event) => setOpticEditForm((current) => ({ ...current, reachKm: event.target.value }))} value={opticEditForm.reachKm} /></label>
              <label>Conector<input onChange={(event) => setOpticEditForm((current) => ({ ...current, connectorType: event.target.value }))} value={opticEditForm.connectorType} /></label>
              <label>Modo<input onChange={(event) => setOpticEditForm((current) => ({ ...current, fiberMode: event.target.value }))} value={opticEditForm.fiberMode} /></label>
              <label>Tx dBm<input inputMode="decimal" onChange={(event) => setOpticEditForm((current) => ({ ...current, txPowerDbm: event.target.value }))} value={opticEditForm.txPowerDbm} /></label>
              <label>Rx dBm<input inputMode="decimal" onChange={(event) => setOpticEditForm((current) => ({ ...current, rxPowerDbm: event.target.value }))} value={opticEditForm.rxPowerDbm} /></label>
              <label>Estado<select onChange={(event) => setOpticEditForm((current) => ({ ...current, status: event.target.value }))} value={opticEditForm.status}>
                <option value="active">active</option>
                <option value="degraded">degraded</option>
                <option value="faulty">faulty</option>
                <option value="retired">retired</option>
              </select></label>
              <button disabled={!opticEditForm.deviceName || !opticEditForm.interfaceName || !opticEditForm.vendor || !opticEditForm.partNumber || !opticEditForm.speedMbps} type="submit">Guardar optica</button>
            </form>
          )}
        </div>

        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Alta rapida</p><h2>Patchcord / cross-connect</h2></div></div>
          <form className="quickForm" onSubmit={(event) => void savePhysical(event, "/physical/patchcords", {
            code: patchForm.code,
            aDeviceName: patchForm.aDeviceName || null,
            aInterfaceName: patchForm.aInterfaceName || null,
            zDeviceName: patchForm.zDeviceName || null,
            zInterfaceName: patchForm.zInterfaceName || null,
            circuitCode: patchForm.circuitCode || null,
            aEndpoint: patchForm.aEndpoint,
            zEndpoint: patchForm.zEndpoint,
            mediaType: patchForm.mediaType,
            connectorA: patchForm.connectorA,
            connectorZ: patchForm.connectorZ,
            lengthMeters: num(patchForm.lengthMeters),
            fiberMode: patchForm.fiberMode || null,
            color: patchForm.color || null,
            status: patchForm.status
          }, () => setPatchForm((current) => ({ ...current, code: "", aEndpoint: "", zEndpoint: "" })))}>
            <label>Codigo<input onChange={(event) => setPatchForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={patchForm.code} /></label>
            <label>Medio<select onChange={(event) => setPatchForm((current) => ({ ...current, mediaType: event.target.value }))} value={patchForm.mediaType}><option value="fiber">fiber</option><option value="utp">utp</option><option value="dac">dac</option></select></label>
            <label className="wideField">Extremo A<input onChange={(event) => setPatchForm((current) => ({ ...current, aEndpoint: event.target.value }))} value={patchForm.aEndpoint} /></label>
            <label className="wideField">Extremo Z<input onChange={(event) => setPatchForm((current) => ({ ...current, zEndpoint: event.target.value }))} value={patchForm.zEndpoint} /></label>
            <label>Conector A<input onChange={(event) => setPatchForm((current) => ({ ...current, connectorA: event.target.value }))} value={patchForm.connectorA} /></label>
            <label>Conector Z<input onChange={(event) => setPatchForm((current) => ({ ...current, connectorZ: event.target.value }))} value={patchForm.connectorZ} /></label>
            <label>Largo m<input inputMode="decimal" onChange={(event) => setPatchForm((current) => ({ ...current, lengthMeters: event.target.value }))} value={patchForm.lengthMeters} /></label>
            <label>Circuito<input onChange={(event) => setPatchForm((current) => ({ ...current, circuitCode: event.target.value }))} value={patchForm.circuitCode} /></label>
            <button disabled={!patchForm.code || !patchForm.aEndpoint || !patchForm.zEndpoint} type="submit">Guardar patchcord</button>
          </form>
          {selectedPatchcord && (
            <form className="quickForm" onSubmit={updatePatchcord}>
              <p className="eyebrow">Editar patchcord</p>
              <label className="wideField">Patchcord<select onChange={(event) => setSelectedPatchcordId(event.target.value)} value={selectedPatchcordId}>
                {patchcords.map((patchcord) => <option key={patchcord.id} value={patchcord.id}>{patchcord.code} - {patchcord.aEndpoint}</option>)}
              </select></label>
              <label>Codigo<input onChange={(event) => setPatchEditForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={patchEditForm.code} /></label>
              <label>Medio<select onChange={(event) => setPatchEditForm((current) => ({ ...current, mediaType: event.target.value }))} value={patchEditForm.mediaType}>
                <option value="fiber">fiber</option>
                <option value="utp">utp</option>
                <option value="dac">dac</option>
              </select></label>
              <label>Equipo A<input onChange={(event) => setPatchEditForm((current) => ({ ...current, aDeviceName: event.target.value }))} value={patchEditForm.aDeviceName} /></label>
              <label>Puerto A<input onChange={(event) => setPatchEditForm((current) => ({ ...current, aInterfaceName: event.target.value }))} value={patchEditForm.aInterfaceName} /></label>
              <label>Equipo Z<input onChange={(event) => setPatchEditForm((current) => ({ ...current, zDeviceName: event.target.value }))} value={patchEditForm.zDeviceName} /></label>
              <label>Puerto Z<input onChange={(event) => setPatchEditForm((current) => ({ ...current, zInterfaceName: event.target.value }))} value={patchEditForm.zInterfaceName} /></label>
              <label className="wideField">Extremo A<input onChange={(event) => setPatchEditForm((current) => ({ ...current, aEndpoint: event.target.value }))} value={patchEditForm.aEndpoint} /></label>
              <label className="wideField">Extremo Z<input onChange={(event) => setPatchEditForm((current) => ({ ...current, zEndpoint: event.target.value }))} value={patchEditForm.zEndpoint} /></label>
              <label>Conector A<input onChange={(event) => setPatchEditForm((current) => ({ ...current, connectorA: event.target.value }))} value={patchEditForm.connectorA} /></label>
              <label>Conector Z<input onChange={(event) => setPatchEditForm((current) => ({ ...current, connectorZ: event.target.value }))} value={patchEditForm.connectorZ} /></label>
              <label>Largo m<input inputMode="decimal" onChange={(event) => setPatchEditForm((current) => ({ ...current, lengthMeters: event.target.value }))} value={patchEditForm.lengthMeters} /></label>
              <label>Modo<input onChange={(event) => setPatchEditForm((current) => ({ ...current, fiberMode: event.target.value }))} value={patchEditForm.fiberMode} /></label>
              <label>Color<input onChange={(event) => setPatchEditForm((current) => ({ ...current, color: event.target.value }))} value={patchEditForm.color} /></label>
              <label>Circuito<input onChange={(event) => setPatchEditForm((current) => ({ ...current, circuitCode: event.target.value.toUpperCase() }))} value={patchEditForm.circuitCode} /></label>
              <label>Estado<select onChange={(event) => setPatchEditForm((current) => ({ ...current, status: event.target.value }))} value={patchEditForm.status}>
                <option value="active">active</option>
                <option value="planned">planned</option>
                <option value="degraded">degraded</option>
                <option value="retired">retired</option>
              </select></label>
              <button disabled={!patchEditForm.code || !patchEditForm.aEndpoint || !patchEditForm.zEndpoint} type="submit">Guardar patchcord</button>
            </form>
          )}
        </div>

        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Alta rapida</p><h2>Activo datacenter</h2></div></div>
          <form className="quickForm" onSubmit={(event) => void savePhysical(event, "/physical/datacenter-assets", {
            siteCode: assetForm.siteCode,
            rackCode: assetForm.rackCode || null,
            name: assetForm.name,
            assetType: assetForm.assetType,
            units: num(assetForm.units),
            ports: num(assetForm.ports),
            status: assetForm.status,
            notes: assetForm.notes || null
          }, () => setAssetForm((current) => ({ ...current, name: "", notes: "" })))}>
            <label>Sede<input onChange={(event) => setAssetForm((current) => ({ ...current, siteCode: event.target.value.toUpperCase() }))} value={assetForm.siteCode} /></label>
            <label>Rack<input onChange={(event) => setAssetForm((current) => ({ ...current, rackCode: event.target.value.toUpperCase() }))} value={assetForm.rackCode} /></label>
            <label className="wideField">Nombre<input onChange={(event) => setAssetForm((current) => ({ ...current, name: event.target.value }))} value={assetForm.name} /></label>
            <label>Tipo<input onChange={(event) => setAssetForm((current) => ({ ...current, assetType: event.target.value }))} value={assetForm.assetType} /></label>
            <label>RU<input inputMode="numeric" onChange={(event) => setAssetForm((current) => ({ ...current, units: event.target.value }))} value={assetForm.units} /></label>
            <label>Puertos<input inputMode="numeric" onChange={(event) => setAssetForm((current) => ({ ...current, ports: event.target.value }))} value={assetForm.ports} /></label>
            <label>Estado<select onChange={(event) => setAssetForm((current) => ({ ...current, status: event.target.value }))} value={assetForm.status}><option value="active">active</option><option value="planned">planned</option><option value="degraded">degraded</option></select></label>
            <label className="wideField">Notas<input onChange={(event) => setAssetForm((current) => ({ ...current, notes: event.target.value }))} value={assetForm.notes} /></label>
            <button disabled={!assetForm.siteCode || !assetForm.name} type="submit">Guardar activo</button>
          </form>
          {selectedDatacenterAsset && (
            <form className="quickForm" onSubmit={updateDatacenterAsset}>
              <p className="eyebrow">Editar activo</p>
              <label className="wideField">Activo<select onChange={(event) => setSelectedDatacenterAssetId(event.target.value)} value={selectedDatacenterAssetId}>
                {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.siteCode} - {asset.name}</option>)}
              </select></label>
              <label>Sede<input onChange={(event) => setAssetEditForm((current) => ({ ...current, siteCode: event.target.value.toUpperCase() }))} value={assetEditForm.siteCode} /></label>
              <label>Rack<input onChange={(event) => setAssetEditForm((current) => ({ ...current, rackCode: event.target.value.toUpperCase() }))} value={assetEditForm.rackCode} /></label>
              <label className="wideField">Nombre<input onChange={(event) => setAssetEditForm((current) => ({ ...current, name: event.target.value }))} value={assetEditForm.name} /></label>
              <label>Tipo<input onChange={(event) => setAssetEditForm((current) => ({ ...current, assetType: event.target.value }))} value={assetEditForm.assetType} /></label>
              <label>RU<input inputMode="numeric" onChange={(event) => setAssetEditForm((current) => ({ ...current, units: event.target.value }))} value={assetEditForm.units} /></label>
              <label>Puertos<input inputMode="numeric" onChange={(event) => setAssetEditForm((current) => ({ ...current, ports: event.target.value }))} value={assetEditForm.ports} /></label>
              <label>Estado<select onChange={(event) => setAssetEditForm((current) => ({ ...current, status: event.target.value }))} value={assetEditForm.status}>
                <option value="active">active</option>
                <option value="planned">planned</option>
                <option value="degraded">degraded</option>
                <option value="retired">retired</option>
              </select></label>
              <label className="wideField">Notas<input onChange={(event) => setAssetEditForm((current) => ({ ...current, notes: event.target.value }))} value={assetEditForm.notes} /></label>
              <button disabled={!assetEditForm.siteCode || !assetEditForm.name} type="submit">Guardar activo</button>
            </form>
          )}
        </div>
        <div className="panel physicalOpsPanel">
          <div className="panelHeader"><div><p className="eyebrow">Operacion</p><h2>Editar estado / eliminar</h2></div></div>
          <form className="quickForm" onSubmit={updatePhysicalStatus}>
            <label className="wideField">Registro<select onChange={(event) => {
              const record = physicalRecords.find((item) => `${item.kind}:${item.id}` === event.target.value);
              setOperationForm({ recordKey: event.target.value, status: record?.status ?? "active" });
            }} value={operationForm.recordKey}>
              <option value="">Selecciona un registro</option>
              {physicalRecords.map((item) => (
                <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>{item.kind} - {item.label}</option>
              ))}
            </select></label>
            <label>Estado<select onChange={(event) => setOperationForm((current) => ({ ...current, status: event.target.value }))} value={operationForm.status}>
              <option value="active">active</option>
              <option value="planned">planned</option>
              <option value="degraded">degraded</option>
              <option value="down">down</option>
              <option value="reserved">reserved</option>
              <option value="used">used</option>
              <option value="available">available</option>
              <option value="retired">retired</option>
              <option value="faulty">faulty</option>
            </select></label>
            <button disabled={!selectedRecord} type="submit">Actualizar estado</button>
            <button className="dangerButton" disabled={!selectedRecord} onClick={() => void deletePhysicalRecord()} type="button">Eliminar registro</button>
          </form>
        </div>
        <span className={`formState physicalState ${formState}`}>{formStateLabel(formState)}</span>
      </section>
      <section className="physicalGrid">
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Proveedores</p><h2>Capacidad contratada</h2></div></div>
          <DataTable
            columns={["Proveedor", "Contrato", "Servicio", "Commit", "Entregado", "Uso", "Billing"]}
            rows={capacities.map((item) => [item.providerName, item.contractCode, item.serviceType, formatCapacity(item.committedMbps), formatCapacity(item.deliveredMbps), formatCapacity(item.usedMbps), item.billingMode])}
          />
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Fibra site-to-site</p><h2>Tramos y ocupacion</h2></div></div>
          <DataTable
            columns={["Codigo", "A", "Z", "Proveedor", "Cable", "Hilos", "Usados", "Km", "Estado"]}
            statusColumnIndex={8}
            rows={fiberSpans.map((span) => [span.code, span.aSite, span.zSite, span.providerCode ?? "propio", span.cableType, String(span.fiberCount), String(span.usedFibers), span.distanceKm ? String(span.distanceKm) : "N/D", span.status])}
          />
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Hilos</p><h2>Asignacion por fibra</h2></div></div>
          <DataTable
            columns={["Tramo", "Hilo", "Tubo", "Color", "Estado", "Servicio", "Circuito", "A", "Z"]}
            statusColumnIndex={4}
            rows={fiberStrands.map((strand) => [strand.spanCode, String(strand.strandNumber), strand.tubeColor ?? "", strand.fiberColor ?? "", strand.status, strand.service ?? "reserva", strand.circuitCode ?? "", strand.aTermination ?? "", strand.zTermination ?? ""])}
          />
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Opticas</p><h2>Transceivers por puerto</h2></div></div>
          <DataTable
            columns={["Equipo", "Puerto", "Sitio", "Vendor", "Parte", "Factor", "Gbps", "Lambda", "Alcance", "Rx", "Estado"]}
            statusColumnIndex={10}
            rows={transceivers.map((item) => [item.device, item.interface, item.siteCode, item.vendor, item.partNumber, item.formFactor, String(item.speedMbps / 1000), item.wavelengthNm ? `${item.wavelengthNm}nm` : "N/D", item.reachKm ? `${item.reachKm}km` : "N/D", item.rxPowerDbm !== null ? `${item.rxPowerDbm}dBm` : "N/D", item.status])}
          />
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Patchcords</p><h2>Puerto a puerto / ODF</h2></div></div>
          <DataTable
            columns={["Codigo", "Extremo A", "Extremo Z", "Medio", "Conector A", "Conector Z", "Largo", "Color", "Circuito", "Estado"]}
            statusColumnIndex={9}
            rows={patchcords.map((item) => [item.code, item.aEndpoint, item.zEndpoint, item.mediaType, item.connectorA, item.connectorZ, item.lengthMeters ? `${item.lengthMeters}m` : "N/D", item.color ?? "", item.circuitCode ?? "", item.status])}
          />
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Activos DC</p><h2>ODF, PDU, bandejas y auxiliares</h2></div></div>
          <DataTable
            columns={["Sede", "Rack", "Activo", "Tipo", "RU", "Puertos", "Estado", "Notas"]}
            statusColumnIndex={6}
            rows={assets.map((asset) => [asset.siteCode, asset.rackCode ?? "sala", asset.name, asset.assetType, asset.units ? String(asset.units) : "", asset.ports ? String(asset.ports) : "", asset.status, asset.notes ?? ""])}
          />
        </div>
      </section>
    </ModulePage>
  );
}

function CircuitsView({
  circuits,
  contracts,
  devices,
  interfaces,
  onReload,
  providers,
  sites
}: {
  circuits: Circuit[];
  contracts: ProviderContract[];
  devices: Device[];
  interfaces: NetworkInterface[];
  onReload: () => Promise<void>;
  providers: Provider[];
  sites: Site[];
}) {
  const [circuitForm, setCircuitForm] = useState({
    code: "",
    name: "",
    circuitType: "transport",
    providerCode: providers[0]?.code ?? "",
    contractCode: "",
    status: "planned",
    capacityMbps: "1000",
    slaTarget: "99.9"
  });
  const [endpointForm, setEndpointForm] = useState({
    circuitCode: circuits[0]?.code ?? "",
    siteCode: sites[0]?.code ?? "",
    deviceName: "",
    interfaceName: "",
    label: "A",
    demarcation: ""
  });
  const [circuitEndpoints, setCircuitEndpoints] = useState<CircuitEndpoint[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState("");
  const selectedCircuitEndpoint = circuitEndpoints.find((endpoint) => endpoint.id === selectedEndpointId);
  const [endpointEditForm, setEndpointEditForm] = useState({
    siteCode: "",
    deviceName: "",
    interfaceName: "",
    label: "A",
    demarcation: ""
  });
  const [operationForm, setOperationForm] = useState<{ circuitCode: string; status: string }>({
    circuitCode: circuits[0]?.code ?? "",
    status: circuits[0]?.status ?? "active"
  });
  const [circuitEditForm, setCircuitEditForm] = useState<{
    code: string;
    name: string;
    providerCode: string;
    contractCode: string;
    status: string;
    capacityMbps: string;
    slaTarget: string;
  }>({
    code: circuits[0]?.code ?? "",
    name: circuits[0]?.name ?? "",
    providerCode: circuits[0]?.providerCode === "OWN" ? "" : circuits[0]?.providerCode ?? "",
    contractCode: circuits[0]?.contractCode ?? "",
    status: circuits[0]?.status ?? "active",
    capacityMbps: circuits[0]?.capacityMbps ? String(circuits[0].capacityMbps) : "",
    slaTarget: circuits[0]?.slaTarget ? String(circuits[0].slaTarget) : ""
  });
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const down = circuits.filter((circuit) => circuit.status === "down").length;
  const degraded = circuits.filter((circuit) => circuit.status === "degraded").length;
  const totalCapacity = circuits.reduce((sum, circuit) => sum + circuit.capacityMbps, 0);
  const selectedCircuit = circuits.find((circuit) => circuit.code === operationForm.circuitCode);
  const selectedEndpointDevice = devices.find((device) => device.name === endpointForm.deviceName);
  const deviceInterfaces = interfaces.filter((networkInterface) => networkInterface.device === endpointForm.deviceName);
  const selectedEndpointEditDevice = devices.find((device) => device.name === endpointEditForm.deviceName);
  const endpointEditInterfaces = interfaces.filter((networkInterface) => networkInterface.device === endpointEditForm.deviceName);
  const providerContracts = contracts.filter((contract) => contract.providerCode === circuitForm.providerCode);
  const editProviderContracts = contracts.filter((contract) => contract.providerCode === circuitEditForm.providerCode);

  useEffect(() => {
    let active = true;

    if (!selectedCircuit) {
      setCircuitEndpoints([]);
      setSelectedEndpointId("");
      return;
    }

    apiGet<{ endpoints: CircuitEndpoint[] }>(`/circuits/${selectedCircuit.code}/endpoints`)
      .then((payload) => {
        if (!active) return;
        setCircuitEndpoints(payload.endpoints);
        setSelectedEndpointId((current) => (payload.endpoints.some((endpoint) => endpoint.id === current) ? current : payload.endpoints[0]?.id ?? ""));
      })
      .catch(() => {
        if (!active) return;
        setCircuitEndpoints([]);
        setSelectedEndpointId("");
      });

    return () => {
      active = false;
    };
  }, [selectedCircuit]);

  useEffect(() => {
    if (selectedCircuitEndpoint) {
      setEndpointEditForm({
        siteCode: selectedCircuitEndpoint.siteCode ?? "",
        deviceName: selectedCircuitEndpoint.device ?? "",
        interfaceName: selectedCircuitEndpoint.interface ?? "",
        label: selectedCircuitEndpoint.label,
        demarcation: selectedCircuitEndpoint.demarcation ?? ""
      });
    }
  }, [selectedCircuitEndpoint]);

  useEffect(() => {
    if (selectedCircuit) {
      setCircuitEditForm({
        code: selectedCircuit.code,
        name: selectedCircuit.name,
        providerCode: selectedCircuit.providerCode === "OWN" ? "" : selectedCircuit.providerCode,
        contractCode: selectedCircuit.contractCode ?? "",
        status: selectedCircuit.status,
        capacityMbps: selectedCircuit.capacityMbps ? String(selectedCircuit.capacityMbps) : "",
        slaTarget: selectedCircuit.slaTarget ? String(selectedCircuit.slaTarget) : ""
      });
    }
  }, [selectedCircuit]);

  async function createCircuit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("saving");

    try {
      await apiPost("/circuits", {
        code: circuitForm.code,
        name: circuitForm.name,
        circuitType: circuitForm.circuitType,
        providerCode: circuitForm.providerCode || null,
        contractCode: circuitForm.contractCode || null,
        status: circuitForm.status,
        capacityMbps: circuitForm.capacityMbps ? Number(circuitForm.capacityMbps) : null,
        slaTarget: circuitForm.slaTarget ? Number(circuitForm.slaTarget) : null,
        reason: "Alta desde modulo Circuitos"
      });
      setCircuitForm((current) => ({ ...current, code: "", name: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function createEndpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("saving");

    try {
      await apiPost(`/circuits/${endpointForm.circuitCode}/endpoints`, {
        siteCode: endpointForm.siteCode || null,
        deviceName: endpointForm.deviceName || null,
        interfaceName: endpointForm.interfaceName || null,
        label: endpointForm.label,
        demarcation: endpointForm.demarcation || null,
        reason: "Alta de extremo desde modulo Circuitos"
      });
      await onReload();
      const payload = await apiGet<{ endpoints: CircuitEndpoint[] }>(`/circuits/${endpointForm.circuitCode}/endpoints`);
      setCircuitEndpoints(payload.endpoints);
      setSelectedEndpointId((current) => (payload.endpoints.some((endpoint) => endpoint.id === current) ? current : payload.endpoints[0]?.id ?? ""));
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateEndpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCircuit || !selectedCircuitEndpoint) return;
    setFormState("saving");

    try {
      await apiPatch(`/circuits/${selectedCircuit.code}/endpoints/${selectedCircuitEndpoint.id}`, {
        siteCode: endpointEditForm.siteCode || null,
        deviceName: endpointEditForm.deviceName || null,
        interfaceName: endpointEditForm.interfaceName || null,
        label: endpointEditForm.label,
        demarcation: endpointEditForm.demarcation || null,
        reason: "Edicion de extremo desde modulo Circuitos"
      });
      const payload = await apiGet<{ endpoints: CircuitEndpoint[] }>(`/circuits/${selectedCircuit.code}/endpoints`);
      setCircuitEndpoints(payload.endpoints);
      setSelectedEndpointId((current) => (payload.endpoints.some((endpoint) => endpoint.id === current) ? current : payload.endpoints[0]?.id ?? ""));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateCircuit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCircuit) return;
    setFormState("saving");

    try {
      await apiPatch(`/circuits/${selectedCircuit.code}`, {
        code: circuitEditForm.code,
        name: circuitEditForm.name,
        providerCode: circuitEditForm.providerCode || null,
        contractCode: circuitEditForm.contractCode || null,
        status: circuitEditForm.status,
        capacityMbps: circuitEditForm.capacityMbps ? Number(circuitEditForm.capacityMbps) : null,
        slaTarget: circuitEditForm.slaTarget ? Number(circuitEditForm.slaTarget) : null,
        reason: "Edicion completa desde modulo Circuitos"
      });
      setOperationForm((current) => ({ ...current, circuitCode: circuitEditForm.code, status: circuitEditForm.status }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateCircuitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCircuit) return;
    setFormState("saving");

    try {
      await apiPatch(`/circuits/${selectedCircuit.code}/status`, {
        status: operationForm.status,
        reason: "Actualizacion desde modulo Circuitos"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteCircuit() {
    if (!selectedCircuit) return;
    setFormState("saving");

    try {
      await apiDelete(`/circuits/${selectedCircuit.code}`);
      setOperationForm({ circuitCode: "", status: "active" });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="Circuitos" title="Enlaces por proveedor, capacidad y estado">
      <section className="metricGrid compactMetrics">
        <Metric label="Circuitos caidos" value={String(down)} tone="critical" />
        <Metric label="Degradados" value={String(degraded)} tone="warning" />
        <Metric label="Capacidad documentada" value={`${totalCapacity}M`} tone="neutral" />
        <Metric label="Sin interfaces" value={String(circuits.filter((item) => !item.linkedInterfaces).length)} tone="warning" />
      </section>
      <section className="circuitWorkbench">
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Alta rapida</p><h2>Circuito proveedor/site</h2></div></div>
          <form className="quickForm" onSubmit={createCircuit}>
            <label>Codigo<input onChange={(event) => setCircuitForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={circuitForm.code} /></label>
            <label>Tipo<select onChange={(event) => setCircuitForm((current) => ({ ...current, circuitType: event.target.value }))} value={circuitForm.circuitType}>
              <option value="transport">transporte</option><option value="internet">internet</option><option value="metro">metro</option><option value="backup">backup</option><option value="internal">interno</option>
            </select></label>
            <label className="wideField">Nombre<input onChange={(event) => setCircuitForm((current) => ({ ...current, name: event.target.value }))} value={circuitForm.name} /></label>
            <label>Proveedor<select onChange={(event) => setCircuitForm((current) => ({ ...current, providerCode: event.target.value, contractCode: "" }))} value={circuitForm.providerCode}>
              <option value="">Propio / sin proveedor</option>
              {providers.map((provider) => <option key={provider.id} value={provider.code}>{provider.code} - {provider.name}</option>)}
            </select></label>
            <label>Contrato<select onChange={(event) => setCircuitForm((current) => ({ ...current, contractCode: event.target.value }))} value={circuitForm.contractCode}>
              <option value="">Sin contrato</option>
              {providerContracts.map((contract) => <option key={contract.id} value={contract.code}>{contract.code} - {contract.status}</option>)}
            </select></label>
            <label>Mbps<input inputMode="numeric" onChange={(event) => setCircuitForm((current) => ({ ...current, capacityMbps: event.target.value }))} value={circuitForm.capacityMbps} /></label>
            <label>SLA %<input inputMode="decimal" onChange={(event) => setCircuitForm((current) => ({ ...current, slaTarget: event.target.value }))} value={circuitForm.slaTarget} /></label>
            <label>Estado<select onChange={(event) => setCircuitForm((current) => ({ ...current, status: event.target.value }))} value={circuitForm.status}>
              <option value="planned">planned</option><option value="active">active</option><option value="degraded">degraded</option><option value="down">down</option><option value="retired">retired</option>
            </select></label>
            <button disabled={!circuitForm.code || !circuitForm.name} type="submit">Crear circuito</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Extremos</p><h2>Punto A/Z y demarcacion</h2></div></div>
          <form className="quickForm" onSubmit={createEndpoint}>
            <label>Circuito<select onChange={(event) => setEndpointForm((current) => ({ ...current, circuitCode: event.target.value }))} value={endpointForm.circuitCode}>
              {circuits.map((circuit) => <option key={circuit.id} value={circuit.code}>{circuit.code} - {circuit.name}</option>)}
            </select></label>
            <label>Etiqueta<select onChange={(event) => setEndpointForm((current) => ({ ...current, label: event.target.value }))} value={endpointForm.label}>
              <option value="A">A</option><option value="Z">Z</option><option value="B">B</option><option value="handoff">handoff</option><option value="backup">backup</option>
            </select></label>
            <label>Sede<select onChange={(event) => setEndpointForm((current) => ({ ...current, siteCode: event.target.value }))} value={endpointForm.siteCode}>
              <option value="">Sin sede</option>
              {sites.map((site) => <option key={site.id} value={site.code}>{site.code} - {site.name}</option>)}
            </select></label>
            <label>Equipo<select onChange={(event) => setEndpointForm((current) => ({ ...current, deviceName: event.target.value, interfaceName: "" }))} value={endpointForm.deviceName}>
              <option value="">Sin equipo</option>
              {devices.filter((device) => !endpointForm.siteCode || device.siteCode === endpointForm.siteCode).map((device) => <option key={device.id} value={device.name}>{device.name}</option>)}
            </select></label>
            <label>Interfaz<select disabled={!selectedEndpointDevice} onChange={(event) => setEndpointForm((current) => ({ ...current, interfaceName: event.target.value }))} value={endpointForm.interfaceName}>
              <option value="">Sin interfaz</option>
              {deviceInterfaces.map((networkInterface) => <option key={networkInterface.id} value={networkInterface.name}>{networkInterface.name} - {networkInterface.status}</option>)}
            </select></label>
            <label className="wideField">Demarcacion<input onChange={(event) => setEndpointForm((current) => ({ ...current, demarcation: event.target.value }))} placeholder="ODF, bandeja, puerto, sala, poste o handoff" value={endpointForm.demarcation} /></label>
            <button disabled={!endpointForm.circuitCode || !endpointForm.label} type="submit">Agregar extremo</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
          {selectedCircuitEndpoint && (
            <form className="quickForm" onSubmit={updateEndpoint}>
              <p className="eyebrow">Editar extremo</p>
              <label className="wideField">Extremo<select onChange={(event) => setSelectedEndpointId(event.target.value)} value={selectedEndpointId}>
                {circuitEndpoints.map((endpoint) => <option key={endpoint.id} value={endpoint.id}>{endpoint.label} - {endpoint.siteCode ?? "sin sede"} - {endpoint.demarcation ?? endpoint.interface ?? "sin demarcacion"}</option>)}
              </select></label>
              <label>Etiqueta<select onChange={(event) => setEndpointEditForm((current) => ({ ...current, label: event.target.value }))} value={endpointEditForm.label}>
                <option value="A">A</option><option value="Z">Z</option><option value="B">B</option><option value="handoff">handoff</option><option value="backup">backup</option>
              </select></label>
              <label>Sede<select onChange={(event) => setEndpointEditForm((current) => ({ ...current, siteCode: event.target.value, deviceName: "", interfaceName: "" }))} value={endpointEditForm.siteCode}>
                <option value="">Sin sede</option>
                {sites.map((site) => <option key={site.id} value={site.code}>{site.code} - {site.name}</option>)}
              </select></label>
              <label>Equipo<select onChange={(event) => setEndpointEditForm((current) => ({ ...current, deviceName: event.target.value, interfaceName: "" }))} value={endpointEditForm.deviceName}>
                <option value="">Sin equipo</option>
                {devices.filter((device) => !endpointEditForm.siteCode || device.siteCode === endpointEditForm.siteCode).map((device) => <option key={device.id} value={device.name}>{device.name}</option>)}
              </select></label>
              <label>Interfaz<select disabled={!selectedEndpointEditDevice} onChange={(event) => setEndpointEditForm((current) => ({ ...current, interfaceName: event.target.value }))} value={endpointEditForm.interfaceName}>
                <option value="">Sin interfaz</option>
                {endpointEditInterfaces.map((networkInterface) => <option key={networkInterface.id} value={networkInterface.name}>{networkInterface.name} - {networkInterface.status}</option>)}
              </select></label>
              <label className="wideField">Demarcacion<input onChange={(event) => setEndpointEditForm((current) => ({ ...current, demarcation: event.target.value }))} placeholder="ODF, bandeja, puerto, sala, poste o handoff" value={endpointEditForm.demarcation} /></label>
              <button disabled={!endpointEditForm.label} type="submit">Guardar extremo</button>
              <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
            </form>
          )}
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Operacion</p><h2>Estado y retiro seguro</h2></div></div>
          {selectedCircuit && (
            <form className="quickForm" onSubmit={updateCircuit}>
              <p className="eyebrow">Editar circuito</p>
              <label>Codigo<input onChange={(event) => setCircuitEditForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={circuitEditForm.code} /></label>
              <label>Estado<select onChange={(event) => setCircuitEditForm((current) => ({ ...current, status: event.target.value }))} value={circuitEditForm.status}>
                <option value="planned">planned</option><option value="active">active</option><option value="degraded">degraded</option><option value="down">down</option><option value="maintenance">maintenance</option><option value="retired">retired</option>
              </select></label>
              <label className="wideField">Nombre<input onChange={(event) => setCircuitEditForm((current) => ({ ...current, name: event.target.value }))} value={circuitEditForm.name} /></label>
              <label>Proveedor<select onChange={(event) => setCircuitEditForm((current) => ({ ...current, providerCode: event.target.value, contractCode: "" }))} value={circuitEditForm.providerCode}>
                <option value="">Propio / sin proveedor</option>
                {providers.map((provider) => <option key={provider.id} value={provider.code}>{provider.code} - {provider.name}</option>)}
              </select></label>
              <label>Contrato<select onChange={(event) => setCircuitEditForm((current) => ({ ...current, contractCode: event.target.value }))} value={circuitEditForm.contractCode}>
                <option value="">Sin contrato</option>
                {editProviderContracts.map((contract) => <option key={contract.id} value={contract.code}>{contract.code} - {contract.status}</option>)}
              </select></label>
              <label>Mbps<input inputMode="numeric" onChange={(event) => setCircuitEditForm((current) => ({ ...current, capacityMbps: event.target.value }))} value={circuitEditForm.capacityMbps} /></label>
              <label>SLA %<input inputMode="decimal" onChange={(event) => setCircuitEditForm((current) => ({ ...current, slaTarget: event.target.value }))} value={circuitEditForm.slaTarget} /></label>
              <button disabled={!circuitEditForm.code || !circuitEditForm.name} type="submit">Guardar circuito</button>
            </form>
          )}
          <form className="quickForm" onSubmit={updateCircuitStatus}>
            <label className="wideField">Circuito<select onChange={(event) => {
              const next = circuits.find((circuit) => circuit.code === event.target.value);
              setOperationForm({ circuitCode: event.target.value, status: next?.status ?? "active" });
            }} value={operationForm.circuitCode}>
              <option value="">Seleccionar</option>
              {circuits.map((circuit) => <option key={circuit.id} value={circuit.code}>{circuit.code} - {circuit.name}</option>)}
            </select></label>
            <label>Estado<select onChange={(event) => setOperationForm((current) => ({ ...current, status: event.target.value }))} value={operationForm.status}>
              <option value="planned">planned</option><option value="active">active</option><option value="degraded">degraded</option><option value="down">down</option><option value="maintenance">maintenance</option><option value="retired">retired</option>
            </select></label>
            <button disabled={!selectedCircuit} type="submit">Actualizar estado</button>
            <button className="dangerButton" disabled={!selectedCircuit} onClick={() => void deleteCircuit()} type="button">Eliminar sin dependencias</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
      </section>
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Inventario</p><h2>Circuitos documentados</h2></div></div>
        <DataTable
          columns={["Codigo", "Nombre", "Proveedor", "Estado", "Capacidad", "A", "Z", "SLA", "Extremos", "Interfaces"]}
          statusColumnIndex={3}
          rows={circuits.map((circuit) => [
            circuit.code,
            circuit.name,
            circuit.providerName ?? circuit.providerCode,
            circuit.status,
            `${circuit.capacityMbps} Mbps`,
            circuit.aSite,
            circuit.zSite,
            `${circuit.slaTarget}%`,
            String(circuit.endpointCount ?? 0),
            String(circuit.linkedInterfaces ?? 0)
          ])}
        />
      </section>
    </ModulePage>
  );
}

type MapImportPayload = {
  sites: Array<{
    code: string;
    name: string;
    siteType: string;
    status: string;
    latitude: number;
    longitude: number;
    address?: string | null;
  }>;
  links: Array<{
    aSiteCode: string;
    zSiteCode: string;
    linkType: string;
    status: string;
    capacityMbps?: number | null;
    label?: string | null;
  }>;
};

const defaultMapCsvPayload = `SITE,NUEVO-NODO,Nuevo nodo,node,planned,-16.12,-72.52,Referencia de campo
LINK,MAJES,NUEVO-NODO,distribution,planned,1000,Majes <> Nuevo nodo`;

function validateMapCsv(csv: string) {
  const errors: string[] = [];
  const siteCodes = new Set<string>();

  csv.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      return;
    }

    const cells = line.split(",").map((cell) => cell.trim());
    const kind = cells[0]?.toUpperCase();
    const row = index + 1;

    if (kind === "SITE") {
      if (!cells[1] || !cells[2]) {
        errors.push(`Fila ${row}: SITE requiere codigo y nombre`);
      }

      if (Number.isNaN(Number(cells[5])) || Number.isNaN(Number(cells[6]))) {
        errors.push(`Fila ${row}: SITE requiere latitud y longitud numericas`);
      }

      siteCodes.add(cells[1]?.toUpperCase());
      return;
    }

    if (kind === "LINK") {
      if (!cells[1] || !cells[2]) {
        errors.push(`Fila ${row}: LINK requiere origen y destino`);
      }

      if (cells[1]?.toUpperCase() === cells[2]?.toUpperCase()) {
        errors.push(`Fila ${row}: origen y destino no pueden ser iguales`);
      }

      if (cells[5] && Number.isNaN(Number(cells[5]))) {
        errors.push(`Fila ${row}: capacidad debe ser numerica`);
      }

      return;
    }

    errors.push(`Fila ${row}: tipo desconocido ${cells[0] || "vacio"}`);
  });

  return errors;
}

function parseMapCsv(csv: string): MapImportPayload {
  const payload: MapImportPayload = { sites: [], links: [] };

  for (const rawLine of csv.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const cells = line.split(",").map((cell) => cell.trim());
    const kind = cells[0]?.toUpperCase();

    if (kind === "SITE") {
      payload.sites.push({
        code: cells[1]?.toUpperCase(),
        name: cells[2],
        siteType: cells[3] || "node",
        status: cells[4] || "planned",
        latitude: Number(cells[5]),
        longitude: Number(cells[6]),
        address: cells[7] || null
      });
    }

    if (kind === "LINK") {
      payload.links.push({
        aSiteCode: cells[1]?.toUpperCase(),
        zSiteCode: cells[2]?.toUpperCase(),
        linkType: cells[3] || "transport",
        status: cells[4] || "planned",
        capacityMbps: cells[5] ? Number(cells[5]) : null,
        label: cells[6] || null
      });
    }
  }

  return payload;
}

const defaultMapImportPayload = JSON.stringify({
  sites: [
    {
      code: "NUEVO-NODO",
      name: "Nuevo nodo",
      siteType: "node",
      status: "planned",
      latitude: -16.12,
      longitude: -72.52,
      address: "Referencia de campo"
    }
  ],
  links: [
    {
      aSiteCode: "MAJES",
      zSiteCode: "NUEVO-NODO",
      linkType: "distribution",
      status: "planned",
      capacityMbps: 1000,
      label: "Majes <> Nuevo nodo"
    }
  ]
}, null, 2);

function formatCapacity(capacityMbps: number | null) {
  if (!capacityMbps) {
    return "N/D";
  }

  if (capacityMbps >= 1000) {
    return `${capacityMbps / 1000}G`;
  }

  return `${capacityMbps}M`;
}

function formStateLabel(state: "idle" | "saving" | "saved" | "error") {
  if (state === "saving") {
    return "Guardando cambios";
  }

  if (state === "saved") {
    return "Mapa actualizado";
  }

  if (state === "error") {
    return "No se pudo guardar";
  }

  return "API requerida para guardar";
}

function toDateTimeLocal(value?: string | null) {
  return value ? value.slice(0, 16) : "";
}

function formatMbps(value: number | null | undefined) {
  const safeValue = value ?? 0;

  if (safeValue >= 1000) {
    return `${Number((safeValue / 1000).toFixed(2))} Gbps`;
  }

  return `${safeValue} Mbps`;
}


function RacksPowerView({
  devices,
  onReload,
  powerAssets,
  racks,
  powerFeeds,
  sites
}: {
  devices: Device[];
  onReload: () => Promise<void>;
  powerAssets: PowerAsset[];
  racks: RackView[];
  powerFeeds: PowerFeed[];
  sites: Site[];
}) {
  const firstSiteCode = sites[0]?.code ?? racks[0]?.siteCode ?? "AQP-POP";
  const [activeSiteCode, setActiveSiteCode] = useState(firstSiteCode);
  const siteRacks = useMemo(() => racks.filter((rack) => rack.siteCode === activeSiteCode), [activeSiteCode, racks]);
  const sitePowerFeeds = useMemo(() => powerFeeds.filter((feed) => feed.siteCode === activeSiteCode), [activeSiteCode, powerFeeds]);
  const sitePowerAssets = useMemo(() => powerAssets.filter((asset) => asset.siteCode === activeSiteCode), [activeSiteCode, powerAssets]);
  const [selectedRackId, setSelectedRackId] = useState(siteRacks[0]?.id ?? "");
  const [rackForm, setRackForm] = useState({ code: "", name: "", heightU: "45" });
  const [rackEditForm, setRackEditForm] = useState({ code: "", name: "", heightU: "" });
  const [powerForm, setPowerForm] = useState({ name: "", capacityWatts: "", loadWatts: "", source: "" });
  const [selectedPowerFeedId, setSelectedPowerFeedId] = useState(sitePowerFeeds[0]?.id ?? "");
  const selectedPowerFeed = sitePowerFeeds.find((feed) => feed.id === selectedPowerFeedId);
  const [powerEditForm, setPowerEditForm] = useState({ name: "", feedType: "ac", status: "active", capacityWatts: "", loadWatts: "", source: "" });
  const [assetForm, setAssetForm] = useState({ name: "", assetType: "ups", capacityWatts: "", loadWatts: "", autonomyMinutes: "", batteryHealthPercent: "", sourceFeedId: "", notes: "" });
  const [selectedPowerAssetId, setSelectedPowerAssetId] = useState(sitePowerAssets[0]?.id ?? "");
  const selectedPowerAsset = sitePowerAssets.find((asset) => asset.id === selectedPowerAssetId);
  const [assetEditForm, setAssetEditForm] = useState({ name: "", assetType: "ups", status: "active", capacityWatts: "", loadWatts: "", autonomyMinutes: "", batteryHealthPercent: "", sourceFeedId: "", notes: "" });
  const [placementForm, setPlacementForm] = useState({ deviceId: "", rackId: siteRacks[0]?.id ?? "", positionU: "", heightU: "1", powerFeedId: "" });
  const [crudState, setCrudState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const selectedRack = siteRacks.find((rack) => rack.id === selectedRackId) ?? siteRacks[0];
  const siteDevices = devices.filter((device) => device.siteCode === activeSiteCode);
  const mountedDevices = siteRacks.reduce((sum, rack) => sum + rack.devices.length, 0);
  const totalLoad = sitePowerFeeds.reduce((sum, feed) => sum + (feed.loadWatts ?? 0), 0);
  const totalCapacity = sitePowerFeeds.reduce((sum, feed) => sum + (feed.capacityWatts ?? 0), 0);
  const utilization = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;

  useEffect(() => {
    if (selectedRack) {
      setRackEditForm({
        code: selectedRack.code,
        name: selectedRack.name,
        heightU: String(selectedRack.heightU)
      });
    }
  }, [selectedRack]);

  useEffect(() => {
    const currentRackBelongsToSite = siteRacks.some((rack) => rack.id === selectedRackId);
    if (!currentRackBelongsToSite) {
      const nextRackId = siteRacks[0]?.id ?? "";
      setSelectedRackId(nextRackId);
      setPlacementForm((current) => ({ ...current, rackId: nextRackId, deviceId: "", powerFeedId: "" }));
    }
  }, [activeSiteCode, selectedRackId, siteRacks]);

  useEffect(() => {
    const currentAssetBelongsToSite = sitePowerAssets.some((asset) => asset.id === selectedPowerAssetId);
    if (!currentAssetBelongsToSite) {
      setSelectedPowerAssetId(sitePowerAssets[0]?.id ?? "");
    }
  }, [selectedPowerAssetId, sitePowerAssets]);

  useEffect(() => {
    const currentFeedBelongsToSite = sitePowerFeeds.some((feed) => feed.id === selectedPowerFeedId);
    if (!currentFeedBelongsToSite) {
      setSelectedPowerFeedId(sitePowerFeeds[0]?.id ?? "");
    }
  }, [selectedPowerFeedId, sitePowerFeeds]);

  useEffect(() => {
    if (selectedPowerFeed) {
      setPowerEditForm({
        name: selectedPowerFeed.name,
        feedType: selectedPowerFeed.feedType,
        status: selectedPowerFeed.status,
        capacityWatts: selectedPowerFeed.capacityWatts ? String(selectedPowerFeed.capacityWatts) : "",
        loadWatts: selectedPowerFeed.loadWatts ? String(selectedPowerFeed.loadWatts) : "",
        source: selectedPowerFeed.source ?? ""
      });
    }
  }, [selectedPowerFeed]);

  useEffect(() => {
    if (selectedPowerAsset) {
      setAssetEditForm({
        name: selectedPowerAsset.name,
        assetType: selectedPowerAsset.assetType,
        status: selectedPowerAsset.status,
        capacityWatts: selectedPowerAsset.capacityWatts ? String(selectedPowerAsset.capacityWatts) : "",
        loadWatts: selectedPowerAsset.loadWatts ? String(selectedPowerAsset.loadWatts) : "",
        autonomyMinutes: selectedPowerAsset.autonomyMinutes ? String(selectedPowerAsset.autonomyMinutes) : "",
        batteryHealthPercent: selectedPowerAsset.batteryHealthPercent ? String(selectedPowerAsset.batteryHealthPercent) : "",
        sourceFeedId: "",
        notes: selectedPowerAsset.notes ?? ""
      });
    }
  }, [selectedPowerAsset]);

  async function createRack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCrudState("saving");
    try {
      await apiPost(`/sites/${activeSiteCode}/racks`, {
        code: rackForm.code,
        name: rackForm.name,
        heightU: Number(rackForm.heightU),
        reason: "Alta desde UI de racks"
      });
      setRackForm({ code: "", name: "", heightU: "45" });
      await onReload();
      setCrudState("saved");
    } catch {
      setCrudState("error");
    }
  }

  async function deleteRack(id: string) {
    setCrudState("saving");
    try {
      await apiDelete(`/sites/${activeSiteCode}/racks/${id}`);
      await onReload();
      setCrudState("saved");
    } catch {
      setCrudState("error");
    }
  }

  async function updateRack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRack) return;
    setCrudState("saving");

    try {
      await apiPatch(`/sites/${activeSiteCode}/racks/${selectedRack.id}`, {
        code: rackEditForm.code,
        name: rackEditForm.name,
        heightU: Number(rackEditForm.heightU),
        reason: "Edicion de rack desde vista fisica"
      });
      await onReload();
      setCrudState("saved");
    } catch {
      setCrudState("error");
    }
  }

  async function createPowerFeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCrudState("saving");
    try {
      await apiPost(`/sites/${activeSiteCode}/power-feeds`, {
        name: powerForm.name,
        capacityWatts: powerForm.capacityWatts ? Number(powerForm.capacityWatts) : null,
        loadWatts: powerForm.loadWatts ? Number(powerForm.loadWatts) : null,
        source: powerForm.source || null,
        reason: "Alta desde UI de energia"
      });
      setPowerForm({ name: "", capacityWatts: "", loadWatts: "", source: "" });
      await onReload();
      setCrudState("saved");
    } catch {
      setCrudState("error");
    }
  }

  async function deletePowerFeed(id: string) {
    setCrudState("saving");
    try {
      await apiDelete(`/sites/${activeSiteCode}/power-feeds/${id}`);
      setSelectedPowerFeedId("");
      await onReload();
      setCrudState("saved");
    } catch {
      setCrudState("error");
    }
  }

  async function updatePowerFeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPowerFeed) return;
    setCrudState("saving");

    try {
      await apiPatch(`/sites/${activeSiteCode}/power-feeds/${selectedPowerFeed.id}`, {
        name: powerEditForm.name,
        feedType: powerEditForm.feedType,
        status: powerEditForm.status,
        capacityWatts: powerEditForm.capacityWatts ? Number(powerEditForm.capacityWatts) : null,
        loadWatts: powerEditForm.loadWatts ? Number(powerEditForm.loadWatts) : null,
        source: powerEditForm.source || null,
        reason: "Edicion de alimentacion electrica desde vista de racks"
      });
      await onReload();
      setCrudState("saved");
    } catch {
      setCrudState("error");
    }
  }

  async function createPowerAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCrudState("saving");
    try {
      await apiPost(`/sites/${activeSiteCode}/power-assets`, {
        name: assetForm.name,
        assetType: assetForm.assetType,
        capacityWatts: assetForm.capacityWatts ? Number(assetForm.capacityWatts) : null,
        loadWatts: assetForm.loadWatts ? Number(assetForm.loadWatts) : null,
        autonomyMinutes: assetForm.autonomyMinutes ? Number(assetForm.autonomyMinutes) : null,
        batteryHealthPercent: assetForm.batteryHealthPercent ? Number(assetForm.batteryHealthPercent) : null,
        sourceFeedId: assetForm.sourceFeedId || null,
        notes: assetForm.notes || null,
        reason: "Alta desde vista energia avanzada"
      });
      setAssetForm({ name: "", assetType: "ups", capacityWatts: "", loadWatts: "", autonomyMinutes: "", batteryHealthPercent: "", sourceFeedId: "", notes: "" });
      await onReload();
      setCrudState("saved");
    } catch {
      setCrudState("error");
    }
  }

  async function updatePowerAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPowerAsset) return;
    setCrudState("saving");

    try {
      await apiPatch(`/sites/${activeSiteCode}/power-assets/${selectedPowerAsset.id}`, {
        name: assetEditForm.name,
        assetType: assetEditForm.assetType,
        status: assetEditForm.status,
        capacityWatts: assetEditForm.capacityWatts ? Number(assetEditForm.capacityWatts) : null,
        loadWatts: assetEditForm.loadWatts ? Number(assetEditForm.loadWatts) : null,
        autonomyMinutes: assetEditForm.autonomyMinutes ? Number(assetEditForm.autonomyMinutes) : null,
        batteryHealthPercent: assetEditForm.batteryHealthPercent ? Number(assetEditForm.batteryHealthPercent) : null,
        sourceFeedId: assetEditForm.sourceFeedId || null,
        notes: assetEditForm.notes || null,
        reason: "Edicion de activo electrico desde vista de racks"
      });
      await onReload();
      setCrudState("saved");
    } catch {
      setCrudState("error");
    }
  }

  async function deletePowerAsset(id: string) {
    setCrudState("saving");

    try {
      await apiDelete(`/sites/${activeSiteCode}/power-assets/${id}`);
      setSelectedPowerAssetId("");
      await onReload();
      setCrudState("saved");
    } catch {
      setCrudState("error");
    }
  }

  async function placeDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCrudState("saving");
    try {
      await apiPatch(`/inventory/devices/${placementForm.deviceId}/placement`, {
        rackId: placementForm.rackId || selectedRack?.id,
        positionU: Number(placementForm.positionU),
        heightU: Number(placementForm.heightU),
        powerFeedId: placementForm.powerFeedId || null,
        reason: "Ubicacion fisica desde vista de rack"
      });
      await onReload();
      setCrudState("saved");
    } catch {
      setCrudState("error");
    }
  }

  return (
    <ModulePage eyebrow="Racks / energia" title="Vista fisica por sede, rack y alimentacion">
      <section className="metricGrid compactMetrics">
        <Metric label="Racks sede" value={String(siteRacks.length)} tone="neutral" />
        <Metric label="Equipos montados" value={String(mountedDevices)} tone="neutral" />
        <Metric label="Uso energia" value={`${utilization}%`} tone={utilization > 80 ? "warning" : "neutral"} />
        <Metric label="Carga W" value={String(totalLoad)} tone="neutral" />
      </section>
      <section className="rackLayout">
        <div className="panel rackListPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Racks</p>
              <h2>{activeSiteCode}</h2>
            </div>
            <select className="compactSelect" onChange={(event) => setActiveSiteCode(event.target.value)} value={activeSiteCode}>
              {sites.map((site) => <option key={site.id} value={site.code}>{site.code}</option>)}
              {sites.length === 0 && <option value={activeSiteCode}>{activeSiteCode}</option>}
            </select>
          </div>
          <div className="rackListStack">
            {siteRacks.map((rack) => (
              <div className="rackListWrap" key={rack.id}>
                <button className={rack.id === selectedRack?.id ? "rackListItem active" : "rackListItem"} onClick={() => setSelectedRackId(rack.id)} type="button">
                  <strong>{rack.code}</strong>
                  <span>{rack.name}</span>
                  <small>{rack.siteCode} - {rack.utilizationU}/{rack.heightU}U</small>
                </button>
                <button className="smallDanger" onClick={() => void deleteRack(rack.id)} type="button">Eliminar</button>
              </div>
            ))}
            {siteRacks.length === 0 && <span className="mutedText">Sin racks registrados en esta sede</span>}
          </div>
          {selectedRack && (
            <form className="quickForm" onSubmit={updateRack}>
              <p className="eyebrow">Editar rack</p>
              <label>Codigo<input onChange={(event) => setRackEditForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={rackEditForm.code} /></label>
              <label>RU<input inputMode="numeric" onChange={(event) => setRackEditForm((current) => ({ ...current, heightU: event.target.value }))} value={rackEditForm.heightU} /></label>
              <label className="wideField">Nombre<input onChange={(event) => setRackEditForm((current) => ({ ...current, name: event.target.value }))} value={rackEditForm.name} /></label>
              <button type="submit">Guardar rack</button>
              <span className={`formState ${crudState}`}>{formStateLabel(crudState)}</span>
            </form>
          )}
          <form className="quickForm" onSubmit={createRack}>
            <p className="eyebrow">Nuevo rack</p>
            <label>Codigo<input onChange={(event) => setRackForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={rackForm.code} /></label>
            <label>RU<input inputMode="numeric" onChange={(event) => setRackForm((current) => ({ ...current, heightU: event.target.value }))} value={rackForm.heightU} /></label>
            <label className="wideField">Nombre<input onChange={(event) => setRackForm((current) => ({ ...current, name: event.target.value }))} value={rackForm.name} /></label>
            <button type="submit">Agregar rack</button>
            <span className={`formState ${crudState}`}>{formStateLabel(crudState)}</span>
          </form>
        </div>
        <div className="panel rackVisualPanel">
          {selectedRack ? <RackDiagram rack={selectedRack} /> : <span className="mutedText">Sin racks registrados</span>}
          <form className="quickForm placementForm" onSubmit={placeDevice}>
            <p className="eyebrow">Ubicar equipo</p>
            <label>Equipo<select onChange={(event) => setPlacementForm((current) => ({ ...current, deviceId: event.target.value }))} value={placementForm.deviceId}>
              <option value="">Seleccionar</option>
              {siteDevices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
            </select></label>
            <label>Rack<select onChange={(event) => setPlacementForm((current) => ({ ...current, rackId: event.target.value }))} value={placementForm.rackId || selectedRack?.id || ""}>
              {siteRacks.map((rack) => <option key={rack.id} value={rack.id}>{rack.code}</option>)}
            </select></label>
            <label>U superior<input inputMode="numeric" onChange={(event) => setPlacementForm((current) => ({ ...current, positionU: event.target.value }))} value={placementForm.positionU} /></label>
            <label>Altura U<input inputMode="numeric" onChange={(event) => setPlacementForm((current) => ({ ...current, heightU: event.target.value }))} value={placementForm.heightU} /></label>
            <label className="wideField">Energia<select onChange={(event) => setPlacementForm((current) => ({ ...current, powerFeedId: event.target.value }))} value={placementForm.powerFeedId}>
              <option value="">Sin feed</option>
              {sitePowerFeeds.map((feed) => <option key={feed.id} value={feed.id}>{feed.name}</option>)}
            </select></label>
            <button type="submit">Montar equipo</button>
            <span className={`formState ${crudState}`}>{formStateLabel(crudState)}</span>
          </form>
        </div>
        <div className="panel powerPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Energia</p>
              <h2>Alimentacion por sede</h2>
            </div>
          </div>
          <div className="powerFeedList">
            {sitePowerFeeds.map((feed) => {
              const percent = feed.capacityWatts ? Math.round(((feed.loadWatts ?? 0) / feed.capacityWatts) * 100) : 0;
              return (
                <article className={selectedPowerFeed?.id === feed.id ? "selectedMiniItem" : ""} key={feed.id}>
                  <div>
                    <strong>{feed.name}</strong>
                    <span>{feed.feedType} - {feed.source ?? "sin fuente"}</span>
                  </div>
                  <small className={`statusText ${feed.status}`}>{feed.status}</small>
                  <div className="powerBar"><span style={{ width: `${Math.min(percent, 100)}%` }} /></div>
                  <em>{feed.loadWatts ?? 0}W / {feed.capacityWatts ?? 0}W</em>
                  <button className="smallGhost" onClick={() => setSelectedPowerFeedId(feed.id)} type="button">Editar</button>
                  <button className="smallDanger" onClick={() => void deletePowerFeed(feed.id)} type="button">Eliminar</button>
                </article>
              );
            })}
            {sitePowerFeeds.length === 0 && <span className="mutedText">Sin alimentaciones documentadas en esta sede</span>}
          </div>
          {selectedPowerFeed && (
            <form className="quickForm" onSubmit={updatePowerFeed}>
              <p className="eyebrow">Editar alimentacion</p>
              <label>Feed<select onChange={(event) => setSelectedPowerFeedId(event.target.value)} value={selectedPowerFeedId}>
                {sitePowerFeeds.map((feed) => <option key={feed.id} value={feed.id}>{feed.name}</option>)}
              </select></label>
              <label>Nombre<input onChange={(event) => setPowerEditForm((current) => ({ ...current, name: event.target.value }))} value={powerEditForm.name} /></label>
              <label>Tipo<select onChange={(event) => setPowerEditForm((current) => ({ ...current, feedType: event.target.value }))} value={powerEditForm.feedType}>
                <option value="ac">AC</option>
                <option value="dc">DC</option>
                <option value="ups">UPS</option>
                <option value="generator">Generador</option>
              </select></label>
              <label>Estado<select onChange={(event) => setPowerEditForm((current) => ({ ...current, status: event.target.value }))} value={powerEditForm.status}>
                <option value="active">Activo</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="degraded">Degradado</option>
                <option value="offline">Fuera de servicio</option>
              </select></label>
              <label>Capacidad W<input inputMode="numeric" onChange={(event) => setPowerEditForm((current) => ({ ...current, capacityWatts: event.target.value }))} value={powerEditForm.capacityWatts} /></label>
              <label>Carga W<input inputMode="numeric" onChange={(event) => setPowerEditForm((current) => ({ ...current, loadWatts: event.target.value }))} value={powerEditForm.loadWatts} /></label>
              <label className="wideField">Fuente<input onChange={(event) => setPowerEditForm((current) => ({ ...current, source: event.target.value }))} value={powerEditForm.source} /></label>
              <button type="submit">Guardar alimentacion</button>
              <span className={`formState ${crudState}`}>{formStateLabel(crudState)}</span>
            </form>
          )}
          <form className="quickForm" onSubmit={createPowerFeed}>
            <p className="eyebrow">Nueva alimentacion</p>
            <label>Nombre<input onChange={(event) => setPowerForm((current) => ({ ...current, name: event.target.value }))} value={powerForm.name} /></label>
            <label>Capacidad W<input inputMode="numeric" onChange={(event) => setPowerForm((current) => ({ ...current, capacityWatts: event.target.value }))} value={powerForm.capacityWatts} /></label>
            <label>Carga W<input inputMode="numeric" onChange={(event) => setPowerForm((current) => ({ ...current, loadWatts: event.target.value }))} value={powerForm.loadWatts} /></label>
            <label>Fuente<input onChange={(event) => setPowerForm((current) => ({ ...current, source: event.target.value }))} value={powerForm.source} /></label>
            <button type="submit">Agregar energia</button>
            <span className={`formState ${crudState}`}>{formStateLabel(crudState)}</span>
          </form>
          <div className="powerAssetList">
            <p className="eyebrow">Activos electricos</p>
            {sitePowerAssets.map((asset) => (
              <article className={selectedPowerAsset?.id === asset.id ? "selectedMiniItem" : ""} key={asset.id}>
                <button className="miniListButton" onClick={() => setSelectedPowerAssetId(asset.id)} type="button">
                  <strong>{asset.name}</strong>
                  <span>{asset.assetType} - {asset.sourceFeed ?? "sin feed"}</span>
                  <small className={`statusText ${asset.status}`}>{asset.status}</small>
                  <em>{asset.loadWatts ?? 0}W / {asset.capacityWatts ?? 0}W</em>
                  <em>Autonomia {asset.autonomyMinutes ?? 0} min - bateria {asset.batteryHealthPercent ?? 0}%</em>
                </button>
                <button className="smallDanger" onClick={() => void deletePowerAsset(asset.id)} type="button">Eliminar</button>
              </article>
            ))}
            {sitePowerAssets.length === 0 && <span className="mutedText">Sin activos electricos registrados en esta sede</span>}
          </div>
          {selectedPowerAsset && (
            <form className="quickForm" onSubmit={updatePowerAsset}>
              <p className="eyebrow">Editar activo electrico</p>
              <label>Nombre<input onChange={(event) => setAssetEditForm((current) => ({ ...current, name: event.target.value }))} value={assetEditForm.name} /></label>
              <label>Tipo<select onChange={(event) => setAssetEditForm((current) => ({ ...current, assetType: event.target.value }))} value={assetEditForm.assetType}>
                <option value="ups">UPS</option><option value="rectifier">Rectificador</option><option value="battery_bank">Baterias</option><option value="pdu">PDU</option><option value="generator">Generador</option>
              </select></label>
              <label>Estado<select onChange={(event) => setAssetEditForm((current) => ({ ...current, status: event.target.value }))} value={assetEditForm.status}>
                <option value="active">active</option><option value="degraded">degraded</option><option value="maintenance">maintenance</option><option value="down">down</option><option value="planned">planned</option>
              </select></label>
              <label>Capacidad W<input inputMode="numeric" onChange={(event) => setAssetEditForm((current) => ({ ...current, capacityWatts: event.target.value }))} value={assetEditForm.capacityWatts} /></label>
              <label>Carga W<input inputMode="numeric" onChange={(event) => setAssetEditForm((current) => ({ ...current, loadWatts: event.target.value }))} value={assetEditForm.loadWatts} /></label>
              <label>Autonomia min<input inputMode="numeric" onChange={(event) => setAssetEditForm((current) => ({ ...current, autonomyMinutes: event.target.value }))} value={assetEditForm.autonomyMinutes} /></label>
              <label>Salud bateria %<input inputMode="numeric" onChange={(event) => setAssetEditForm((current) => ({ ...current, batteryHealthPercent: event.target.value }))} value={assetEditForm.batteryHealthPercent} /></label>
              <label className="wideField">Feed<select onChange={(event) => setAssetEditForm((current) => ({ ...current, sourceFeedId: event.target.value }))} value={assetEditForm.sourceFeedId}>
                <option value="">Sin cambio / sin feed</option>
                {sitePowerFeeds.map((feed) => <option key={feed.id} value={feed.id}>{feed.name}</option>)}
              </select></label>
              <label className="wideField">Notas<input onChange={(event) => setAssetEditForm((current) => ({ ...current, notes: event.target.value }))} value={assetEditForm.notes} /></label>
              <button type="submit">Guardar activo</button>
              <span className={`formState ${crudState}`}>{formStateLabel(crudState)}</span>
            </form>
          )}
          <form className="quickForm" onSubmit={createPowerAsset}>
            <p className="eyebrow">Nuevo activo electrico</p>
            <label>Nombre<input onChange={(event) => setAssetForm((current) => ({ ...current, name: event.target.value }))} value={assetForm.name} /></label>
            <label>Tipo<select onChange={(event) => setAssetForm((current) => ({ ...current, assetType: event.target.value }))} value={assetForm.assetType}>
              <option value="ups">UPS</option><option value="rectifier">Rectificador</option><option value="battery_bank">Baterias</option><option value="pdu">PDU</option><option value="generator">Generador</option>
            </select></label>
            <label>Capacidad W<input inputMode="numeric" onChange={(event) => setAssetForm((current) => ({ ...current, capacityWatts: event.target.value }))} value={assetForm.capacityWatts} /></label>
            <label>Carga W<input inputMode="numeric" onChange={(event) => setAssetForm((current) => ({ ...current, loadWatts: event.target.value }))} value={assetForm.loadWatts} /></label>
            <label>Autonomia min<input inputMode="numeric" onChange={(event) => setAssetForm((current) => ({ ...current, autonomyMinutes: event.target.value }))} value={assetForm.autonomyMinutes} /></label>
            <label>Salud bateria %<input inputMode="numeric" onChange={(event) => setAssetForm((current) => ({ ...current, batteryHealthPercent: event.target.value }))} value={assetForm.batteryHealthPercent} /></label>
            <label className="wideField">Feed<select onChange={(event) => setAssetForm((current) => ({ ...current, sourceFeedId: event.target.value }))} value={assetForm.sourceFeedId}>
              <option value="">Sin feed</option>
              {sitePowerFeeds.map((feed) => <option key={feed.id} value={feed.id}>{feed.name}</option>)}
            </select></label>
            <label className="wideField">Notas<input onChange={(event) => setAssetForm((current) => ({ ...current, notes: event.target.value }))} value={assetForm.notes} /></label>
            <button type="submit">Agregar activo</button>
          </form>
        </div>
      </section>
    </ModulePage>
  );
}

function RackDiagram({ rack }: { rack: RackView }) {
  const units = Array.from({ length: rack.heightU }, (_, index) => rack.heightU - index);

  return (
    <div className="rackDiagram">
      <div className="rackHeader">
        <div>
          <p className="eyebrow">{rack.siteCode}</p>
          <h2>{rack.name}</h2>
        </div>
        <strong>{rack.heightU}RU</strong>
      </div>
      <div className="rackUnits">
        {units.map((unit) => {
          const device = rack.devices.find((item) => item.positionU !== null && unit <= item.positionU && unit > item.positionU - item.heightU);
          const isTop = device?.positionU === unit;
          return (
            <div className={device ? `rackUnit occupied ${device.status}` : "rackUnit"} key={unit}>
              <span>U{unit}</span>
              {device && isTop && <strong>{device.name}</strong>}
              {device && isTop && <small>{device.role} - {device.powerFeed ?? "sin energia"}</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DevicesView({ devices, onReload, sites }: { devices: Device[]; onReload: () => Promise<void>; sites: Site[] }) {
  const [deviceForm, setDeviceForm] = useState({ siteCode: sites[0]?.code ?? "AQP-POP", name: "", roleCode: "edge_router", status: "planned", managementIp: "", serialNumber: "" });
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.id ?? "");
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? devices[0];
  const [editForm, setEditForm] = useState({ siteCode: selectedDevice?.siteCode ?? "AQP-POP", name: selectedDevice?.name ?? "", roleCode: selectedDevice?.role ?? "edge_router", status: selectedDevice?.status ?? "planned", managementIp: selectedDevice?.managementIp ?? "" });
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (selectedDevice) {
      setEditForm({
        siteCode: selectedDevice.siteCode,
        name: selectedDevice.name,
        roleCode: selectedDevice.role,
        status: selectedDevice.status,
        managementIp: selectedDevice.managementIp ?? ""
      });
    }
  }, [selectedDevice]);

  async function createDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("saving");

    try {
      await apiPost("/inventory/devices", {
        siteCode: deviceForm.siteCode,
        name: deviceForm.name,
        roleCode: deviceForm.roleCode || null,
        status: deviceForm.status,
        managementIp: deviceForm.managementIp || null,
        serialNumber: deviceForm.serialNumber || null,
        reason: "Alta desde modulo Equipos"
      });
      setDeviceForm((current) => ({ ...current, name: "", managementIp: "", serialNumber: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDevice) return;
    setFormState("saving");

    try {
      await apiPatch(`/inventory/devices/${selectedDevice.id}`, {
        siteCode: editForm.siteCode,
        name: editForm.name,
        roleCode: editForm.roleCode || null,
        status: editForm.status,
        managementIp: editForm.managementIp || null,
        reason: "Edicion desde modulo Equipos"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteSelectedDevice() {
    if (!selectedDevice) return;
    setFormState("saving");

    try {
      await apiDelete(`/inventory/devices/${selectedDevice.id}`);
      setSelectedDeviceId("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="Equipos" title="Inventario tecnico por sede y rol">
      <section className="deviceWorkbenchGrid">
        <div className="panel deviceListPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Inventario</p>
              <h2>{devices.length} equipos</h2>
            </div>
          </div>
          <div className="deviceList">
            {devices.map((device) => (
              <button className={device.id === selectedDevice?.id ? "deviceListItem active" : "deviceListItem"} key={device.id} onClick={() => setSelectedDeviceId(device.id)} type="button">
                <strong>{device.name}</strong>
                <span>{device.role} - {device.siteCode}</span>
                <small className={`statusText ${device.status}`}>{device.status} / {device.managementIp ?? "sin IP"}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Alta rapida</p>
              <h2>Nuevo equipo</h2>
            </div>
          </div>
          <form className="quickForm" onSubmit={createDevice}>
            <label className="wideField">Sede<select onChange={(event) => setDeviceForm((current) => ({ ...current, siteCode: event.target.value }))} value={deviceForm.siteCode}>
              {sites.map((site) => <option key={site.id} value={site.code}>{site.code} - {site.name}</option>)}
            </select></label>
            <label className="wideField">Nombre<input onChange={(event) => setDeviceForm((current) => ({ ...current, name: event.target.value.toUpperCase() }))} value={deviceForm.name} /></label>
            <label>Rol<DeviceRoleSelect onChange={(value) => setDeviceForm((current) => ({ ...current, roleCode: value }))} value={deviceForm.roleCode} /></label>
            <label>Estado<DeviceStatusSelect onChange={(value) => setDeviceForm((current) => ({ ...current, status: value }))} value={deviceForm.status} /></label>
            <label>IP gestion<input onChange={(event) => setDeviceForm((current) => ({ ...current, managementIp: event.target.value }))} value={deviceForm.managementIp} /></label>
            <label>Serie<input onChange={(event) => setDeviceForm((current) => ({ ...current, serialNumber: event.target.value }))} value={deviceForm.serialNumber} /></label>
            <button type="submit">Crear equipo</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Edicion</p>
              <h2>{selectedDevice?.name ?? "Selecciona equipo"}</h2>
            </div>
          </div>
          {selectedDevice ? (
            <form className="quickForm" onSubmit={updateDevice}>
              <label className="wideField">Sede<select onChange={(event) => setEditForm((current) => ({ ...current, siteCode: event.target.value }))} value={editForm.siteCode}>
                {sites.map((site) => <option key={site.id} value={site.code}>{site.code} - {site.name}</option>)}
              </select></label>
              <label className="wideField">Nombre<input onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value.toUpperCase() }))} value={editForm.name} /></label>
              <label>Rol<DeviceRoleSelect onChange={(value) => setEditForm((current) => ({ ...current, roleCode: value }))} value={editForm.roleCode} /></label>
              <label>Estado<DeviceStatusSelect onChange={(value) => setEditForm((current) => ({ ...current, status: value }))} value={editForm.status} /></label>
              <label className="wideField">IP gestion<input onChange={(event) => setEditForm((current) => ({ ...current, managementIp: event.target.value }))} value={editForm.managementIp} /></label>
              <button type="submit">Guardar cambios</button>
              <button className="dangerButton" onClick={() => void deleteSelectedDevice()} type="button">Eliminar si no tiene dependencias</button>
              <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
            </form>
          ) : (
            <span className="mutedText">Sin equipo seleccionado</span>
          )}
        </div>
      </section>
    </ModulePage>
  );
}

function DeviceRoleSelect({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <select onChange={(event) => onChange(event.target.value)} value={value}>
      <option value="edge_router">Router edge</option>
      <option value="core_router">Router core</option>
      <option value="olt">OLT</option>
      <option value="switch">Switch</option>
      <option value="server">Servidor</option>
    </select>
  );
}

function DeviceStatusSelect({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <select onChange={(event) => onChange(event.target.value)} value={value}>
      <option value="planned">Planificado</option>
      <option value="active">Activo</option>
      <option value="degraded">Degradado</option>
      <option value="maintenance">Mantenimiento</option>
    </select>
  );
}

function InterfacesView({
  circuits,
  devices,
  interfaceLinks,
  interfaces,
  onReload
}: {
  circuits: Circuit[];
  devices: Device[];
  interfaceLinks: InterfaceLink[];
  interfaces: NetworkInterface[];
  onReload: () => Promise<void>;
}) {
  const [interfaceForm, setInterfaceForm] = useState({ deviceName: devices[0]?.name ?? "", name: "", interfaceType: "ethernet", status: "unknown", speedMbps: "", description: "" });
  const [selectedInterfaceId, setSelectedInterfaceId] = useState(interfaces[0]?.id ?? "");
  const selectedInterface = interfaces.find((item) => item.id === selectedInterfaceId) ?? interfaces[0];
  const [editForm, setEditForm] = useState({ name: selectedInterface?.name ?? "", interfaceType: selectedInterface?.type ?? "ethernet", status: selectedInterface?.status ?? "unknown", speedMbps: selectedInterface?.speedMbps ? String(selectedInterface.speedMbps) : "", description: selectedInterface?.description ?? "" });
  const [linkForm, setLinkForm] = useState({ aInterfaceId: interfaces[0]?.id ?? "", bInterfaceId: interfaces[1]?.id ?? "", circuitCode: "", linkType: "patchcord", status: "active", capacityMbps: "" });
  const [selectedLinkId, setSelectedLinkId] = useState("");
  const selectedLink = interfaceLinks.find((link) => link.id === selectedLinkId);
  const [linkEditForm, setLinkEditForm] = useState({ circuitCode: "", linkType: "patchcord", status: "active", capacityMbps: "" });
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const linksForSelected = selectedInterface
    ? interfaceLinks.filter((link) => link.aInterfaceId === selectedInterface.id || link.bInterfaceId === selectedInterface.id)
    : [];

  useEffect(() => {
    if (selectedInterface) {
      setEditForm({
        name: selectedInterface.name,
        interfaceType: selectedInterface.type,
        status: selectedInterface.status,
        speedMbps: selectedInterface.speedMbps ? String(selectedInterface.speedMbps) : "",
        description: selectedInterface.description ?? ""
      });
    }
  }, [selectedInterface]);

  useEffect(() => {
    if (selectedInterface && linkForm.aInterfaceId !== selectedInterface.id) {
      const nextPeer = interfaces.find((item) => item.id !== selectedInterface.id)?.id ?? "";
      setLinkForm((current) => ({ ...current, aInterfaceId: selectedInterface.id, bInterfaceId: current.bInterfaceId && current.bInterfaceId !== selectedInterface.id ? current.bInterfaceId : nextPeer }));
    }
  }, [interfaces, linkForm.aInterfaceId, selectedInterface]);

  useEffect(() => {
    if (!selectedLink && linksForSelected[0]) {
      setSelectedLinkId(linksForSelected[0].id);
    }
  }, [linksForSelected, selectedLink]);

  useEffect(() => {
    if (selectedLink) {
      setLinkEditForm({
        circuitCode: selectedLink.circuitCode ?? "",
        linkType: selectedLink.linkType,
        status: selectedLink.status,
        capacityMbps: selectedLink.capacityMbps ? String(selectedLink.capacityMbps) : ""
      });
    }
  }, [selectedLink]);

  async function createInterface(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("saving");

    try {
      await apiPost("/inventory/interfaces", {
        deviceName: interfaceForm.deviceName,
        name: interfaceForm.name,
        interfaceType: interfaceForm.interfaceType,
        status: interfaceForm.status,
        speedMbps: interfaceForm.speedMbps ? Number(interfaceForm.speedMbps) : null,
        description: interfaceForm.description || null,
        reason: "Alta desde modulo Interfaces"
      });
      setInterfaceForm((current) => ({ ...current, name: "", speedMbps: "", description: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateInterface(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedInterface) return;
    setFormState("saving");

    try {
      await apiPatch(`/inventory/interfaces/${selectedInterface.id}`, {
        name: editForm.name,
        interfaceType: editForm.interfaceType,
        status: editForm.status,
        speedMbps: editForm.speedMbps ? Number(editForm.speedMbps) : null,
        description: editForm.description || null,
        reason: "Edicion desde modulo Interfaces"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteSelectedInterface() {
    if (!selectedInterface) return;
    setFormState("saving");

    try {
      await apiDelete(`/inventory/interfaces/${selectedInterface.id}`);
      setSelectedInterfaceId("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function createInterfaceLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!linkForm.aInterfaceId || !linkForm.bInterfaceId || linkForm.aInterfaceId === linkForm.bInterfaceId) {
      setFormState("error");
      return;
    }

    setFormState("saving");

    try {
      await apiPost("/inventory/interface-links", {
        aInterfaceId: linkForm.aInterfaceId,
        bInterfaceId: linkForm.bInterfaceId,
        circuitCode: linkForm.circuitCode || null,
        linkType: linkForm.linkType,
        status: linkForm.status,
        capacityMbps: linkForm.capacityMbps ? Number(linkForm.capacityMbps) : null,
        reason: "Alta de enlace puerto a puerto desde modulo Interfaces"
      });
      setLinkForm((current) => ({ ...current, circuitCode: "", capacityMbps: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateInterfaceLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLink) return;
    setFormState("saving");

    try {
      await apiPatch(`/inventory/interface-links/${selectedLink.id}`, {
        circuitCode: linkEditForm.circuitCode || null,
        linkType: linkEditForm.linkType,
        status: linkEditForm.status,
        capacityMbps: linkEditForm.capacityMbps ? Number(linkEditForm.capacityMbps) : null,
        reason: "Edicion de enlace puerto a puerto desde modulo Interfaces"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteInterfaceLink(id: string) {
    setFormState("saving");

    try {
      await apiDelete(`/inventory/interface-links/${id}`);
      setSelectedLinkId("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="Interfaces" title="Puertos fisicos, logicos y contexto de enlace">
      <section className="deviceWorkbenchGrid">
        <div className="panel deviceListPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Puertos</p>
              <h2>{interfaces.length} interfaces</h2>
            </div>
          </div>
          <div className="deviceList">
            {interfaces.map((networkInterface) => (
              <button className={networkInterface.id === selectedInterface?.id ? "deviceListItem active" : "deviceListItem"} key={networkInterface.id} onClick={() => setSelectedInterfaceId(networkInterface.id)} type="button">
                <strong>{networkInterface.device} {networkInterface.name}</strong>
                <span>{networkInterface.type} - {networkInterface.siteCode}</span>
                <small className={`statusText ${networkInterface.status}`}>{networkInterface.status} / {networkInterface.speedMbps ? `${networkInterface.speedMbps} Mbps` : "sin velocidad"}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Alta rapida</p>
              <h2>Nueva interfaz</h2>
            </div>
          </div>
          <form className="quickForm" onSubmit={createInterface}>
            <label className="wideField">Equipo<select onChange={(event) => setInterfaceForm((current) => ({ ...current, deviceName: event.target.value }))} value={interfaceForm.deviceName}>
              {devices.map((device) => <option key={device.id} value={device.name}>{device.name} - {device.siteCode}</option>)}
            </select></label>
            <label>Nombre<input onChange={(event) => setInterfaceForm((current) => ({ ...current, name: event.target.value }))} value={interfaceForm.name} /></label>
            <label>Tipo<InterfaceTypeSelect onChange={(value) => setInterfaceForm((current) => ({ ...current, interfaceType: value }))} value={interfaceForm.interfaceType} /></label>
            <label>Estado<InterfaceStatusSelect onChange={(value) => setInterfaceForm((current) => ({ ...current, status: value }))} value={interfaceForm.status} /></label>
            <label>Mbps<input inputMode="numeric" onChange={(event) => setInterfaceForm((current) => ({ ...current, speedMbps: event.target.value }))} value={interfaceForm.speedMbps} /></label>
            <label className="wideField">Descripcion<input onChange={(event) => setInterfaceForm((current) => ({ ...current, description: event.target.value }))} value={interfaceForm.description} /></label>
            <button type="submit">Crear interfaz</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Edicion</p>
              <h2>{selectedInterface ? `${selectedInterface.device} ${selectedInterface.name}` : "Selecciona interfaz"}</h2>
            </div>
          </div>
          {selectedInterface ? (
            <form className="quickForm" onSubmit={updateInterface}>
              <label>Nombre<input onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} value={editForm.name} /></label>
              <label>Tipo<InterfaceTypeSelect onChange={(value) => setEditForm((current) => ({ ...current, interfaceType: value }))} value={editForm.interfaceType} /></label>
              <label>Estado<InterfaceStatusSelect onChange={(value) => setEditForm((current) => ({ ...current, status: value }))} value={editForm.status} /></label>
              <label>Mbps<input inputMode="numeric" onChange={(event) => setEditForm((current) => ({ ...current, speedMbps: event.target.value }))} value={editForm.speedMbps} /></label>
              <label className="wideField">Descripcion<input onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} value={editForm.description} /></label>
              <button type="submit">Guardar interfaz</button>
              <button className="dangerButton" onClick={() => void deleteSelectedInterface()} type="button">Eliminar si no tiene dependencias</button>
              <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
            </form>
          ) : (
            <span className="mutedText">Sin interfaz seleccionada</span>
          )}
        </div>
        <div className="panel interfaceLinkPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Conexiones</p>
              <h2>Puerto a puerto</h2>
            </div>
          </div>
          <div className="miniList">
            {linksForSelected.map((link) => {
              const peerId = link.aInterfaceId === selectedInterface?.id ? link.bInterfaceId : link.aInterfaceId;
              const peer = interfaces.find((item) => item.id === peerId);
              return (
                <article className={selectedLink?.id === link.id ? "selectedMiniItem" : ""} key={link.id}>
                  <button className="miniListButton" onClick={() => setSelectedLinkId(link.id)} type="button">
                    <strong>{link.aDevice} / {link.bDevice}</strong>
                    <span>{peer ? `${peer.device} ${peer.name} / ${peer.siteCode}` : "interfaz remota"} - {link.circuitCode ?? "sin circuito"}</span>
                    <small className={`statusText ${link.status}`}>{link.linkType} / {link.status} / {link.capacityMbps ? `${link.capacityMbps} Mbps` : "sin capacidad"}</small>
                  </button>
                  <button className="smallDanger" onClick={() => void deleteInterfaceLink(link.id)} type="button">Eliminar</button>
                </article>
              );
            })}
            {linksForSelected.length === 0 && <span className="mutedText">Sin enlaces documentados para la interfaz seleccionada</span>}
          </div>
          {selectedLink && (
            <form className="quickForm" onSubmit={updateInterfaceLink}>
              <p className="eyebrow">Editar enlace seleccionado</p>
              <label>Tipo<select onChange={(event) => setLinkEditForm((current) => ({ ...current, linkType: event.target.value }))} value={linkEditForm.linkType}>
                <option value="patchcord">patchcord</option>
                <option value="uplink">uplink</option>
                <option value="transport">transport</option>
                <option value="pon">pon</option>
                <option value="radio">radio</option>
                <option value="logical">logical</option>
              </select></label>
              <label>Estado<select onChange={(event) => setLinkEditForm((current) => ({ ...current, status: event.target.value }))} value={linkEditForm.status}>
                <option value="active">active</option>
                <option value="degraded">degraded</option>
                <option value="down">down</option>
                <option value="planned">planned</option>
              </select></label>
              <label>Circuito<select onChange={(event) => setLinkEditForm((current) => ({ ...current, circuitCode: event.target.value }))} value={linkEditForm.circuitCode}>
                <option value="">Sin circuito</option>
                {circuits.map((circuit) => <option key={circuit.id} value={circuit.code}>{circuit.code}</option>)}
              </select></label>
              <label>Mbps<input inputMode="numeric" onChange={(event) => setLinkEditForm((current) => ({ ...current, capacityMbps: event.target.value }))} value={linkEditForm.capacityMbps} /></label>
              <button type="submit">Guardar enlace</button>
              <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
            </form>
          )}
          <form className="quickForm" onSubmit={createInterfaceLink}>
            <p className="eyebrow">Nuevo enlace</p>
            <label className="wideField">Interfaz A<select onChange={(event) => setLinkForm((current) => ({ ...current, aInterfaceId: event.target.value }))} value={linkForm.aInterfaceId}>
              {interfaces.map((item) => <option key={item.id} value={item.id}>{item.device} {item.name} - {item.siteCode}</option>)}
            </select></label>
            <label className="wideField">Interfaz B<select onChange={(event) => setLinkForm((current) => ({ ...current, bInterfaceId: event.target.value }))} value={linkForm.bInterfaceId}>
              {interfaces.map((item) => <option disabled={item.id === linkForm.aInterfaceId} key={item.id} value={item.id}>{item.device} {item.name} - {item.siteCode}</option>)}
            </select></label>
            <label>Tipo<select onChange={(event) => setLinkForm((current) => ({ ...current, linkType: event.target.value }))} value={linkForm.linkType}>
              <option value="patchcord">patchcord</option>
              <option value="uplink">uplink</option>
              <option value="transport">transport</option>
              <option value="pon">pon</option>
              <option value="radio">radio</option>
              <option value="logical">logical</option>
            </select></label>
            <label>Estado<select onChange={(event) => setLinkForm((current) => ({ ...current, status: event.target.value }))} value={linkForm.status}>
              <option value="active">active</option>
              <option value="degraded">degraded</option>
              <option value="down">down</option>
              <option value="planned">planned</option>
            </select></label>
            <label>Circuito<select onChange={(event) => setLinkForm((current) => ({ ...current, circuitCode: event.target.value }))} value={linkForm.circuitCode}>
              <option value="">Sin circuito</option>
              {circuits.map((circuit) => <option key={circuit.id} value={circuit.code}>{circuit.code}</option>)}
            </select></label>
            <label>Mbps<input inputMode="numeric" onChange={(event) => setLinkForm((current) => ({ ...current, capacityMbps: event.target.value }))} value={linkForm.capacityMbps} /></label>
            <button disabled={!linkForm.aInterfaceId || !linkForm.bInterfaceId || linkForm.aInterfaceId === linkForm.bInterfaceId} type="submit">Crear enlace</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
      </section>
    </ModulePage>
  );
}

function InterfaceTypeSelect({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <select onChange={(event) => onChange(event.target.value)} value={value}>
      <option value="ethernet">Ethernet</option>
      <option value="sfp">SFP/SFP+</option>
      <option value="pon">PON</option>
      <option value="loopback">Loopback</option>
      <option value="vlan">VLAN</option>
      <option value="radio">Radio</option>
    </select>
  );
}

function InterfaceStatusSelect({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <select onChange={(event) => onChange(event.target.value)} value={value}>
      <option value="unknown">Desconocido</option>
      <option value="active">Activo</option>
      <option value="degraded">Degradado</option>
      <option value="down">Caido</option>
      <option value="disabled">Deshabilitado</option>
      <option value="planned">Planificado</option>
    </select>
  );
}

function TopologyView({ graph }: { graph: ReturnType<typeof usePlatformData>["topology"] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedNodeId, setSelectedNodeId] = useState(graph.nodes[0]?.id ?? "");
  const filteredGraph = useMemo(() => {
    if (statusFilter === "all") {
      return graph;
    }

    const edges = graph.edges.filter((edge) => edge.status === statusFilter);
    const nodeIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
    const nodes = graph.nodes.filter((node) => node.status === statusFilter || nodeIds.has(node.id));
    return { nodes, edges };
  }, [graph, statusFilter]);
  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId);
  const selectedEdges = selectedNode ? graph.edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id) : [];
  const degradedEdges = graph.edges.filter((edge) => edge.status === "degraded").length;
  const downEdges = graph.edges.filter((edge) => edge.status === "down").length;

  return (
    <ModulePage eyebrow="Topologia" title="Grafo operativo derivado de relaciones reales">
      <section className="metricGrid compactMetrics">
        <Metric label="Nodos" value={String(graph.nodes.length)} tone="neutral" />
        <Metric label="Enlaces" value={String(graph.edges.length)} tone="neutral" />
        <Metric label="Degradados" value={String(degradedEdges)} tone={degradedEdges > 0 ? "warning" : "neutral"} />
        <Metric label="Caidos" value={String(downEdges)} tone={downEdges > 0 ? "critical" : "neutral"} />
      </section>
      <section className="topologyWorkbench">
        <div className="panel topologyGraphPanel">
          <div className="panelHeader">
            <div><p className="eyebrow">Grafo</p><h2>Vista filtrada</h2></div>
            <select className="inlineSelect" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="all">Todos</option>
              <option value="healthy">Healthy</option>
              <option value="degraded">Degraded</option>
              <option value="down">Down</option>
            </select>
          </div>
          <TopologyMap graph={filteredGraph} />
        </div>
        <div className="panel topologyDetailPanel">
          <div className="panelHeader"><div><p className="eyebrow">Detalle</p><h2>{selectedNode?.label ?? "Selecciona nodo"}</h2></div></div>
          <div className="deviceList compactList">
            {graph.nodes.map((node) => (
              <button className={node.id === selectedNodeId ? "deviceListItem active" : "deviceListItem"} key={node.id} onClick={() => setSelectedNodeId(node.id)} type="button">
                <strong>{node.label}</strong>
                <span>{node.type}</span>
                <small className={`statusText ${node.status}`}>{node.status}</small>
              </button>
            ))}
          </div>
          {selectedNode && (
            <DataTable
              columns={["Vecino", "Estado", "Etiqueta"]}
              statusColumnIndex={1}
              rows={selectedEdges.map((edge) => {
                const neighborId = edge.source === selectedNode.id ? edge.target : edge.source;
                const neighbor = graph.nodes.find((node) => node.id === neighborId);
                return [neighbor?.label ?? neighborId, edge.status, edge.label];
              })}
            />
          )}
        </div>
      </section>
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Aristas</p><h2>Conexiones documentadas</h2></div></div>
        <DataTable
          columns={["Origen", "Destino", "Estado", "Etiqueta"]}
          statusColumnIndex={2}
          rows={graph.edges.map((edge) => [
            graph.nodes.find((node) => node.id === edge.source)?.label ?? edge.source,
            graph.nodes.find((node) => node.id === edge.target)?.label ?? edge.target,
            edge.status,
            edge.label
          ])}
        />
      </section>
    </ModulePage>
  );
}

function MonitoringView({
  alerts,
  circuits,
  devices,
  maintenanceWindows,
  onReload,
  prefixes,
  sites
}: {
  alerts: Alert[];
  circuits: Circuit[];
  devices: Device[];
  maintenanceWindows: MaintenanceWindow[];
  onReload: () => Promise<void>;
  prefixes: Prefix[];
  sites: Site[];
}) {
  const objectOptions = [
    ...sites.map((site) => ({ id: site.id, label: `${site.code} - ${site.name}`, type: "site" })),
    ...devices.map((device) => ({ id: device.id, label: `${device.name} - ${device.siteCode}`, type: "device" })),
    ...circuits.map((circuit) => ({ id: circuit.id, label: `${circuit.code} - ${circuit.name}`, type: "circuit" })),
    ...prefixes.map((prefix) => ({ id: prefix.id, label: `${prefix.prefix} - ${prefix.siteCode}`, type: "prefix" }))
  ];
  const [alertForm, setAlertForm] = useState({
    objectKey: objectOptions[0] ? `${objectOptions[0].type}:${objectOptions[0].id}` : "",
    monitorSource: "manual-noc",
    severity: "major",
    title: "",
    description: ""
  });
  const [alertOperationForm, setAlertOperationForm] = useState({
    alertId: alerts[0]?.id ?? "",
    status: alerts[0]?.status ?? "acknowledged"
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    objectKey: objectOptions[0] ? `${objectOptions[0].type}:${objectOptions[0].id}` : "",
    title: "",
    status: "scheduled",
    startsAt: "",
    endsAt: ""
  });
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState(maintenanceWindows[0]?.id ?? "");
  const selectedMaintenance = maintenanceWindows.find((window) => window.id === selectedMaintenanceId);
  const [maintenanceEditForm, setMaintenanceEditForm] = useState({
    title: selectedMaintenance?.title ?? "",
    status: selectedMaintenance?.status ?? "scheduled",
    startsAt: selectedMaintenance ? selectedMaintenance.startsAt.slice(0, 16) : "",
    endsAt: selectedMaintenance ? selectedMaintenance.endsAt.slice(0, 16) : ""
  });
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const critical = alerts.filter((alert) => alert.severity === "critical").length;
  const major = alerts.filter((alert) => alert.severity === "major").length;
  const minor = alerts.filter((alert) => alert.severity === "minor").length;
  const selectedAlert = alerts.find((alert) => alert.id === alertOperationForm.alertId);

  useEffect(() => {
    if (selectedMaintenance) {
      setMaintenanceEditForm({
        title: selectedMaintenance.title,
        status: selectedMaintenance.status,
        startsAt: selectedMaintenance.startsAt.slice(0, 16),
        endsAt: selectedMaintenance.endsAt.slice(0, 16)
      });
    }
  }, [selectedMaintenance]);

  function splitObjectKey(key: string) {
    const [objectType, objectId] = key.split(":");
    return { objectId, objectType };
  }

  function alertIncidentCode(alert: Alert) {
    const suffix = alert.id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase();
    return `INC-ALERT-${suffix || Date.now()}`;
  }

  async function createAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const objectRef = splitObjectKey(alertForm.objectKey);
    setFormState("saving");

    try {
      await apiPost("/monitoring/alerts", {
        objectType: objectRef.objectType,
        objectId: objectRef.objectId,
        monitorSource: alertForm.monitorSource,
        severity: alertForm.severity,
        title: alertForm.title,
        description: alertForm.description || null,
        reason: "Alta manual desde modulo Monitoreo"
      });
      setAlertForm((current) => ({ ...current, title: "", description: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function acknowledgeAlert() {
    if (!selectedAlert) return;
    setFormState("saving");

    try {
      await apiPost(`/monitoring/alerts/${selectedAlert.id}/ack`, {});
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function createIncidentFromAlert() {
    if (!selectedAlert) return;
    setFormState("saving");

    try {
      await apiPost("/incidents", {
        code: alertIncidentCode(selectedAlert),
        title: selectedAlert.title,
        severity: selectedAlert.severity,
        status: "open",
        ownerTeam: "noc",
        summary: `${selectedAlert.context || "Alerta generada desde monitoreo"} | Fuente: ${selectedAlert.monitorSource ?? "monitoring"}`,
        impacts: selectedAlert.objectType && selectedAlert.objectId ? [{
          objectType: selectedAlert.objectType,
          objectId: selectedAlert.objectId,
          impactType: selectedAlert.severity === "critical" ? "service_down" : "service_risk",
          notes: `Escalado desde alerta ${selectedAlert.id}`
        }] : [],
        reason: "Escalamiento desde alerta de monitoreo"
      });
      await apiPost(`/monitoring/alerts/${selectedAlert.id}/ack`, {});
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateAlertStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAlert) return;
    setFormState("saving");

    try {
      await apiPatch(`/monitoring/alerts/${selectedAlert.id}/status`, {
        status: alertOperationForm.status,
        reason: "Cambio desde consola NOC"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteAlert() {
    if (!selectedAlert) return;
    setFormState("saving");

    try {
      await apiDelete(`/monitoring/alerts/${selectedAlert.id}`);
      setAlertOperationForm({ alertId: "", status: "acknowledged" });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function createMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const objectRef = splitObjectKey(maintenanceForm.objectKey);
    setFormState("saving");

    try {
      await apiPost("/monitoring/maintenance-windows", {
        objectType: objectRef.objectType,
        objectId: objectRef.objectId,
        title: maintenanceForm.title,
        status: maintenanceForm.status,
        startsAt: maintenanceForm.startsAt,
        endsAt: maintenanceForm.endsAt,
        reason: "Programacion desde modulo Monitoreo"
      });
      setMaintenanceForm((current) => ({ ...current, title: "", startsAt: "", endsAt: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMaintenance) return;
    setFormState("saving");

    try {
      await apiPatch(`/monitoring/maintenance-windows/${selectedMaintenance.id}`, {
        title: maintenanceEditForm.title,
        status: maintenanceEditForm.status,
        startsAt: maintenanceEditForm.startsAt,
        endsAt: maintenanceEditForm.endsAt,
        reason: "Actualizacion desde modulo Monitoreo"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteMaintenance() {
    if (!selectedMaintenance) return;
    setFormState("saving");

    try {
      await apiDelete(`/monitoring/maintenance-windows/${selectedMaintenance.id}`);
      setSelectedMaintenanceId("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="Monitoreo" title="Alertas normalizadas y ventanas de mantenimiento">
      <section className="metricGrid compactMetrics">
        <Metric label="Criticas" value={String(critical)} tone="critical" />
        <Metric label="Mayores" value={String(major)} tone="warning" />
        <Metric label="Menores" value={String(minor)} tone="neutral" />
        <Metric label="Mantenimientos" value={String(maintenanceWindows.length)} tone="neutral" />
      </section>
      <section className="monitoringWorkbench">
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">NOC</p><h2>Crear alerta</h2></div></div>
          <form className="quickForm" onSubmit={createAlert}>
            <label className="wideField">Objeto<select onChange={(event) => setAlertForm((current) => ({ ...current, objectKey: event.target.value }))} value={alertForm.objectKey}>
              {objectOptions.map((option) => <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>{option.type} - {option.label}</option>)}
            </select></label>
            <label>Severidad<select onChange={(event) => setAlertForm((current) => ({ ...current, severity: event.target.value }))} value={alertForm.severity}>
              <option value="critical">critical</option><option value="major">major</option><option value="minor">minor</option>
            </select></label>
            <label>Fuente<input onChange={(event) => setAlertForm((current) => ({ ...current, monitorSource: event.target.value }))} value={alertForm.monitorSource} /></label>
            <label className="wideField">Titulo<input onChange={(event) => setAlertForm((current) => ({ ...current, title: event.target.value }))} value={alertForm.title} /></label>
            <label className="wideField">Contexto<input onChange={(event) => setAlertForm((current) => ({ ...current, description: event.target.value }))} value={alertForm.description} /></label>
            <button disabled={!alertForm.objectKey || !alertForm.title} type="submit">Crear alerta</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Operacion</p><h2>Reconocer o cerrar</h2></div></div>
          <form className="quickForm" onSubmit={updateAlertStatus}>
            <label className="wideField">Alerta<select onChange={(event) => {
              const next = alerts.find((alert) => alert.id === event.target.value);
              setAlertOperationForm({ alertId: event.target.value, status: next?.status ?? "acknowledged" });
            }} value={alertOperationForm.alertId}>
              <option value="">Seleccionar</option>
              {alerts.map((alert) => <option key={alert.id} value={alert.id}>{alert.severity} - {alert.title}</option>)}
            </select></label>
            <label>Estado<select onChange={(event) => setAlertOperationForm((current) => ({ ...current, status: event.target.value }))} value={alertOperationForm.status}>
              <option value="active">active</option><option value="acknowledged">acknowledged</option><option value="resolved">resolved</option><option value="muted">muted</option>
            </select></label>
            <button disabled={!selectedAlert} type="submit">Cambiar estado</button>
            <button disabled={!selectedAlert} onClick={() => void acknowledgeAlert()} type="button">ACK</button>
            <button disabled={!selectedAlert} onClick={() => void createIncidentFromAlert()} type="button">Crear incidencia</button>
            <button className="dangerButton" disabled={!selectedAlert} onClick={() => void deleteAlert()} type="button">Eliminar alerta</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
          {selectedAlert && (
            <article className="selectedAlertCard">
              <span className={`statusText ${selectedAlert.severity}`}>{selectedAlert.severity}</span>
              <strong>{selectedAlert.title}</strong>
              <small>{selectedAlert.objectType}:{selectedAlert.objectId}</small>
              <small>{selectedAlert.context || "Sin contexto adicional"}</small>
            </article>
          )}
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Mantenimiento</p><h2>Ventana programada</h2></div></div>
          <form className="quickForm" onSubmit={createMaintenance}>
            <label className="wideField">Objeto<select onChange={(event) => setMaintenanceForm((current) => ({ ...current, objectKey: event.target.value }))} value={maintenanceForm.objectKey}>
              {objectOptions.map((option) => <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>{option.type} - {option.label}</option>)}
            </select></label>
            <label className="wideField">Titulo<input onChange={(event) => setMaintenanceForm((current) => ({ ...current, title: event.target.value }))} value={maintenanceForm.title} /></label>
            <label>Inicio<input onChange={(event) => setMaintenanceForm((current) => ({ ...current, startsAt: event.target.value }))} type="datetime-local" value={maintenanceForm.startsAt} /></label>
            <label>Fin<input onChange={(event) => setMaintenanceForm((current) => ({ ...current, endsAt: event.target.value }))} type="datetime-local" value={maintenanceForm.endsAt} /></label>
            <label>Estado<select onChange={(event) => setMaintenanceForm((current) => ({ ...current, status: event.target.value }))} value={maintenanceForm.status}>
              <option value="scheduled">scheduled</option><option value="active">active</option><option value="completed">completed</option><option value="cancelled">cancelled</option>
            </select></label>
            <button disabled={!maintenanceForm.objectKey || !maintenanceForm.title || !maintenanceForm.startsAt || !maintenanceForm.endsAt} type="submit">Programar</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
          <form className="quickForm" onSubmit={updateMaintenance}>
            <p className="eyebrow">Editar ventana</p>
            <label className="wideField">Ventana<select onChange={(event) => setSelectedMaintenanceId(event.target.value)} value={selectedMaintenanceId}>
              <option value="">Seleccionar</option>
              {maintenanceWindows.map((window) => <option key={window.id} value={window.id}>{window.status} - {window.title}</option>)}
            </select></label>
            <label className="wideField">Titulo<input disabled={!selectedMaintenance} onChange={(event) => setMaintenanceEditForm((current) => ({ ...current, title: event.target.value }))} value={maintenanceEditForm.title} /></label>
            <label>Inicio<input disabled={!selectedMaintenance} onChange={(event) => setMaintenanceEditForm((current) => ({ ...current, startsAt: event.target.value }))} type="datetime-local" value={maintenanceEditForm.startsAt} /></label>
            <label>Fin<input disabled={!selectedMaintenance} onChange={(event) => setMaintenanceEditForm((current) => ({ ...current, endsAt: event.target.value }))} type="datetime-local" value={maintenanceEditForm.endsAt} /></label>
            <label>Estado<select disabled={!selectedMaintenance} onChange={(event) => setMaintenanceEditForm((current) => ({ ...current, status: event.target.value }))} value={maintenanceEditForm.status}>
              <option value="scheduled">scheduled</option><option value="active">active</option><option value="completed">completed</option><option value="cancelled">cancelled</option>
            </select></label>
            <button disabled={!selectedMaintenance || !maintenanceEditForm.title || !maintenanceEditForm.startsAt || !maintenanceEditForm.endsAt} type="submit">Guardar ventana</button>
            <button className="dangerButton" disabled={!selectedMaintenance} onClick={() => void deleteMaintenance()} type="button">Eliminar ventana</button>
          </form>
        </div>
      </section>
      <section className="splitGrid">
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Alertas</p>
              <h2>Objetos afectados</h2>
            </div>
          </div>
          <DataTable
            columns={["Severidad", "Titulo", "Objeto", "Estado", "Fuente", "Ultima vez"]}
            statusColumnIndex={0}
            rows={alerts.map((alert) => [
              alert.severity,
              alert.title,
              `${alert.objectType}:${alert.objectId}`,
              alert.status ?? "active",
              alert.monitorSource ?? "demo",
              alert.lastSeenAt ? new Date(alert.lastSeenAt).toLocaleString() : ""
            ])}
          />
        </div>
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Mantenimiento</p>
              <h2>Ventanas activas y proximas</h2>
            </div>
          </div>
          <DataTable
            columns={["Titulo", "Objeto", "Estado", "Inicio", "Fin"]}
            statusColumnIndex={2}
            rows={maintenanceWindows.map((window) => [
              window.title,
              `${window.objectType}:${window.objectId}`,
              window.status,
              new Date(window.startsAt).toLocaleString(),
              new Date(window.endsAt).toLocaleString()
            ])}
          />
        </div>
      </section>
    </ModulePage>
  );
}


type IncidentDetail = {
  incident: Incident;
  events: IncidentEvent[];
  impacts: Array<{ id: string; objectType: string; objectLabel: string; impactType: string; notes: string | null }>;
};

function IncidentsView({
  circuits,
  devices,
  incidents,
  onReload,
  prefixes,
  sites
}: {
  circuits: Circuit[];
  devices: Device[];
  incidents: Incident[];
  onReload: () => Promise<void>;
  prefixes: Prefix[];
  sites: Site[];
}) {
  const objectOptions = [
    ...sites.map((site) => ({ id: site.id, label: `${site.code} - ${site.name}`, type: "site" })),
    ...devices.map((device) => ({ id: device.id, label: `${device.name} - ${device.siteCode}`, type: "device" })),
    ...circuits.map((circuit) => ({ id: circuit.id, label: `${circuit.code} - ${circuit.name}`, type: "circuit" })),
    ...prefixes.map((prefix) => ({ id: prefix.id, label: `${prefix.prefix} - ${prefix.siteCode}`, type: "prefix" }))
  ];
  const [selectedCode, setSelectedCode] = useState(incidents[0]?.code ?? "");
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [incidentForm, setIncidentForm] = useState({
    code: "",
    title: "",
    severity: "major",
    status: "open",
    ownerTeam: "noc",
    summary: "",
    objectKey: objectOptions[0] ? `${objectOptions[0].type}:${objectOptions[0].id}` : "",
    impactType: "service_impact",
    notes: ""
  });
  const [operationForm, setOperationForm] = useState({
    incidentCode: incidents[0]?.code ?? "",
    status: incidents[0]?.status ?? "investigating"
  });
  const [incidentEditForm, setIncidentEditForm] = useState({
    title: incidents[0]?.title ?? "",
    severity: incidents[0]?.severity ?? "major",
    status: incidents[0]?.status ?? "open",
    ownerTeam: incidents[0]?.ownerTeam ?? "noc",
    summary: incidents[0]?.summary ?? ""
  });
  const [eventMessage, setEventMessage] = useState("");
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const active = incidents.filter((incident) => !["resolved", "closed"].includes(incident.status)).length;
  const critical = incidents.filter((incident) => incident.severity === "critical").length;
  const impacted = incidents.reduce((sum, incident) => sum + incident.impactCount, 0);
  const selectedIncident = incidents.find((incident) => incident.code === selectedCode) ?? incidents[0];
  const selectedOperationIncident = incidents.find((incident) => incident.code === operationForm.incidentCode);

  useEffect(() => {
    if (!selectedIncident) {
      return;
    }

    apiGet<IncidentDetail>(`/incidents/${selectedIncident.code}`)
      .then(setDetail)
      .catch(() => setDetail({ incident: selectedIncident, events: [], impacts: [] }));
  }, [selectedIncident?.code]);

  useEffect(() => {
    if (!selectedCode && incidents[0]) {
      setSelectedCode(incidents[0].code);
    }
  }, [incidents, selectedCode]);

  useEffect(() => {
    if (selectedIncident) {
      setOperationForm({ incidentCode: selectedIncident.code, status: selectedIncident.status });
      setIncidentEditForm({
        title: selectedIncident.title,
        severity: selectedIncident.severity,
        status: selectedIncident.status,
        ownerTeam: selectedIncident.ownerTeam ?? "noc",
        summary: selectedIncident.summary ?? ""
      });
    }
  }, [selectedIncident?.code, selectedIncident?.ownerTeam, selectedIncident?.severity, selectedIncident?.status, selectedIncident?.summary, selectedIncident?.title]);

  async function submitIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!incidentForm.code.trim() || !incidentForm.title.trim()) {
      return;
    }

    const [objectType, objectId] = incidentForm.objectKey.split(":");
    setFormState("saving");

    try {
      await apiPost("/incidents", {
        code: incidentForm.code,
        title: incidentForm.title,
        severity: incidentForm.severity,
        status: incidentForm.status,
        ownerTeam: incidentForm.ownerTeam || null,
        summary: incidentForm.summary || null,
        impacts: objectType && objectId ? [{
          objectType,
          objectId,
          impactType: incidentForm.impactType,
          notes: incidentForm.notes || null
        }] : [],
        reason: "Alta desde consola de Incidencias"
      });
      setSelectedCode(incidentForm.code.toUpperCase());
      setIncidentForm({
        code: "",
        title: "",
        severity: "major",
        status: "open",
        ownerTeam: "noc",
        summary: "",
        objectKey: objectOptions[0] ? `${objectOptions[0].type}:${objectOptions[0].id}` : "",
        impactType: "service_impact",
        notes: ""
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function submitIncidentEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedIncident || !eventMessage.trim()) {
      return;
    }

    setFormState("saving");

    try {
      await apiPost(`/incidents/${selectedIncident.code}/events`, {
        eventType: "update",
        message: eventMessage,
        reason: "Actualizacion desde workbench NOC"
      });
      const refreshed = await apiGet<IncidentDetail>(`/incidents/${selectedIncident.code}`);
      setDetail(refreshed);
      setEventMessage("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateIncidentStatus() {
    if (!selectedOperationIncident) {
      return;
    }

    setFormState("saving");

    try {
      await apiPatch(`/incidents/${selectedOperationIncident.code}/status`, {
        status: operationForm.status,
        reason: "Cambio desde modulo Incidencias"
      });
      await onReload();
      const refreshed = await apiGet<IncidentDetail>(`/incidents/${selectedOperationIncident.code}`);
      setDetail(refreshed);
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedIncident) {
      return;
    }

    setFormState("saving");

    try {
      await apiPatch(`/incidents/${selectedIncident.code}`, {
        title: incidentEditForm.title,
        severity: incidentEditForm.severity,
        status: incidentEditForm.status,
        ownerTeam: incidentEditForm.ownerTeam || null,
        summary: incidentEditForm.summary || null,
        reason: "Edicion desde modulo Incidencias"
      });
      await onReload();
      const refreshed = await apiGet<IncidentDetail>(`/incidents/${selectedIncident.code}`);
      setDetail(refreshed);
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteIncident() {
    if (!selectedOperationIncident) {
      return;
    }

    setFormState("saving");

    try {
      await apiDelete(`/incidents/${selectedOperationIncident.code}`);
      setSelectedCode("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="Incidencias" title="Gestion NOC de eventos operativos">
      <section className="metricGrid compactMetrics">
        <Metric label="Activas" value={String(active)} tone={active > 0 ? "warning" : "neutral"} />
        <Metric label="Criticas" value={String(critical)} tone={critical > 0 ? "critical" : "neutral"} />
        <Metric label="Objetos impactados" value={String(impacted)} tone="neutral" />
        <Metric label="Total" value={String(incidents.length)} tone="neutral" />
      </section>
      <section className="incidentWorkbench">
        <div className="panel incidentListPanel">
          <form className="quickForm incidentCreateForm" onSubmit={submitIncident}>
            <label>
              Codigo
              <input
                onChange={(event) => setIncidentForm((current) => ({ ...current, code: event.target.value }))}
                placeholder="INC-MAJES-001"
                value={incidentForm.code}
              />
            </label>
            <label>
              Severidad
              <select
                onChange={(event) => setIncidentForm((current) => ({ ...current, severity: event.target.value }))}
                value={incidentForm.severity}
              >
                <option value="critical">critical</option>
                <option value="major">major</option>
                <option value="minor">minor</option>
              </select>
            </label>
            <label>
              Titulo
              <input
                onChange={(event) => setIncidentForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Degradacion transporte Majes"
                value={incidentForm.title}
              />
            </label>
            <label>
              Objeto impactado
              <select
                onChange={(event) => setIncidentForm((current) => ({ ...current, objectKey: event.target.value }))}
                value={incidentForm.objectKey}
              >
                {objectOptions.map((option) => (
                  <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Resumen
              <textarea
                onChange={(event) => setIncidentForm((current) => ({ ...current, summary: event.target.value }))}
                placeholder="Sintoma, alcance y primera accion"
                value={incidentForm.summary}
              />
            </label>
            <button type="submit">Crear incidencia</button>
          </form>
          {incidents.map((incident) => (
            <button
              className={incident.code === selectedIncident?.code ? "incidentListItem active" : "incidentListItem"}
              key={incident.id}
              onClick={() => setSelectedCode(incident.code)}
            >
              <span className={`statusText ${incident.severity}`}>{incident.severity}</span>
              <strong>{incident.code}</strong>
              <small>{incident.title}</small>
            </button>
          ))}
          {incidents.length === 0 && <span className="mutedText">Sin incidencias registradas</span>}
        </div>
        <div className="panel incidentDetailPanel">
          {selectedIncident && (
            <>
              <div className="panelHeader">
                <div>
                  <p className="eyebrow">{selectedIncident.code}</p>
                  <h2>{selectedIncident.title}</h2>
                </div>
                <span className={`statusText ${selectedIncident.severity}`}>{selectedIncident.status}</span>
              </div>
              <div className="incidentMeta">
                <div><span>Severidad</span><strong>{selectedIncident.severity}</strong></div>
                <div><span>Equipo</span><strong>{selectedIncident.ownerTeam ?? "NOC"}</strong></div>
                <div><span>Impactos</span><strong>{selectedIncident.impactCount}</strong></div>
                <div><span>Inicio</span><strong>{new Date(selectedIncident.startedAt).toLocaleString()}</strong></div>
              </div>
              {selectedIncident.summary && <p className="incidentSummary">{selectedIncident.summary}</p>}
              <form className="quickForm incidentEditForm" onSubmit={updateIncident}>
                <label className="wideField">Titulo<input onChange={(event) => setIncidentEditForm((current) => ({ ...current, title: event.target.value }))} value={incidentEditForm.title} /></label>
                <label>Severidad<select onChange={(event) => setIncidentEditForm((current) => ({ ...current, severity: event.target.value }))} value={incidentEditForm.severity}>
                  <option value="critical">critical</option>
                  <option value="major">major</option>
                  <option value="minor">minor</option>
                </select></label>
                <label>Estado<select onChange={(event) => setIncidentEditForm((current) => ({ ...current, status: event.target.value }))} value={incidentEditForm.status}>
                  <option value="open">open</option>
                  <option value="investigating">investigating</option>
                  <option value="monitoring">monitoring</option>
                  <option value="resolved">resolved</option>
                  <option value="closed">closed</option>
                </select></label>
                <label>Equipo<input onChange={(event) => setIncidentEditForm((current) => ({ ...current, ownerTeam: event.target.value }))} value={incidentEditForm.ownerTeam} /></label>
                <label className="wideField">Resumen<textarea onChange={(event) => setIncidentEditForm((current) => ({ ...current, summary: event.target.value }))} value={incidentEditForm.summary} /></label>
                <button disabled={!incidentEditForm.title} type="submit">Guardar incidencia</button>
              </form>
              <div className="incidentOps">
                <label>
                  Estado
                  <select
                    onChange={(event) => setOperationForm((current) => ({ ...current, status: event.target.value }))}
                    value={operationForm.status}
                  >
                    <option value="open">open</option>
                    <option value="investigating">investigating</option>
                    <option value="monitoring">monitoring</option>
                    <option value="resolved">resolved</option>
                    <option value="closed">closed</option>
                  </select>
                </label>
                <button onClick={updateIncidentStatus} type="button">Actualizar estado</button>
                <button className="dangerButton" onClick={deleteIncident} type="button">Eliminar</button>
                <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
              </div>
              <section className="incidentColumns">
                <div>
                  <p className="eyebrow">Impactos</p>
                  <div className="miniList">
                    {(detail?.impacts ?? []).map((impact) => (
                      <article key={impact.id}>
                        <strong>{impact.objectLabel}</strong>
                        <span>{impact.objectType} - {impact.impactType}</span>
                      </article>
                    ))}
                    {detail?.impacts.length === 0 && <span className="mutedText">Sin impactos documentados</span>}
                  </div>
                </div>
                <div>
                  <p className="eyebrow">Timeline</p>
                  <div className="miniList">
                    {(detail?.events ?? []).map((item) => (
                      <article key={item.id}>
                        <strong>{item.eventType}</strong>
                        <span>{item.message}</span>
                        <small>{new Date(item.createdAt).toLocaleString()}</small>
                      </article>
                    ))}
                    {detail?.events.length === 0 && <span className="mutedText">Sin eventos registrados</span>}
                  </div>
                </div>
              </section>
              <form className="incidentEventForm" onSubmit={submitIncidentEvent}>
                <textarea
                  onChange={(event) => setEventMessage(event.target.value)}
                  placeholder="Agregar actualizacion operacional"
                  value={eventMessage}
                />
                <button type="submit">Agregar update</button>
                <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
              </form>
            </>
          )}
          {!selectedIncident && <span className="mutedText">Selecciona o crea una incidencia para operar el timeline.</span>}
        </div>
      </section>
    </ModulePage>
  );
}

function DocumentationView({
  circuits,
  devices,
  documents,
  evidence,
  onReload,
  prefixes,
  sites
}: {
  circuits: Circuit[];
  devices: Device[];
  documents: TechnicalDocument[];
  evidence: EvidenceFile[];
  onReload: () => Promise<void>;
  prefixes: Prefix[];
  sites: Site[];
}) {
  const objectOptions = [
    ...sites.map((site) => ({ id: site.id, label: `${site.code} - ${site.name}`, type: "site" })),
    ...devices.map((device) => ({ id: device.id, label: `${device.name} - ${device.siteCode}`, type: "device" })),
    ...circuits.map((circuit) => ({ id: circuit.id, label: `${circuit.code} - ${circuit.name}`, type: "circuit" })),
    ...prefixes.map((prefix) => ({ id: prefix.id, label: `${prefix.prefix} - ${prefix.siteCode}`, type: "prefix" }))
  ];
  const [documentForm, setDocumentForm] = useState({
    objectKey: objectOptions[0] ? `${objectOptions[0].type}:${objectOptions[0].id}` : "",
    title: "",
    bodyMd: ""
  });
  const [evidenceForm, setEvidenceForm] = useState({
    objectKey: objectOptions[0] ? `${objectOptions[0].type}:${objectOptions[0].id}` : "",
    filename: "",
    storageKey: "",
    contentType: "application/pdf"
  });
  const [selectedDocumentId, setSelectedDocumentId] = useState(documents[0]?.id ?? "");
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId);
  const [documentEditForm, setDocumentEditForm] = useState({
    title: selectedDocument?.title ?? "",
    bodyMd: selectedDocument?.bodyMd ?? ""
  });
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(evidence[0]?.id ?? "");
  const selectedEvidence = evidence.find((file) => file.id === selectedEvidenceId);
  const [evidenceEditForm, setEvidenceEditForm] = useState({
    filename: selectedEvidence?.filename ?? "",
    storageKey: selectedEvidence?.storageKey ?? "",
    contentType: selectedEvidence?.contentType ?? "application/pdf"
  });
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const next = documents.find((document) => document.id === selectedDocumentId);
    setDocumentEditForm({
      title: next?.title ?? "",
      bodyMd: next?.bodyMd ?? ""
    });
  }, [documents, selectedDocumentId]);

  useEffect(() => {
    const next = evidence.find((file) => file.id === selectedEvidenceId);
    setEvidenceEditForm({
      filename: next?.filename ?? "",
      storageKey: next?.storageKey ?? "",
      contentType: next?.contentType ?? "application/pdf"
    });
  }, [evidence, selectedEvidenceId]);

  function splitObjectKey(key: string) {
    const [objectType, objectId] = key.split(":");
    return { objectId, objectType };
  }

  async function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const objectRef = splitObjectKey(documentForm.objectKey);
    setFormState("saving");

    try {
      await apiPost("/documentation/documents", {
        objectType: objectRef.objectType,
        objectId: objectRef.objectId,
        title: documentForm.title,
        bodyMd: documentForm.bodyMd,
        reason: "Alta desde modulo Documentacion"
      });
      setDocumentForm((current) => ({ ...current, title: "", bodyMd: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function createEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const objectRef = splitObjectKey(evidenceForm.objectKey);
    setFormState("saving");

    try {
      await apiPost("/documentation/evidence", {
        objectType: objectRef.objectType,
        objectId: objectRef.objectId,
        filename: evidenceForm.filename,
        storageKey: evidenceForm.storageKey,
        contentType: evidenceForm.contentType || null,
        reason: "Alta de evidencia desde modulo Documentacion"
      });
      setEvidenceForm((current) => ({ ...current, filename: "", storageKey: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDocument) return;
    setFormState("saving");

    try {
      await apiPatch(`/documentation/documents/${selectedDocument.id}`, {
        title: documentEditForm.title,
        bodyMd: documentEditForm.bodyMd,
        reason: "Edicion desde modulo Documentacion"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteDocument() {
    if (!selectedDocument) return;
    setFormState("saving");

    try {
      await apiDelete(`/documentation/documents/${selectedDocument.id}`);
      setSelectedDocumentId("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEvidence) return;
    setFormState("saving");

    try {
      await apiPatch(`/documentation/evidence/${selectedEvidence.id}`, {
        filename: evidenceEditForm.filename,
        storageKey: evidenceEditForm.storageKey,
        contentType: evidenceEditForm.contentType || null,
        reason: "Edicion desde modulo Documentacion"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteEvidence() {
    if (!selectedEvidence) return;
    setFormState("saving");

    try {
      await apiDelete(`/documentation/evidence/${selectedEvidence.id}`);
      setSelectedEvidenceId("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="Documentacion" title="Runbooks, evidencias y soporte tecnico por objeto">
      <section className="documentationWorkbench">
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Runbook</p><h2>Documento tecnico</h2></div></div>
          <form className="quickForm" onSubmit={createDocument}>
            <label className="wideField">Objeto<select onChange={(event) => setDocumentForm((current) => ({ ...current, objectKey: event.target.value }))} value={documentForm.objectKey}>
              {objectOptions.map((option) => <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>{option.type} - {option.label}</option>)}
            </select></label>
            <label className="wideField">Titulo<input onChange={(event) => setDocumentForm((current) => ({ ...current, title: event.target.value }))} value={documentForm.title} /></label>
            <label className="wideField">Contenido<textarea onChange={(event) => setDocumentForm((current) => ({ ...current, bodyMd: event.target.value }))} placeholder="Procedimiento, notas, comandos o referencia" value={documentForm.bodyMd} /></label>
            <button disabled={!documentForm.objectKey || !documentForm.title || !documentForm.bodyMd} type="submit">Crear documento</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Evidencia</p><h2>Archivo referenciado</h2></div></div>
          <form className="quickForm" onSubmit={createEvidence}>
            <label className="wideField">Objeto<select onChange={(event) => setEvidenceForm((current) => ({ ...current, objectKey: event.target.value }))} value={evidenceForm.objectKey}>
              {objectOptions.map((option) => <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>{option.type} - {option.label}</option>)}
            </select></label>
            <label>Archivo<input onChange={(event) => setEvidenceForm((current) => ({ ...current, filename: event.target.value }))} value={evidenceForm.filename} /></label>
            <label>Tipo<input onChange={(event) => setEvidenceForm((current) => ({ ...current, contentType: event.target.value }))} value={evidenceForm.contentType} /></label>
            <label className="wideField">Ruta / storage key<input onChange={(event) => setEvidenceForm((current) => ({ ...current, storageKey: event.target.value }))} placeholder="nas://evidencias/..." value={evidenceForm.storageKey} /></label>
            <button disabled={!evidenceForm.objectKey || !evidenceForm.filename || !evidenceForm.storageKey} type="submit">Registrar evidencia</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Edicion</p><h2>Documento existente</h2></div></div>
          <form className="quickForm" onSubmit={updateDocument}>
            <label className="wideField">Documento<select onChange={(event) => setSelectedDocumentId(event.target.value)} value={selectedDocumentId}>
              <option value="">Seleccionar</option>
              {documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
            </select></label>
            <label className="wideField">Titulo<input disabled={!selectedDocument} onChange={(event) => setDocumentEditForm((current) => ({ ...current, title: event.target.value }))} value={documentEditForm.title} /></label>
            <label className="wideField">Contenido<textarea disabled={!selectedDocument} onChange={(event) => setDocumentEditForm((current) => ({ ...current, bodyMd: event.target.value }))} value={documentEditForm.bodyMd} /></label>
            <button disabled={!selectedDocument || !documentEditForm.title || !documentEditForm.bodyMd} type="submit">Guardar documento</button>
            <button className="dangerButton" disabled={!selectedDocument} onClick={() => void deleteDocument()} type="button">Eliminar documento</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Edicion</p><h2>Evidencia existente</h2></div></div>
          <form className="quickForm" onSubmit={updateEvidence}>
            <label className="wideField">Evidencia<select onChange={(event) => setSelectedEvidenceId(event.target.value)} value={selectedEvidenceId}>
              <option value="">Seleccionar</option>
              {evidence.map((file) => <option key={file.id} value={file.id}>{file.filename}</option>)}
            </select></label>
            <label>Archivo<input disabled={!selectedEvidence} onChange={(event) => setEvidenceEditForm((current) => ({ ...current, filename: event.target.value }))} value={evidenceEditForm.filename} /></label>
            <label>Tipo<input disabled={!selectedEvidence} onChange={(event) => setEvidenceEditForm((current) => ({ ...current, contentType: event.target.value }))} value={evidenceEditForm.contentType} /></label>
            <label className="wideField">Ruta / storage key<input disabled={!selectedEvidence} onChange={(event) => setEvidenceEditForm((current) => ({ ...current, storageKey: event.target.value }))} value={evidenceEditForm.storageKey} /></label>
            <button disabled={!selectedEvidence || !evidenceEditForm.filename || !evidenceEditForm.storageKey} type="submit">Guardar evidencia</button>
            <button className="dangerButton" disabled={!selectedEvidence} onClick={() => void deleteEvidence()} type="button">Eliminar evidencia</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
      </section>
      <section className="splitGrid">
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Documentos</p>
              <h2>Notas y procedimientos</h2>
            </div>
          </div>
          <DataTable
            columns={["Titulo", "Objeto", "Autor", "Actualizado"]}
            statusColumnIndex={undefined}
            rows={documents.map((document) => [
              document.title,
              `${document.objectType}:${document.objectId}`,
              document.createdBy,
              new Date(document.updatedAt).toLocaleString()
            ])}
          />
        </div>
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Evidencias</p>
              <h2>Archivos y pruebas</h2>
            </div>
          </div>
          <DataTable
            columns={["Archivo", "Objeto", "Tipo", "Subido por", "Fecha"]}
            statusColumnIndex={undefined}
            rows={evidence.map((file) => [
              file.filename,
              `${file.objectType}:${file.objectId}`,
              file.contentType ?? "archivo",
              file.uploadedBy,
              new Date(file.uploadedAt).toLocaleString()
            ])}
          />
        </div>
      </section>
    </ModulePage>
  );
}

function BackupsView({
  backups,
  devices,
  onReload,
  summary
}: {
  backups: ConfigBackup[];
  devices: Device[];
  onReload: () => Promise<void>;
  summary: BackupSummary;
}) {
  const [backupForm, setBackupForm] = useState({
    deviceName: devices[0]?.name ?? "",
    storageKey: "",
    configHash: "",
    source: "manual"
  });
  const [selectedBackupId, setSelectedBackupId] = useState(backups[0]?.id ?? "");
  const selectedBackup = backups.find((backup) => backup.id === selectedBackupId);
  const [backupEditForm, setBackupEditForm] = useState({
    deviceName: backups[0]?.device ?? devices[0]?.name ?? "",
    storageKey: backups[0]?.storageKey ?? "",
    configHash: backups[0]?.configHash ?? "",
    source: backups[0]?.source ?? "manual"
  });
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const coverage = summary.totalDevices > 0 ? Math.round((summary.devicesWithBackup / summary.totalDevices) * 100) : 0;

  useEffect(() => {
    if (selectedBackup) {
      setBackupEditForm({
        deviceName: selectedBackup.device,
        storageKey: selectedBackup.storageKey,
        configHash: selectedBackup.configHash,
        source: selectedBackup.source
      });
    }
  }, [selectedBackup]);

  async function createBackup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("saving");

    try {
      await apiPost("/backups", {
        deviceName: backupForm.deviceName,
        storageKey: backupForm.storageKey,
        configHash: backupForm.configHash,
        source: backupForm.source,
        reason: "Alta desde modulo Backups"
      });
      setBackupForm((current) => ({ ...current, storageKey: "", configHash: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteBackup() {
    if (!selectedBackup) return;
    setFormState("saving");

    try {
      await apiDelete(`/backups/${selectedBackup.id}`);
      setSelectedBackupId("");
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateBackup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBackup) return;
    setFormState("saving");

    try {
      await apiPatch(`/backups/${selectedBackup.id}`, {
        deviceName: backupEditForm.deviceName,
        storageKey: backupEditForm.storageKey,
        configHash: backupEditForm.configHash,
        source: backupEditForm.source,
        reason: "Edicion desde modulo Backups"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="Backups" title="Respaldo de configuraciones y evidencia de cambio">
      <section className="metricGrid compactMetrics">
        <Metric label="Equipos" value={String(summary.totalDevices)} tone="neutral" />
        <Metric label="Con backup" value={`${coverage}%`} tone="neutral" />
        <Metric label="Vencidos" value={String(summary.staleBackups)} tone={summary.staleBackups > 0 ? "warning" : "neutral"} />
        <Metric label="Registros" value={String(backups.length)} tone="neutral" />
      </section>
      <section className="backupWorkbench">
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Registro</p><h2>Backup de configuracion</h2></div></div>
          <form className="quickForm" onSubmit={createBackup}>
            <label className="wideField">Equipo<select onChange={(event) => setBackupForm((current) => ({ ...current, deviceName: event.target.value }))} value={backupForm.deviceName}>
              {devices.map((device) => <option key={device.id} value={device.name}>{device.name} - {device.siteCode}</option>)}
            </select></label>
            <label>Origen<select onChange={(event) => setBackupForm((current) => ({ ...current, source: event.target.value }))} value={backupForm.source}>
              <option value="manual">manual</option><option value="oxidized">oxidized</option><option value="rancid">rancid</option><option value="mikrotik-api">mikrotik-api</option><option value="script">script</option>
            </select></label>
            <label>Hash<input onChange={(event) => setBackupForm((current) => ({ ...current, configHash: event.target.value }))} value={backupForm.configHash} /></label>
            <label className="wideField">Storage key<input onChange={(event) => setBackupForm((current) => ({ ...current, storageKey: event.target.value }))} placeholder="nas://backups/router.cfg" value={backupForm.storageKey} /></label>
            <button disabled={!backupForm.deviceName || !backupForm.storageKey || !backupForm.configHash} type="submit">Registrar backup</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Operacion</p><h2>Editar o retirar backup</h2></div></div>
          <form className="quickForm" onSubmit={updateBackup}>
            <label className="wideField">Backup<select onChange={(event) => setSelectedBackupId(event.target.value)} value={selectedBackupId}>
              <option value="">Seleccionar</option>
              {backups.map((backup) => <option key={backup.id} value={backup.id}>{backup.device} - {new Date(backup.collectedAt).toLocaleString()}</option>)}
            </select></label>
            <label className="wideField">Equipo<select disabled={!selectedBackup} onChange={(event) => setBackupEditForm((current) => ({ ...current, deviceName: event.target.value }))} value={backupEditForm.deviceName}>
              {devices.map((device) => <option key={device.id} value={device.name}>{device.name} - {device.siteCode}</option>)}
            </select></label>
            <label>Origen<select disabled={!selectedBackup} onChange={(event) => setBackupEditForm((current) => ({ ...current, source: event.target.value }))} value={backupEditForm.source}>
              <option value="manual">manual</option><option value="oxidized">oxidized</option><option value="rancid">rancid</option><option value="mikrotik-api">mikrotik-api</option><option value="script">script</option>
            </select></label>
            <label>Hash<input disabled={!selectedBackup} onChange={(event) => setBackupEditForm((current) => ({ ...current, configHash: event.target.value }))} value={backupEditForm.configHash} /></label>
            <label className="wideField">Storage<input disabled={!selectedBackup} onChange={(event) => setBackupEditForm((current) => ({ ...current, storageKey: event.target.value }))} value={backupEditForm.storageKey} /></label>
            <button disabled={!selectedBackup || !backupEditForm.deviceName || !backupEditForm.storageKey || !backupEditForm.configHash} type="submit">Guardar backup</button>
            <button className="dangerButton" disabled={!selectedBackup} onClick={() => void deleteBackup()} type="button">Eliminar registro</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
      </section>
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Inventario</p><h2>Backups registrados</h2></div></div>
        <DataTable
          columns={["Equipo", "Sede", "Origen", "Hash", "Storage", "Recolectado"]}
          statusColumnIndex={undefined}
          rows={backups.map((backup) => [
            backup.device,
            backup.siteCode,
            backup.source,
            backup.configHash,
            backup.storageKey,
            new Date(backup.collectedAt).toLocaleString()
          ])}
        />
      </section>
    </ModulePage>
  );
}

function ChangesView({
  changes,
  circuits,
  devices,
  onReload,
  prefixes,
  sites
}: {
  changes: ChangeRequest[];
  circuits: Circuit[];
  devices: Device[];
  onReload: () => Promise<void>;
  prefixes: Prefix[];
  sites: Site[];
}) {
  const objectOptions = [
    ...sites.map((site) => ({ id: site.id, label: `${site.code} - ${site.name}`, type: "site" })),
    ...devices.map((device) => ({ id: device.id, label: `${device.name} - ${device.siteCode}`, type: "device" })),
    ...circuits.map((circuit) => ({ id: circuit.id, label: `${circuit.code} - ${circuit.name}`, type: "circuit" })),
    ...prefixes.map((prefix) => ({ id: prefix.id, label: `${prefix.prefix} - ${prefix.siteCode}`, type: "prefix" }))
  ];
  const [changeForm, setChangeForm] = useState({
    title: "",
    description: "",
    riskLevel: "medium",
    plannedStart: "",
    plannedEnd: "",
    objectKey: objectOptions[0] ? `${objectOptions[0].type}:${objectOptions[0].id}` : "",
    impactType: "service_risk",
    notes: ""
  });
  const [operationForm, setOperationForm] = useState({
    changeId: changes[0]?.id ?? "",
    status: changes[0]?.status ?? "submitted"
  });
  const [changeEditForm, setChangeEditForm] = useState({
    title: changes[0]?.title ?? "",
    description: changes[0]?.description ?? "",
    riskLevel: changes[0]?.riskLevel ?? "medium",
    plannedStart: toDateTimeLocal(changes[0]?.plannedStart),
    plannedEnd: toDateTimeLocal(changes[0]?.plannedEnd),
    objectKey: objectOptions[0] ? `${objectOptions[0].type}:${objectOptions[0].id}` : "",
    impactType: "service_risk",
    notes: ""
  });
  const [formState, setFormState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const selectedChange = changes.find((change) => change.id === operationForm.changeId);
  const submitted = changes.filter((change) => change.status === "submitted").length;
  const approved = changes.filter((change) => change.status === "approved").length;
  const highRisk = changes.filter((change) => change.riskLevel === "high").length;

  function splitObjectKey(key: string) {
    const [objectType, objectId] = key.split(":");
    return { objectId, objectType };
  }

  useEffect(() => {
    if (!selectedChange) {
      return;
    }

    setChangeEditForm((current) => ({
      ...current,
      title: selectedChange.title,
      description: selectedChange.description,
      riskLevel: selectedChange.riskLevel,
      plannedStart: toDateTimeLocal(selectedChange.plannedStart),
      plannedEnd: toDateTimeLocal(selectedChange.plannedEnd)
    }));

    apiGet<{ impacts: Array<{ objectType: string; objectId: string; impactType: string; notes: string | null }> }>(`/changes/${selectedChange.id}/impacts`)
      .then(({ impacts }) => {
        const impact = impacts[0];
        if (!impact) {
          return;
        }

        setChangeEditForm((current) => ({
          ...current,
          objectKey: `${impact.objectType}:${impact.objectId}`,
          impactType: impact.impactType,
          notes: impact.notes ?? ""
        }));
      })
      .catch(() => undefined);
  }, [selectedChange]);

  async function createChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const objectRef = splitObjectKey(changeForm.objectKey);
    setFormState("saving");

    try {
      await apiPost("/changes", {
        title: changeForm.title,
        description: changeForm.description,
        riskLevel: changeForm.riskLevel,
        plannedStart: changeForm.plannedStart || null,
        plannedEnd: changeForm.plannedEnd || null,
        impacts: changeForm.objectKey ? [{
          objectType: objectRef.objectType,
          objectId: objectRef.objectId,
          impactType: changeForm.impactType,
          notes: changeForm.notes || null
        }] : [],
        reason: "Alta desde modulo Cambios"
      });
      setChangeForm((current) => ({ ...current, title: "", description: "", notes: "" }));
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function approveChange() {
    if (!selectedChange) return;
    setFormState("saving");

    try {
      await apiPost(`/changes/${selectedChange.id}/approve`, {});
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateChangeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChange) return;
    setFormState("saving");

    try {
      await apiPatch(`/changes/${selectedChange.id}/status`, {
        status: operationForm.status,
        reason: "Actualizacion desde modulo Cambios"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function updateChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChange) return;

    const objectRef = splitObjectKey(changeEditForm.objectKey);
    setFormState("saving");

    try {
      await apiPatch(`/changes/${selectedChange.id}`, {
        title: changeEditForm.title,
        description: changeEditForm.description,
        riskLevel: changeEditForm.riskLevel,
        plannedStart: changeEditForm.plannedStart || null,
        plannedEnd: changeEditForm.plannedEnd || null,
        impacts: changeEditForm.objectKey ? [{
          objectType: objectRef.objectType,
          objectId: objectRef.objectId,
          impactType: changeEditForm.impactType,
          notes: changeEditForm.notes || null
        }] : [],
        reason: "Edicion desde modulo Cambios"
      });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  async function deleteChange() {
    if (!selectedChange) return;
    setFormState("saving");

    try {
      await apiDelete(`/changes/${selectedChange.id}`);
      setOperationForm({ changeId: "", status: "submitted" });
      await onReload();
      setFormState("saved");
    } catch {
      setFormState("error");
    }
  }

  return (
    <ModulePage eyebrow="Cambios" title="Planificacion, aprobacion e impacto de cambios">
      <section className="metricGrid compactMetrics">
        <Metric label="Solicitados" value={String(submitted)} tone="warning" />
        <Metric label="Aprobados" value={String(approved)} tone="neutral" />
        <Metric label="Alto riesgo" value={String(highRisk)} tone={highRisk > 0 ? "critical" : "neutral"} />
        <Metric label="Total" value={String(changes.length)} tone="neutral" />
      </section>
      <section className="changeWorkbench">
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Solicitud</p><h2>Nuevo cambio</h2></div></div>
          <form className="quickForm" onSubmit={createChange}>
            <label className="wideField">Titulo<input onChange={(event) => setChangeForm((current) => ({ ...current, title: event.target.value }))} value={changeForm.title} /></label>
            <label>Riesgo<select onChange={(event) => setChangeForm((current) => ({ ...current, riskLevel: event.target.value }))} value={changeForm.riskLevel}>
              <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option>
            </select></label>
            <label>Impacto<select onChange={(event) => setChangeForm((current) => ({ ...current, impactType: event.target.value }))} value={changeForm.impactType}>
              <option value="service_risk">service_risk</option><option value="outage">outage</option><option value="capacity">capacity</option><option value="routing">routing</option><option value="documentation">documentation</option>
            </select></label>
            <label>Inicio<input onChange={(event) => setChangeForm((current) => ({ ...current, plannedStart: event.target.value }))} type="datetime-local" value={changeForm.plannedStart} /></label>
            <label>Fin<input onChange={(event) => setChangeForm((current) => ({ ...current, plannedEnd: event.target.value }))} type="datetime-local" value={changeForm.plannedEnd} /></label>
            <label className="wideField">Objeto impactado<select onChange={(event) => setChangeForm((current) => ({ ...current, objectKey: event.target.value }))} value={changeForm.objectKey}>
              {objectOptions.map((option) => <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>{option.type} - {option.label}</option>)}
            </select></label>
            <label className="wideField">Descripcion<textarea onChange={(event) => setChangeForm((current) => ({ ...current, description: event.target.value }))} value={changeForm.description} /></label>
            <label className="wideField">Notas de impacto<input onChange={(event) => setChangeForm((current) => ({ ...current, notes: event.target.value }))} value={changeForm.notes} /></label>
            <button disabled={!changeForm.title || !changeForm.description} type="submit">Crear cambio</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Operacion</p><h2>Editar cambio</h2></div></div>
          <form className="quickForm" onSubmit={updateChange}>
            <label className="wideField">Cambio<select onChange={(event) => {
              const next = changes.find((change) => change.id === event.target.value);
              setOperationForm({ changeId: event.target.value, status: next?.status ?? "submitted" });
            }} value={operationForm.changeId}>
              <option value="">Seleccionar</option>
              {changes.map((change) => <option key={change.id} value={change.id}>{change.title}</option>)}
            </select></label>
            <label className="wideField">Titulo<input disabled={!selectedChange} onChange={(event) => setChangeEditForm((current) => ({ ...current, title: event.target.value }))} value={changeEditForm.title} /></label>
            <label>Riesgo<select disabled={!selectedChange} onChange={(event) => setChangeEditForm((current) => ({ ...current, riskLevel: event.target.value }))} value={changeEditForm.riskLevel}>
              <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option>
            </select></label>
            <label>Impacto<select disabled={!selectedChange} onChange={(event) => setChangeEditForm((current) => ({ ...current, impactType: event.target.value }))} value={changeEditForm.impactType}>
              <option value="service_risk">service_risk</option><option value="outage">outage</option><option value="capacity">capacity</option><option value="routing">routing</option><option value="documentation">documentation</option>
            </select></label>
            <label>Inicio<input disabled={!selectedChange} onChange={(event) => setChangeEditForm((current) => ({ ...current, plannedStart: event.target.value }))} type="datetime-local" value={changeEditForm.plannedStart} /></label>
            <label>Fin<input disabled={!selectedChange} onChange={(event) => setChangeEditForm((current) => ({ ...current, plannedEnd: event.target.value }))} type="datetime-local" value={changeEditForm.plannedEnd} /></label>
            <label className="wideField">Objeto impactado<select disabled={!selectedChange} onChange={(event) => setChangeEditForm((current) => ({ ...current, objectKey: event.target.value }))} value={changeEditForm.objectKey}>
              {objectOptions.map((option) => <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>{option.type} - {option.label}</option>)}
            </select></label>
            <label className="wideField">Descripcion<textarea disabled={!selectedChange} onChange={(event) => setChangeEditForm((current) => ({ ...current, description: event.target.value }))} value={changeEditForm.description} /></label>
            <label className="wideField">Notas de impacto<input disabled={!selectedChange} onChange={(event) => setChangeEditForm((current) => ({ ...current, notes: event.target.value }))} value={changeEditForm.notes} /></label>
            <button disabled={!selectedChange || !changeEditForm.title || !changeEditForm.description} type="submit">Guardar cambio</button>
          </form>
          <form className="quickForm compactForm" onSubmit={updateChangeStatus}>
            <label>Estado<select disabled={!selectedChange} onChange={(event) => setOperationForm((current) => ({ ...current, status: event.target.value }))} value={operationForm.status}>
              <option value="submitted">submitted</option><option value="approved">approved</option><option value="in_progress">in_progress</option><option value="completed">completed</option><option value="cancelled">cancelled</option>
            </select></label>
            <button disabled={!selectedChange} type="submit">Actualizar estado</button>
            <button disabled={!selectedChange} onClick={() => void approveChange()} type="button">Aprobar</button>
            <button className="dangerButton" disabled={!selectedChange} onClick={() => void deleteChange()} type="button">Eliminar</button>
            <span className={`formState ${formState}`}>{formStateLabel(formState)}</span>
          </form>
        </div>
      </section>
      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">Inventario</p><h2>Cambios registrados</h2></div></div>
        <DataTable
          columns={["Titulo", "Estado", "Riesgo", "Inicio", "Fin", "Solicitante", "Impactos"]}
          statusColumnIndex={1}
          rows={changes.map((change) => [
            change.title,
            change.status,
            change.riskLevel,
            change.plannedStart ? new Date(change.plannedStart).toLocaleString() : "sin fecha",
            change.plannedEnd ? new Date(change.plannedEnd).toLocaleString() : "sin fecha",
            change.requestedBy,
            String(change.impactCount)
          ])}
        />
      </section>
    </ModulePage>
  );
}

function HistoryView({ audit }: { audit: AuditEvent[] }) {
  const [filters, setFilters] = useState({
    action: "",
    objectType: "",
    query: ""
  });
  const actions = Array.from(new Set(audit.map((event) => event.action))).sort();
  const objectTypes = Array.from(new Set(audit.map((event) => event.objectType))).sort();
  const filteredAudit = audit.filter((event) => {
    const haystack = `${event.action} ${event.objectType} ${event.objectLabel} ${event.actor} ${event.reason ?? ""}`.toLowerCase();
    return (!filters.action || event.action === filters.action)
      && (!filters.objectType || event.objectType === filters.objectType)
      && (!filters.query || haystack.includes(filters.query.toLowerCase()));
  });

  return (
    <ModulePage eyebrow="Historial" title="Trazabilidad de cambios operativos">
      <section className="historyWorkbench">
        <div className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Filtros</p><h2>Buscar eventos</h2></div></div>
          <form className="quickForm" onSubmit={(event) => event.preventDefault()}>
            <label>Accion<select onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))} value={filters.action}>
              <option value="">Todas</option>
              {actions.map((action) => <option key={action} value={action}>{action}</option>)}
            </select></label>
            <label>Objeto<select onChange={(event) => setFilters((current) => ({ ...current, objectType: event.target.value }))} value={filters.objectType}>
              <option value="">Todos</option>
              {objectTypes.map((objectType) => <option key={objectType} value={objectType}>{objectType}</option>)}
            </select></label>
            <label className="wideField">Texto<input onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="router, circuito, usuario, motivo..." value={filters.query} /></label>
            <button onClick={() => setFilters({ action: "", objectType: "", query: "" })} type="button">Limpiar filtros</button>
          </form>
        </div>
        <section className="metricGrid compactMetrics">
          <Metric label="Eventos" value={String(audit.length)} tone="neutral" />
          <Metric label="Filtrados" value={String(filteredAudit.length)} tone="neutral" />
          <Metric label="Tipos" value={String(objectTypes.length)} tone="neutral" />
          <Metric label="Acciones" value={String(actions.length)} tone="neutral" />
        </section>
      </section>
      <DataTable
        columns={["Accion", "Objeto", "Tipo", "Actor", "Motivo", "Fecha"]}
        statusColumnIndex={undefined}
        rows={filteredAudit.map((event) => [
          event.action,
          event.objectLabel,
          event.objectType,
          event.actor,
          event.reason ?? "sin motivo",
          new Date(event.at).toLocaleString()
        ])}
      />
    </ModulePage>
  );
}

function PlaceholderView({ module }: { module: string }) {
  return (
    <ModulePage eyebrow={module} title="Modulo preparado para la siguiente iteracion">
      <div className="emptyState">
        <strong>Base lista</strong>
        <span>El dominio ya esta contemplado en la arquitectura y se conectara con entidades, permisos y auditoria.</span>
      </div>
    </ModulePage>
  );
}

function ModulePage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <>
      <section className="nocHeader">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
      </section>
      {children}
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "critical" | "warning" | "neutral" }) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DataTable({
  columns,
  rows,
  statusColumnIndex
}: {
  columns: string[];
  rows: string[][];
  statusColumnIndex?: number;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = normalizedQuery
    ? rows.filter((row) => row.join(" ").toLowerCase().includes(normalizedQuery))
    : rows;

  function downloadCsv() {
    const escapeCell = (value: string) => `"${value.replace(/"/g, "\"\"")}"`;
    const csv = [columns, ...filteredRows].map((row) => row.map(escapeCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ispops-table-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tableFrame">
      <div className="tableToolbar">
        <label>
          Buscar
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar filas..." value={query} />
        </label>
        <div className="tableToolbarActions">
          <button disabled={filteredRows.length === 0} onClick={downloadCsv} type="button">CSV</button>
          <span>{filteredRows.length} / {rows.length}</span>
        </div>
      </div>
      <div className="table" style={{ "--columns": `repeat(${columns.length}, minmax(120px, 1fr))` } as CSSProperties}>
        <div className="tableRow head">
          {columns.map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>
        {filteredRows.map((row, rowIndex) => (
          <div className="tableRow" key={`${row[0]}-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <span className={cellIndex === statusColumnIndex ? `statusText ${cell}` : undefined} key={`${cell}-${cellIndex}`}>
                {cell}
              </span>
            ))}
          </div>
        ))}
        {filteredRows.length === 0 && (
          <div className="tableEmpty">
            <strong>Sin resultados</strong>
            <span>Ajusta el filtro para ver registros.</span>
          </div>
        )}
      </div>
    </div>
  );
}
