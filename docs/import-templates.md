# Plantillas CSV de importacion

Guia practica para cargar inventario operativo desde planillas. Las filas que empiezan con `#` se ignoran. Usa coma simple como separador y evita comas dentro de nombres, notas o descripciones.

## Orden recomendado

1. Sedes y enlaces de mapa.
2. Equipos.
3. Interfaces.
4. Capacidad de proveedores.
5. Tramos de fibra.
6. Hilos de fibra.
7. Transceivers.
8. Patchcords.
9. Activos datacenter.

## Mapa de sedes

```csv
# SITE,code,name,siteType,status,latitude,longitude,address
SITE,NUEVO-NODO,Nuevo nodo,node,planned,-16.12,-72.52,Referencia de campo
# LINK,aSiteCode,zSiteCode,linkType,status,capacityMbps,label
LINK,MAJES,NUEVO-NODO,distribution,planned,1000,Majes <> Nuevo nodo
```

## Equipos

```csv
# siteCode,name,roleCode,status,managementIp,serialNumber
AQP-POP,RTR-AQP-02,edge_router,active,10.10.0.2,SN-AQP-002
MAJES,SW-MAJ-02,switch,planned,,SN-MAJ-002
```

## Interfaces

```csv
# deviceName,name,interfaceType,status,speedMbps,description
RTR-AQP-02,sfp1,sfp,active,10000,Transporte hacia La Joya
SW-MAJ-02,ether1,ethernet,planned,1000,Uplink local
```

## Capacidad de proveedor

```csv
# providerCode,contractCode,serviceType,committedMbps,burstableMbps,deliveredMbps,usedMbps,billingMode,status
ANDEAN,AF-TRANS-2026,transporte regional,10000,,10000,0,commit,active
```

## Tramos de fibra

```csv
# code,aSite,zSite,providerCode,cableType,fiberCount,usedFibers,distanceKm,status,notes
FO-AQP-MAJ-02,AQP-POP,MAJES,ANDEAN,ADSS monomodo,24,2,78,planned,Ruta troncal
```

## Hilos de fibra

```csv
# spanCode,strandNumber,tubeColor,fiberColor,status,service,circuitCode,aTermination,zTermination
FO-AQP-MAJ-02,1,azul,azul,used,transporte MAJES,CIR-AQP-MAJ-01,ODF AQP 1/1,ODF MAJ 1/1
```

## Transceivers

```csv
# deviceName,interfaceName,vendor,partNumber,serialNumber,formFactor,speedMbps,wavelengthNm,reachKm,connectorType,fiberMode,txPowerDbm,rxPowerDbm,status
RTR-AQP-02,sfp1,OEM,SFP-10G-LR,SN-OPT-001,SFP+,10000,1310,10,LC,SM,-2.1,-8.4,active
```

## Patchcords

```csv
# code,aDeviceName,aInterfaceName,zDeviceName,zInterfaceName,circuitCode,aEndpoint,zEndpoint,mediaType,connectorA,connectorZ,lengthMeters,fiberMode,color,status
PC-AQP-001,RTR-AQP-02,sfp1,ODF-AQP-01,P01,CIR-AQP-MAJ-01,RTR-AQP-02 sfp1,ODF AQP bandeja 1 puerto 1,fiber,LC/UPC,LC/UPC,3,SM,amarillo,active
```

## Activos datacenter

```csv
# siteCode,rackCode,name,assetType,units,ports,status,notes
AQP-POP,RACK-01,ODF AQP 01,odf,2,48,active,ODF troncal transporte
```

## Reglas operativas

- Primero crea sedes y equipos referenciados; los importadores fallan filas que apunten a objetos inexistentes.
- Mantén codigos de sedes, proveedores, circuitos y equipos en mayusculas para busqueda consistente.
- Cuando una columna opcional no aplique, dejala vacia.
- Revisa el resumen de importacion: `created` debe coincidir con las filas esperadas y `failed` debe quedar en cero antes de dar el lote por cerrado.
