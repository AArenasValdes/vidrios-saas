# Agent Map - Indice Maestro del Proyecto

## Proposito

Esta documentacion sirve como **indice maestro** para que cualquier agente de codigo pueda entender rapidamente donde esta cada funcionalidad, que archivos tocar, y cuales evitar. El objetivo es **reducir gasto de tokens** evitando busquedas innecesarias en el proyecto.

## Regla principal

**Antes de modificar codigo, leer el archivo correspondiente en `docs/agent-map/`.**

Si la tarea es sobre cotizaciones, leer `FEATURES_MAP.md` seccion Cotizaciones antes de explorar el proyecto. Si es sobre una ruta especifica, leer `ROUTES_MAP.md`. Si es sobre base de datos, leer `DATA_MODEL_MAP.md`.

Si la tarea toca desktop comercial, cotizaciones, dashboard, configuracion visual o catalogos, leer primero `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md`.

Si la tarea toca dashboard Fase 5 o su contrato de datos, leer tambien `docs/design/FASE_5_DASHBOARD_BRIEF.md` (ya implementado en desktop; no reabrir CRM/seguimiento).

## Orden recomendado de lectura

1. **`../VENTORA_DESKTOP_TALLER_ROADMAP.md`** - Documento rector de desktop taller y orden de milestones
2. **`PROJECT_OVERVIEW.md`** - Stack, arquitectura, convenciones, estructura de carpetas
3. **`ROUTES_MAP.md`** - Todas las rutas con archivos, propositos y riesgos
4. **`FEATURES_MAP.md`** - Organizacion por funcionalidad con archivos criticos
5. **`DATA_MODEL_MAP.md`** - Tablas Supabase, relaciones, campos importantes
6. **`COMPONENTS_MAP.md`** - Componentes reutilizables y donde se usan
7. **`AGENT_TASK_GUIDE.md`** - Guia practica por tipo de tarea
8. **`TOKEN_SAVING_RULES.md`** - Reglas para ahorrar tokens
9. **`CHANGELOG_AGENT_MAP.md`** - Historial de cambios en esta documentacion
10. **`ACTIVATION_ONBOARDING.md`** - Flujo `/activacion` (onboarding primera cotizacion, separado del dashboard)
11. **`../design/FASE_5_DASHBOARD_BRIEF.md`** - Brief + prompt de diseño dashboard Fase 5
12. **`CUBICACION_PAUTA_HANDOFF.md`** - Handoff completo cubicación / pauta / partidas V1 (pegar a otra IA)
13. **`CONSTRUCTOR_DESKTOP_HANDOFF.md`** - Estado operativo completo del Constructor-cuaderno, renderer y PDF (leer antes de continuar esta superficie)

## Foco actual

- Desktop taller, no CRM generico.
- **Fase actual = Fase 4 — Cubicación y pauta revisable V1**. Fase 5 + diseño desktop quedó cerrada para demo. También cerradas: Fase 1, 2A, **2B** (2026-07-17). Constructor V2/cuaderno es usable y sigue en pulido controlado; handoff: `CONSTRUCTOR_DESKTOP_HANDOFF.md`.
- **Decisión Camino 2 (2026-07-19):** no ampliar tipologías en el selector de partida. Catálogo = precio; partida V1 = solo 3 patrones de estimación; tipologías complejas = constructor. Handoff completo: `CUBICACION_PAUTA_HANDOFF.md`.
- Cortes Fase 4 ya implementados (2026-07-18): sistemas/estados/roles; snapshot `[cub:]`; edicion manual; Guardar ajuste; pauta consolidada; **calibracion V1** (descuentos + ejemplo real en ficha de linea).
- Alcance Fase 4 V1: cubicar sin precios, reglas en `catalog_metadata`, pauta revisable, snapshot, ajuste a linea, consolidado, calibracion por sistema/ejemplo.
- Siguiente corte seguro: validar calibracion con ejemplos reales de un piloto; presets por proveedor solo si hace falta.
- Fuera de Fase 4 V1: precios/costos/margen, optimización de pérdida, nesting, CAD, inventario, fabricación automática y promesas de manual técnico universal.
- No reinventar 2B ni Quote Studio sin bug concreto. CRM/Kanban fuera.

## Advertencia critica

- **No buscar todo el proyecto** si la tarea pertenece a un modulo ya mapeado.
- **No leer archivos completos** si solo necesitas saber donde esta algo. Usar el mapa primero.
- **No explorar carpetas enteras** si ya existe una seccion para esa feature.
- **Los archivos en `src/hooks/`, `src/services/`, `src/repositories/`, `src/types/` son solo re-exports** legacy. La fuente real esta en `src/features/<feature>/`.
- **No tocar tablas legacy** (`materials`, `product_types`, `system_lines`, etc.) sin instruccion explicita.

## Como mantener actualizado este mapa

- Al agregar una ruta nueva: actualizar `ROUTES_MAP.md` y `FEATURES_MAP.md`
- Al mover un archivo: actualizar todos los mapas donde aparezca
- Al cambiar una tabla o query: actualizar `DATA_MODEL_MAP.md`
- Al crear un componente reutilizable: actualizar `COMPONENTS_MAP.md`
- Al tomar una decision tecnica relevante: registrarla en `CHANGELOG_AGENT_MAP.md`

## Ubicacion

```
docs/agent-map/
  README.md                 <- Este archivo
  ../VENTORA_DESKTOP_TALLER_ROADMAP.md <- Documento rector de desktop taller
  PROJECT_OVERVIEW.md       <- Stack, arquitectura, carpetas
  ROUTES_MAP.md             <- Mapa completo de rutas
  FEATURES_MAP.md           <- Organizacion por feature
  DATA_MODEL_MAP.md         <- Tablas, relaciones, campos
  COMPONENTS_MAP.md         <- Componentes reutilizables
  AGENT_TASK_GUIDE.md       <- Guia practica por tarea
  CONSTRUCTOR_DESKTOP_HANDOFF.md <- Handoff Constructor desktop / SVG / PDF
  CUBICACION_PAUTA_HANDOFF.md <- Handoff cubicación/pauta (para otras IAs)
  TOKEN_SAVING_RULES.md     <- Reglas para ahorrar tokens
  CHANGELOG_AGENT_MAP.md    <- Historial de cambios
  ACTIVATION_ONBOARDING.md  <- Onboarding /activacion (primera cotizacion)
```
