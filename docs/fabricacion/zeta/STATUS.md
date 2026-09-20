# Estado del pipeline Zeta → Ventora

Actualizado: 2026-09-19

## SODAL / L25 — TESTING (evidencia confirmed ≠ production_ready)

| Capa | Estado | Detalle |
|---|---|---|
| Evidencia Zeta (`confirmed/`) | **Completa** | **22** JSON L25, 0 pending para L25 |
| Trazabilidad 1:1 | **Sidecars JSON** | `docs/fabricacion/zeta/evidence/` (24 sidecars; 1 complete_1_1, 23 partial) |
| `pnpm zeta:validate` | Global | **24** confirmed = 22 L25 + 2 L-4800 (no son 24 recetas L25) |
| Implementación Ventora | **TESTING** | **18** recetas canónicas; `confirmed` Zeta no implica `production_ready` |
| Fórmulas | | `sodal-l25-formula-v2`; 6/6 gates en 18/18 |
| Fuente en código | | `src/features/fabricacion/fixtures/sodal-l25-zeta-recipes.ts` |
| Tests gate | | `sodal-l25-zeta-recipes.test.ts` — 18 canónicas + 4 extra @ 0 mm |
| Seed / backfill | | `seed-sodal-l25-recipes.ts`, `scripts/backfill-sodal-l25-recipes.ts`, `scripts/backfill-sodal-l25-formula-v2.ts` (ya ejecutados; no re-correr) |
| Catálogo | | `ventora:l25` — corredera SODAL, variantes glazing × pierna × refuerzo |
| UI cotización | | `FabricationVariantSelector` + `sodal-l25-quote-config-panel` |
| Closeout | | `docs/fabricacion/L25_PRODUCTION_CLOSEOUT.md` |

**No volver a extraer L25 salvo regresión documentada.** No sobrescribir JSON en `confirmed/sodal/l25/`.

Referencias:
- Evidencia: `docs/fabricacion/zeta/INDEX.md`, `docs/SODAL_LINEA25_ZETA_2026-09-18.md`
- Producto / handoff: `docs/agent-map/CUBICACION_PAUTA_HANDOFF.md` (bloque L25 2026-09-19)
- Mapa técnico: `docs/agent-map/CHANGELOG_AGENT_MAP.md`, `FEATURES_MAP.md`

## Siguiente foco (extracción Zeta)

El plan de líneas Zeta **continúa con otras líneas del catálogo Ventora**, no con L25.

Antes de abrir Zeta para una línea nueva:

1. `pnpm zeta:coverage` — revisar cola
2. Agregar targets `pending` para la nueva línea (fabricante/sistema/variante)
3. Extraer con Cursor Browser + `pnpm zeta:ingest`
4. Implementar en Ventora en tarea separada (fixtures + tests + seed)

### SODAL / L-4800 MONOLITICO — TESTING (receta Zeta, sin P2A)

- 2H `1800 × 1500`: **CONFIRMED** — Plan `PA-56`; receta Ventora `testing`, medida fija.
- 3H `3000 × 1500`: **CONFIRMED** — Plan `PA-54`; receta Ventora `testing`, medida fija.
- Fallback P2A genérico: **bloqueado** cuando hay evidencia Zeta para `ventora:serie-4800-corredera-2h`.
- 4H `3000 × 1500`: **PENDING** — en proyectos nuevos `46414` y `46415` repitió `La linea L-4800 MONOLITICO no tiene perfiles para extensiones` y `No se ha encontrado el producto para el perfil adaptador`; no se generó Plan.
- Cobertura global actual: `24 confirmed`, `1 pending`, `4 conflicts`.

Líneas plantilla genéricas aún sugeridas (no Zeta SODAL): L5000, L20, bases tipológicas pendientes de taller.

## Comando para sincronizar agentes

```bash
pnpm zeta:coverage
pnpm zeta:validate
```

Los agentes deben leer este archivo + `coverage.json` + `targets.json` antes de proponer extracción.
