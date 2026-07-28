# Handoff - Flujo movil de cotizacion por items / Constructor

Ultima consolidacion: 2026-07-27.

## Proposito

Este documento explica el flujo movil nuevo de `/cotizaciones/nueva` para que otro ChatGPT o agente pueda entenderlo sin redescubrir decisiones de producto, pantallas, nombres, estado, persistencia ni riesgos.

Antes de editar, leer en este orden:

1. `docs/agent-map/README.md`
2. `docs/agent-map/FEATURES_MAP.md` - seccion Cotizaciones
3. este documento
4. archivos indicados en **Mapa de codigo**

## Idea central

En movil, el usuario cotiza principalmente **por items**. Esa es la modalidad guiada principal y debe sentirse como el camino natural. Dentro de esa modalidad existen dos superficies:

- **Guiada**: wizard tradicional para agregar componentes paso a paso.
- **Constructor**: lista visual rapida de piezas, pensada para cargar varias ventanas/puertas con menos pasos.

Ambas superficies trabajan sobre el mismo `draft.items`. No existe un segundo borrador, no hay persistencia paralela y no se debe duplicar logica de guardado.

El antiguo nombre visible **Cuaderno** ya no debe usarse como concepto principal para el usuario final. En codigo quedan nombres internos heredados como `mobile-cuaderno`, pero en UI la palabra correcta es **Constructor** o **Constructor de piezas**.

## Entrada del Paso 2 movil

Ruta: `/cotizaciones/nueva`.

El Paso 2 movil primero decide la modalidad comercial de la cotizacion:

- `por_item`: cotizar cada componente con precio propio.
- `total_global`: cuadernillo / trabajo con total manual global.

Reglas actuales:

- Al elegir `por_item`, el flujo aterriza en la lista de componentes con **Guiada** como superficie base.
- El usuario no deberia sentir que esta eligiendo un modo tecnico extra para poder cotizar; `por_item` es la forma guiada principal.
- El toggle **Guiada | Constructor** solo debe aparecer cuando ayuda a cambiar la superficie de trabajo.
- Si el usuario avanza dentro del wizard a pasos posteriores, el toggle no debe seguir ocupando espacio.
- Si el usuario vuelve al paso de tipo/lista, el toggle puede volver a verse.
- `Cambiar modalidad` debe volver al selector comercial inicial, no a una pantalla intermedia confusa.

## Flujo Guiada

La superficie Guiada es el wizard movil existente:

1. Tipo
2. Cantidad
3. Datos / configuracion

Comportamiento esperado:

- Es el camino por defecto para `por_item`.
- Mantiene el formulario conocido para usuarios que quieren ir paso a paso.
- Desde la lista o encabezado puede abrir el Constructor si la cuenta esta en `por_item`.
- No debe mostrar panel financiero desktop, costos internos, margen, merma ni Quote Studio en movil.
- Item libre mantiene su flujo simplificado y no entra a quick edit visual.

## Flujo Constructor movil

El Constructor movil vive en:

`app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/`

Objetivo UX:

- Cargar piezas rapido desde el celular.
- El componente es el protagonista.
- Evitar pantallas cargadas, bloques redundantes y scroll excesivo.
- Dar acceso a detalle solo cuando el usuario lo toca.

Pantalla principal:

- Header compacto con tabs **Guiada | Constructor**.
- Titulo **Constructor de piezas**.
- Boton principal **Agregar pieza**.
- Barra compacta **Linea para todas**.
- Lista de tarjetas de piezas.
- Footer sticky con cantidad de piezas y CTA **Continuar al resumen**.

La lista de piezas muestra:

- Mini croquis visual.
- Nombre comercial.
- Medidas.
- Cantidad.
- Linea elegida si existe.
- Estado visual, por ejemplo `Lista`, `Falta precio`, `Faltan datos`.
- Menu secundario para acciones puntuales.

## Agregar pieza

La accion principal es **Agregar pieza**.

Al tocarla se abre un bottom sheet liviano con presets visuales. No debe existir un bloque permanente grande de "pieza a agregar" arriba de la lista, porque se superpone y carga demasiado la pantalla.

Presets principales:

- Fijo
- Corredera
- Abatible
- Oscilobatiente
- Proyectante
- Puerta
- Otros presets disponibles desde el grupo "Mas tipos"
- Composicion / pano libre cuando se requiere entrar a armar algo mas manual

Al seleccionar un preset:

- Se crea un item en `draft.items`.
- Se genera o actualiza `guidedVisualConfig` con `createQuoteConstructorPresetConfig`.
- Si hay linea global elegida, esa linea se aplica a la pieza nueva.
- Para presets normales, se abre la edicion rapida de la pieza.
- Para composicion libre, puede abrirse el editor de composicion.

## Linea para todas

La linea global es una ayuda, no un modo.

Reglas:

- Solo aplica a lineas de perfil: aluminio o PVC.
- No debe mezclar lineas de cristal.
- Se usa para proximas piezas.
- Puede aplicarse explicitamente a piezas actuales con un boton de aplicar.
- No debe ocupar mucho alto permanente.

UX esperada:

- Barra compacta: `Linea para todas`, nombre de linea o `Sin linea global`, y boton `Elegir` / `Cambiar`.
- Al tocar `Elegir`, mostrar un selector superpuesto/bottom sheet con todas las lineas disponibles de perfil.
- El usuario elige una linea y luego toca aplicar/cerrar segun corresponda.
- La accion debe ser obvia: elegir linea global para el trabajo, no elegir una pieza.

## Edicion rapida de pieza

Componente:

`CuadernoQuickEditSheet`

Es un bottom sheet transaccional. Esto significa:

- Los cambios quedan en estado local mientras el sheet esta abierto.
- Nada se confirma hasta tocar **Guardar cambios**.
- Cerrar sin guardar no debe mutar la pieza.

Orden actual de la edicion:

1. Datos base
   - Nombre
   - Ancho
   - Alto
   - Cantidad
   - accesos rapidos `x1`, `x2`, `x4`, `x6`
2. Perfil
   - Material: Aluminio / PVC
   - Color visible del perfil
3. Linea y precio
   - Selector de linea filtrado por material preferido
   - Precio unitario calculado si la linea tiene plantilla/precio configurado
   - Campo editable para override manual
   - Nota corta de cubicacion/pauta: se revisa en desktop
4. Vidrio
   - Selector de tipo de vidrio
5. Forma y apertura
   - Acceso al editor de composicion visual
6. Acciones
   - Duplicar
   - Eliminar
   - Guardar cambios

Reglas importantes:

- Si el usuario elige Aluminio, el selector debe priorizar lineas de Aluminio.
- Si el usuario elige PVC, el selector debe priorizar lineas de PVC.
- Las lineas de Cristal deben poder elegirse en el selector correcto cuando corresponde vidrio/cristal, pero la linea global no debe usarlas.
- Al elegir una linea, el precio sugerido se calcula con `applyLineTemplateToComponentForm` y `buildComponentFormLinePricingSummary`.
- Si el usuario escribe manualmente el precio, se marca como precio manual.
- Cambiar material/color debe reflejarse en el preview del croquis mediante `colorHex`.
- En movil, la pauta de corte no se edita. Solo queda como dato rapido; la revision completa es desktop.

## Color del perfil

El color debe estar arriba de Linea y precio porque visualmente pertenece al perfil de la pieza.

UX esperada:

- Mostrar resumen compacto con swatch + nombre.
- Boton `Cambiar` para desplegar los colores principales.
- No mostrar todos los colores expandidos por defecto.
- Al elegir color, cerrar el panel de colores para evitar scroll largo.
- Nombres visibles bajo cada color cuando el panel esta abierto.
- Opciones dependen del material:
  - Aluminio usa `ALUMINUM_COLOR_OPTIONS`.
  - PVC usa `PVC_COLOR_OPTIONS`.

## Selector de linea en pieza

El selector de linea dentro de una pieza no debe sentirse pesado.

Reglas esperadas:

- Debe filtrar o priorizar por material elegido.
- Si material = Aluminio, mostrar lineas de aluminio como opcion natural.
- Si material = PVC, mostrar lineas de PVC como opcion natural.
- Debe permitir lineas de cristal cuando el contexto lo requiera.
- Debe mostrar precio/m2, proveedor, minimo y redondeo si existe.
- Al elegir, debe recalcular y mostrar `Precio unitario`.
- Debe evitar pasos extra tipo "elegir y despues buscar otra vez".

## Editor de composicion movil

Componente:

`CuadernoComposicionMovil`

Se abre desde **Forma y apertura**.

Objetivo:

- Armar o ajustar la composicion visual sin repetir todos los campos de precio, vidrio y color.
- No debe abrir una pantalla redundante con los mismos campos del quick edit.
- El foco es forma, modulos y apertura.

Pantalla:

- Full-screen mobile.
- Header con safe area de iPhone.
- Bloque principal de croquis.
- Herramientas **Partir lado**, **Partir alto**, **Reflejar**, **Igualar**.
- Medidas ancho/alto contenidas bajo el croquis.
- Selector de modulo `M1`, `M2`, etc.
- Tipo de modulo: fijo, corredera, abatible, proyectante, mas tipos.
- Controles de forma del vano, vidrio redondeado/palillos si aplican.
- Footer sticky **Usar esta composicion**.

Regla de `Reflejar`:

- Solo se habilita en modulos con apertura lateral.
- Tipos reflectables actuales: abatible, oscilobatiente, puerta, shower frontal.
- En piezas sin apertura lateral debe verse deshabilitado y explicar que no aplica.

## Persistencia y estado

Fuente de verdad:

- `draft.items`
- `sessionStorage` del workflow
- Persistencia formal posterior en el guardado normal de cotizacion

