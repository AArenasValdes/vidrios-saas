# SODAL L25 — Closeout de producción

Fecha: 2026-09-19  
Alcance: documentación y auditoría final. **No** se cambiaron lógica, fórmulas, recetas, UI, snapshots ni base de datos. **No** se re-ejecutaron backfills.

## Estado

SODAL L25: **PRODUCTION READY**

## Fuente

Sistema Zeta / evidencia confirmada en `docs/fabricacion/zeta/confirmed/sodal/l25/`.

Implementación Ventora: `src/features/fabricacion/fixtures/sodal-l25-zeta-recipes.ts` + `sodal-l25-zeta-catalog.ts`.  
Fórmulas: `sodal-l25-formula-v2` (`src/features/fabricacion/zeta/sodal-l25-profile-roles.ts`).

## Reconciliación de cifras (oficial)

Estas tres lecturas **no se contradicen**. Miden conjuntos distintos.

| Lectura que circuló | Qué medía en realidad | Cifra oficial |
|---|---|---|
| 22 evidencias confirmed | Solo JSON L25 | **22** evidencias L25 |
| `pnpm zeta:validate` = 24 | Inventario **global** `confirmed/` | **24** = 22 L25 + 2 L-4800 (`confirmed/sodal/4800/`) |
| 72 filas en producción | Filas `fabrication_recipes` por organización | **72** = 18 identidades × 4 orgs |
| 18 recetas canónicas | Identidades técnicas únicas | **18** |

### 22 vs 24

`pnpm zeta:validate` recorre **todo** `docs/fabricacion/zeta/confirmed/`, no solo L25.

- L25: 22 archivos en `confirmed/sodal/l25/`
- L-4800: 2 archivos en `confirmed/sodal/4800/` (monolítico 2H y 3H)
- Total validate: **24**

La cifra de producto L25 sigue siendo **22 evidencias**. Las 2 de L-4800 no son recetas L25 ni están implementadas como catálogo canónico L25.

### 72 filas vs 18 recetas

Las 18 recetas canónicas se siembran **por organización** (`scope='organization'`, `status='validated'`).

En el proyecto remoto auditado al backfill v2 había **4 organizaciones** con `ventora:l25`:

`18 × 4 = 72` filas.

72 no es “72 recetas distintas”. Es el mismo catálogo de 18 identidades, copiado a cada org. El resolver opera por `organization_id` + identidad (hojas × glazing × pierna × refuerzo).

### 2 vs 3 fallos legacy

No hay un tercer test L25 roto. La diferencia es de **conteo**:

| Conteo | Qué incluye | Oficial |
|---|---|---|
| 2 fallos | Dos `it(...)` que fallan en `fabricacion-line-variant.service.test.ts` | **2 tests** |
| 3 fallos | Esos 2 tests + 1 **suite** que no llega a ejecutar casos (`zeta-workflow.test.ts`) | **2 tests + 1 suite rota** |

Cifra oficial de deuda: **2 tests legacy fallan** y **1 suite extractor no corre**. Ninguno pertenece a la implementación SODAL L25. Detalle en `TECH_DEBT`.

## Cobertura

- 2H / 3H / 4H
- Monolítico / DVH
- Pierna abierta / cerrada
- Normal / reforzada **solo en combinaciones admitidas**

Seis familias × tres hojas = 18 recetas:

| Familia Zeta | Glazing | Pierna | Refuerzo |
|---|---|---|---|
| L-25 DVH PIERNA ABIERTA | DVH | abierta | normal |
| L-25 DVH PIERNA ABIERTA REFORZADA | DVH | abierta | reforzada |
| L-25 DVH PIERNA CERRADA | DVH | cerrada | normal |
| L-25 MONOLITICO PIERNA ABIERTA | monolítico | abierta | normal |
| L-25 MONOLITICO PIERNA ABIERTA REFORZADA | monolítico | abierta | reforzada |
| L-25 MONOLITICO PIERNA CERRADA | monolítico | cerrada | normal |

## Recetas

