# Handoff - Constructor desktop / cuaderno de componentes

Ultima consolidacion: 2026-07-20.

## Proposito

Este documento es la fuente operativa para continuar el modo **Constructor** de `/cotizaciones/nueva` con otro agente sin volver a derivar decisiones, arquitectura, archivos ni estado de QA.

Antes de editar, leer en este orden:

1. `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md`
2. `Agents.md`
3. este documento
4. `docs/agent-map/FEATURES_MAP.md` - Cotizaciones y PDF
5. `docs/agent-map/COMPONENTS_MAP.md` - `GuidedVisualComposer` y `QuoteConstructorWorkspace`
6. los archivos indicados en **Mapa de codigo**

## Estado ejecutivo

- El Paso 2 desktop ofrece dos modos equivalentes sobre el mismo `draft.items`: **Cotización rápida** (cuaderno) y **Cotización guiada** (wizard 5 pasos).
- Nombres anteriores (`Presupuesto` / `Constructor`) quedaron reemplazados; la preferencia de modo se guarda en `localStorage` (`ventora:quote-desktop-workspace-mode`), default **Cotización rápida**.
- Cotización rápida ahora se monta dentro del shell Quote Studio: header y tabs compartidos, cuaderno al centro y el mismo panel financiero/resumen. El panel usa scroll natural: no queda fijo mientras avanzan las piezas. Entre 1024 y 1439 px queda bajo el cuaderno; desde 1440 px se ubica a la derecha. Entre 1024 y 1279 px el inspector baja bajo el tablero para no comprimir las tarjetas.
- La cabecera del cuaderno ofrece una línea base opcional: se usa para nuevas piezas y puede aplicarse explícitamente a las piezas ya creadas. No es otro modo ni cambia PDF, WhatsApp, schema o persistencia formal; cada ítem conserva su propia línea al guardar.
- Contrato de dominio compartido: `src/features/cotizaciones/new-quote/quote-piece-domain.ts` (estado comercial, estado técnico, resumen técnico). No hay segundo draft ni sincronización artificial.
- Cotización rápida muestra resumen técnico por tarjeta, badges duales y cubicación/despiece en el inspector (mismo `PautaCubicacionPanel` / snapshot `[cub:]`).
- Cotización guiada desktop `por_item`: Tipo → Sistema → Medidas → Despiece → Precio. Mobile intacto.
- Persistencia formal sigue en `cotizacion_item_visual_configs`; `[gvc:]` sigue como bridge/fallback.
- Mobile conserva el flujo previo y no monta el workspace de Cotización rápida.

## Cambios implementados

### 1. Constructor-cuaderno con varias piezas

`QuoteConstructorWorkspace` recibe estado controlado:

- `items`
- `quotePricingMode`
- `activeItemId`
- lineas y vidrios disponibles
- total global
- callbacks de agregar, seleccionar, actualizar, duplicar, eliminar, mover, recalcular, abrir edicion avanzada e ir al resumen

Las piezas existentes compatibles aparecen automaticamente. Se consideran compatibles:

- piezas con `guidedVisualConfig` persistida;
- `Ventana`;
- `Puerta`;
- `Trabajo personalizado`;
- nunca `item_libre_con_valor`.

Los elementos no visuales permanecen disponibles en Presupuesto y el Constructor muestra una nota con su cantidad.

### 2. Estacion desktop profesional

La distribucion actual tiene:

- encabezado compacto con `X de Y completas`;
- accion secundaria `Revisar pendientes`;
- barra sticky de presets;
- tablero cuadriculado claro;
- tarjetas responsive: una columna en 1024/1280, dos en 1440 y tres en 1920;
- inspector de 390px (380px cerca de 1024);
- footer sticky con progreso y CTA;
- un unico scroll vertical principal activado por `data-constructor-workspace="true"`.

La tarjeta contiene solo:

- codigo;
- nombre;
- estado concreto;
- croquis SVG;
- ancho, alto y cantidad;
- menu contextual para mover, duplicar y eliminar.

Estados actuales:

- `Falta nombre`
- `Faltan medidas`
- `Falta cantidad`
- `Falta precio` en `por_item`
- `Completa`

### 3. Inspector y color

El inspector esta agrupado en:

1. Identificacion
2. Sistema y material
3. Vidrio y color
4. Apertura y composicion
5. Precio

