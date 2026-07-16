# Playbook operativo local

Esta guia define el orden recomendado para empezar a cargar datos reales de la ISP sin romper relaciones ni perder trazabilidad.

## Antes de cargar datos reales

1. Ejecuta `pnpm dev:local`.
2. Abre `http://localhost:5173`.
3. Verifica en la barra superior:
   - `API live`
   - `PostgreSQL conectado`
4. Ejecuta `pnpm doctor` si algo no responde.
5. Crea un backup inicial con `pnpm db:backup`.

No cargues datos reales si la UI muestra `demo local`, `Demo sin DB` o `DB offline`.

## Orden recomendado de carga

### 1. Sedes

Carga primero las sedes principales:

- Arequipa / proveedor
- La Joya
- Majes
- Santa Rita
- Corire
- Aplao
- Escalerillas
- Quiscay

Datos minimos:

- codigo corto
- nombre
- tipo: `pop`, `hub`, `tower`, `node`, `datacenter`
- estado
- latitud/longitud si se usara mapa
- direccion o referencia

### 2. Mapa y transporte site-to-site

Registra los enlaces del transporte:

1. Arequipa -> La Joya
2. La Joya -> Majes
3. Majes -> Santa Rita
4. Majes -> Corire
5. Majes -> Aplao
6. Corire -> Escalerillas
7. Aplao -> Quiscay

Datos minimos:

- sede A
- sede Z
- tipo de enlace
- capacidad Mbps
- estado
- etiqueta operativa

### 3. Proveedores y contratos

Carga proveedores antes de crear circuitos o capacidad contratada.

Datos minimos de proveedor:

- codigo
- nombre
- tipo: transporte, internet, energia, torre, datacenter
- correo NOC
- telefono NOC

Datos minimos de contrato:

- proveedor
- codigo de contrato
- nombre
- costo mensual
- moneda
- SLA
- vigencia

### 4. Capacidad contratada

En Datacenter/Fisico registra la capacidad por proveedor:

- tipo de servicio: internet, transporte, fibra oscura, cross-connect
- Mbps comprometidos
- Mbps burstables
- Mbps entregados
- Mbps usados
- modo de facturacion
- estado

Esto alimenta vistas de capacidad y riesgo por proveedor.

### 5. Racks y energia por sede

Por cada sede importante:

1. Crea racks de 45 RU.
2. Crea feeds electricos.
3. Carga UPS, rectificadores, baterias, PDU o energia DC/AC.

Datos minimos:

- rack: codigo, nombre, altura RU
- feed: nombre, tipo, capacidad W, carga W
- activo electrico: tipo, capacidad, carga, autonomia, salud bateria

### 6. Equipos

Carga equipos despues de sedes, racks y energia.

Datos minimos:

- sede
- nombre unico
- rol: router, switch, OLT, ODF, server
- estado
- IP de gestion
- serial
- ubicacion fisica: rack, RU, altura, feed

### 7. Interfaces

Carga interfaces de cada equipo:

- nombre: `ether1`, `sfp-sfpplus1`, `pon1`, `ge-0/0/0`
- tipo: ethernet, sfp, pon, uplink, loopback
- velocidad Mbps
- estado
- descripcion

### 8. Patchcords, transceivers y fibra

Completa la capa fisica:

- transceiver por interfaz
- patchcord puerto a puerto
- tramos de fibra entre sedes
- hilos de fibra usados/libres
- terminaciones A/Z

Datos importantes:

- modelo y serial del transceiver
- form factor: SFP, SFP+, QSFP
- longitud de onda
- alcance
- conector
- fibra monomodo/multimodo
- potencia TX/RX
- patchcord con extremo A y Z
- codigo de tramo de fibra
- numero de hilo
- color de tubo/fibra

### 9. Circuitos

Crea circuitos despues de proveedores, sedes, equipos e interfaces.

Datos minimos:

- codigo
- nombre
- proveedor
- contrato
- tipo: internet, transporte, backhaul, peering
- capacidad Mbps
- SLA
- notas
- extremos A/Z con sede, equipo, interfaz y demarcacion

### 10. IPAM

Carga prefijos y direcciones despues de sedes, equipos e interfaces.

Prefijos:

- bloque CIDR
- familia IPv4/IPv6
- rol
- sede
- VRF
- estado

IPs:

- direccion
- prefijo
- interfaz
- rol
- estado
- descripcion

Cada IP debe quedar asociada al equipo, interfaz, sede, servicio y contexto operativo cuando aplique.

### 11. Servicios

Crea servicios operativos despues de circuitos e IPAM.

Ejemplos:

- Internet upstream principal
- Transporte Arequipa-Majes
- Backhaul Majes-Corire
- Servicio OLT por zona
- Gestion NOC

Extremos de servicio:

- sede
- equipo
- interfaz
- IP
- circuito relacionado
- rol del extremo

### 12. Documentacion, evidencias y backups

Por cada sede/equipo/circuito/servicio critico:

- agrega runbook
- adjunta evidencia o referencia
- registra backup de configuracion
- agrega motivo (`reason`) en cada cambio

### 13. Monitoreo e incidencias

Empieza manual:

- registra alertas relevantes
- crea incidencias cuando haya impacto
- vincula incidencias a sedes, equipos, circuitos o servicios
- documenta eventos durante la atencion

Luego se puede integrar SNMP, MikroTik, OLT o herramientas externas.

## Reglas operativas

- No elimines objetos si tienen dependencias; retira, documenta y cambia estado primero.
- Usa codigos cortos y estables: `AQP-POP`, `MAJ-HUB`, `APL-NODE`.
- Mantén nombres de equipos unicos.
- En cada alta/edicion/eliminacion escribe un motivo claro.
- Haz `pnpm db:backup` antes de cargas masivas o reorganizaciones.
- Revisa el modulo Historial despues de cambios grandes.

## Checklist de una sede lista

- Sede creada con ubicacion.
- Enlace de transporte hacia la red principal.
- Rack creado.
- Energia documentada.
- Equipos montados.
- Interfaces registradas.
- Patchcords/transceivers/fibra documentados.
- Circuitos asociados.
- Prefijos/IPs asignados.
- Servicios relacionados.
- Documentacion y evidencias cargadas.
- Backups registrados.
- Alertas/incidencias vinculables.
