# Navegación Zeta — Cursor Browser + ingest

La navegación en Sistema Zeta la hace el agente o el usuario con **Cursor Browser** (MCP `cursor-ide-browser`). Los scripts `scripts/zeta/*` son la única capa que parsea, valida y escribe `confirmed/`.

## Cadena obligatoria

```text
targets.json
→ Cursor Browser navega Zeta (state → interact → state)
→ Plan de armado visible
→ raw/  (plan.html, plan.txt, screenshots, metadata.json)
→ pnpm zeta:ingest -- --target=<id>
→ parsear + validar schema
→ confirmed/
→ coverage/index
```

**La navegación manual nunca escribe en `confirmed/` directamente.**

## Flujo recomendado

1. Leer `docs/fabricacion/zeta/coverage.json`, `targets.json` e `INDEX.md`.
2. Elegir un target `pending` (no tocar `confirmed/` existente).
3. Abrir `https://sistemazeta.cl/zeta/` en Cursor Browser (sesión ya autenticada del taller).
4. Crear **proyecto nuevo** con una sola configuración (ver `docs/fabricacion/zeta/SELECTORS.md`).
5. Llegar al **Plan de armado** con línea, hojas, dimensiones, vidrio y color correctos.
6. Guardar evidencia en `docs/fabricacion/zeta/raw/<fabricante>/<sistema>/<target-id>/`:
   - `plan.html` — DOM del plan (preferido)
   - `plan.txt` — texto plano alternativo
   - `screenshot.png` — captura del plan visible
   - `metadata.json` — opcional: `sourceEvidence.projectId`, `planId`, `pageUrl`
   - checkpoints opcionales: `checkpoint-*.png`
7. Ejecutar:

```bash
pnpm zeta:ingest -- --target=<id>
pnpm zeta:validate
pnpm zeta:coverage
```

## Patrón: state → interact → state

1. `browser_snapshot` — estado accesible + spinners.
2. Click/fill/select con refs del snapshot (no coordenadas fijas).
3. Esperar UI estable (sin overlay “Preparando proyecto…”, sin error bloqueante).
4. Repetir hasta Plan de armado visible.
5. Extraer HTML/texto del plan → guardar en `raw/`.
6. `pnpm zeta:ingest` completa el pipeline auditable.

Selectores documentados: `docs/fabricacion/zeta/SELECTORS.md`.

## Fallback Playwright (batch técnico)

Solo si hace falta automatizar sin agente:

```bash
pnpm zeta:extract -- --login          # primera vez
pnpm zeta:extract -- --live --limit=1
```

Requiere sesión en `tmp/zeta-auth/` (gitignored). Preferir Cursor Browser + ingest para calibración y targets nuevos.

## Reglas

- Un proyecto nuevo = una configuración = un target.
- No reutilizar marcos ni convertir tipologías en el mismo proyecto.
- Lock mental: un solo navegador Zeta (`tmp/zeta-auth/extract.lock` si corre `--live`).
- Errores de UI no prueban que la receta no exista — registrar y dejar `pending`.
- Máximo un reintento limpio por target.

## Parser

El parser vive en `scripts/zeta/parse-plan.ts`. La navegación solo entrega HTML/texto; normalización y validación son siempre PNPM.
