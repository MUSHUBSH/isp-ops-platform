# Roadmap ejecutable

Estado actual: prototipo operativo local con frontend React, API modular, PostgreSQL local, datos demo, CRUD amplio, mapa, topologia, IPAM, inventario, servicios, monitoreo basico y auditoria robusta.

## Fase 1: V1 local estable

Objetivo: usar la plataforma en una laptop/PC local para cargar datos reales de la ISP con seguridad razonable.

Prioridad alta:

- Revisar visualmente todos los modulos principales en desktop y mobile.
- Completar estados vacios y mensajes de error por modulo.
- Mejorar formularios largos con secciones y validacion visual.
- Agregar confirmaciones claras antes de eliminar.
- Probar flujo completo:
  - sede
  - proveedor
  - contrato
  - capacidad
  - rack
  - energia
  - equipo
  - interfaz
  - circuito
  - IP
  - servicio
  - documento
  - backup
  - incidencia
  - cambio
- Crear importadores CSV guiados para:
  - sedes: base implementada
  - equipos: base implementada
  - interfaces: base implementada
  - planta fisica/datacenter: base implementada
  - IPAM: pendiente
  - circuitos: pendiente
- Completar OpenAPI formal desde `docs/api-surface.md`.
- Agregar pruebas automaticas para repositorios criticos.
- Documentar backup/restore local con ejemplo de restauracion.

Criterio de salida:

- `pnpm setup:local`, `pnpm dev:local`, `pnpm doctor` funcionan en una maquina limpia.
- La UI indica `API live` y `PostgreSQL conectado`.
- Se puede cargar una sede completa sin tocar SQL manualmente.
- El historial muestra altas, ediciones y borrados con nombres legibles.

## Fase 2: V1 operativa interna

Objetivo: que NOC/soporte/infraestructura puedan usarla como fuente diaria de consulta y documentacion.

Prioridad alta:

- Autenticacion real con usuarios administrables desde UI.
- Roles por equipo:
  - super admin
  - NOC
  - soporte
  - infraestructura
  - lectura
- Permisos por sede o zona.
- Vistas detalle profundas:
  - sede
  - equipo
  - circuito
  - servicio
  - IP
- Buscador global contra API con debounce y resultados agrupados.
- Dashboard NOC accionable:
  - alertas activas
  - incidencias abiertas
  - sitios degradados
  - circuitos caidos
  - capacidad por proveedor
  - servicios en riesgo
- Reportes exportables CSV.
- Control de cambios mas completo:
  - aprobacion
  - ventana
  - rollback
  - evidencias
- Mejoras de mapa:
  - capas
  - filtros por estado
  - busqueda de sede
  - impacto aguas abajo visual

Criterio de salida:

- Un tecnico puede encontrar rapidamente sede, equipo, IP, circuito o servicio.
- El NOC puede ver impacto y estado sin abrir varias pantallas.
- Los cambios relevantes quedan auditados con actor, motivo y before/after.

## Fase 3: Integraciones reales

Objetivo: conectar la fuente de verdad con la operacion real de red.

Prioridad alta:

- Adaptador SNMP inicial:
  - estado interfaz
  - trafico
  - errores
  - uptime
- Adaptador MikroTik:
  - vecinos
  - interfaces
  - direcciones IP
  - rutas basicas
- Adaptador OLT:
  - PON
  - ONUs
  - potencia
  - estado
- Importacion desde monitoreo externo:
  - Zabbix
  - LibreNMS
  - Prometheus/Alertmanager
- Normalizacion de alertas.
- Job scheduler para recoleccion periodica.
- Historial de metricas.
- Deteccion de drift entre documentacion y red real.

Criterio de salida:

- La plataforma detecta diferencias entre lo documentado y lo observado.
- Las alertas se vinculan a sede/equipo/interfaz/circuito/servicio.
- El NOC puede saltar de alerta a contexto tecnico.

## Fase 4: Producto avanzado ISP

Objetivo: superar herramientas genericas como sistema interno especializado.

Ideas clave:

- Motor de impacto por topologia.
- Capacidad y saturacion por proveedor, tramo y sede.
- Vista historica de crecimiento.
- Planeamiento de expansion.
- Gestion de fibra por tubo/hilo/ODF.
- Flujo de altas masivas para nuevas sedes.
- Inventario financiero basico:
  - costo proveedor
  - costo circuito
  - costo energia
  - costo rack/datacenter
- Portal de consulta para soporte.
- Modo NOC wallboard.

## Deuda tecnica vigilada

- Modularizar `App.tsx` en componentes por dominio.
- Completar pruebas unitarias API.
- Completar pruebas e2e UI.
- Mantener OpenAPI al dia.
- Revisar indices PostgreSQL cuando haya datos reales.
- Definir migraciones versionadas antes de produccion compartida.
- Evitar que los datos demo oculten errores de PostgreSQL en modo operativo.

## Siguiente mejor bloque de trabajo

1. Separar vistas grandes de `App.tsx` por modulo.
2. Mejorar confirmaciones y mensajes de error de eliminacion.
3. Implementar importadores CSV de IPAM y circuitos.
4. Completar vista detalle de sede con pestañas.
5. Completar OpenAPI desde `docs/api-surface.md`.
