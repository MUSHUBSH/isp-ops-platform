# Desarrollo local primero

Esta plataforma puede trabajarse sin VPS ni pagos mensuales. La forma recomendada para esta etapa es:

- PostgreSQL local en Docker
- API local en `http://localhost:4000`
- Web local en `http://localhost:5173`
- Dominio GoDaddy reservado para una fase posterior

## Requisitos

- Docker Desktop instalado y abierto
- Node/pnpm disponible desde el runtime local del proyecto

## Arranque rapido

Desde la raiz del repo:

```powershell
.\scripts\local-dev.ps1
```

Esto hace:

1. Levanta PostgreSQL con Docker Compose.
2. Usa `DATABASE_URL=postgres://ispops:ispops_dev@localhost:5432/ispops`.
3. Arranca API y Web en modo desarrollo.
4. La web queda en `http://localhost:5173`.

## Verificar base local

```powershell
.\scripts\db-health.ps1
```

## Diagnostico completo

Si no sabes si el problema esta en Docker, PostgreSQL, la API o la web:

```powershell
pnpm doctor
```

Este comando no modifica datos. Solo revisa herramientas locales, contenedor PostgreSQL, API y web.

## Resetear base local

Cuando cambie `packages/database/schema.sql` o `seed.sql`, Docker no reaplica esos archivos si el volumen ya existe. Para recrear la DB local:

```powershell
.\scripts\db-reset.ps1
```

Esto borra solo el volumen local Docker de este proyecto y vuelve a crear la base con schema/seed.

## Variables locales

La API necesita:

```env
DATABASE_URL=postgres://ispops:ispops_dev@localhost:5432/ispops
PORT=4000
```

La web necesita:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_API_KEY=dev-admin-key
```

`local-dev.ps1` las establece automaticamente para esta sesion.

## Recomendacion operativa

Mientras esto siga siendo iniciativa propia:

- No pagar VPS todavia.
- Cargar datos reales poco a poco localmente.
- Exportar backups SQL periodicamente.
- Usar capturas o demo local para justificar presupuesto futuro.


## Si Docker falla

Si ves un error como:

```txt
failed to connect to the docker API
```

significa que Docker Desktop esta instalado pero no esta corriendo.

Solucion:

1. Abre Docker Desktop desde Windows.
2. Espera a que diga `Docker is running`.
3. Vuelve a ejecutar:

```powershell
pnpm dev:local
```


## Backup local

Cuando empieces a guardar datos reales, genera respaldos SQL antes de cambios grandes:

```powershell
pnpm db:backup
```

Los archivos quedan en `backups/` con nombre tipo:

```txt
ispops-20260706-214500.sql
```
