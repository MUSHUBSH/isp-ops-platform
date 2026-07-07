# Arquitectura

## Componentes

- Web NOC-first: React, TypeScript, tablas densas, paneles laterales, tema claro/oscuro y topologia.
- API modular: dominios separados para sedes, proveedores, IPAM, inventario, circuitos, topologia, monitoreo, documentos y auditoria.
- PostgreSQL: fuente de verdad con tipos `cidr`, `inet` y `macaddr`.
- Workers futuros: descubrimiento, monitoreo, backups, reconciliacion y alertas.
- Object storage: evidencias, contratos, fotos, backups y adjuntos.

## Flujo de datos

1. El usuario documenta o importa objetos tecnicos.
2. La API valida relaciones y emite eventos de auditoria.
3. La base conserva el estado actual y el historial.
4. La topologia se deriva desde interfaces, links, circuitos y servicios.
5. Los adaptadores de monitoreo normalizan alertas y las vinculan a objetos reales.

## Modulos API

- identity
- audit
- providers
- resources
- ipam
- sites
- inventory
- circuits
- topology
- monitoring
- documentation
- backups
