---
name: ventora-zeta-extractor
description: Extrae evidencia técnica desde Sistema Zeta hacia docs/fabricacion/zeta con PNPM, sin inferir cortes ni sobrescribir confirmed/. Use when extracting Zeta plans, running pnpm zeta:extract, updating coverage/targets, or processing pending L25 recipes.
---

# Extractor Sistema Zeta (Ventora)

Sistema Zeta es fuente **externa de evidencia**. No es el motor de recetas de Ventora.

Cadena obligatoria:

```text
targets.json
→ Cursor Browser navega Zeta
→ Plan de armado visible
→ raw/
→ parsear + validar schema
→ confirmed/
→ coverage/index
```

Nunca saltar capas. Esta skill **no** implementa `fabrication_recipes`.

**Navegación principal:** Cursor Browser (`references/NAVIGATION.md`).  
**Persistencia:** `scripts/zeta/*` (única capa que escribe `confirmed/`).  
**Fallback técnico:** Playwright (`pnpm zeta:extract -- --live`).

## Antes de navegar

1. Leer `docs/fabricacion/zeta/README.md`, `coverage.json`, `targets.json` e `INDEX.md`.
2. Leer `references/NAVIGATION.md` y `docs/fabricacion/zeta/SELECTORS.md`.
3. Saltar automáticamente recetas ya `confirmed`.
4. Procesar únicamente pendientes.
5. No investigar ni sobrescribir L25 confirmed existente.
6. Package manager: **PNPM**. Nunca npm, npx ni yarn.
7. Adquirir lock mental: un solo navegador Zeta (`tmp/zeta-auth/extract.lock` en `--live`).

## Capas (no mezclar)

| Capa | Qué es | Qué no es |
|---|---|---|
| `confirmed/` | Observación directa de un **Plan de armado** real | Inferencia, catálogo, auditoría Ventora |
| `pending/` | Falta evidencia suficiente | Receta inexistente |
| `conflicts/` | Evidencias incompatibles o UI anómala | Fórmula |
| `raw/` | HTML/texto/screenshot/metadatos/error | Cookies, tokens, passwords |
| `derived/` | Fórmulas matemáticas posteriores | Observación |
| Ventora | Futura implementación | Fuera de esta skill |

Nunca mezclar Alumet, HaceVentanas u otras fuentes dentro de `confirmed/` Zeta.

## Reglas de extracción

- Una prueba Zeta = un **proyecto nuevo** = **una sola configuración**.
- No reutilizar componentes anteriores.
- No convertir un componente monolítico existente a DVH ni viceversa.
- Priorizar **Plan de armado** sobre tablas de consumo.
- No inventar `position` si Zeta no la entrega (`null`).
- No cambiar configuraciones globales de Zeta ni el porcentaje de pérdida.
- No almacenar usuario ni contraseña.
- Auth: reutilizar sesión del taller en Cursor Browser; Playwright auth solo en `tmp/zeta-auth/` (gitignored).
- Si Zeta falla: conservar `pending`, registrar el error exacto, screenshot y consola.
- Máximo **un reintento limpio** por configuración. Nunca bucles infinitos.
- Un error de UI (`No se ha encontrado el producto`, Vue/JS) **no** prueba que la receta no exista.
- Default live batch: `--limit=5`. Dry-run si no hay `--live`.
- No lanzar las 29 líneas.
- **La navegación no escribe `confirmed/`** — siempre pasar por raw + ingest/validate.

## Patrón Cursor Browser: state → interact → state

1. Capturar estado (`browser_snapshot`, screenshot).
2. Interactuar con selector DOM estable (label, id, texto visible).
3. Esperar UI estable (sin spinners Vue, sin error bloqueante).
4. Repetir hasta Plan de armado visible.
5. Guardar `plan.html` / `plan.txt` en `raw/`.
6. `pnpm zeta:ingest -- --target=<id>`.

## Comandos

```bash
pnpm zeta:extract -- --dry-run
pnpm zeta:extract -- --self-check
pnpm zeta:extract -- --login                    # solo Playwright
pnpm zeta:extract -- --live --manufacturer=SODAL --system=L25 --limit=1
pnpm zeta:ingest -- --target=dvh_pierna_abierta_2h_1800x1500
pnpm zeta:validate
pnpm zeta:coverage
pnpm zeta:derive
```

## Algoritmo

Para cada target pendiente:

1. Si existe en `confirmed/` → SKIP.
2. Cursor Browser: proyecto nuevo. Un marco/configuración.
3. Seleccionar fabricante, línea, variante, tipología, hojas, dimensiones, color, vidrio, herraje.
4. Generar Plan de armado y comprobar línea/hojas/dimensiones.
5. Guardar RAW (HTML + checkpoints) **antes** de normalizar.
6. `pnpm zeta:ingest` → parser + validar schema y coherencia.
7. Solo entonces escribir JSON en `confirmed/`.
8. Actualizar `coverage.json`, `INDEX.md`, `targets.json`.
9. Log en `docs/fabricacion/zeta/runs/`.

## Clasificaciones

`CONFIRMED` `PENDING` `CONFIGURATION_ERROR` `ZETA_UI_ERROR` `AUTOMATION_ERROR` `SOURCE_CONFLICT` `UNSUPPORTED_CONFIRMED`

## Roles

- **ZETA EXTRACTOR**: único autorizado a navegar Zeta. Lock `tmp/zeta-auth/extract.lock` en `--live`.
- Cursor Browser = navegación; scripts PNPM = verdad auditable.
- Auditor, tests y docs **no** navegan Zeta.
- No paralelizar dos navegaciones Zeta.
- Sí paralelizar: validar JSON, tests y coverage mientras **no** se abre Zeta.

## Ejemplos de invocación

```text
Usuario: extrae la siguiente pendiente L25
Agente: lee coverage.json y targets.json → SKIP confirmed → navega con Cursor Browser → raw → ingest --limit=1
```

```text
Usuario: usa ventora-zeta-extractor para L-25 DVH PIERNA ABIERTA 2H
Agente: Cursor Browser → proyecto nuevo → TE4104 → Plan de armado → raw → ingest → confirmed solo si valida
```