No crear:

- segundo draft para Constructor movil
- tabla nueva
- estado paralelo persistente
- sincronizacion artificial entre Guiada y Constructor

El Constructor usa los mismos callbacks de pagina:

- `onAddPreset`
- `onUpdateItem`
- `onApplyLineToItems`
- `onDuplicateItem`
- `onRemoveItem`
- `onGoToSummary`

Al guardar una pieza, el patch usa `QuoteConstructorItemPatch`:

- `nombre`
- `ancho`
- `alto`
- `cantidad`
- `lineTemplateId`
- `vidrio`
- `material`
- `colorHex`
- `costoProveedorUnitario`
- `markPriceManual` si aplica

## Relacion con PDF, WhatsApp y resumen

El flujo movil no cambia el contrato comercial final:

- Paso 3 resume los mismos `draft.items`.
- PDF cliente debe seguir limpio, sin pauta tecnica ni costos internos.
- WhatsApp usa el resumen comercial existente.
- La pauta/cubicacion interna se revisa en desktop y en `/print/cotizaciones/[id]/fabricacion`.
- En `total_global`, no mostrar precios `$0` por pieza en salidas comerciales.

## Mapa de codigo

Archivos principales:

- `app/(pwa-app)/cotizaciones/nueva/page.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-movil-shell.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-encabezado-movil.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-lista-movil.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/paso-dos-cuaderno-movil.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/cuaderno-quick-edit-sheet.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/cuaderno-composicion-movil.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/cuaderno-constructor-movil.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/cuaderno-piece-status.ts`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/paso-dos-cuaderno-movil.module.css`

Servicios y dominio compartido:

- `src/features/cotizaciones/new-quote/workflow-ui.ts`
- `src/features/cotizaciones/new-quote/quote-piece-domain.ts`
- `src/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service.ts`
- `src/features/cotizaciones/visual-composer/services/guided-visual-renderer.service.ts`
- `src/features/cotizaciones/visual-composer/types/guided-visual-config.ts`
- `src/features/cotizaciones/line-templates/components/line-template-picker.tsx`
- `src/features/cotizaciones/visual-composer/components/glass-option-picker.tsx`

Tests relevantes:

- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/__tests__/paso-dos-cuaderno-movil.test.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/__tests__/paso-dos-wizard-movil-shell.test.tsx`
- `src/features/cotizaciones/visual-composer/services/__tests__/quote-constructor-workspace.service.test.ts`
- `src/features/cotizaciones/new-quote/__tests__/workflow-ui-step-two.test.ts`

## Reglas de UX movil que no se deben romper

- Validar visualmente en 390 px y 430 px.
- En iPhone respetar `safe-area-inset-top` y `safe-area-inset-bottom`.
- Con teclado numerico abierto, el sheet no debe saltar agresivamente: la compensacion iOS esta limitada.
- El footer sticky no debe tapar campos activos.
- Evitar bloques permanentes grandes encima de la lista.
- Evitar duplicar controles entre quick edit y composicion.
- El usuario debe poder agregar, editar y continuar al resumen con pocos toques.
- El texto no debe superponerse ni quedar cortado.
- No usar el espacio superior para controles secundarios cuando hay muchas piezas.
- Los colores no deben estar todos desplegados por defecto.
- La linea global debe ser entendible en una barra compacta.

## Checklist de QA recomendado

1. Mobile 390 px: elegir `por_item`, confirmar que cae en Guiada/lista y que el toggle solo aparece donde corresponde.
2. Abrir Constructor, agregar Fijo, Corredera y Abatible.
3. Elegir linea global y aplicarla a piezas actuales.
4. Editar una pieza, cambiar material Aluminio/PVC y confirmar filtro/lineas/precio.
5. Cambiar color y confirmar que el croquis de tarjeta/preview refleja `colorHex`.
6. Elegir vidrio o linea de cristal cuando corresponda.
7. Abrir Forma y apertura, partir lado/alto, reflejar solo cuando aplique, guardar composicion.
8. En iPhone, tocar ancho/alto con teclado abierto y confirmar que el panel no salta demasiado.
9. Duplicar y eliminar piezas.
10. Continuar al resumen y confirmar totales.
11. Guardar borrador y reabrir para confirmar hydrate desde `sessionStorage`.
12. Guardar cotizacion y revisar que PDF/WhatsApp no muestren datos tecnicos internos.

## No hacer

- No reabrir Quote Studio desktop desde este flujo movil.
- No exponer costo, margen, utilidad, merma o panel financiero en movil.
- No convertir la pauta/cubicacion en editor movil.
- No crear persistencia separada para el Constructor movil.
- No usar `Cuaderno` como nombre visible principal si se esta hablando del nuevo flujo.
- No hacer que la linea global aplique cristales.
- No habilitar `Reflejar` en modulos sin apertura lateral.
- No romper `total_global` ni item libre.
