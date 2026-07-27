# Agent Map - Indice Maestro del Proyecto

## Proposito

Esta documentacion sirve como **indice maestro** para que cualquier agente de codigo pueda entender rapidamente donde esta cada funcionalidad, que archivos tocar, y cuales evitar. El objetivo es **reducir gasto de tokens** evitando busquedas innecesarias en el proyecto.

## Regla principal

**Antes de modificar codigo, leer el archivo correspondiente en `docs/agent-map/`.**

Si la tarea es sobre cotizaciones, leer `FEATURES_MAP.md` seccion Cotizaciones antes de explorar el proyecto. Si es sobre una ruta especifica, leer `ROUTES_MAP.md`. Si es sobre base de datos, leer `DATA_MODEL_MAP.md`.

Si la tarea toca desktop comercial, cotizaciones, dashboard, configuracion visual o catalogos, leer primero `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md`.

Si la tarea toca el giro de producto jul 2026 (recetas, plantillas, posicionamiento), leer `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`.

Si la tarea toca dashboard Fase 5 o su contrato de datos, leer tambien `docs/design/FASE_5_DASHBOARD_BRIEF.md` (ya implementado en desktop; no reabrir CRM/seguimiento).

## Orden recomendado de lectura

1. **`../VENTORA_DESKTOP_TALLER_ROADMAP.md`** - Documento rector de desktop taller y orden de milestones
2. **`../VENTORA_GIRO_PRODUCTO_2026-07.md`** - Giro de producto: capas, V1 vendible, go-to-market
3. **`PROJECT_OVERVIEW.md`** - Stack, arquitectura, convenciones, estructura de carpetas
4. **`ROUTES_MAP.md`** - Todas las rutas con archivos, propositos y riesgos
5. **`FEATURES_MAP.md`** - Organizacion por funcionalidad con archivos criticos
6. **`DATA_MODEL_MAP.md`** - Tablas Supabase, relaciones, campos importantes
7. **`COMPONENTS_MAP.md`** - Componentes reutilizables y donde se usan
8. **`AGENT_TASK_GUIDE.md`** - Guia practica por tipo de tarea
9. **`TOKEN_SAVING_RULES.md`** - Reglas para ahorrar tokens
10. **`CHANGELOG_AGENT_MAP.md`** - Historial de cambios en esta documentacion
11. **`ACTIVATION_ONBOARDING.md`** - Flujo `/activacion` (onboarding primera cotizacion, separado del dashboard)
12. **`../design/FASE_5_DASHBOARD_BRIEF.md`** - Brief + prompt de diseño dashboard Fase 5
13. **`CUBICACION_PAUTA_HANDOFF.md`** - Handoff completo cubicación / pauta (pegar a otra IA)
14. **`CONSTRUCTOR_DESKTOP_HANDOFF.md`** - Estado operativo completo del Constructor-cuaderno, renderer y PDF
15. **`../manuales/MANUAL_LINEAS_CUBICACION_PAUTA.md`** - Manual corto para taller

## Foco actual

- Desktop taller, no CRM generico.
- Paso 2 mobile (2026-07-27): `por_item` ofrece **Guiada | Constructor** sobre el mismo `draft.items`; el Constructor mobile vive en `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/` y no reutiliza el workspace desktop.
- **Fase actual = Fase 4 — Cubicación V1 vendible multi-tipología** (2026-07-24). Pack `fabricationRecipePack` + espejo `fabricationRecipe`; plantillas L5000/L20/L25 iniciales sugeridas; bases tipológicas pendientes; filtro por tipología en cotizar; print `/print/cotizaciones/[id]/fabricacion`. Giro: `../VENTORA_GIRO_PRODUCTO_2026-07.md`. Handoff: `CUBICACION_PAUTA_HANDOFF.md`.
- Camino 2 (3 partidas Marco/Hoja) = solo migración.
- Fuera de alcance: optimizador real, nesting, CAD, inventario, fabricación automática, marketing de “más comunes” antes de validación piloto.
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
docs/
  VENTORA_DESKTOP_TALLER_ROADMAP.md <- Documento rector de desktop taller
  VENTORA_GIRO_PRODUCTO_2026-07.md  <- Giro de producto jul 2026
  manuales/MANUAL_LINEAS_CUBICACION_PAUTA.md
  agent-map/
    README.md                 <- Este archivo
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
