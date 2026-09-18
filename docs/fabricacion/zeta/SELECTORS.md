# Selectores — Sistema Zeta

Documentación viva para **Cursor Browser** (principal) y **Playwright** (fallback en `live-flow.ts`).

No usar coordenadas fijas. Prioridad: `#id` estable → `role` + texto → relación label/input → clases Vue.

Patrón obligatorio: **state → interact → state** (snapshot → click/fill → snapshot).

## Navegación

| Paso | Selector | Notas |
|---|---|---|
| Ir a proyectos | URL `/zeta/proyectos`, `/zeta/projects`, `/proyectos` | Primera URL que muestre texto “proyecto” |
| Fallback nav | `getByRole('link', { name: /proyectos/i })` | Si las URLs directas fallan |

## Proyecto nuevo

| Paso | Selector | Notas |
|---|---|---|
| Crear | `button` / `link` con `/nuevo proyecto/i`, `/crear proyecto/i`, `/^nuevo$/i` | Nunca reutilizar proyecto existente |
| Nombre | `input[name*='nombre' i]`, `input[placeholder*='nombre' i]` | Valor `VENTORA-EXTRACT-{timestamp}-a{attempt}` |
| Confirmar | `/guardar/i`, `/crear/i`, `/aceptar/i`, `/continuar/i` | |
| Abrir proyecto | Card/link con texto del nombre del proyecto | Lista `/zeta/proyectos` |
| Wizard paso 1 | Subtítulo `/Escribe el nombre de tu proyecto/i` → `placeholder="Nombre del Proyecto"` + `placeholder="Dirección"` → **Continuar** | Mismo título “Datos del proyecto”; distinguir por subtítulo |
| Wizard paso 2 | Subtítulo `/Selecciona a tu cliente/i` → click `table tbody tr` (env `ZETA_CLIENT_CONTACT` o primera fila) → **Continuar** | Modal **Datos del cliente**; filas `dm-tabla-clientes__row` |
| Wizard paso 3 | Subtítulo `/Selecciona la categoria/i` → dropdowns Categoría, Línea, Herrajes, Color, Cristal → **Finalizar** | Segundo modal “Datos del proyecto”; herraje = primera opción si no hay hint |
| Alerta | `/Completa el nombre del cliente/i` → botón **OK** | Si se intenta Crear ventana sin completar wizard |
| Crear ventana | `/crear ventana/i` en toolbar Diseñador | Tras wizard paso 3 |
| projectId | Query `idProject=` o `projectId=` en URL | Guardado en metadata |

## Marco único

| Paso | Selector | Notas |
|---|---|---|
| Detectar marco previo | texto `/marco\s*\d/i` | Si existe → error (proyecto no vacío) |
| Agregar marco | `/nuevo marco/i`, `/agregar marco/i`, `/nuevo componente/i` | Exactamente uno |

## Configuración

| Campo | Selector | Notas |
|---|---|---|
| Tipología | label `/tipolog[ií]a|modelo|tipo de ventana/i` → `[role='combobox']` / `.v-select` | Opcional según línea |
| Línea | label `/l[ií]nea|producto|serie|sistema/i` + opción texto exacto | Debe coincidir `L-25 DVH PIERNA ABIERTA` |
| Hojas | `button`/`text` `\b2H\b` o dropdown `/hojas/i` | |
| Ancho | label `\bancho\b` → `following::input[1]` | mm |
| Alto | label `\balto\b|\baltura\b` → input | mm |
| Color | dropdown `/color/i` | `BLANCO` |
| Vidrio | dropdown `/vidrio|cristal|termopanel/i` | `TE4104` |

## Esperas de estado

- Ocultar `.v-progress-linear`, `.v-progress-circular`, `[aria-busy='true']`, overlay “Preparando proyecto…”
- Texto visible: línea, `{n}H`, ancho, alto, vidrio
- Errores bloqueantes: `/No se ha encontrado el producto/`, `/No se ha encontrado la l[ií]nea/`

## Plan de armado

| Paso | Selector | Notas |
|---|---|---|
| Abrir plan | `/plan de armado/i`, `/continuar/i`, `/generar/i`, `/reporte/i` | Puede navegar a `/zeta/reporteV2` |
| Plan listo | `#btn-descargar`, `.btn-descargar`, `button:has-text('Descargar')` | Evidencia documental previa |
| planId | regex `\bPA-\d+\b` en body | |
| Tabla perfiles | `table tr` → `th,td` | Parser principal en ingest |

## Checkpoints (raw)

- `checkpoint-project-created.png`
- `checkpoint-line-selected.png`
- `checkpoint-geometry-configured.png`
- `checkpoint-plan-visible.png`
- `screenshot.png` (Plan final)
