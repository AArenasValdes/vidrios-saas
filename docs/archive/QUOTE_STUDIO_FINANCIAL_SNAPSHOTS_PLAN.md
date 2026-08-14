# Quote Studio Desktop - Snapshots financieros

Fecha: 2026-07-07

Estado: **Fase 1 cerrada** (2026-07-09). Migracion local y remota aplicadas. QA desktop aprobado en por items y por total.

## Objetivo

Persistir un snapshot financiero de la cotizacion preparada en desktop sin cambiar el flujo movil, PDF, WhatsApp, aprobacion publica ni reglas de calculo historicas.

El snapshot debe separar claramente:

- costos netos;
- precio recomendado neto;
- precio neto final;
- utilidad estimada;
- margen real;
- IVA como capa tributaria final;
- total a cobrar con IVA.

## Contexto leido

Documentacion DB revisada:

- `supabase/docs/current_schema.sql`
- `supabase/docs/database_map.md`
- `supabase/docs/rls_policies.md`
- `supabase/docs/agent_database_notes.md`

Codigo revisado:

- `src/features/cotizaciones/repositories/cotizaciones-repository.ts`
- `src/features/cotizaciones/services/cotizaciones.service.ts`
- `src/features/cotizaciones/services/cotizaciones-workflow.service.ts`
- `src/features/cotizaciones/services/quote-studio-financial.service.ts`
- `src/features/cotizaciones/types/cotizacion.ts`
- `src/features/cotizaciones/types/cotizacion-item.ts`

## Modelo actual relevante

`cotizaciones` ya tiene:

- `subtotal_neto`
- `costo_total`
- `margen_pct`
- `utilidad_total`
- `descuento_pct`
- `flete`
- `iva`
- `total`
- `pricing_mode`

`cotizacion_items` ya tiene:

- `precio_unitario`
- `subtotal`
- `costo_unitario`
- `costo_total`
- `margen_pct`
- `utilidad`
- `linea`
- `vidrio`
- `observaciones`

Conclusion: no conviene crear una tabla nueva en Fase 1. El primer snapshot debe ser aditivo sobre tablas existentes.

## Decision de diseno

Usar `cotizaciones` como snapshot financiero principal.

No crear por ahora:

- tabla nueva de snapshots;
- tabla de costos por item;
- tabla de catalogo privado;
- tabla de cubicacion;
- tabla de cobros;
- tabla de oportunidades.

Motivo:

- la cotizacion ya es la entidad visible del flujo Desktop Taller;
- RLS y multi-tenant ya existen en `cotizaciones`;
- evita duplicar persistencia;
- reduce riesgo sobre mobile, PDF, WhatsApp y aprobacion publica;
- permite evolucionar a catalogo privado despues sin bloquear Fase 1.

## Columnas propuestas para `cotizaciones`

Agregar solo columnas nullable para no inventar datos historicos.

```sql
alter table public.cotizaciones
  add column if not exists costo_materiales_total numeric(12,2),
  add column if not exists costo_mano_obra_total numeric(12,2),
  add column if not exists costo_traslado_total numeric(12,2),
  add column if not exists costo_otros_total numeric(12,2),
  add column if not exists merma_pct numeric(7,4),
  add column if not exists merma_total numeric(12,2),
  add column if not exists margen_objetivo_pct numeric(7,4),
  add column if not exists precio_recomendado_neto numeric(12,2),
  add column if not exists iva_pct numeric(7,4),
  add column if not exists financial_snapshot_version integer,
  add column if not exists financial_snapshot_calculado_en timestamptz,
  add column if not exists cost_basis_status text;
```

### Semantica

| Columna | Semantica |
|---|---|
| `costo_materiales_total` | Suma de costos de materiales de items confirmados. |
| `costo_mano_obra_total` | Mano de obra manual o futura fuente validada. |
| `costo_traslado_total` | Costo de traslado, separado del precio/cobro al cliente. |
| `costo_otros_total` | Otros costos netos del taller. |
| `merma_pct` | Porcentaje usado para calcular merma sobre costo base. |
| `merma_total` | Monto neto de merma. |
| `margen_objetivo_pct` | Margen real objetivo, no markup. |
| `precio_recomendado_neto` | Precio sugerido sin IVA. |
| `iva_pct` | Porcentaje tributario usado para calcular `iva`. |
| `financial_snapshot_version` | Version del algoritmo/estructura del snapshot. |
| `financial_snapshot_calculado_en` | Momento en que se calculo el snapshot. |
| `cost_basis_status` | Estado de base de costo: `sin_costos`, `estimado`, `manual`. |

