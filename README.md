# ISP Ops Platform

ERP tecnico interno para operacion de ISP multisede: NOC, proveedores, ASN/LACNIC, IPAM, servicios, sedes, equipos, interfaces, circuitos, topologia, monitoreo, documentacion, backups y auditoria.

Este repositorio nace como monorepo API-first:

- `apps/web`: React + TypeScript, UI NOC-first.
- `apps/api`: API TypeScript modular.
- `packages/database`: esquema PostgreSQL inicial.
- `packages/contracts`: contrato OpenAPI.
- `docs`: decisiones de arquitectura y modelo.
- `docs/api-surface.md`: catalogo actual de endpoints implementados.
- `docs/operational-playbook.md`: orden recomendado para cargar datos reales.

Estado: prototipo operativo local para documentacion, IPAM, servicios, inventario, topologia y NOC.

## Principios

- La red se modela como relaciones operativas, no como inventario plano.
- Cada IP debe poder explicar su origen, asignacion, interfaz, equipo, sede, servicio e historial.
- La topologia se deriva de datos estructurados.
- La auditoria es append-only.
- El monitoreo se integra, se normaliza y se vincula con la fuente de verdad.

## Primeros comandos previstos

```bash
pnpm install
pnpm dev
```

La estructura esta preparada para evolucionar hacia servicios reales, migraciones y adaptadores de monitoreo.


## Modo local recomendado

Como esta etapa se trabajara sin VPS ni presupuesto mensual, usa el flujo local:

```powershell
pnpm dev:local
```

Esto levanta PostgreSQL en Docker y arranca API + Web con las variables necesarias.

Comandos utiles:

```powershell
pnpm db:health   # verifica PostgreSQL y conteos principales
pnpm doctor      # diagnostico completo de entorno local
pnpm db:backup   # genera backup SQL local en backups/
pnpm db:reset    # recrea la base local con schema/seed
pnpm db:psql     # abre psql dentro del contenedor
```

Guia completa: `docs/local-first.md`.

Para empezar a cargar datos reales sin romper relaciones, sigue `docs/operational-playbook.md`.

## Base de datos

El proyecto incluye `docker-compose.yml` para levantar PostgreSQL con el esquema y semillas iniciales:

```bash
docker compose up -d
```

La API usa `DATABASE_URL`. Si no existe o PostgreSQL no responde, los endpoints de lectura usan datos demo para permitir desarrollo de UI. Las operaciones de escritura requieren PostgreSQL y registran eventos en `audit_events`.

## Autenticacion local

Las escrituras usan API key interna por header:

```bash
x-api-key: dev-admin-key
```

La semilla crea `admin@ispops.local` con rol `super_admin` y permisos completos. La web lee `VITE_API_KEY` desde `.env`.

## Endpoints de escritura iniciales

- `POST /sites`
- `GET /sites/map`
- `POST /sites/map/import`
- `PATCH /sites/:code/location`
- `POST /sites/transport-links`
- `POST /providers`
- `POST /ipam/prefixes`
- `POST /ipam/addresses`
- `POST /services`
- `POST /services/:code/endpoints`
- `GET /sites/:code/racks`
- `POST /sites/:code/racks`
- `GET /sites/:code/power`
- `POST /sites/:code/power-feeds`
- `GET /incidents`
- `POST /incidents`
- `POST /incidents/:code/events`
- `POST /inventory/devices`
- `POST /inventory/interfaces`
- `POST /inventory/interface-links`
- `POST /circuits`
- `POST /circuits/:code/endpoints`
- `POST /documentation/documents`
- `POST /documentation/evidence`
- `POST /backups`
- `POST /monitoring/alerts`
- `POST /monitoring/alerts/:id/ack`
- `POST /monitoring/maintenance-windows`
- `POST /changes`
- `POST /changes/:id/approve`

Cada payload acepta un campo `reason` para dejar trazabilidad humana en auditoria.

## Nota Docker Desktop

Si `pnpm db:up` o `pnpm dev:local` muestra `failed to connect to the docker API`, abre Docker Desktop en Windows y espera a que el motor quede corriendo. Luego repite el comando.
