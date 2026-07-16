INSERT INTO roles (code, name) VALUES
  ('super_admin', 'Super administrador'),
  ('noc_operator', 'Operador NOC'),
  ('network_engineer', 'Ingeniero de red'),
  ('support_agent', 'Soporte tecnico'),
  ('auditor', 'Auditor')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
  ('noc.read', 'Ver dashboard NOC'),
  ('alerts.ack', 'Reconocer alertas'),
  ('alerts.write', 'Crear alertas normalizadas'),
  ('ipam.write', 'Administrar IPAM'),
  ('inventory.write', 'Administrar inventario'),
  ('circuits.write', 'Administrar circuitos'),
  ('services.write', 'Administrar servicios tecnicos'),
  ('providers.write', 'Administrar proveedores'),
  ('sites.write', 'Administrar sedes'),
  ('documentation.write', 'Administrar documentos y evidencias'),
  ('backups.write', 'Registrar backups'),
  ('physical.write', 'Administrar planta fisica y datacenter'),
  ('maintenance.write', 'Administrar ventanas de mantenimiento'),
  ('incidents.write', 'Administrar incidencias operativas'),
  ('changes.write', 'Crear y actualizar cambios'),
  ('changes.approve', 'Aprobar cambios'),
  ('audit.read', 'Ver auditoria')
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (email, display_name, status) VALUES
  ('admin@ispops.local', 'Administrador ISP Ops', 'active'),
  ('noc@ispops.local', 'Operador NOC', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'admin@ispops.local' AND r.code = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'noc@ispops.local' AND r.code = 'noc_operator'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('noc.read', 'alerts.ack', 'audit.read')
WHERE r.code = 'noc_operator'
ON CONFLICT DO NOTHING;

INSERT INTO api_keys (user_id, name, key_hash, status)
SELECT id, 'dev-admin-key', 'dev-admin-key', 'active'
FROM users WHERE email = 'admin@ispops.local'
ON CONFLICT (key_hash) DO NOTHING;

INSERT INTO sites (code, name, site_type, status, address, latitude, longitude) VALUES
  ('LIM-CORE', 'POP Lima Centro', 'pop', 'active', 'Lima', -12.046374, -77.042793),
  ('AQP-POP', 'POP Arequipa', 'pop', 'degraded', 'Arequipa', -16.409047, -71.537451),
  ('TRU-NODO', 'Nodo Trujillo Norte', 'node', 'active', 'Trujillo', -8.109052, -79.021534),
  ('LA-JOYA', 'Hub La Joya', 'hub', 'active', 'La Joya, Arequipa', -16.423000, -71.818000),
  ('MAJES', 'Hub Majes', 'hub', 'active', 'Majes, Arequipa', -16.350000, -72.190000),
  ('SANTA-RITA', 'Sede Santa Rita', 'node', 'active', 'Santa Rita de Siguas, Arequipa', -16.490000, -72.100000),
  ('CORIRE', 'Sede Corire', 'node', 'active', 'Corire, Arequipa', -16.220000, -72.470000),
  ('APLAO', 'Sede Aplao', 'node', 'active', 'Aplao, Arequipa', -16.080000, -72.490000),
  ('ESCALERILLAS', 'Sede Escalerillas', 'node', 'planned', 'Escalerillas, Arequipa', -16.180000, -72.570000),
  ('QUISCAY', 'Sede Quiscay', 'node', 'planned', 'Quiscay, Arequipa', -16.050000, -72.600000)
ON CONFLICT (code) DO NOTHING;

INSERT INTO user_site_scopes (user_id, site_id)
SELECT u.id, s.id
FROM users u CROSS JOIN sites s
WHERE u.email = 'noc@ispops.local'
ON CONFLICT DO NOTHING;

INSERT INTO racks (site_id, code, name, height_u)
SELECT s.id, seed.code, seed.name, 45
FROM sites s
JOIN (
  VALUES
    ('AQP-POP', 'RACK-AQP-01', 'Rack principal Arequipa'),
    ('MAJES', 'RACK-MAJES-01', 'Rack transporte Majes'),
    ('CORIRE', 'RACK-CORIRE-01', 'Rack nodo Corire'),
    ('APLAO', 'RACK-APLAO-01', 'Rack nodo Aplao')
) AS seed(site_code, code, name) ON seed.site_code = s.code
ON CONFLICT (site_id, code) DO NOTHING;

INSERT INTO power_feeds (site_id, name, feed_type, status, capacity_watts, load_watts, source)
SELECT s.id, seed.name, seed.feed_type, seed.status, seed.capacity_watts, seed.load_watts, seed.source
FROM sites s
JOIN (
  VALUES
    ('AQP-POP', 'AC-A', 'ac', 'active', 3000, 1420, 'Red comercial + UPS'),
    ('AQP-POP', 'DC-48V', 'dc', 'active', 2500, 980, 'Rectificador 48V'),
    ('MAJES', 'AC-A', 'ac', 'active', 2200, 860, 'Red comercial + inversor'),
    ('CORIRE', 'AC-A', 'ac', 'active', 1600, 620, 'Red comercial'),
    ('APLAO', 'AC-A', 'ac', 'degraded', 1600, 780, 'Red comercial')
) AS seed(site_code, name, feed_type, status, capacity_watts, load_watts, source) ON seed.site_code = s.code
ON CONFLICT (site_id, name) DO NOTHING;

INSERT INTO power_assets (site_id, source_feed_id, name, asset_type, status, capacity_watts, load_watts, autonomy_minutes, battery_health_percent, notes)
SELECT s.id, pf.id, seed.name, seed.asset_type, seed.status, seed.capacity_watts, seed.load_watts, seed.autonomy_minutes, seed.battery_health_percent, seed.notes
FROM sites s
JOIN (
  VALUES
    ('AQP-POP', 'AC-A', 'UPS AQP 6kVA', 'ups', 'active', 5400, 1420, 38, 91, 'Protege router, switch core y OLT'),
    ('AQP-POP', 'DC-48V', 'Rectificador 48V', 'rectifier', 'active', 2500, 980, 120, 86, 'Banco 48V para transporte'),
    ('MAJES', 'AC-A', 'UPS Majes 3kVA', 'ups', 'active', 2700, 860, 44, 88, 'Nodo de distribucion')
) AS seed(site_code, feed_name, name, asset_type, status, capacity_watts, load_watts, autonomy_minutes, battery_health_percent, notes) ON seed.site_code = s.code
LEFT JOIN power_feeds pf ON pf.site_id = s.id AND pf.name = seed.feed_name
ON CONFLICT (site_id, name) DO NOTHING;

INSERT INTO providers (code, name, provider_type, status, noc_email) VALUES
  ('ANDEAN', 'Andean Fiber', 'transport', 'active', 'noc@andeanfiber.example'),
  ('PACIFIC', 'Pacific Transit', 'internet_transit', 'active', 'noc@pacifictransit.example')
ON CONFLICT (code) DO NOTHING;

INSERT INTO contracts (provider_id, code, name, status, currency, monthly_cost, sla_target)
SELECT id, 'AF-TRANS-2026', 'Transporte regional sur/norte', 'active', 'USD', 8200, 99.70
FROM providers WHERE code = 'ANDEAN'
ON CONFLICT (provider_id, code) DO NOTHING;

INSERT INTO contracts (provider_id, code, name, status, currency, monthly_cost, sla_target)
SELECT id, 'PT-IPT-2026', 'Transito IP 20G Lima', 'active', 'USD', 14500, 99.90
FROM providers WHERE code = 'PACIFIC'
ON CONFLICT (provider_id, code) DO NOTHING;

INSERT INTO provider_capacities (provider_id, contract_id, service_type, committed_mbps, burstable_mbps, delivered_mbps, used_mbps, billing_mode, status)
SELECT p.id, c.id, seed.service_type, seed.committed_mbps, seed.burstable_mbps, seed.delivered_mbps, seed.used_mbps, seed.billing_mode, seed.status
FROM (
  VALUES
    ('ANDEAN', 'AF-TRANS-2026', 'transporte regional', 20000, 40000, 20000, 12700, 'commit 20G', 'active'),
    ('PACIFIC', 'PT-IPT-2026', 'transito IP', 20000, 30000, 20000, 15400, '95th percentile', 'active')
) AS seed(provider_code, contract_code, service_type, committed_mbps, burstable_mbps, delivered_mbps, used_mbps, billing_mode, status)
JOIN providers p ON p.code = seed.provider_code
LEFT JOIN contracts c ON c.provider_id = p.id AND c.code = seed.contract_code
ON CONFLICT (provider_id, contract_id, service_type) DO NOTHING;

INSERT INTO autonomous_systems (asn, name, ownership) VALUES
  (64512, 'ISP propio', 'own'),
  (64496, 'Pacific Transit', 'external')
ON CONFLICT (asn) DO NOTHING;

INSERT INTO rir_allocations (registry, resource, resource_type, status, allocated_at) VALUES
  ('LACNIC', '190.0.2.0/24', 'ipv4', 'active', '2024-01-10')
ON CONFLICT (resource) DO NOTHING;

INSERT INTO vrfs (name, route_distinguisher, description) VALUES
  ('global', NULL, 'Tabla global'),
  ('mgmt', '64512:10', 'Gestion de infraestructura'),
  ('access', '64512:20', 'Acceso clientes')
ON CONFLICT (name) DO NOTHING;

INSERT INTO prefixes (rir_allocation_id, site_id, vrf_id, prefix, family, role, status, description)
SELECT ra.id, s.id, v.id, '190.0.2.0/24', 4, 'public_customers', 'active', 'Pool publico clientes empresariales Lima'
FROM rir_allocations ra, sites s, vrfs v
WHERE ra.resource = '190.0.2.0/24' AND s.code = 'LIM-CORE' AND v.name = 'global'
ON CONFLICT DO NOTHING;

INSERT INTO prefixes (site_id, vrf_id, prefix, family, role, status, description)
SELECT s.id, v.id, '10.10.0.0/20', 4, 'management', 'active', 'Gestion multisede'
FROM sites s, vrfs v
WHERE s.code = 'LIM-CORE' AND v.name = 'mgmt'
ON CONFLICT DO NOTHING;

INSERT INTO manufacturers (name) VALUES
  ('Juniper'),
  ('MikroTik'),
  ('Huawei')
ON CONFLICT (name) DO NOTHING;

INSERT INTO device_roles (code, name) VALUES
  ('core_router', 'Router core'),
  ('edge_router', 'Router edge'),
  ('olt', 'OLT')
ON CONFLICT (code) DO NOTHING;

INSERT INTO device_models (manufacturer_id, model, device_type)
SELECT id, 'MX204', 'router' FROM manufacturers WHERE name = 'Juniper'
ON CONFLICT (manufacturer_id, model) DO NOTHING;

INSERT INTO device_models (manufacturer_id, model, device_type)
SELECT id, 'CCR2216', 'router' FROM manufacturers WHERE name = 'MikroTik'
ON CONFLICT (manufacturer_id, model) DO NOTHING;

INSERT INTO devices (site_id, model_id, role_id, name, status, management_ip)
SELECT s.id, dm.id, dr.id, 'PE-LIMA-01', 'active', '190.0.2.2'
FROM sites s, device_models dm, device_roles dr
WHERE s.code = 'LIM-CORE' AND dm.model = 'MX204' AND dr.code = 'core_router'
ON CONFLICT (name) DO NOTHING;

INSERT INTO devices (site_id, model_id, role_id, name, status, management_ip)
SELECT s.id, dm.id, dr.id, 'PE-AQP-01', 'degraded', '190.0.2.18'
FROM sites s, device_models dm, device_roles dr
WHERE s.code = 'AQP-POP' AND dm.model = 'CCR2216' AND dr.code = 'edge_router'
ON CONFLICT (name) DO NOTHING;

UPDATE devices d
SET rack_id = r.id,
    position_u = 38,
    height_u = 1,
    power_feed_id = pf.id
FROM racks r
JOIN sites s ON s.id = r.site_id
LEFT JOIN power_feeds pf ON pf.site_id = s.id AND pf.name = 'DC-48V'
WHERE d.name = 'PE-AQP-01' AND s.code = 'AQP-POP' AND r.code = 'RACK-AQP-01';

UPDATE devices d
SET rack_id = r.id,
    position_u = 40,
    height_u = 2,
    power_feed_id = pf.id
FROM racks r
JOIN sites s ON s.id = r.site_id
LEFT JOIN power_feeds pf ON pf.site_id = s.id AND pf.name = 'AC-A'
WHERE d.name = 'PE-LIMA-01' AND s.code = 'LIM-CORE';

INSERT INTO interfaces (device_id, name, interface_type, status, speed_mbps, description)
SELECT id, 'lo0', 'loopback', 'active', NULL, 'Loopback BGP/router-id'
FROM devices WHERE name = 'PE-LIMA-01'
ON CONFLICT (device_id, name) DO NOTHING;

INSERT INTO interfaces (device_id, name, interface_type, status, speed_mbps, description)
SELECT id, 'xe-0/0/2', 'ethernet', 'degraded', 10000, 'Transporte hacia AQP-POP'
FROM devices WHERE name = 'PE-LIMA-01'
ON CONFLICT (device_id, name) DO NOTHING;

INSERT INTO interfaces (device_id, name, interface_type, status, speed_mbps, description)
SELECT id, 'ether1', 'ethernet', 'down', 10000, 'Transporte hacia LIM-CORE'
FROM devices WHERE name = 'PE-AQP-01'
ON CONFLICT (device_id, name) DO NOTHING;

INSERT INTO ip_addresses (prefix_id, interface_id, address, status, role, dns_name, description)
SELECT p.id, i.id, '190.0.2.2/32', 'assigned', 'loopback', 'pe-lima-01.example', 'Loopback PE Lima'
FROM prefixes p, interfaces i
WHERE p.prefix = '190.0.2.0/24' AND i.name = 'lo0'
ON CONFLICT (address) DO NOTHING;

INSERT INTO circuits (provider_id, contract_id, code, name, circuit_type, status, capacity_mbps, sla_target)
SELECT p.id, c.id, 'TR-LIM-ARE-10G', 'Transporte Lima <> Arequipa', 'transport', 'down', 10000, 99.70
FROM providers p
LEFT JOIN contracts c ON c.provider_id = p.id AND c.code = 'AF-TRANS-2026'
WHERE p.code = 'ANDEAN'
ON CONFLICT (code) DO NOTHING;

INSERT INTO circuit_endpoints (circuit_id, site_id, device_id, interface_id, label, demarcation)
SELECT c.id, s.id, d.id, i.id, 'A', 'PE-LIMA-01 xe-0/0/2'
FROM circuits c, sites s, devices d, interfaces i
WHERE c.code = 'TR-LIM-ARE-10G' AND s.code = 'LIM-CORE' AND d.name = 'PE-LIMA-01' AND i.device_id = d.id AND i.name = 'xe-0/0/2'
ON CONFLICT DO NOTHING;

INSERT INTO circuit_endpoints (circuit_id, site_id, device_id, interface_id, label, demarcation)
SELECT c.id, s.id, d.id, i.id, 'Z', 'PE-AQP-01 ether1'
FROM circuits c, sites s, devices d, interfaces i
WHERE c.code = 'TR-LIM-ARE-10G' AND s.code = 'AQP-POP' AND d.name = 'PE-AQP-01' AND i.device_id = d.id AND i.name = 'ether1'
ON CONFLICT DO NOTHING;

INSERT INTO services (code, name, service_type, status, owner_team, description) VALUES
  ('SVC-BGP-EDGE', 'BGP edge y transito IP', 'routing', 'active', 'infra', 'Servicio de borde BGP, loopbacks, transito y salida internacional'),
  ('SVC-TRANSPORTE-SUR', 'Transporte regional sur', 'transport', 'degraded', 'noc', 'Backbone Arequipa, La Joya, Majes y sedes derivadas'),
  ('SVC-GESTION-ISP', 'Gestion infraestructura ISP', 'management', 'active', 'infra', 'Acceso de gestion a routers, switches, OLT y energia')
ON CONFLICT (code) DO NOTHING;

INSERT INTO service_endpoints (service_id, role, site_id, device_id, interface_id, ip_address_id, circuit_id)
SELECT svc.id, 'router-id', s.id, d.id, i.id, ip.id, NULL
FROM services svc
JOIN devices d ON d.name = 'PE-LIMA-01'
JOIN sites s ON s.id = d.site_id
JOIN interfaces i ON i.device_id = d.id AND i.name = 'lo0'
LEFT JOIN ip_addresses ip ON ip.interface_id = i.id
WHERE svc.code = 'SVC-BGP-EDGE'
ON CONFLICT DO NOTHING;

INSERT INTO service_endpoints (service_id, role, site_id, device_id, interface_id, ip_address_id, circuit_id)
SELECT svc.id, 'primary-transport', s.id, d.id, i.id, NULL, c.id
FROM services svc
JOIN circuits c ON c.code = 'TR-LIM-ARE-10G'
JOIN devices d ON d.name = 'PE-AQP-01'
JOIN sites s ON s.id = d.site_id
JOIN interfaces i ON i.device_id = d.id AND i.name = 'ether1'
WHERE svc.code = 'SVC-TRANSPORTE-SUR'
ON CONFLICT DO NOTHING;

INSERT INTO interface_links (a_interface_id, b_interface_id, circuit_id, link_type, status, capacity_mbps)
SELECT ai.id, bi.id, c.id, 'transport', 'down', 10000
FROM interfaces ai
JOIN devices ad ON ad.id = ai.device_id
JOIN interfaces bi ON bi.name = 'ether1'
JOIN devices bd ON bd.id = bi.device_id
JOIN circuits c ON c.code = 'TR-LIM-ARE-10G'
WHERE ad.name = 'PE-LIMA-01' AND ai.name = 'xe-0/0/2' AND bd.name = 'PE-AQP-01'
ON CONFLICT DO NOTHING;

INSERT INTO site_transport_links (a_site_id, z_site_id, provider_id, link_type, status, capacity_mbps, label)
SELECT a.id, z.id, p.id, seed.link_type, seed.status, seed.capacity_mbps, seed.label
FROM (
  VALUES
    ('AQP-POP', 'LA-JOYA', 'transport', 'active', 10000, 'Arequipa <> La Joya'),
    ('LA-JOYA', 'MAJES', 'transport', 'active', 10000, 'La Joya <> Majes'),
    ('MAJES', 'SANTA-RITA', 'distribution', 'active', 2000, 'Majes <> Santa Rita'),
    ('MAJES', 'CORIRE', 'distribution', 'active', 2000, 'Majes <> Corire'),
    ('MAJES', 'APLAO', 'distribution', 'active', 2000, 'Majes <> Aplao'),
    ('CORIRE', 'ESCALERILLAS', 'last_mile', 'planned', 1000, 'Corire <> Escalerillas'),
    ('APLAO', 'QUISCAY', 'last_mile', 'planned', 1000, 'Aplao <> Quiscay')
) AS seed(a_code, z_code, link_type, status, capacity_mbps, label)
JOIN sites a ON a.code = seed.a_code
JOIN sites z ON z.code = seed.z_code
LEFT JOIN providers p ON p.code = 'ANDEAN'
ON CONFLICT (a_site_id, z_site_id, link_type) DO NOTHING;

INSERT INTO datacenter_assets (site_id, rack_id, name, asset_type, status, units, ports, notes)
SELECT s.id, r.id, seed.name, seed.asset_type, seed.status, seed.units, seed.ports, seed.notes
FROM (
  VALUES
    ('AQP-POP', 'RACK-AQP-01', 'ODF-AQP-01', 'ODF 48 LC', 'active', 1, 48, 'Troncal proveedor y transporte regional'),
    ('AQP-POP', 'RACK-AQP-01', 'PDU-AQP-A', 'PDU monitoreable', 'active', 1, 16, 'Circuito AC-A'),
    ('AQP-POP', NULL, 'Bandeja fibra superior', 'canalizacion', 'active', NULL, NULL, 'Ruta patchcords ODF/equipos')
) AS seed(site_code, rack_code, name, asset_type, status, units, ports, notes)
JOIN sites s ON s.code = seed.site_code
LEFT JOIN racks r ON r.site_id = s.id AND r.code = seed.rack_code
ON CONFLICT (site_id, name) DO NOTHING;

INSERT INTO fiber_spans (code, a_site_id, z_site_id, provider_id, cable_type, fiber_count, used_fibers, distance_km, status, notes)
SELECT seed.code, a.id, z.id, p.id, seed.cable_type, seed.fiber_count, seed.used_fibers, seed.distance_km, seed.status, seed.notes
FROM (
  VALUES
    ('FO-AQP-LJ-024', 'AQP-POP', 'LA-JOYA', 'ANDEAN', 'ADSS monomodo', 24, 8, 62.4, 'active', 'Ruta troncal hacia Majes'),
    ('FO-LJ-MAJ-048', 'LA-JOYA', 'MAJES', 'ANDEAN', 'ADSS monomodo', 48, 12, 84.2, 'active', 'Cable principal con reserva para expansion'),
    ('FO-MAJ-COR-012', 'MAJES', 'CORIRE', NULL, 'drop armado', 12, 4, 18.7, 'active', 'Distribucion regional')
) AS seed(code, a_code, z_code, provider_code, cable_type, fiber_count, used_fibers, distance_km, status, notes)
JOIN sites a ON a.code = seed.a_code
JOIN sites z ON z.code = seed.z_code
LEFT JOIN providers p ON p.code = seed.provider_code
ON CONFLICT (code) DO NOTHING;

INSERT INTO fiber_strands (span_id, circuit_id, strand_number, tube_color, fiber_color, status, service, a_termination, z_termination)
SELECT fs.id, c.id, seed.strand_number, seed.tube_color, seed.fiber_color, seed.status, seed.service, seed.a_termination, seed.z_termination
FROM (
  VALUES
    ('FO-AQP-LJ-024', 'TR-LIM-ARE-10G', 1, 'azul', 'azul', 'used', 'Transporte 10G AQP-LA-JOYA', 'ODF-AQP-01/P01', 'ODF-LJ-01/P01'),
    ('FO-AQP-LJ-024', 'TR-LIM-ARE-10G', 2, 'azul', 'naranja', 'used', 'Retorno 10G AQP-LA-JOYA', 'ODF-AQP-01/P02', 'ODF-LJ-01/P02'),
    ('FO-LJ-MAJ-048', NULL, 7, 'verde', 'rojo', 'reserved', 'Reserva OLT Majes', 'ODF-LJ-01/P07', 'ODF-MAJ-01/P07')
) AS seed(span_code, circuit_code, strand_number, tube_color, fiber_color, status, service, a_termination, z_termination)
JOIN fiber_spans fs ON fs.code = seed.span_code
LEFT JOIN circuits c ON c.code = seed.circuit_code
ON CONFLICT (span_id, strand_number) DO NOTHING;

INSERT INTO transceivers (interface_id, vendor, part_number, serial_number, form_factor, speed_mbps, wavelength_nm, reach_km, connector_type, fiber_mode, tx_power_dbm, rx_power_dbm, status)
SELECT i.id, seed.vendor, seed.part_number, seed.serial_number, seed.form_factor, seed.speed_mbps, seed.wavelength_nm, seed.reach_km, seed.connector_type, seed.fiber_mode, seed.tx_power_dbm, seed.rx_power_dbm, seed.status
FROM (
  VALUES
    ('PE-AQP-01', 'ether1', 'Finisar', 'FTLX1475D3BCL', 'FNS-AQP-001', 'SFP+', 10000, 1310, 10, 'LC', 'SM', -1.8, -6.2, 'degraded'),
    ('PE-LIMA-01', 'xe-0/0/2', 'Juniper', 'EX-SFP-10GE-LR', 'JNP-LIM-002', 'SFP+', 10000, 1310, 10, 'LC', 'SM', -2.1, -5.4, 'active')
) AS seed(device_name, interface_name, vendor, part_number, serial_number, form_factor, speed_mbps, wavelength_nm, reach_km, connector_type, fiber_mode, tx_power_dbm, rx_power_dbm, status)
JOIN devices d ON d.name = seed.device_name
JOIN interfaces i ON i.device_id = d.id AND i.name = seed.interface_name
ON CONFLICT (interface_id) DO NOTHING;

INSERT INTO patchcords (code, a_interface_id, z_interface_id, circuit_id, a_endpoint, z_endpoint, media_type, connector_a, connector_z, length_meters, fiber_mode, color, status)
SELECT seed.code, ai.id, zi.id, c.id, seed.a_endpoint, seed.z_endpoint, seed.media_type, seed.connector_a, seed.connector_z, seed.length_meters, seed.fiber_mode, seed.color, seed.status
FROM (
  VALUES
    ('PC-AQP-0001', 'PE-AQP-01', 'ether1', NULL, NULL, 'TR-LIM-ARE-10G', 'PE-AQP-01 ether1', 'ODF-AQP-01/P01', 'fiber', 'LC/UPC', 'LC/UPC', 3, 'SM', 'amarillo', 'active'),
    ('PC-AQP-0102', NULL, NULL, NULL, NULL, NULL, 'SW-AQP-01 xe1', 'PE-AQP-01 xe-0/0/3', 'dac', 'SFP+', 'SFP+', 1, NULL, 'negro', 'active')
) AS seed(code, a_device_name, a_interface_name, z_device_name, z_interface_name, circuit_code, a_endpoint, z_endpoint, media_type, connector_a, connector_z, length_meters, fiber_mode, color, status)
LEFT JOIN devices ad ON ad.name = seed.a_device_name
LEFT JOIN interfaces ai ON ai.device_id = ad.id AND ai.name = seed.a_interface_name
LEFT JOIN devices zd ON zd.name = seed.z_device_name
LEFT JOIN interfaces zi ON zi.device_id = zd.id AND zi.name = seed.z_interface_name
LEFT JOIN circuits c ON c.code = seed.circuit_code
ON CONFLICT (code) DO NOTHING;

INSERT INTO documents (object_type, object_id, title, body_md)
SELECT 'circuit', c.id, 'Procedimiento de escalamiento TR-LIM-ARE-10G', 'Escalar primero a NOC Andean Fiber. Adjuntar pruebas de perdida y estado de interfaz.'
FROM circuits c
WHERE c.code = 'TR-LIM-ARE-10G'
ON CONFLICT DO NOTHING;

INSERT INTO documents (object_type, object_id, title, body_md)
SELECT 'site', s.id, 'Notas operativas POP Lima Centro', 'Core principal, transito IP y transporte regional. Revisar ventanas de mantenimiento.'
FROM sites s
WHERE s.code = 'LIM-CORE'
ON CONFLICT DO NOTHING;

INSERT INTO evidence_files (object_type, object_id, filename, storage_key, content_type)
SELECT 'provider', p.id, 'contrato-andean-2026.pdf', 'providers/andean/contrato-2026.pdf', 'application/pdf'
FROM providers p
WHERE p.code = 'ANDEAN'
ON CONFLICT DO NOTHING;

INSERT INTO evidence_files (object_type, object_id, filename, storage_key, content_type)
SELECT 'circuit', c.id, 'odf-aqp-extremo-z.jpg', 'circuits/tr-lim-are-10g/odf-aqp.jpg', 'image/jpeg'
FROM circuits c
WHERE c.code = 'TR-LIM-ARE-10G'
ON CONFLICT DO NOTHING;

INSERT INTO config_backups (device_id, storage_key, config_hash, source)
SELECT id, 'backups/PE-LIMA-01/2026-07-04.conf', 'sha256:demo-lima', 'scheduled'
FROM devices WHERE name = 'PE-LIMA-01'
ON CONFLICT DO NOTHING;

INSERT INTO config_backups (device_id, storage_key, config_hash, source)
SELECT id, 'backups/PE-AQP-01/2026-07-03.conf', 'sha256:demo-aqp', 'scheduled'
FROM devices WHERE name = 'PE-AQP-01'
ON CONFLICT DO NOTHING;

INSERT INTO monitored_objects (object_type, object_id, monitor_source, external_ref, status, last_seen_at)
SELECT 'circuit', c.id, 'demo-monitor', 'circuit:TR-LIM-ARE-10G', 'down', now()
FROM circuits c
WHERE c.code = 'TR-LIM-ARE-10G'
ON CONFLICT DO NOTHING;

INSERT INTO monitored_objects (object_type, object_id, monitor_source, external_ref, status, last_seen_at)
SELECT 'interface', i.id, 'demo-monitor', 'interface:PE-LIMA-01:xe-0/0/2', 'degraded', now()
FROM interfaces i
JOIN devices d ON d.id = i.device_id
WHERE d.name = 'PE-LIMA-01' AND i.name = 'xe-0/0/2'
ON CONFLICT DO NOTHING;

INSERT INTO alerts (monitored_object_id, severity, status, title, description)
SELECT mo.id, 'critical', 'active', 'Circuito TR-LIM-ARE-10G caido', 'Proveedor Andean Fiber - POP Arequipa'
FROM monitored_objects mo
WHERE mo.external_ref = 'circuit:TR-LIM-ARE-10G'
ON CONFLICT DO NOTHING;

INSERT INTO alerts (monitored_object_id, severity, status, title, description)
SELECT mo.id, 'major', 'active', 'PE-LIMA-01 uplink saturado', 'Interfaz xe-0/0/2 - 92% promedio 15m'
FROM monitored_objects mo
WHERE mo.external_ref = 'interface:PE-LIMA-01:xe-0/0/2'
ON CONFLICT DO NOTHING;

INSERT INTO change_requests (title, description, status, risk_level, planned_start, planned_end, requested_by)
SELECT 'Migracion transporte Lima-Arequipa', 'Mover trafico a ruta alterna y validar reconvergencia.', 'submitted', 'high', now() + interval '1 day', now() + interval '1 day 2 hours', u.id
FROM users u WHERE u.email = 'admin@ispops.local'
ON CONFLICT DO NOTHING;

INSERT INTO change_impacts (change_request_id, object_type, object_id, impact_type, notes)
SELECT cr.id, 'circuit', c.id, 'service_degradation', 'Riesgo de degradacion regional durante pruebas'
FROM change_requests cr, circuits c
WHERE cr.title = 'Migracion transporte Lima-Arequipa' AND c.code = 'TR-LIM-ARE-10G'
ON CONFLICT DO NOTHING;


INSERT INTO incidents (code, title, severity, status, started_at, owner_team, summary, created_by)
SELECT 'INC-AQP-MAJES-001', 'Degradacion transporte Majes y sedes derivadas', 'major', 'investigating', now() - interval '45 minutes', 'noc', 'Perdida intermitente en transporte regional hacia Majes.', u.id
FROM users u WHERE u.email = 'noc@ispops.local'
ON CONFLICT (code) DO NOTHING;

INSERT INTO incident_impacts (incident_id, object_type, object_id, impact_type, notes)
SELECT i.id, 'site', s.id, 'degraded', 'Impacto regional aguas abajo de Majes'
FROM incidents i, sites s
WHERE i.code = 'INC-AQP-MAJES-001' AND s.code IN ('MAJES', 'SANTA-RITA', 'CORIRE', 'APLAO')
ON CONFLICT DO NOTHING;

INSERT INTO incident_events (incident_id, event_type, message, created_by)
SELECT i.id, 'update', 'NOC valida perdida y latencia hacia sedes derivadas de Majes.', u.id
FROM incidents i, users u
WHERE i.code = 'INC-AQP-MAJES-001' AND u.email = 'noc@ispops.local'
ON CONFLICT DO NOTHING;
