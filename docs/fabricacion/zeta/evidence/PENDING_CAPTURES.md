# Capturas Zeta pendientes — auditoría de sidecars

Generado: 2026-09-19T21:08:42.611Z

Este informe **no modifica** `confirmed/` ni habilita `production_ready`.

## Acceso a Sistema Zeta

Estado verificado al generar este informe: **sin sesión autenticada** en `https://sistemazeta.cl/zeta/` (pantalla de login).
No hay `tmp/zeta-auth/` con sesión Playwright almacenada.

Para cerrar evidencias parciales hace falta:
1. Autenticarse manualmente en Cursor Browser o `pnpm zeta:extract -- --login`.
2. Crear **proyecto nuevo** por variante (ver `docs/fabricacion/zeta/SELECTORS.md`).
3. Guardar en `docs/fabricacion/zeta/raw/sodal/{l25|4800}/<recipeId>/`:
   `plan.html`, `plan.txt`, `screenshot.png`, `metadata.json`, checkpoints opcionales.
4. Registrar run en `docs/fabricacion/zeta/runs/<timestamp>.json`.
5. `pnpm zeta:build-evidence-sidecars` (no tocar `confirmed/` salvo ingest explícito).

## Resumen

| Estado sidecar | Cantidad |
|---|---:|
| complete_1_1 | 1 |
| partial | 23 |

## Sidecars partial — detalle por variante

### `dvh_pierna_abierta_3h_3000x1500` (L25)

- **planId referencia:** PA-47
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_3h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/dvh_pierna_abierta_3h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_3h_3000x1500/plan.txt`
- `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_3h_3000x1500/metadata.json`
- `docs/fabricacion/zeta/runs/2026-09-19_17-55-41-browser-l25-3h.json`
- `docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_3h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- screenshot PNG
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `dvh_pierna_abierta_4h_3000x1500` (L25)

- **planId referencia:** PA-48
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_4h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/dvh_pierna_abierta_4h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_4h_3000x1500/plan.txt`
- `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_4h_3000x1500/metadata.json`
- `docs/fabricacion/zeta/runs/2026-09-19_21-07-00-browser-l25-4h.json`
- `docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_4h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- screenshot PNG
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `dvh_pierna_abierta_reforzada_2h_1800x1500` (L25)

- **planId referencia:** PA-3
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_reforzada_2h_1800x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/dvh_pierna_abierta_reforzada_2h_1800x1500.json`

**Evidencia disponible hoy:**
- `docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_2h_1800x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `dvh_pierna_abierta_reforzada_3h_2400x1500` (L25)

- **planId referencia:** PA-52
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_reforzada_3h_2400x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/dvh_pierna_abierta_reforzada_3h_2400x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/PA-52_VENTORA-ZETA-BATCH-011.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_3h_2400x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `dvh_pierna_abierta_reforzada_3h_3000x1500` (L25)

- **planId referencia:** PA-3
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_reforzada_3h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/dvh_pierna_abierta_reforzada_3h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_3h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `dvh_pierna_abierta_reforzada_4h_3000x1500` (L25)

- **planId referencia:** PA-3
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_reforzada_4h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/dvh_pierna_abierta_reforzada_4h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_4h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `dvh_pierna_cerrada_2h_1800x1500` (L25)

- **planId referencia:** PA-42
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_cerrada_2h_1800x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/dvh_pierna_cerrada_2h_1800x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/PA-42_VENTORA-ZETA-BATCH-001.md (derivado)`
- `docs/fabricacion/zeta/runs/2026-09-18_03-42-27.json`
- `docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_2h_1800x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `dvh_pierna_cerrada_3h_2400x1500` (L25)

- **planId referencia:** PA-53
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_cerrada_3h_2400x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/dvh_pierna_cerrada_3h_2400x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/PA-53_VENTORA-ZETA-BATCH-012.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_3h_2400x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `dvh_pierna_cerrada_3h_3000x1500` (L25)

