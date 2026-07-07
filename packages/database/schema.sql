CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  description text NOT NULL
);

CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES users(id),
  role_id uuid NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id),
  permission_id uuid NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE TABLE sites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  site_type text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  parent_site_id uuid REFERENCES sites(id),
  address text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_site_scopes (
  user_id uuid NOT NULL REFERENCES users(id),
  site_id uuid NOT NULL REFERENCES sites(id),
  PRIMARY KEY (user_id, site_id)
);

CREATE TABLE racks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid NOT NULL REFERENCES sites(id),
  code text NOT NULL,
  name text NOT NULL,
  height_u integer NOT NULL DEFAULT 42,
  UNIQUE (site_id, code)
);

CREATE TABLE power_feeds (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid NOT NULL REFERENCES sites(id),
  name text NOT NULL,
  feed_type text NOT NULL DEFAULT 'ac',
  status text NOT NULL DEFAULT 'active',
  capacity_watts integer,
  load_watts integer,
  source text,
  UNIQUE (site_id, name)
);

CREATE TABLE power_assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid NOT NULL REFERENCES sites(id),
  source_feed_id uuid REFERENCES power_feeds(id),
  name text NOT NULL,
  asset_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  capacity_watts integer,
  load_watts integer,
  autonomy_minutes integer,
  battery_health_percent integer CHECK (battery_health_percent BETWEEN 0 AND 100),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, name)
);

CREATE TABLE datacenter_assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid NOT NULL REFERENCES sites(id),
  rack_id uuid REFERENCES racks(id),
  name text NOT NULL,
  asset_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  units integer,
  ports integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, name)
);

CREATE TABLE providers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  provider_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  noc_phone text,
  noc_email text,
  escalation_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid NOT NULL REFERENCES providers(id),
  code text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  currency char(3),
  monthly_cost numeric(12, 2),
  sla_target numeric(5, 2),
  UNIQUE (provider_id, code)
);

CREATE TABLE provider_capacities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid NOT NULL REFERENCES providers(id),
  contract_id uuid REFERENCES contracts(id),
  service_type text NOT NULL,
  committed_mbps integer NOT NULL,
  burstable_mbps integer,
  delivered_mbps integer NOT NULL,
  used_mbps integer NOT NULL DEFAULT 0,
  billing_mode text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  UNIQUE (provider_id, contract_id, service_type)
);

CREATE TABLE autonomous_systems (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  asn integer NOT NULL UNIQUE,
  name text NOT NULL,
  ownership text NOT NULL DEFAULT 'external'
);

CREATE TABLE rir_allocations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  registry text NOT NULL DEFAULT 'LACNIC',
  resource cidr NOT NULL UNIQUE,
  resource_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  allocated_at date,
  notes text
);

CREATE TABLE vrfs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  route_distinguisher text,
  description text
);

CREATE TABLE vlans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid REFERENCES sites(id),
  vlan_id integer NOT NULL,
  name text NOT NULL,
  purpose text,
  UNIQUE (site_id, vlan_id)
);

CREATE TABLE prefixes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_prefix_id uuid REFERENCES prefixes(id),
  rir_allocation_id uuid REFERENCES rir_allocations(id),
  site_id uuid REFERENCES sites(id),
  vrf_id uuid REFERENCES vrfs(id),
  prefix cidr NOT NULL,
  family integer NOT NULL CHECK (family IN (4, 6)),
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vrf_id, prefix)
);

CREATE INDEX prefixes_prefix_gist_idx ON prefixes USING gist (prefix inet_ops);

CREATE TABLE manufacturers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE
);

CREATE TABLE device_models (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  model text NOT NULL,
  device_type text NOT NULL,
  UNIQUE (manufacturer_id, model)
);

CREATE TABLE device_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid NOT NULL REFERENCES sites(id),
  rack_id uuid REFERENCES racks(id),
  model_id uuid REFERENCES device_models(id),
  role_id uuid REFERENCES device_roles(id),
  name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'planned',
  serial_number text,
  management_ip inet,
  position_u integer,
  height_u integer NOT NULL DEFAULT 1,
  power_feed_id uuid REFERENCES power_feeds(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE interfaces (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  vlan_id uuid REFERENCES vlans(id),
  name text NOT NULL,
  interface_type text NOT NULL,
  status text NOT NULL DEFAULT 'unknown',
  mac_address macaddr,
  speed_mbps integer,
  description text,
  UNIQUE (device_id, name)
);

CREATE TABLE ip_addresses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prefix_id uuid NOT NULL REFERENCES prefixes(id),
  interface_id uuid REFERENCES interfaces(id),
  address inet NOT NULL,
  status text NOT NULL DEFAULT 'reserved',
  role text NOT NULL,
  dns_name text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (address)
);

CREATE INDEX ip_addresses_address_gist_idx ON ip_addresses USING gist (address inet_ops);

CREATE TABLE circuits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid REFERENCES providers(id),
  contract_id uuid REFERENCES contracts(id),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  circuit_type text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  capacity_mbps integer,
  sla_target numeric(5, 2),
  installed_at date,
  notes text
);