- Recetas canónicas: **18**
- Observaciones de validación Zeta: **22** (18 canónicas + 4 extra 3H @ 2400×1500)
- Extra geométricas (no crean receta extra):
  - `dvh_pierna_abierta_reforzada_3h_2400x1500`
  - `dvh_pierna_cerrada_3h_2400x1500`
  - `monolitico_pierna_abierta_3h_2400x1500`
  - `monolitico_pierna_abierta_reforzada_3h_2400x1500`

Combinaciones **explícitamente no soportadas**:

- Pierna **cerrada** + refuerzo **reforzada**, monolítico o DVH, cualquier cantidad de hojas.
- `isValidSodalL25Combination()` las rechaza. La UI no ofrece cerrado + reforzada.

La plantilla caracol pre-Zeta y los slots `draft` 3H/4H de `line-base-variant-catalog.ts` quedan **supersedidos**. No son el catálogo vigente.

## Formula engine

Versión actual: `sodal-l25-formula-v2`

Roles por código (`sodal-l25-profile-roles.ts`):

| Rol | Códigos | Base de fórmula |
|---|---|---|
| `frame_width` | 2501, 2502 | `ancho_total` |
| `frame_height` | 2503, 2509 | `alto_total` |
| `sash_height` | 2506, 2507, 2510, 2511R, 2512R, 2517, 2518, 2519, 2522, 2529R, 2530R | `alto_total` |
| `sash_width` | 2504, 2505, 2516 | `ancho_por_hoja` o `ancho_total` según la familia |

Reglas:

- Un código sin rol, o un rol que no calza con las observaciones, **falla** el derive/import.
- `|ajusteMm|` solo desempata bases del **mismo** rol.
- El derivador no elige `ancho_total` para jambas, piernas ni cabezales.

Tests fuera de muestra (además de los 22 @ 0 mm Zeta):

- 2H 2000×1500: riel = 1984; verticales ≤ 1500; al cambiar solo el ancho los verticales no cambian.
- 4H 3200×1600: riel = 3184; verticales ≤ 1600; misma invariante de ancho.
- COT-180926-010 / cotización 818, V1 2H monolítico abierta reforzada 2000×1500.
- V2 3H DVH pierna cerrada 3000×1500: jamba/pierna no cambian respecto de la evidencia.

Invariantes:

- Verticales (`frame_height`, `sash_height`) no dependen del ancho.
- Horizontales de marco (`2501`/`2502`) = `ancho_total + ajuste` (ajuste observado, típico −16).
- Todo perfil L25 calculado tiene rol clasificado.

## Gates

Los 6 gates de `fabricacion-gates.service.ts` están aprobados en **18/18** recetas canónicas (`sodal-l25-zeta-recipes.test.ts`).

1. `source_exact` — fuente Zeta + contrato `sodal:l25`.
2. `distinct_geometry` — al menos dos geometrías aprobadas (canónica + extra o geometría de prueba).
3. `role_invariants` — ancho/alto cambian o permanecen según el rol.
4. `resolver_unique` — una sola receta activa por identidad.
5. `snapshot_despiece_pauta_e2e` — cubicación, snapshot, despiece y pauta calculables.
6. `accessories_hardware_classified` — cada accesorio declara rol e impactos.

`validated` en L25 = catálogo técnico system-managed verificado contra Zeta. **No** significa “validada en el taller del cliente”.

## Producción

| Superficie | Afectados | Recalculados | Skip (ya v2) |
|---|---:|---:|---:|
| Recetas L25 Zeta (filas org) | 72 | 72 | 0 |
| Snapshots L25 defectuosos v1 | 9 | 9 | 0 |

- Cotización **818** (COT-180926-010) corregida en ese backfill: jambas/piernas/hojas horizontales pasaron de bases v1 erróneas a `sodal-l25-formula-v2` (2503 1700→1500; 2504/2505 1088→988; 2511R/2512R 1665→1465; rieles 1984 sin cambio).
- Backfill idempotente: `scripts/backfill-sodal-l25-formula-v2.ts` / `pnpm fabricacion:backfill-l25-v2`. **No re-ejecutar** en este closeout.
- Seed: `seed-sodal-l25-recipes.ts`. Legacy L25 sin prefijo `zeta:confirmed:` se archiva al seed.
- Trigger `prevent_validated_fabrication_recipe_update` se bypasseó solo durante el backfill y quedó **reactivado**.

