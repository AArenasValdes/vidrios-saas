# Base de datos — costos privados por perfil (L42 y proveedor declarado)

> Estado verificado por conexión directa de solo lectura a Supabase: **2026-11-20 UTC**.  
> Proyecto: `yrtrwgkaopfumpidjthk` (base de **producción**; la organización 3 es de prueba, pero utiliza la misma base).  
> Rama de código: `codex/estabilizar-costos-proveedor` · Draft PR #27.  
> **Migraciones pendientes. No aplicar sobre producción sin confirmar respaldo recuperable y autorizar la operación.**

## Estado real del esquema

Tabla: `public.organizacion_presentaciones_taller`.

- Existe; RLS está habilitado. Se observó una política `SELECT` para el rol `authenticated`. La verificación de aislamiento multiempresa real y permisos de las rutas de servidor sigue pendiente; RLS habilitado por sí solo no prueba aislamiento.
- La tabla contiene `organization_id`, `family_key`, `configuration_key`, `codigo_tecnico`, `acabado_nombre`, `largo_comercial_mm`, `precio_neto`, `moneda`, `preferida`, `revision`, `eliminado_en` y otros metadatos de presentación.
- Índices previos observados: PK, `organizacion_presentaciones_taller_family_idx`, `organizacion_presentaciones_taller_insumo_idx`, `organizacion_presentaciones_taller_preferida_uq` y `organizacion_presentaciones_taller_sku_active_uq`.
- Presentaciones activas de familia `universal:aluminio:l42`: **0**. Grupos duplicados según identidad propuesta: **0**.
- No existe `organizacion_presentaciones_taller_l42_identity_uq`.
- No existe la columna `proveedor_nombre`.
- La migración base `20261004221000_workshop_supplier_presentations` figura en el historial remoto. **Las dos migraciones siguientes no aparecen**.

Estos datos son una instantánea del esquema en la fecha indicada, no una garantía de que permanezca igual al aplicar cambios. No se consultaron ni modificaron precios ni datos privados de clientes.

## Migraciones preparadas en el repositorio

### 1. `20261117212944_l42_workshop_presentation_identity_unique.sql`

Crea un índice único parcial `organizacion_presentaciones_taller_l42_identity_uq` para presentaciones **activas** L42. Identidad: organización + familia + configuración (nulo normalizado) + código técnico normalizado + nombre de acabado normalizado. No modifica filas existentes. La comprobación inicial aborta si existen grupos duplicados, y un conflicto de inserción concurrente se podrá responder como HTTP 409 desde la API.

**Atención:** el mismo archivo forma parte de la Draft PR #26. Debe conciliarse al integrar ramas para no duplicarlo.

### 2. `20261119120000_workshop_presentation_supplier_name.sql`

Añade `proveedor_nombre text NULL` con restricción que admite `NULL` o entre 1 y 120 caracteres no vacíos después de `trim`. Los registros anteriores quedan con `NULL`; no se actualizan precios, listas externas ni identidades de proveedor. El nombre expresa lo indicado por el taller, **no** una relación con un proveedor oficial.

## Estado de controles

| Control | Estado |
| --- | --- |
| Proyecto Supabase accesible | Confirmado (solo lectura) |
| Tabla base y RLS | Confirmado |
| Prechequeo L42 sin duplicados | Confirmado en 2026-11-20 UTC |
| Respaldo reciente y recuperable | **No comprobado**; verificar en Database → Backups |
| Migración 20261117212944 aplicada | No |
| Migración 20261119120000 aplicada | No |
| Persistencia real de costo con/sin nombre | Pendiente |
| Aislamiento efectivo entre dos organizaciones | Pendiente |
| Compatibilidad de registros históricos | Pendiente de smoke real |
| Preview autorizada para escrituras | No comprobado; no usar para escrituras |

## Procedimiento de despliegue controlado

1. Abrir Supabase Dashboard → **Database → Backups** y confirmar existencia y capacidad de restauración de un respaldo reciente. En planes sin copias automáticas, preparar un respaldo lógico verificable. No confundir un backup automático supuesto con uno comprobado. Documentar fecha/punto de recuperación.
2. Obtener autorización explícita para aplicar DDL a este proyecto de producción; comprobar posibles efectos de bloqueo temporal al crear índices.
3. Repetir consultas **de solo lectura** para detectar duplicados L42, existencia de índice y columna, y consultar `supabase_migrations.schema_migrations` o el historial vía Supabase. Si alguna migración ya se aplicó, reconciliar el estado antes de intentar repetirla.
4. Aplicar **en orden**, usando el mecanismo gestionado de migraciones/CLI que registre su versión, el SQL exacto de los dos archivos del repositorio. Preferir la herramienta de migraciones a pegar DDL en SQL Editor, porque ejecutar SQL manualmente no registra el historial de migraciones.
5. Verificar postaplicación con:
   ```sql
   select
     exists(
       select 1 from pg_indexes
       where schemaname='public'
         and indexname='organizacion_presentaciones_taller_l42_identity_uq'
     ) as indice_l42,
     exists(
       select 1 from information_schema.columns
       where table_schema='public'
         and table_name='organizacion_presentaciones_taller'
         and column_name='proveedor_nombre'
     ) as nombre_proveedor;
   ```
   Ambos campos deben ser `true`. Confirmar también las versiones en el historial.
6. Con permisos autorizados, hacer smoke acotado con **organización de prueba 3**: guardar costo privado con/sin nombre, recargar, editar, comprobar L42 mixto y L25, verificar permisos de dos usuarios de organizaciones distintas, y confirmar que el precio comercial y los snapshots históricos no cambian.
7. Mantener PR #27 en Draft y PR #26 sin merge hasta cerrar las validaciones; no atribuir resultados reales a las 60 pruebas simuladas ni a `fabrication:verify`.

## Reversión y límites

- Eliminar el índice no modifica filas, pero debe ejecutarse solamente mediante cambio autorizado y evaluando dependencias.
- Eliminar la columna `proveedor_nombre` **elimina los nombres almacenados**; no ejecutar `DROP COLUMN` en producción como reversión automática.
- No crear identidades técnicas a partir de líneas sin familia canónica, ni alterar recetas, despieces, precios de venta o datos históricos para superar una prueba.
- Si el respaldo o las autorizaciones no pueden verificarse, el estado correcto es **bloqueado para DDL productivo**, pero se pueden mantener avances de documentación, tests y revisión visual de solo lectura.