- **planId referencia:** PA-43
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_cerrada_3h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/dvh_pierna_cerrada_3h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/PA-43_VENTORA-ZETA-BATCH-002.md (derivado)`
- `docs/fabricacion/zeta/runs/2026-09-18_03-42-27.json`
- `docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_3h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `dvh_pierna_cerrada_4h_3000x1500` (L25)

- **planId referencia:** PA-44
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_cerrada_4h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/dvh_pierna_cerrada_4h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/PA-44_VENTORA-ZETA-BATCH-003.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_4h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `monolitico_2h_1800x1500` (4800)

- **planId referencia:** PA-56
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/4800/monolitico_2h_1800x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/4800/monolitico_2h_1800x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/4800/monolitico_2h_1800x1500/plan.html`
- `docs/fabricacion/zeta/raw/sodal/4800/monolitico_2h_1800x1500/plan.txt`
- `docs/fabricacion/zeta/raw/sodal/4800/monolitico_2h_1800x1500/metadata.json`
- `docs/fabricacion/zeta/runs/2026-09-18_21-52-59.json`
- `docs/fabricacion/zeta/confirmed/sodal/4800/monolitico_2h_1800x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- screenshot PNG
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L-4800 testing; P2A legacy filtrado en resolver

### `monolitico_3h_3000x1500` (4800)

- **planId referencia:** PA-54
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/4800/monolitico_3h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/4800/monolitico_3h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/4800/monolitico_3h_3000x1500/plan.html`
- `docs/fabricacion/zeta/raw/sodal/4800/monolitico_3h_3000x1500/plan.txt`
- `docs/fabricacion/zeta/raw/sodal/4800/monolitico_3h_3000x1500/metadata.json`
- `docs/fabricacion/zeta/runs/2026-09-18_21-45-29.json`
- `docs/fabricacion/zeta/confirmed/sodal/4800/monolitico_3h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- screenshot PNG
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L-4800 testing; P2A legacy filtrado en resolver

### `monolitico_pierna_abierta_2h_1800x1500` (L25)

- **planId referencia:** PA-3
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/monolitico_pierna_abierta_2h_1800x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/monolitico_pierna_abierta_2h_1800x1500.json`

**Evidencia disponible hoy:**
- `docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado)`
- `docs/fabricacion/zeta/runs/2026-09-18_03-43-44.json`
- `docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_2h_1800x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `monolitico_pierna_abierta_3h_2400x1500` (L25)

- **planId referencia:** PA-50
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/monolitico_pierna_abierta_3h_2400x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/monolitico_pierna_abierta_3h_2400x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/PA-50_VENTORA-ZETA-BATCH-009.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_3h_2400x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `monolitico_pierna_abierta_3h_3000x1500` (L25)

- **planId referencia:** PA-3
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/monolitico_pierna_abierta_3h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/monolitico_pierna_abierta_3h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_3h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `monolitico_pierna_abierta_4h_3000x1500` (L25)

- **planId referencia:** PA-3
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/monolitico_pierna_abierta_4h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/monolitico_pierna_abierta_4h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_4h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `monolitico_pierna_abierta_reforzada_2h_1800x1500` (L25)

- **planId referencia:** PA-5
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/monolitico_pierna_abierta_reforzada_2h_1800x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/monolitico_pierna_abierta_reforzada_2h_1800x1500.json`

**Evidencia disponible hoy:**
- `docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_2h_1800x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `monolitico_pierna_abierta_reforzada_3h_2400x1500` (L25)

- **planId referencia:** PA-51
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/monolitico_pierna_abierta_reforzada_3h_2400x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/monolitico_pierna_abierta_reforzada_3h_2400x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/PA-51_VENTORA-ZETA-BATCH-010.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_3h_2400x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `monolitico_pierna_abierta_reforzada_3h_3000x1500` (L25)

- **planId referencia:** PA-5
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/monolitico_pierna_abierta_reforzada_3h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/monolitico_pierna_abierta_reforzada_3h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_3h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `monolitico_pierna_abierta_reforzada_4h_3000x1500` (L25)

