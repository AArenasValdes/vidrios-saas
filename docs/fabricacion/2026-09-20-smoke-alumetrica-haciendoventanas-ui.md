# Smoke test: concordancia Alumétrica / Haciendo Ventanas vs Ventora

Fecha: 2026-09-20  
Alcance: auditoría only (sin seed, sin fixes)  
Entorno: local `pnpm run build` (OK) + servidor en `:3000` (ya activo; segundo `start` falló por `EADDRINUSE`)

## Resumen ejecutivo

| Resultado | Cantidad |
|---|---:|
| Líneas con evidencia recolectada auditadas | 8 bundles + 3 bloqueadas |
| Fixtures vs Haciendo (perfiles/largos) | **OK** en las 6 líneas con despiece 1200×1000 |
| Recetas merge en BD | **0** (seed no ejecutado — GAP_ESPERADO) |
| UI mobile vs Alumétrica (variantes) | **GAP_ESPERADO** en L20 y demás: 1 variante visible vs N tipologías documentadas |
| Receta org L20 vs fixture Haciendo | **GAP_ESPERADO / BUG_ARQUITECTURA**: receta validated usa arquetipo Ventora, no merge Alumétrica |
| Bugs UI confirmados | 1 (`testing` muestra pill «Validada») |
| Smoke browser autenticado | **Bloqueado** (sin `PLAYWRIGHT_E2E_*`; redirect a login) |

**Conclusión:** La integración documental Codex es coherente con Haciendo Ventanas en fixtures `testing`, pero **no está materializada en BD** ni expuesta en cotización. La UI mobile muestra **una sola receta por línea** (la más reciente de la org), no la galería multi-variante de Alumétrica. Para L20, ver solo «estandar» es comportamiento esperado del producto actual, no fallo del merge.

---

## Fase 0 — Entorno

| Paso | Resultado |
|---|---|
| `pnpm run build` | **Pasa** (contrario al reporte 2026-09-19; el bloqueo `node:fs` no se reprodujo) |
| `pnpm run start` | **EADDRINUSE** — ya había instancia en `:3000` |
| Navegación sin sesión a `/configuracion/empresa/lineas-precios` | Redirect a `/login?next=...` |

---

## Fase 1 — Auditoría automatizada

### Comandos

| Comando | Resultado | Clasificación |
|---|---|---|
| `pnpm exec tsc --noEmit` | 0 | pasa |
| `pnpm run lint` | exit 1, 1528 errors / 13126 warnings | **preexistente ampliado** (escaneo muy amplio; merge report citaba 0 errors) |
| `alumetrica-haciendoventanas-integration.test.ts` | **8/8** | pasa |
| `fabricacion-line-variant.service.test.ts` | **15/15** | pasa |

### Matriz fixtures vs Haciendo Ventanas (1200×1000)

Fuente Haciendo: [`2026-09-19-despieces-observados.md`](haciendoventanas/2026-09-19-despieces-observados.md)  
Fuente fixtures: [`alumetrica-haciendoventanas-testing.ts`](../../src/features/fabricacion/fixtures/alumetrica-haciendoventanas-testing.ts)

| catalog_key | Variantes Alumétrica | Variantes Haciendo | Bundles fixture | Perfiles vs HV | Vidrio vs HV | Clasificación |
|---|---:|---:|---:|---|---|---|
| `ventora:serie-3200-puerta-abatible-1h` | 3 | 1 | 1 | OK (3222/3225) | GAP: no promovido (ambiguo) | GAP_ESPERADO |
| `ventora:serie-4800-corredera-2h` | 2 | 1 | 3* | OK (4801–4808) | GAP: ancho no verificado | GAP_ESPERADO |
| `ventora:l20` | **5** | **1** | **1** Normal | **OK** (2001–2019) | **OK** 543×899×2 | GAP variantes 5→1 |
| `ventora:s33-corredera-2h` | 2 | 1 | 1 | OK | OK 488×816×2 | GAP variantes 2→1 |
| `ventora:s33-rpt-corredera-2h` | 4 | 1 | 1 RPT | OK | OK 491×825×2 | GAP variantes 4→1 |
| `ventora:optima-s28-corredera-2h` | 2 | 1 TP 2H | 1 | OK | OK 493×829×2 | GAP variantes 2→1 |

\* Incluye 2 bundles Zeta (1800×1500 / 3000×1500) además del fixture HV 1200×1000.

