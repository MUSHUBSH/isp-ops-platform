# Superficie API actual

Este catalogo resume los endpoints implementados en la API local. Las rutas `GET` son de lectura; las rutas `POST`, `PATCH` y `DELETE` requieren API key y el permiso indicado por cada modulo.

Header de escritura:

```http
x-api-key: dev-admin-key
```

## Sistema

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/health` | Estado API y conexion PostgreSQL/demo |
| GET | `/identity/me` | Usuario resuelto por API key |
| GET | `/identity/roles` | Roles disponibles |
| GET | `/identity/permissions` | Permisos disponibles |
| GET | `/search?q=` | Busqueda global operacional |
| GET | `/audit/recent` | Ultimos eventos de auditoria |

## Dashboard NOC

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/noc/summary` | KPIs NOC: salud, alertas, sedes, capacidad |
| GET | `/noc/workbench` | Vista resumida para consola NOC |

## Proveedores y contratos

Permiso de escritura: `providers.write`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/providers` | Lista proveedores |
| GET | `/providers/:id` | Detalle proveedor por id o codigo |
| POST | `/providers` | Crear proveedor |
| PATCH | `/providers/:id` | Editar proveedor |
| PATCH | `/providers/:id/status` | Cambiar estado de proveedor |
| DELETE | `/providers/:id` | Eliminar proveedor sin dependencias |
| GET | `/providers/contracts` | Lista contratos |
| POST | `/providers/contracts` | Crear contrato |
| PATCH | `/providers/contracts/:id` | Editar contrato |
| PATCH | `/providers/contracts/:id/status` | Cambiar estado de contrato |
| DELETE | `/providers/contracts/:id` | Eliminar contrato sin dependencias |

## ASN, LACNIC e IPAM

Permiso de escritura: `ipam.write`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/ipam/prefixes` | Prefijos y bloques |
| POST | `/ipam/prefixes` | Crear prefijo |
| PATCH | `/ipam/prefixes/:id` | Editar prefijo |
| DELETE | `/ipam/prefixes/:id` | Eliminar prefijo sin dependencias |
| GET | `/ipam/addresses` | IPs asignadas |
| POST | `/ipam/addresses` | Asignar IP |
| PATCH | `/ipam/addresses/:id` | Editar asignacion IP |
| DELETE | `/ipam/addresses/:id` | Eliminar IP sin dependencias |
| GET | `/ipam/debt` | Deuda documental IPAM |

## Servicios

Permiso de escritura: `services.write`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/services` | Servicios operativos |
| GET | `/services/:code` | Servicio con extremos |
| POST | `/services` | Crear servicio |
| PATCH | `/services/:code` | Editar servicio |
| DELETE | `/services/:code` | Eliminar servicio sin dependencias |
| GET | `/services/endpoints?serviceCode=` | Extremos de servicios |
| POST | `/services/:code/endpoints` | Crear extremo de servicio |
| PATCH | `/services/endpoints/:id` | Editar extremo de servicio |
| DELETE | `/services/endpoints/:id` | Eliminar extremo de servicio |

## Sedes y mapa

Permiso de escritura: `sites.write`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/sites` | Lista sedes |
| GET | `/sites/map` | Nodos y enlaces del mapa principal |
| GET | `/sites/:code/downstream-impact` | Impacto aguas abajo |
| GET | `/sites/:code/operational-view` | Inventario, topologia, enlaces e incidencias por sede |
| POST | `/sites` | Crear sede |
| PATCH | `/sites/:code` | Editar sede |
| PATCH | `/sites/:code/location` | Editar ubicacion/mapa |
| DELETE | `/sites/:code` | Eliminar sede sin dependencias |
| POST | `/sites/map/import` | Importar sedes/enlaces por CSV o JSON |
| POST | `/sites/transport-links` | Crear enlace site-to-site |
| PATCH | `/sites/transport-links/:id` | Editar enlace site-to-site |
| DELETE | `/sites/transport-links/:id` | Eliminar enlace site-to-site |

