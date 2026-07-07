# Modelo de datos

El modelo base esta en `packages/database/schema.sql`.

Entidades principales:

- `sites`: sedes, POPs, nodos, torres, datacenters.
- `providers`, `contracts`, `circuits`: relacion comercial y tecnica.
- `autonomous_systems`, `rir_allocations`, `prefixes`, `ip_addresses`: recursos de numeracion.
- `devices`, `interfaces`, `interface_links`: inventario y conexion tecnica.
- `services`, `service_endpoints`: contexto operacional de servicios.
- `alerts`, `monitored_objects`: monitoreo normalizado.
- `documents`, `evidence_files`, `config_backups`: documentacion y evidencia.
- `audit_events`, `activity_log`: trazabilidad.

Regla rectora: los objetos criticos deben estar relacionados. Una IP asignada sin interfaz, equipo, sede y contexto de servicio debe aparecer como deuda documental.