Tests de integración confirman: orden/códigos/cantidades/largos, repetibilidad ×3, `MEDIDA_NO_OBSERVADA` fuera de fixture, bloqueo público de `testing`, L-4800 4H bloqueada, seed idempotente.

### Líneas bloqueadas / sin fixture

| catalog_key | Estado | Motivo |
|---|---|---|
| `ventora:optima-s28-corredera-3h` | BLOQUEADO | 3H / 2 termopaneles |
| `ventora:s38-rpt-proyectante` | BLOQUEADO | conflicto 1 vidrio vs 2H Alumétrica |
| `ventora:l25` | sin fixture merge | pipeline Zeta propio; conflicto vidrio Haciendo |
| L-4800 4H | BLOQUEADO | medida no observada |

### BD: recetas merge

```sql
-- fabrication_recipes con source_reference merge:* → 0 filas
```

GAP_ESPERADO: seed exige `organizationId` explícito y no se ejecutó.

---

## Fase 2 — Smoke visual mobile

### Limitación de acceso

- Variables `PLAYWRIGHT_E2E_EMAIL` / `PLAYWRIGHT_E2E_PASSWORD`: **no configuradas**
- Browser MCP: redirect a login al abrir catálogo
- **Proxy de datos UI:** org `44` en Supabase (líneas comerciales activas con recetas org)

### Comportamiento UI confirmado (código + BD org 44)

Rutas auditadas:

- `/configuracion/empresa/lineas-precios`
- `/configuracion/empresa/lineas-precios/[id]/fabricacion`

| Línea | Recetas org 44 | Variantes en BD | Estado focus | Perfiles | Vidrio (reglas) | Accesorios | Variantes visibles mobile |
|---|---:|---:|---|---:|---:|---:|---|
| Serie 20 | 1 | 1 (`estandar`) | validated | 7 | 1 | 3 | **1** |
| Serie 3200 | 2 | 1 | draft | 5–6 | 1–2 | 6–7 | **1** (más reciente) |
| Serie 4800 | 2 | 2 | draft | 7 | 1 | 3–7 | **1** |
| S-33 | 1 | 1 | draft | 11 | 4 | 4 | **1** |
| S-33 RPT | 1 | 1 | draft | 8 | 2 | 5 | **1** |
| Óptima S-28 2H | 1 | 1 | draft | 7 | 1 | 3 | **1** |

Lógica mobile: `focusRecipe = lineRecipes[0]` por `updatedAt`; **no renderiza** `FabricacionVariantTree`.

### Capturas del usuario (L20)

Observado en screenshot mobile:

- Pill: **Validada**
- Construcción: **Corredera · 2 hojas · estandar**
- Perfiles: **7 reglas · 12 cortes**
- Vidrio: **2 definido**
- Accesorios: **4 definido**

Interpretación:

- Coherente con receta **validated de org** (arquetipo `ventora-arquetipo:corredera_2h`), **no** con fixture merge Alumétrica/Haciendo.
- «2 definido» vidrio = `activeGlassCount` (piezas calculadas), no reglas; la receta org tiene **1 regla** de vidrio con cantidad activa 2.
- «4 definido» accesorios puede variar por org/receta; org 44 tiene 3 reglas × qty 1 — posible org distinta en captura o receta editada.

---

## Fase 2 — Auditoría profunda L20

### Las 5 configuraciones Alumétrica (galería Modelos)

Documentadas en [`alumetrica/2026-09-19-matriz-lineas.md`](alumetrica/2026-09-19-matriz-lineas.md):

1. Monolítico pierna abierta — Jamba 2009  
2. Monolítico pierna abierta  
3. Monolítico pierna cerrada — Jamba 2009  
4. Monolítico pierna cerrada  
5. TP 15 mm  

Alumétrica lista **13 códigos** de perfil (2001–2021); Haciendo capturó **7** en un solo PDF 1200×1000.

### Qué modeló Ventora

| Capa | Variantes | Perfiles | Vidrio |
|---|---:|---|---|
| Alumétrica docs | 5 tipologías | 13 códigos | TP 15 mm mencionado |
| Haciendo docs | 1 despiece | 7 (2001–2019) | 543×899×2 |
| Fixture merge | 1 (`Normal`) | 7 fijos | 543×899×2 |
| Catálogo slots (`line-base-variant-catalog`) | **1** (`caracol` ≈ estandar) | — | — |
| Receta org validated (ej. org 44) | **1** (`estandar`) | 7 reglas (2001,2004,2005,2009,2010,**2014**,2019) | fórmula, no fixture |