## UX

Resolución vigente:

```text
componente → hojas → L25 → vidrio → pierna/refuerzo → receta → snapshot → despiece/pauta
```

1. El componente comercial fija tipología corredera.
2. Las hojas salen del esquema comercial (`sheetScheme` / `fabricacionHojas`).
3. La línea `ventora:l25` activa el panel SODAL (`SodalL25QuoteConfigPanel`).
4. El vidrio infiere glazing (`[fgl:]` monolítico|dvh).
5. El usuario elige pierna y refuerzo (`FabricationVariantSelector`; cerrado+reforzada no se ofrece).
6. `resolveFabricationRecipe()` / `resolveFabricacionRecipe()` matchea la identidad completa contra recetas Zeta `validated` de la org.
7. Al guardar se escribe `cotizacion_items.fabricacion_snapshot` con `formulaVersion: sodal-l25-formula-v2`.
8. Despiece y pauta de `/print/cotizaciones/[id]/fabricacion` leen el **snapshot congelado**, no un recálculo live.

El precio por m² es comercial e independiente de la receta técnica.

## Históricos

Los 9 snapshots L25 con fórmulas v1 defectuosas se recalcularon **una vez** en el backfill de plataforma 2026-09-19.

Los snapshots nuevos quedan congelados. Print no recalcula. Un cambio de receta validada exige nueva versión; no se pisan snapshots posteriores.

## Legacy

Estos fallos **continúan** y **no pertenecen** a la implementación SODAL L25:

1. `fabricacion-line-variant.service.test.ts` → `una variante compatible se autoselecciona`  
   Espera `calculado` sobre la plantilla caracol 2H. El despiece vigente marca `receta_incompleta` porque esa fixture ya no es una receta Zeta validated.
2. `fabricacion-line-variant.service.test.ts` → `cotización comercial sigue sin pauta cuando fabricación está incompleta para 3H`  
   Espera `sin_receta`; recibe `receta_incompleta`. El matching genérico de slots `draft` 3H/4H quedó desalineado del resolver L25.
3. `scripts/zeta/__tests__/zeta-workflow.test.ts`  
   La suite **no corre** (0 tests). Jest parsea `scripts/zeta/derive.ts` como CJS y choca con `await main()` top-level ESM.

## TECH_DEBT

Deuda real, fuera de L25 PRODUCTION READY. **No se arregla en este closeout.**

| Ítem | Tipo | Por qué existe | Riesgo |
|---|---|---|---|
| 2 tests de `fabricacion-line-variant.service.test.ts` | Fixture/expectativa pre-Zeta | Siguen usando plantilla caracol y slots `draft` como si fueran el catálogo L25 | Ruido en CI; no altera producción L25 |
| `zeta-workflow.test.ts` no ejecuta | Jest vs ESM del extractor | El pipeline Zeta corre con `node --experimental-strip-types`; Jest no | No cubre extractor en Jest; `pnpm zeta:validate` sí cubre evidencia |
| Slots `draft` L25 en `line-base-variant-catalog.ts` | Catálogo genérico histórico | El árbol multi-variante de las 5 bases aún lista caracol/3H/4H draft | Confusión documental si se lee sin este closeout |

## Regla futura

Ninguna nueva línea de fabricación puede activarse sin:

1. Evidencia fuente (Plan de armado / confirmed).
2. Segunda geometría o regla inequívoca.
3. Invariantes de rol (ancho/alto).
4. Resolver único por identidad técnica.
5. Test end-to-end (snapshot → despiece → pauta).
6. Clasificación de herrajes/accesorios (rol + impactos).

## Verificaciones de este closeout (no destructivas)

| Check | Resultado |
|---|---|
| `pnpm zeta:validate` | OK — 24 confirmed globales |
| Tests específicos L25 | 58 passed / 6 suites |
| `pnpm run build` | OK (exit 0) |
| `pnpm run lint` | OK (0 errors; warnings preexistentes) |
| Backfill producción | **No ejecutado** |