## Columnas existentes que se deben seguir usando

No duplicar estas columnas:

- `subtotal_neto` = precio neto final.
- `costo_total` = costo total neto usado para margen.
- `margen_pct` = margen real final calculado sobre neto.
- `utilidad_total` = `subtotal_neto - costo_total`.
- `iva` = monto de IVA.
- `total` = total a cobrar con IVA.

Regla: el IVA nunca entra en `costo_total`, `utilidad_total`, `margen_pct` ni `precio_recomendado_neto`.

## Constraints propuestas

Agregar checks no negativos y estado controlado:

```sql
alter table public.cotizaciones
  add constraint cotizaciones_financial_costs_nonnegative
  check (
    (costo_materiales_total is null or costo_materiales_total >= 0) and
    (costo_mano_obra_total is null or costo_mano_obra_total >= 0) and
    (costo_traslado_total is null or costo_traslado_total >= 0) and
    (costo_otros_total is null or costo_otros_total >= 0) and
    (merma_pct is null or merma_pct >= 0) and
    (merma_total is null or merma_total >= 0) and
    (margen_objetivo_pct is null or (margen_objetivo_pct >= 0 and margen_objetivo_pct < 100)) and
    (precio_recomendado_neto is null or precio_recomendado_neto >= 0) and
    (iva_pct is null or iva_pct >= 0) and
    (financial_snapshot_version is null or financial_snapshot_version > 0)
  );

alter table public.cotizaciones
  add constraint cotizaciones_cost_basis_status_check
  check (
    cost_basis_status is null or
    cost_basis_status in ('sin_costos', 'estimado', 'manual')
  );
```

Antes de crear constraints, revisar si ya existen para evitar nombres duplicados.

## Backfill propuesto

No backfillear desglose de costos en cotizaciones historicas, porque seria inventar datos.

Backfill seguro:

```sql
update public.cotizaciones
set
  iva_pct = case
    when subtotal_neto is not null and subtotal_neto > 0 and iva is not null
      then round((iva / subtotal_neto) * 100, 4)
    else null
  end,
  cost_basis_status = case
    when costo_total is not null and costo_total > 0 then 'estimado'
    else 'sin_costos'
  end
where financial_snapshot_version is null;
```

No setear `financial_snapshot_version` en historicas si no fueron calculadas con el algoritmo nuevo.

## RLS y multi-tenant

No se requiere nueva policy porque no hay tabla nueva.

`cotizaciones` ya tiene:

- `cotizaciones_select`: `organization_id = get_org_id()`
- `cotizaciones_insert`: `organization_id = get_org_id()`
- `cotizaciones_update`: `organization_id = get_org_id()`

Como solo se agregan columnas, el aislamiento por `organization_id` se mantiene.

Riesgo a revisar antes de ejecutar:

- UPDATE requiere SELECT policy; ya existe.
- El repository siempre debe filtrar `.eq("organization_id", organizationId)` en updates y lecturas; ya lo hace en rutas criticas revisadas.

## Indices

No agregar indice en Fase 1.

Motivo:

- las columnas se leen junto a la cotizacion por `id` o listados existentes por `organization_id`;
- dashboard comercial real queda para Fase 5;
- no hay query aprobada que filtre por margen/costo/precio recomendado.

Si Fase 5 requiere metricas de rentabilidad, evaluar indice parcial posterior:

```sql
create index concurrently cotizaciones_org_financial_snapshot_idx
on public.cotizaciones (organization_id, creado_en desc)
where eliminado_en is null and financial_snapshot_version is not null;
```

No crear ahora.

## Cambios de codigo cuando se apruebe la migracion

Orden recomendado:

1. Crear migracion aditiva.
2. Actualizar tipos:
   - `src/features/cotizaciones/types/cotizacion.ts`
   - `src/features/cotizaciones/types/cotizacion-workflow.ts` si el draft necesita campos nuevos.
3. Actualizar repository:
   - `CotizacionRow`
   - `COTIZACION_DETAIL_SELECT`
   - `buildCotizacionUpdatePayload`
   - `buildCotizacionInsertPayload`
   - mapping de `Cotizacion`
4. Actualizar service:
   - `quote-studio-financial.service.ts`
   - `cotizaciones.service.ts` para persistir snapshot calculado.