**Gap 5→1:** GAP_ESPERADO por diseño del merge (solo evidencia Haciendo verificable) + GAP_ARQUITECTURA (catálogo Ventora 1 slot; mobile sin árbol de variantes).

### Wizard mobile — vidrio

- **Detalle línea:** resumen agregado (`N definido`).
- **Wizard paso Vidrio** (`fabricacion-mobile-materials-step.tsx`): lista editable por regla; muestra nombre y cantidad.
- **Validar:** cubicación consolidada con medidas si hay reglas activas.

Si el usuario no entra al wizard, solo ve el conteo — no el detalle 543×899. Clasificación: **GAP_ESPERADO** (UX resumida), no ausencia de datos en receta validated.

### Receta org vs fixture Haciendo

| Campo | Fixture merge | Receta org 44 validated |
|---|---|---|
| 2002 Riel Inferior | 1×1188 | **Ausente** |
| 2014 Riel portafelpa | Ausente | **Presente** (plantilla comercial) |
| Largos | Fijos observados | Fórmulas (`valorFijoMm` null) |
| Vidrio | 543×899×2 fijo | «Vidrio principal» con fórmula |
| source_reference | `merge:alumetrica+haciendoventanas:...` | `ventora-arquetipo:corredera_2h` |

Clasificación: **GAP_ESPERADO** — la UI muestra la receta del taller/org, no el bundle merge no seedeado.

---

## Fase 3 — Clasificación de hallazgos

### OK

- Fixtures `testing` alineados con tablas Haciendo 1200×1000 (tests 8/8).
- Catálogo comercial 29 líneas intacto.
- Seed merge no ejecutado (guarda explícita).
- Resolver público no activa recetas `testing`.
- L-4800 4H bloqueada en resolver.

### GAP_ESPERADO

- Alumétrica documenta más variantes que fixtures (L20 5→1, S-33 2→1, etc.).
- Accesorios 0 en fixtures HV; Zeta 4800 sí incluye herrajes.
- Vidrio omitido en 3200/4800 HV por lectura ambigua.
- Mobile muestra 1 receta; no galería multi-variante.
- Recetas merge ausentes en BD.
- Usuario no ve variantes Alumétrica en Ventora mobile.

### BUG_UI

| Hallazgo | Evidencia | Severidad |
|---|---|---|
| `status === "testing"` muestra pill **«Validada»** | `getFabricacionVisualStatus()` líneas 219–220 en `fabricacion-line-workflow.utils.ts` | Media |

### BUG_ARQUITECTURA (decisión producto, no regresión merge)

- `FabricacionVariantTree` calculado en hook pero **no cableado** en mobile.
- Catálogo base L20 define 1 slot; Alumétrica expone 5 modelos visuales.

### BLOQUEADO

- S-28 3H, S-38 RPT, L-4800 4H — documentado en merge.

---

## Recomendaciones informativas (sin implementar)

1. **Materializar fixtures:** `seedAlumetricaHaciendoVentanasRecipes({ organizationId: N })` en org piloto.
2. **Variantes L20:** ampliar solo con despieces Haciendo adicionales por tipología; no inventar desde galería Alumétrica sola.
3. **Mobile:** cablear `FabricacionVariantTree` o mensaje «N variantes documentadas, 1 con despiece verificado».
4. **Fix pill testing:** cambiar label a «En prueba» en `getFabricacionVisualStatus`.
5. **Smoke E2E:** configurar `PLAYWRIGHT_E2E_EMAIL/PASSWORD` para repetir Fase 2 en CI.

---

## Anexo — comandos reproducibles

```bash
pnpm run build
pnpm exec tsc --noEmit
pnpm test -- src/features/fabricacion/__tests__/alumetrica-haciendoventanas-integration.test.ts --runInBand
pnpm test -- src/features/fabricacion/__tests__/fabricacion-line-variant.service.test.ts --runInBand
# Browser (requiere credenciales):
# PLAYWRIGHT_E2E_EMAIL=... PLAYWRIGHT_E2E_PASSWORD=... npx playwright test
```

---

## Referencias

- Merge report: [`2026-09-19-merge-alumetrica-haciendoventanas.md`](2026-09-19-merge-alumetrica-haciendoventanas.md)
- Alumétrica: [`alumetrica/2026-09-19-matriz-lineas.md`](alumetrica/2026-09-19-matriz-lineas.md)
- Haciendo: [`haciendoventanas/2026-09-19-despieces-observados.md`](haciendoventanas/2026-09-19-despieces-observados.md)