## Racks, energia e inventario

Permiso de escritura: `inventory.write`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/inventory/manufacturers` | Fabricantes |
| GET | `/inventory/device-models` | Modelos |
| GET | `/inventory/device-roles` | Roles de equipo |
| GET | `/inventory/devices` | Equipos |
| POST | `/inventory/devices` | Crear equipo |
| PATCH | `/inventory/devices/:id` | Editar equipo |
| PATCH | `/inventory/devices/:id/placement` | Ubicar equipo en rack/RU/feed |
| DELETE | `/inventory/devices/:id` | Eliminar equipo sin dependencias |
| GET | `/inventory/interfaces` | Interfaces |
| POST | `/inventory/interfaces` | Crear interfaz |
| PATCH | `/inventory/interfaces/:id` | Editar interfaz |
| DELETE | `/inventory/interfaces/:id` | Eliminar interfaz sin dependencias |
| GET | `/inventory/interface-links` | Enlaces puerto a puerto |
| POST | `/inventory/interface-links` | Crear enlace entre interfaces |
| PATCH | `/inventory/interface-links/:id` | Editar enlace entre interfaces |
| DELETE | `/inventory/interface-links/:id` | Eliminar enlace entre interfaces |
| GET | `/sites/:code/racks` | Racks por sede |
| POST | `/sites/:code/racks` | Crear rack |
| PATCH | `/sites/:code/racks/:id` | Editar rack |
| DELETE | `/sites/:code/racks/:id` | Eliminar rack sin equipos montados |
| GET | `/sites/:code/power` | Feeds electricos por sede |
| POST | `/sites/:code/power-feeds` | Crear feed electrico |
| PATCH | `/sites/:code/power-feeds/:id` | Editar feed electrico |
| DELETE | `/sites/:code/power-feeds/:id` | Eliminar feed sin equipos asignados |
| GET | `/sites/:code/power-assets` | UPS, rectificadores, baterias y activos electricos |
| POST | `/sites/:code/power-assets` | Crear activo electrico |
| PATCH | `/sites/:code/power-assets/:id` | Editar activo electrico |
| DELETE | `/sites/:code/power-assets/:id` | Eliminar activo electrico |

## Datacenter fisico

Permiso de escritura: `physical.write`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/physical/provider-capacities` | Capacidad contratada/usada por proveedor |
| POST | `/physical/provider-capacities` | Crear capacidad de proveedor |
| PATCH | `/physical/provider-capacities/:id` | Editar capacidad de proveedor |
| GET | `/physical/fiber-spans` | Tramos de fibra |
| POST | `/physical/fiber-spans` | Crear tramo de fibra |
| PATCH | `/physical/fiber-spans/:id` | Editar tramo de fibra |
| GET | `/physical/fiber-strands` | Hilos de fibra |
| POST | `/physical/fiber-strands` | Crear hilo de fibra |
| PATCH | `/physical/fiber-strands/:id` | Editar hilo de fibra |
| GET | `/physical/transceivers` | Transceivers |
| POST | `/physical/transceivers` | Crear transceiver |
| PATCH | `/physical/transceivers/:id` | Editar transceiver |
| GET | `/physical/patchcords` | Patchcords puerto a puerto |
| POST | `/physical/patchcords` | Crear patchcord |
| PATCH | `/physical/patchcords/:id` | Editar patchcord |
| GET | `/physical/datacenter-assets` | ODF, bandejas, PDU, OLT, servidores y otros activos |
| POST | `/physical/datacenter-assets` | Crear activo datacenter |
| PATCH | `/physical/datacenter-assets/:id` | Editar activo datacenter |
| PATCH | `/physical/:kind/:id/status` | Cambiar estado de registro fisico |
| DELETE | `/physical/:kind/:id` | Eliminar registro fisico sin dependencias |