La barra de colores usa `COLOR_OPTIONS` de `workflow-ui.ts`. Mantener esa unica fuente; no duplicar listas de color dentro del Constructor.

El sentido de apertura actualiza `openingSide` del modulo seleccionado o, si no hay seleccion valida, del primer modulo.

`Abrir configuracion completa` vuelve temporalmente a Presupuesto y usa el editor existente. `Editar composicion` abre `GuidedVisualComposer` sobre la pieza activa.

### 4. Pricing y sincronizacion

`handleUpdateConstructorItem()` convierte item -> `ComponentFormState`, aplica el patch y vuelve a construir el item con `buildItemFromForm()`.

Comportamiento vigente:

- cambio de linea usa `applyLineTemplateToComponentForm()`;
- cambio de material ajusta categoria y color compatible;
- medida/cantidad invalida el snapshot de cubicacion;
- precio manual marca `precioAjustadoManual`, `origenPrecio: manual` y `precio_directo`;
- el override manual se conserva;
- `Recalcular con plantilla` reutiliza el callback existente;
- `total_global` edita el total del presupuesto y no exige precio por pieza;
- `por_item` bloquea revision si falta precio unitario.

El draft continua persistiendo por el mecanismo existente de `sessionStorage`. Cambiar pieza o alternar Presupuesto/Constructor no crea otro draft.

### 5. Schema visual V2

Cambios aditivos ya incorporados:

- `GuidedModuleType` incluye `oscilobatiente`;
- los modulos incluyen `openingSide?: "left" | "right"`;
- normalizacion legacy usa `left`;
- `schemaVersion` sigue en V2;
- configs V1/legacy se migran/normalizan al leer;
- limite interno de una composicion: seis modulos hoja;
- cantidad de piezas de la cotizacion: sin ese limite compartido.

No convertir esto en CAD, editor de nodos libres ni motor tecnico de fabricacion.

### 6. Renderer SVG

El renderer compartido incorpora:

- perfiles exteriores e interiores en capas;
- marcos de hojas diferenciados;
- encuentros centrales mas robustos;
- uniones visuales ingleteadas;
- vidrio tintado/gradiente segun variante;
- simbolos de corredera, abatible, oscilobatiente, proyectante y puerta;
- sentido de apertura izquierda/derecha;
- palillos y formas controladas;
- cotas horizontales y verticales;
- ids SVG aislados por `resourceKey` para evitar colisiones entre miniaturas.

La salida sigue siendo comercial/referencial. No promete perfiles calibrados, CAD ni manual tecnico.

### 7. Croquis en PDF y documentos publicos

Ultimo ajuste visual (2026-07-20):

- canvas de croquis PDF: `470 x 260`;
- contenedor visual: hasta 248px (256px en variante espaciosa);
- ocupacion del canvas PDF aumentada a `0.88`;
- banda inferior reservada para cotas: 40px;
- ancho/alto quedan mas separados del aluminio;
- textos de cota llevan halo claro con `paint-order="stroke fill"`;
- el renderer legacy recibe tambien mas separacion y halo;
- preview, visor, export y documento publico usan el mismo alto.

Resultado visual comprobado con una ventana de dos modulos y una puerta: el croquis crecio cerca de 30% sin cambiar proporcion ni recortarse.

## Mapa de codigo

### Workspace

- `src/features/cotizaciones/visual-composer/components/quote-constructor-workspace.tsx`
- `src/features/cotizaciones/visual-composer/components/quote-constructor-workspace.module.css`
- `src/features/cotizaciones/visual-composer/components/__tests__/quote-constructor-workspace.test.tsx`
- `src/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service.ts`
- `src/features/cotizaciones/visual-composer/services/__tests__/quote-constructor-workspace.service.test.ts`

### Integracion en Paso 2

- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-seccion.tsx`
- `app/(pwa-app)/cotizaciones/nueva/page.tsx`
- `app/(pwa-app)/cotizaciones/nueva/page.module.css`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-panel-desktop.module.css`

Funciones principales en `page.tsx`:

- `handleAddConstructorPreset()`
- `handleUpdateConstructorItem()`
- `handleMoveConstructorItem()`
- callbacks existentes de duplicar/eliminar/recalcular/editar

### Modelo, editor y renderer