5. Mantener UI mobile sin nuevos campos visibles.
6. Mantener PDF/WhatsApp sin cambios salvo aprobacion explicita.
7. Agregar tests unitarios:
   - costos nulos no crean utilidad falsa;
   - costo igual a precio neto da utilidad 0 y margen 0%;
   - IVA no altera margen;
   - snapshot guarda `precio_recomendado_neto` y `iva_pct`;
   - cotizacion historica sin snapshot sigue cargando.

## Migracion creada

Archivo local:

- `supabase/migrations/20260708033856_add_quote_studio_financial_snapshot.sql`

La migracion fue aplicada en remoto (`yrtrwgkaopfumpidjthk`) el 2026-07-08 via Supabase MCP. Backfill remoto: 554 cotizaciones con `cost_basis_status`, 535 con `iva_pct`, 0 con `financial_snapshot_version` (historicas sin algoritmo nuevo).

## Migration draft de referencia

Cuando se apruebe, crear con:

```bash
supabase migration new add_quote_studio_financial_snapshot
```

Luego pegar SQL revisado. No inventar filename manualmente.

SQL base propuesto:

```sql
alter table public.cotizaciones
  add column if not exists costo_materiales_total numeric(12,2),
  add column if not exists costo_mano_obra_total numeric(12,2),
  add column if not exists costo_traslado_total numeric(12,2),
  add column if not exists costo_otros_total numeric(12,2),
  add column if not exists merma_pct numeric(7,4),
  add column if not exists merma_total numeric(12,2),
  add column if not exists margen_objetivo_pct numeric(7,4),
  add column if not exists precio_recomendado_neto numeric(12,2),
  add column if not exists iva_pct numeric(7,4),
  add column if not exists financial_snapshot_version integer,
  add column if not exists financial_snapshot_calculado_en timestamptz,
  add column if not exists cost_basis_status text;

alter table public.cotizaciones
  add constraint cotizaciones_financial_costs_nonnegative
  check (
    (costo_materiales_total is null or costo_materiales_total >= 0) and
    (costo_mano_obra_total is null or costo_mano_obra_total >= 0) and
    (costo_traslado_total is null or costo_traslado_total >= 0) and
    (costo_otros_total is null or costo_otros_total >= 0) and
    (merma_pct is null or merma_pct >= 0) and
    (merma_total is null or merma_total >= 0) and
    (margen_objetivo_pct is null or (margen_objetivo_pct >= 0 and margen_objetivo_pct < 100)) and
    (precio_recomendado_neto is null or precio_recomendado_neto >= 0) and
    (iva_pct is null or iva_pct >= 0) and
    (financial_snapshot_version is null or financial_snapshot_version > 0)
  );

alter table public.cotizaciones
  add constraint cotizaciones_cost_basis_status_check
  check (
    cost_basis_status is null or
    cost_basis_status in ('sin_costos', 'estimado', 'manual')
  );

update public.cotizaciones
set
  iva_pct = case
    when subtotal_neto is not null and subtotal_neto > 0 and iva is not null
      then round((iva / subtotal_neto) * 100, 4)
    else null
  end,
  cost_basis_status = case
    when costo_total is not null and costo_total > 0 then 'estimado'
    else 'sin_costos'
  end
where financial_snapshot_version is null;
```

Antes de aplicar en una base real:

- revisar si constraints ya existen;
- correr advisors si el entorno lo permite;
- verificar que `current_schema.sql` y tipos esten actualizados o documentar drift;
- probar insert/update/select con una organizacion real.

## Riesgos

1. `current_schema.sql` esta documentado como atrasado para tablas recientes. Confirmar remoto/local antes de ejecutar.
2. `cotizacion_line_templates` existe como addendum y sera base futura de catalogo privado; no mezclar esta migracion con catalogo.
3. No hay fuente real de mano de obra/traslado/merma todavia. Deben persistirse solo si la UI desktop los define.
4. Backfill de costos historicos puede mentir. Por eso queda limitado a `iva_pct` y `cost_basis_status`.
5. Si se agregan columnas al select del repository antes de migrar, puede romper entornos sin la migracion. Hacer migracion primero o mantener fallback legacy.

## Criterio de salida para implementar despues

- Migracion aditiva creada con Supabase CLI.
- Sin tablas nuevas.
- Sin cambios de RLS requeridos.
- Mobile 390/430 sin campos financieros visibles nuevos.
- PDF/WhatsApp/aprobacion publica sin cambios intencionales.
- Lint, build y tests unitarios pasando.
- Smoke de crear/editar cotizacion confirmando que los nuevos campos quedan guardados y que cotizaciones historicas siguen abriendo.