Kinds validos: `provider-capacities`, `fiber-spans`, `fiber-strands`, `transceivers`, `patchcords`, `datacenter-assets`.

## Circuitos

Permiso de escritura: `circuits.write`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/circuits` | Circuitos |
| GET | `/circuits/:code` | Detalle circuito |
| GET | `/circuits/:code/impact` | Impacto y dependencias del circuito |
| POST | `/circuits` | Crear circuito |
| PATCH | `/circuits/:code` | Editar circuito |
| PATCH | `/circuits/:code/status` | Cambiar estado |
| DELETE | `/circuits/:code` | Eliminar circuito sin dependencias |
| GET | `/circuits/:code/endpoints` | Extremos del circuito |
| POST | `/circuits/:code/endpoints` | Crear extremo del circuito |
| PATCH | `/circuits/:code/endpoints/:id` | Editar extremo del circuito |
| DELETE | `/circuits/:code/endpoints/:id` | Eliminar extremo del circuito |

## Topologia

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/topology/graph` | Grafo derivado de sedes, equipos, circuitos y servicios |

## Monitoreo

Permisos: `alerts.write`, `alerts.ack`, `maintenance.write`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/monitoring/alerts` | Alertas normalizadas |
| POST | `/monitoring/alerts` | Crear alerta |
| POST | `/monitoring/alerts/:id/ack` | Confirmar alerta |
| PATCH | `/monitoring/alerts/:id/status` | Cambiar estado de alerta |
| DELETE | `/monitoring/alerts/:id` | Eliminar alerta |
| GET | `/monitoring/maintenance-windows` | Ventanas de mantenimiento |
| POST | `/monitoring/maintenance-windows` | Crear ventana |
| PATCH | `/monitoring/maintenance-windows/:id` | Editar ventana |
| DELETE | `/monitoring/maintenance-windows/:id` | Eliminar ventana |

## Incidencias

Permiso de escritura: `incidents.write`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/incidents` | Lista incidencias |
| GET | `/incidents/:code` | Incidencia con eventos e impactos |
| POST | `/incidents` | Crear incidencia |
| POST | `/incidents/:code/events` | Agregar evento a incidencia |
| PATCH | `/incidents/:code` | Editar incidencia |
| PATCH | `/incidents/:code/status` | Cambiar estado |
| DELETE | `/incidents/:code` | Eliminar incidencia |

## Documentacion y evidencias

Permiso de escritura: `documentation.write`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/documentation/documents` | Documentos tecnicos/runbooks |
| POST | `/documentation/documents` | Crear documento |
| PATCH | `/documentation/documents/:id` | Editar documento |
| DELETE | `/documentation/documents/:id` | Eliminar documento |
| GET | `/documentation/evidence` | Evidencias y archivos referenciados |
| POST | `/documentation/evidence` | Crear evidencia |
| PATCH | `/documentation/evidence/:id` | Editar evidencia |
| DELETE | `/documentation/evidence/:id` | Eliminar evidencia |

## Backups

Permiso de escritura: `backups.write`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/backups` | Registros de backup de configuracion |
| GET | `/backups/summary` | Cobertura de backups |
| POST | `/backups` | Registrar backup |
| PATCH | `/backups/:id` | Editar registro de backup |
| DELETE | `/backups/:id` | Eliminar registro de backup |

## Cambios

Permisos: `changes.write`, `changes.approve`.

| Metodo | Ruta | Proposito |
| --- | --- | --- |
| GET | `/changes` | Solicitudes de cambio |
| GET | `/changes/:id/impacts` | Impactos de una solicitud |
| POST | `/changes` | Crear solicitud de cambio |
| POST | `/changes/:id/approve` | Aprobar cambio |
| PATCH | `/changes/:id` | Editar cambio e impactos |
| PATCH | `/changes/:id/status` | Cambiar estado |
| DELETE | `/changes/:id` | Eliminar cambio |