- **planId referencia:** PA-40
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/monolitico_pierna_abierta_reforzada_4h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/monolitico_pierna_abierta_reforzada_4h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/PA-40_VENTORA-ZETA-PENDING-001.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_4h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `monolitico_pierna_cerrada_2h_1800x1500` (L25)

- **planId referencia:** PA-2
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/monolitico_pierna_cerrada_2h_1800x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/monolitico_pierna_cerrada_2h_1800x1500.json`

**Evidencia disponible hoy:**
- `docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_cerrada_2h_1800x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `monolitico_pierna_cerrada_3h_3000x1500` (L25)

- **planId referencia:** PA-45
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/monolitico_pierna_cerrada_3h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/monolitico_pierna_cerrada_3h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/PA-45_VENTORA-ZETA-BATCH-004.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_cerrada_3h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

### `monolitico_pierna_cerrada_4h_3000x1500` (L25)

- **planId referencia:** PA-46
- **Carpeta raw destino:** `docs/fabricacion/zeta/raw/sodal/l25/monolitico_pierna_cerrada_4h_3000x1500/`
- **Sidecar:** `docs/fabricacion/zeta/evidence/sodal/l25/monolitico_pierna_cerrada_4h_3000x1500.json`

**Evidencia disponible hoy:**
- `docs/fabricacion/zeta/raw/sodal/l25/PA-46_VENTORA-ZETA-BATCH-005.md (derivado)`
- `docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_cerrada_4h_3000x1500.json (confirmed)`

**Campos faltantes para gate 1:1:**
- plan.html
- plan.txt
- screenshot PNG
- metadata.json
- runId
- hash html
- hash screenshot
- fuente 1:1 perfiles/vidrios/accesorios/medidas

- **calculable:** false
- **ventoraStatus:** testing
- **bloqueo:** Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing)

## Sidecars complete_1_1 (referencia)

- `dvh_pierna_abierta_2h_1800x1500` (L25) · calculable=true · raw=`docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_2h_1800x1500/`

## Tabla consolidada

