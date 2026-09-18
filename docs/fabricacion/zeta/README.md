# Base técnica Sistema Zeta

Fuente documental para fabricación de Ventora. El alcance inicial es `SODAL / L25`.

Este README es la guía operativa del extractor. Si vuelves al proyecto dentro de seis meses, empieza aquí.

## Qué es cada capa

| Capa | Significado |
|---|---|
| Extractor | Scripts en `scripts/zeta/` que leen Sistema Zeta o revalidan evidencia ya capturada. |
| `confirmed/` | Observación directa de un **Plan de armado** real. No es receta de Ventora ni validación de taller. |
| `pending/` | Todavía falta un Plan de armado limpio. Un error de UI no demuestra que la receta no exista. |
| `raw/` | Captura original: HTML relevante, texto, screenshot, metadatos, consola. Sin tokens ni passwords. |
| `derived/` | Fórmulas matemáticas deducidas después. Nunca se mezclan con `confirmed/`. |
| `targets.json` | Cola de trabajo generada desde confirmed + pending. |
| `coverage.json` | Estado explícito por fabricante/línea/variante/hojas. |
| `INDEX.md` | Vista Markdown generada. No editar a mano. |
| `runs/` | Log de cada corrida. |

Cadena de trazabilidad:

```text
SISTEMA ZETA → RAW → CONFIRMED → DERIVED → futura fabrication_recipe de Ventora
```

`position: null` significa que la posición no quedó transcrita; no es una inferencia.

No se incluyen fórmulas deducidas, datos de Alumet/HaceVentanas/Google ni recetas implementadas en Ventora.

## Cómo iniciar sesión

1. No se guarda usuario ni contraseña.
2. Ejecuta:

```bash
pnpm zeta:extract -- --login
```

3. Inicia sesión a mano en el navegador que se abre.
4. Cuando el dashboard esté visible, vuelve a la terminal y presiona Enter.
5. El estado queda en `tmp/zeta-auth/` (ignorado por git).

La URL por defecto es `https://sistemazeta.cl/zeta/` (login y app). Proyectos: `https://sistemazeta.cl/zeta/proyectos`. Si tu cuenta usa otro host, define `ZETA_BASE_URL` en el entorno local (no se commitea).

Primera vez en esta máquina:

```bash
pnpm zeta:playwright:install
```

Selectores documentados en `docs/fabricacion/zeta/SELECTORS.md`.

**Extracción live (2026-09):** **Cursor Browser** + ingest. Browser Use fue retirado del repo.

```bash
# 1) Agente navega Zeta en Cursor Browser y guarda raw/
# 2) Pipeline auditable:
pnpm zeta:ingest -- --target=<id>
```

Playwright (`pnpm zeta:extract -- --live`) solo como fallback técnico con sesión en `tmp/zeta-auth/`.

Si Zeta ya está autenticado en el Browser de Cursor, reutilizar esa pestaña; no abrir Brave + Cursor en paralelo para el mismo target.

## Cómo ejecutar extracción

Dry-run (default; no abre Zeta ni escribe confirmed):

```bash
pnpm zeta:extract
pnpm zeta:extract -- --dry-run
pnpm zeta:extract -- --manufacturer=SODAL --system=L25
pnpm zeta:extract -- --line="L-25 DVH PIERNA CERRADA"
```

Self-check contra L25 confirmed, sin sobrescribirla:

```bash
pnpm zeta:extract -- --self-check
```

Extracción real (límite conservador 5, o 1 para seguir con pendientes):

```bash
pnpm zeta:extract -- --live --manufacturer=SODAL --system=L25 --limit=1
```

Reglas en vivo:

- un proyecto nuevo = una configuración;
- no reutilizar componentes;
- no pasar de monolítico a DVH sobre el mismo marco;
- máximo un reintento limpio;
- si Zeta falla, la entrada sigue `pending`.

## Cómo validar

```bash
pnpm zeta:validate
pnpm zeta:coverage
pnpm zeta:derive
```

`validate` no modifica confirmed. `coverage` regenera `coverage.json`, `targets.json` e `INDEX.md`. `derive` escribe solo en `derived/`.

## Cómo interpretar errores

| Código | Significa | Qué hacer |
|---|---|---|
| `CONFIRMED` | Plan de armado extraído y validado | Ya está en confirmed |
| `PENDING` | Falta evidencia | Reintentar después, proyecto nuevo |
| `ZETA_UI_ERROR` | Aviso/error de la UI de Zeta | Conservar pending; no declarar receta inexistente |
| `AUTOMATION_ERROR` | Falló el extractor o se reutilizó mal un componente | Reintento limpio 1/1 |
| `CONFIGURATION_ERROR` | El Plan no calza con el target | Revisar línea/hojas/vidrio |
| `SOURCE_CONFLICT` | Dos evidencias incompatibles | Ir a `conflicts/` |
| `UNSUPPORTED_CONFIRMED` | Zeta dijo no disponible con Plan visible | Documentar; no inventar fórmula |

## Cómo añadir una línea nueva

1. Agrégala como `pending` en `targets.json` (o en `pending/.../PENDING.md` y corre `pnpm zeta:coverage`).
2. No copies datos de otra fuente a `confirmed/`.
3. Extrae con `--live --limit=1`.
4. Confirma que el JSON apunta a `raw/` concreto.
5. Recién entonces, en otra tarea, se podrá implementar una `fabrication_recipe` de Ventora.

## Roles y paralelismo

- **ZETA EXTRACTOR**: único que navega Zeta. Lock `tmp/zeta-auth/extract.lock`.
- **FABRICATION AUDITOR**: lee confirmed/derived, escribe `AUDIT.md`, no navega Zeta.
- **TEST AGENT**: tests de schema/scripts, no navega Zeta.
- **DOC AGENT**: coverage e INDEX.

Permitido en paralelo: validar, testear y cubrir. Prohibido: dos agentes en Zeta con la misma cuenta.

## Automatización segura (sin Zeta)

Cuando cambien archivos en `docs/fabricacion/zeta/confirmed/**`:

1. `pnpm zeta:validate`
2. `pnpm zeta:coverage`

Si hay schema inválido, duplicado, conflicto, código de perfil que desaparece o receta incompleta, el reporte queda en `AUDIT.md` y validate falla.

Cómo activarlo después en Cursor Automations (Agents Window):

1. Trigger Git: push/PR sobre `docs/fabricacion/zeta/confirmed/**`.
2. Tools: terminal del repo. Sin Browser y sin Cloud Agent usando tu cuenta Zeta.
3. Prompt: ejecutar `pnpm zeta:validate` y `pnpm zeta:coverage`; no navegar Sistema Zeta; no modificar confirmed.
4. No uses Cloud Automation para extraer con tu sesión.

Detalle: `docs/fabricacion/zeta/AUTOMATION.md`.

## Comandos PNPM

Nunca uses npm, npx ni yarn.

```bash
pnpm zeta:extract -- --dry-run
pnpm zeta:extract -- --self-check
pnpm zeta:validate
pnpm zeta:coverage
pnpm zeta:derive
```