CREATE TABLE circuit_endpoints (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  circuit_id uuid NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id),
  device_id uuid REFERENCES devices(id),
  interface_id uuid REFERENCES interfaces(id),
  label text NOT NULL,
  demarcation text
);

CREATE TABLE site_transport_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  a_site_id uuid NOT NULL REFERENCES sites(id),
  z_site_id uuid NOT NULL REFERENCES sites(id),
  provider_id uuid REFERENCES providers(id),
  circuit_id uuid REFERENCES circuits(id),
  link_type text NOT NULL DEFAULT 'transport',
  status text NOT NULL DEFAULT 'planned',
  capacity_mbps integer,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (a_site_id <> z_site_id),
  UNIQUE (a_site_id, z_site_id, link_type)
);

CREATE TABLE fiber_spans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  a_site_id uuid NOT NULL REFERENCES sites(id),
  z_site_id uuid NOT NULL REFERENCES sites(id),
  provider_id uuid REFERENCES providers(id),
  cable_type text NOT NULL,
  fiber_count integer NOT NULL,
  used_fibers integer NOT NULL DEFAULT 0,
  distance_km numeric(8, 2),
  status text NOT NULL DEFAULT 'planned',
  notes text,
  CHECK (a_site_id <> z_site_id),
  CHECK (used_fibers <= fiber_count)
);

CREATE TABLE fiber_strands (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  span_id uuid NOT NULL REFERENCES fiber_spans(id) ON DELETE CASCADE,
  circuit_id uuid REFERENCES circuits(id),
  strand_number integer NOT NULL,
  tube_color text,
  fiber_color text,
  status text NOT NULL DEFAULT 'available',
  service text,
  a_termination text,
  z_termination text,
  UNIQUE (span_id, strand_number)
);

CREATE TABLE interface_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  a_interface_id uuid NOT NULL REFERENCES interfaces(id),
  b_interface_id uuid NOT NULL REFERENCES interfaces(id),
  circuit_id uuid REFERENCES circuits(id),
  link_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  capacity_mbps integer,
  CHECK (a_interface_id <> b_interface_id)
);

CREATE TABLE transceivers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  interface_id uuid NOT NULL REFERENCES interfaces(id),
  vendor text NOT NULL,
  part_number text NOT NULL,
  serial_number text,
  form_factor text NOT NULL,
  speed_mbps integer NOT NULL,
  wavelength_nm integer,
  reach_km numeric(8, 2),
  connector_type text NOT NULL,
  fiber_mode text NOT NULL,
  tx_power_dbm numeric(6, 2),
  rx_power_dbm numeric(6, 2),
  status text NOT NULL DEFAULT 'active',
  UNIQUE (interface_id)
);

CREATE TABLE patchcords (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  a_interface_id uuid REFERENCES interfaces(id),
  z_interface_id uuid REFERENCES interfaces(id),
  circuit_id uuid REFERENCES circuits(id),
  a_endpoint text NOT NULL,
  z_endpoint text NOT NULL,
  media_type text NOT NULL,
  connector_a text NOT NULL,
  connector_z text NOT NULL,
  length_meters numeric(8, 2),
  fiber_mode text,
  color text,
  status text NOT NULL DEFAULT 'active',
  CHECK (a_interface_id IS NULL OR z_interface_id IS NULL OR a_interface_id <> z_interface_id)
);

CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  service_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  owner_team text,
  description text
);

CREATE TABLE service_endpoints (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id),
  device_id uuid REFERENCES devices(id),
  interface_id uuid REFERENCES interfaces(id),
  ip_address_id uuid REFERENCES ip_addresses(id),
  circuit_id uuid REFERENCES circuits(id),
  role text NOT NULL
);

CREATE TABLE monitored_objects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  monitor_source text NOT NULL,
  external_ref text,
  status text NOT NULL DEFAULT 'unknown',
  last_seen_at timestamptz
);

CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitored_object_id uuid REFERENCES monitored_objects(id),
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  title text NOT NULL,
  description text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid REFERENCES users(id),
  acknowledged_at timestamptz
);

CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  owner_team text,
  summary text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (resolved_at IS NULL OR resolved_at >= started_at)
);

CREATE TABLE incident_impacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  impact_type text NOT NULL,
  notes text
);

CREATE TABLE incident_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE maintenance_windows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE change_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  risk_level text NOT NULL DEFAULT 'medium',
  planned_start timestamptz,
  planned_end timestamptz,
  requested_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (planned_end IS NULL OR planned_start IS NULL OR planned_end > planned_start)
);

CREATE TABLE change_impacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_request_id uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  impact_type text NOT NULL,
  notes text
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  title text NOT NULL,
  body_md text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evidence_files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  filename text NOT NULL,
  storage_key text NOT NULL,
  content_type text,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE config_backups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id uuid NOT NULL REFERENCES devices(id),
  storage_key text NOT NULL,
  config_hash text NOT NULL,
  collected_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  before_data jsonb,
  after_data jsonb,
  reason text,
  external_ticket text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id uuid REFERENCES users(id),
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