| Variante | Sistema | Evidencia disponible | Campos faltantes | calculable | ventoraStatus | Bloqueo |
|---|---|---|---|---|---|---|
| `dvh_pierna_abierta_2h_1800x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_2h_1800x1500/plan.html; docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_2h_1800x1500/plan.txt; docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_2h_1800x1500/metadata.json; docs/fabricacion/zeta/runs/2026-09-18_05-08-42.json; docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_2h_1800x1500/screenshot.png; docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_2h_1800x1500/checkpoint-plan-visible.png; docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_2h_1800x1500.json (confirmed) | — | true | testing | Trazabilidad 1:1 OK; L25 ≠ production_ready (testing) |
| `dvh_pierna_abierta_3h_3000x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_3h_3000x1500/plan.txt; docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_3h_3000x1500/metadata.json; docs/fabricacion/zeta/runs/2026-09-19_17-55-41-browser-l25-3h.json; docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_3h_3000x1500.json (confirmed) | plan.html, screenshot PNG, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `dvh_pierna_abierta_4h_3000x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_4h_3000x1500/plan.txt; docs/fabricacion/zeta/raw/sodal/l25/dvh_pierna_abierta_4h_3000x1500/metadata.json; docs/fabricacion/zeta/runs/2026-09-19_21-07-00-browser-l25-4h.json; docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_4h_3000x1500.json (confirmed) | plan.html, screenshot PNG, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `dvh_pierna_abierta_reforzada_2h_1800x1500` | L25 | docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_2h_1800x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `dvh_pierna_abierta_reforzada_3h_2400x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/PA-52_VENTORA-ZETA-BATCH-011.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_3h_2400x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `dvh_pierna_abierta_reforzada_3h_3000x1500` | L25 | docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_3h_3000x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `dvh_pierna_abierta_reforzada_4h_3000x1500` | L25 | docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_abierta_reforzada_4h_3000x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `dvh_pierna_cerrada_2h_1800x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/PA-42_VENTORA-ZETA-BATCH-001.md (derivado); docs/fabricacion/zeta/runs/2026-09-18_03-42-27.json; docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_2h_1800x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `dvh_pierna_cerrada_3h_2400x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/PA-53_VENTORA-ZETA-BATCH-012.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_3h_2400x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `dvh_pierna_cerrada_3h_3000x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/PA-43_VENTORA-ZETA-BATCH-002.md (derivado); docs/fabricacion/zeta/runs/2026-09-18_03-42-27.json; docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_3h_3000x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `dvh_pierna_cerrada_4h_3000x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/PA-44_VENTORA-ZETA-BATCH-003.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/dvh_pierna_cerrada_4h_3000x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `monolitico_2h_1800x1500` | 4800 | docs/fabricacion/zeta/raw/sodal/4800/monolitico_2h_1800x1500/plan.html; docs/fabricacion/zeta/raw/sodal/4800/monolitico_2h_1800x1500/plan.txt; docs/fabricacion/zeta/raw/sodal/4800/monolitico_2h_1800x1500/metadata.json; docs/fabricacion/zeta/runs/2026-09-18_21-52-59.json; docs/fabricacion/zeta/confirmed/sodal/4800/monolitico_2h_1800x1500.json (confirmed) | screenshot PNG, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L-4800 testing; P2A legacy filtrado en resolver |
| `monolitico_3h_3000x1500` | 4800 | docs/fabricacion/zeta/raw/sodal/4800/monolitico_3h_3000x1500/plan.html; docs/fabricacion/zeta/raw/sodal/4800/monolitico_3h_3000x1500/plan.txt; docs/fabricacion/zeta/raw/sodal/4800/monolitico_3h_3000x1500/metadata.json; docs/fabricacion/zeta/runs/2026-09-18_21-45-29.json; docs/fabricacion/zeta/confirmed/sodal/4800/monolitico_3h_3000x1500.json (confirmed) | screenshot PNG, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L-4800 testing; P2A legacy filtrado en resolver |
| `monolitico_pierna_abierta_2h_1800x1500` | L25 | docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado); docs/fabricacion/zeta/runs/2026-09-18_03-43-44.json; docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_2h_1800x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `monolitico_pierna_abierta_3h_2400x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/PA-50_VENTORA-ZETA-BATCH-009.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_3h_2400x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `monolitico_pierna_abierta_3h_3000x1500` | L25 | docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_3h_3000x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `monolitico_pierna_abierta_4h_3000x1500` | L25 | docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_4h_3000x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `monolitico_pierna_abierta_reforzada_2h_1800x1500` | L25 | docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_2h_1800x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `monolitico_pierna_abierta_reforzada_3h_2400x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/PA-51_VENTORA-ZETA-BATCH-010.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_3h_2400x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `monolitico_pierna_abierta_reforzada_3h_3000x1500` | L25 | docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_3h_3000x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `monolitico_pierna_abierta_reforzada_4h_3000x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/PA-40_VENTORA-ZETA-PENDING-001.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_reforzada_4h_3000x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `monolitico_pierna_cerrada_2h_1800x1500` | L25 | docs/SODAL_LINEA25_ZETA_2026-09-18.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_cerrada_2h_1800x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `monolitico_pierna_cerrada_3h_3000x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/PA-45_VENTORA-ZETA-BATCH-004.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_cerrada_3h_3000x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
| `monolitico_pierna_cerrada_4h_3000x1500` | L25 | docs/fabricacion/zeta/raw/sodal/l25/PA-46_VENTORA-ZETA-BATCH-005.md (derivado); docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_cerrada_4h_3000x1500.json (confirmed) | plan.html, plan.txt, screenshot PNG, metadata.json, runId, hash html, hash screenshot, fuente 1:1 perfiles/vidrios/accesorios/medidas | false | testing | Gate evidencia incompleto → calculable=false; L25 ≠ production_ready (testing) |