- `src/features/cotizaciones/visual-composer/types/guided-visual-config.ts`
- `src/features/cotizaciones/visual-composer/components/guided-visual-composer.tsx`
- `src/features/cotizaciones/visual-composer/components/guided-visual-composer.module.css`
- `src/features/cotizaciones/visual-composer/services/guided-visual-renderer.service.ts`
- `src/features/cotizaciones/visual-composer/services/guided-visual-shape-paths.ts`
- `src/features/cotizaciones/visual-composer/services/resolve-item-drawing-svg.ts`
- `src/utils/window-drawings.ts` - fallback legacy; no reemplazar a ciegas

### Persistencia

- `src/features/cotizaciones/visual-composer/repositories/cotizacion-item-visual-configs.repository.ts`
- `src/features/cotizaciones/visual-composer/services/cotizacion-item-visual-configs.service.ts`
- `src/utils/cotizacion-item-presentation.ts` - bridge `[gvc:]`
- tabla existente `cotizacion_item_visual_configs`

Toda persistencia formal debe seguir filtrando `organization_id` y respetando soft delete.

### PDF / publico

- `app/print/cotizaciones/[id]/page.tsx`
- `app/print/cotizaciones/[id]/page.module.css`
- `app/presupuesto/[token]/public-quote-preview.tsx`
- `app/presupuesto/[token]/documento/public-quote-document.tsx`
- `src/utils/cotizacion-pdf.ts`

## Evidencia y validacion actual

### Constructor workspace

- Jest de componente: 5/5 paso antes del ultimo ajuste PDF.
- TypeScript: `npx tsc --noEmit --pretty false --incremental false` pasa.
- ESLint focalizado del workspace pasa.
- `npm run build` pasa.
- QA de navegador en build limpio:
  - 1024: inspector 380px, una columna;
  - 1280: inspector 390px, una columna;
  - 1440: dos columnas;
  - 1920: tres columnas;
  - sin overflow horizontal;
  - un solo contenedor de scroll vertical;
  - color Negro actualiza `#2a2a2a` y `aria-pressed`;
  - menu de acciones accesible;
  - consola sin errores;
  - 390 y 430: Constructor no se monta y no aparece el selector desktop.

Captura:

- `C:/Users/aless/.codex/visualizations/2026/07/20/019f7d44-958c-7f30-9144-8182163db299/constructor-profesional-colores-final-1440x900.png`

### PDF / renderer

- TypeScript pasa.
- Build de produccion pasa.
- ESLint focalizado de renderer, resolver, servicio, tests y documentos publicos pasa.
- `app/print/cotizaciones/[id]/page.tsx` conserva deuda preexistente de React Compiler (`preserve-manual-memoization`) y un warning de simbolo sin uso; no fue causada por el cambio del croquis.
- QA en `next start`, cotizacion real `/print/cotizaciones/598`:
  - ventana y puerta mas grandes;
  - cotas despejadas;
  - dos paginas sin recortes;
  - capa de exportacion generada;
  - consola sin errores.
- El boton Descargar PDF fue invocado, pero no se obtuvo un archivo local accesible para rasterizar con Poppler en esta sesion. La verificacion fue sobre visor y capa HTML de exportacion.

Capturas:

- `C:/Users/aless/.codex/visualizations/2026/07/20/019f7d44-958c-7f30-9144-8182163db299/pdf-componentes-grandes-cotas-separadas.png`
- `C:/Users/aless/.codex/visualizations/2026/07/20/019f7d44-958c-7f30-9144-8182163db299/pdf-puerta-grande-cotas-separadas.png`

### Bloqueos globales conocidos

- Los tests focalizados de renderer/legacy agregados en el ultimo ajuste no alcanzan a ejecutarse por el bloqueo global de Jest:
  - `TypeError: this._moduleMocker.clearMocksOnScope is not a function`
- `npm run lint` global mantiene deuda React Compiler en rutas ajenas y en callbacks preexistentes del visor PDF.
- No atribuir estos bloqueos al Constructor sin evidencia nueva.

## Brechas conocidas y siguientes cortes seguros

### Prioridad 1 - validacion local de campos invalidos — CERRADA (2026-07-21)

Cerrada con estado local `fieldDraftsByItemId` en `QuoteConstructorWorkspace`:

- ancho/alto inválidos (< 200 mm) y cantidad inválida (< 1) quedan visibles con mensaje;
- no se llama `onUpdateItem` ni se corrompe `draft.items`;
- tarjeta, inspector y footer pasan a pendiente (`Faltan medidas`); CTA usa `Revisar pendientes`;
- al cambiar de pieza se conserva el draft/error local;
- al corregir se sincroniza item + `GuidedVisualConfig` (medidas) y vuelve a Completa si el resto está OK.

Siguiente corte seguro: Prioridad 2.

### Prioridad 2 - PDF real rasterizado

Obtener el PDF descargado desde el flujo productivo, renderizar paginas con Poppler y comparar contra las capturas de visor. Revisar especialmente:

- cotas de piezas muy anchas y muy altas;
- dos tarjetas por pagina;
- texto/halo en html2canvas;
- documento publico y modo `total_global`.

### Prioridad 3 - QA de persistencia y regresion

Completar cuando Jest global este reparado:

- V1/V2 y `openingSide`;
- SVG de las doce tipologias del selector rapido;
- sincronizacion de medidas;
- precio plantilla vs override manual;
- agregar tres piezas, seleccionar, editar, duplicar, mover y eliminar;
- sessionStorage y edicion de cotizacion existente;
- hydrate formal, PDF, publico y WhatsApp.

### Selector visual vigente en Cotizacion rapida

- Barra principal: Fijo, Corredera, Abatible, Proyectante, Puerta y Composicion.
- `Puerta`: acceso rapido a Puerta abatible y Puerta corredera.
- `Mas tipologias`: Oscilobatiente, Guillotina, Celosia, Puerta corredera, Shower frontal y Shower corredera.
- `Composicion personalizada` reemplaza conceptualmente a `Pano libre`; mantiene el mismo tipo persistido `pano_libre`.
- Todas las miniaturas y el croquis principal usan `guided-visual-renderer.service.ts`; no hay SVG alterno en el selector.
- Los targets `sistema`, `vidrio` y `apertura` del croquis abren la seccion correspondiente del inspector cuando aplica.
- Las animaciones son solo hover/focus visual y respetan `prefers-reduced-motion`; no cambian estado ni geometria persistida.

### Pulido posterior, solo con pedido concreto

- compactar el inspector si su altura vuelve incomodo el sticky;
- revisar escala del croquis en tarjetas del cuaderno por breakpoint;
- seguir mejorando perfiles/simbolos desde el renderer compartido, nunca con un SVG paralelo solo para PDF.

## Guardrails

- Desktop Constructor solamente `>=1024px`.
- Mobile 390/430 intacto.
- No cambiar selector de partidas de cubicacion.
- No crear tabla ni migracion nueva para este trabajo.
- No duplicar persistencia ni estado comercial.
- No tocar precios, IVA, snapshots financieros, WhatsApp o aprobacion publica salvo bug reproducido y alcance explicito.
- No agregar costos tecnicos, inventario, compras, nesting, listas de corte ni fabricacion automatica.
- Mantener el dibujo como referencia comercial, no CAD calibrado.
- Preservar el limite de seis modulos dentro de una composicion.
- Preservar todos los cambios locales: el worktree contiene modificaciones de otras fases/agentes. Nunca usar `git reset --hard` ni restaurar archivos completos.

## Comandos recomendados

```powershell
npx tsc --noEmit --pretty false --incremental false
npx eslint "src/features/cotizaciones/visual-composer/**/*.{ts,tsx}" "app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-seccion.tsx"
npx jest src/features/cotizaciones/visual-composer --runInBand
npm run build
npm run start
```

Si Jest vuelve a fallar antes de ejecutar tests con `clearMocksOnScope`, registrarlo como bloqueo global y continuar con typecheck, build y QA manual proporcional.

## Punto exacto para el proximo agente

Validar en `next start` (desktop 1024/1280/1440/1920 + mobile 390/430):

1. Alternar Cotización rápida ↔ guiada sin duplicar piezas ni perder `[cub:]` / `[gvc:]`.
2. Crear en rápida → abrir configuración guiada → editar despiece → volver al cuaderno.
3. Flujo guiado 5 pasos (Tipo → Sistema → Medidas → Despiece → Precio).
4. PDF real rasterizado (Prioridad 2 histórica) si no se cerró aún.

No redisenar el cuaderno ni el renderer sin bug concreto.
