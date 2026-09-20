# Merge no destructivo: Alumétrica + Haciendo Ventanas

Fecha: 2026-09-19  
Estado: integración técnica preparada en `testing`; seed no ejecutado.

## Resultado de alcance

- El catálogo comercial conserva las 29 líneas de Ventora.
- No se modificaron precios, reglas de cotización por m² ni `catalog_metadata`.
- No se modificaron `docs/fabricacion/zeta/confirmed/*.json`.
- No se modificaron ni archivaron recetas actuales de L25, Serie 5000 ni P2A legacy.
- No se creó ninguna receta global (`scope = ventora`).
- No se insertaron filas en `fabrication_recipes`: el seed exige `organizationId` explícito y esta ejecución no recibió uno.

## Recetas técnicas preparadas

El registro `buildAlumetricaHaciendoTestingBundles()` prepara fixtures en estado
`testing` para:

- Serie 3200;
- Serie 4800;
- Serie 20;
- Serie 33;
- Serie 33 RPT;
- Óptima S-28 2H.

Los resultados de Haciendo Ventanas se guardan como fixtures `1200×1000`.
Fuera de esa medida el motor devuelve `calculable: false` con advertencia
`MEDIDA_NO_OBSERVADA`.

L-4800 2H y 3H conservan además la evidencia Zeta existente y no habilitan
fallback P2A. L-4800 4H queda bloqueada.

## Pendientes y conflictos

- Serie 38 normal: pendiente; no existe fórmula normal verificable en las fuentes.
- S-38 RPT: bloqueada por conflicto de módulo/tipología.
- Óptima S-28 3H: bloqueada por conflicto de cantidad de termopaneles.
- AL-15, AM-35 y S60: candidatas sin receta técnica.
- AL-45 Alumétrica no alimenta Ventora. Línea 45 usa destajes Sodal/Indalum (`docs/fabricacion/2026-09-20-serie-45-practicable-formulas.md`).
- Serie 3200 y Serie 4800: el vidrio no se promueve desde lecturas ambiguas; se conserva la falta como dato pendiente.
- Accesorios no visibles en Haciendo Ventanas no se inventan.

## Guardas de activación

- La cotización pública no envía `allowNonValidatedRecipeId`.
- El resolver público ignora recetas `testing` y `draft` para cálculo automático.
- Las pruebas controladas usan exclusivamente `resolverRecetaFabricacionCompatibleForControlledTest` y requieren `mode`, `recipeId` y `organizationId` explícitos.
- El seed `seedAlumetricaHaciendoVentanasRecipes` exige `organizationId`, es idempotente y solo inserta `scope = organization` con `status = testing`.

## Verificación

Línea base antes de la integración:

| Comando | Resultado | Clasificación |
|---|---:|---|
| `pnpm exec tsc --noEmit` | 0 | pasa |
| `pnpm run lint` | 0 | pasa con warnings; 146 en la línea base y 147 después |
| `pnpm run build` | 1 | preexistente: importación `node:fs` desde `arquetipos-estructurales-lineas.ts` en cliente |
| `pnpm test -- --runInBand` | 1 | línea base: 9 suites, 19 tests y 1 snapshot fallidos |

Pruebas de integración ejecutadas:

| Suite | Resultado |
|---|---:|
| `alumetrica-haciendoventanas-integration.test.ts` | 8/8 pasa |
| `fabricacion-receta-integracion-cotizacion.test.ts` | pasa |
| `fabricacion-despiece-cotizacion.service.test.ts` | pasa |
| `fabricacion-line-variant.service.test.ts` | pasa |

Verificación post-integración:

| Comando | Resultado | Clasificación |
|---|---:|---|
| `pnpm exec tsc --noEmit` | 0 | pasa |
| `pnpm run lint` | 0 | pasa; warnings no bloqueantes |
| `pnpm run build` | 1 | mismo fallo preexistente de `node:fs` en `arquetipos-estructurales-lineas.ts` |
| `pnpm test -- --runInBand` | 1 | 8 suites, 17 tests y 1 snapshot fallidos; no apareció un fallo nuevo de compilación en la integración |

Los fallos de build y batería completa quedan separados como preexistentes.
La suite nueva de integración y las suites de fabricación tocadas pasan 51/51.
