# Agent Map - Indice Maestro del Proyecto

## Proposito

Esta documentacion sirve como **indice maestro** para que cualquier agente de codigo pueda entender rapidamente donde esta cada funcionalidad, que archivos tocar, y cuales evitar. El objetivo es **reducir gasto de tokens** evitando busquedas innecesarias en el proyecto.

## Regla principal

**Antes de modificar codigo, leer el archivo correspondiente en `docs/agent-map/`.**

Si la tarea es sobre cotizaciones, leer `FEATURES_MAP.md` seccion Cotizaciones antes de explorar el proyecto. Si es sobre una ruta especifica, leer `ROUTES_MAP.md`. Si es sobre base de datos, leer `DATA_MODEL_MAP.md`.

## Orden recomendado de lectura

1. **`PROJECT_OVERVIEW.md`** - Stack, arquitectura, convenciones, estructura de carpetas
2. **`ROUTES_MAP.md`** - Todas las rutas con archivos, propositos y riesgos
3. **`FEATURES_MAP.md`** - Organizacion por funcionalidad con archivos criticos
4. **`DATA_MODEL_MAP.md`** - Tablas Supabase, relaciones, campos importantes
5. **`COMPONENTS_MAP.md`** - Componentes reutilizables y donde se usan
6. **`AGENT_TASK_GUIDE.md`** - Guia practica por tipo de tarea
7. **`TOKEN_SAVING_RULES.md`** - Reglas para ahorrar tokens
8. **`CHANGELOG_AGENT_MAP.md`** - Historial de cambios en esta documentacion
9. **`ACTIVATION_ONBOARDING.md`** - Flujo `/activacion` (onboarding primera cotizacion, separado del dashboard)

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
  PROJECT_OVERVIEW.md       <- Stack, arquitectura, carpetas
  ROUTES_MAP.md             <- Mapa completo de rutas
  FEATURES_MAP.md           <- Organizacion por feature
  DATA_MODEL_MAP.md         <- Tablas, relaciones, campos
  COMPONENTS_MAP.md         <- Componentes reutilizables
  AGENT_TASK_GUIDE.md       <- Guia practica por tarea
  TOKEN_SAVING_RULES.md     <- Reglas para ahorrar tokens
  CHANGELOG_AGENT_MAP.md    <- Historial de cambios
  ACTIVATION_ONBOARDING.md  <- Onboarding /activacion (primera cotizacion)
```
