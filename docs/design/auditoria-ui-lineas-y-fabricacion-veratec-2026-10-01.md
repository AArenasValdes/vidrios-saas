# Auditoría visual: líneas, cotización y fabricación Veratec

**Fecha:** 2026-10-01  
**Entorno observado:** servidor local `127.0.0.1:3002`, sesión de organización QA 3.  
**Estado:** propuesta de diseño para revisión; no se modificó código, CSS, lógica, backend ni datos.

## Alcance y base de evidencia

Se revisaron el catálogo de líneas, su selector dentro de Paso 2, los flujos Guiada/Constructor, el pre-resumen y la pauta interna. Se contrastó la interfaz con el smoke QA real de Veratec 7400 informado en la sesión: receta `lista_para_validar`, costo técnico parcial, resoluciones por acabado y consolidación de dos ventanas. No se recalcularon cotizaciones ni se guardó el borrador abierto durante la inspección.

Las capturas aportadas por el usuario (`codex-clipboard-694666b7…png` y `codex-clipboard-67ae2798…png`) documentan la repetición de “Mis líneas”. En el selector móvil abierto con material PVC también se observó el grupo mezclado y Veratec lejos del comienzo. La inspección desktop cubrió el catálogo y el editor dividido entre área de trabajo y panel contextual; el ancho móvil capturado por el browser fue 562 CSS px. No se hizo una matriz de dispositivos 360/390/430 ni 1280/1440, así que esos tamaños quedan pendientes de QA visual tras aprobar el concepto.

## Hallazgos observados

1. **El selector repite “Mis líneas” entre lotes.** El encabezado aparece de nuevo al intercalarse agrupaciones por línea o familia; da la impresión de que cada renglón pertenece a una sección propia distinta. En la evidencia adjunta, la misma etiqueta se repite antes de Corredera 2 hojas 3, Corredera 2 hojas 4 y Corredera 2 hojas 5.
2. **La jerarquía no ayuda a elegir una de muchas líneas.** El selector presenta 44 resultados y prioriza una secuencia extensa; la búsqueda reduce el conjunto, pero los filtros y grupos se sienten como metadatos sucesivos en vez de un camino corto hacia la línea correcta.
3. **El contexto de material no queda suficientemente visible en cada decisión.** PVC se indica arriba, pero el listado largo mezcla materiales y grupos. En otra captura, el texto de orden “Aluminio primero” aparece incluso con un resultado filtrado a Veratec PVC.
4. **La tarjeta seleccionada pierde identidad.** “Veratec 7400 — Corredera 2 hojas” se recorta en el control del editor; precio y material quedan como señales separadas y el acabado elegido no está conectado visualmente con la línea.
5. **Paso 2 mezcla decisiones de cotización y detalle interno.** En desktop conviven modo de precio, costo base, recargo, costo de grupo y vidrio en el mismo espacio; en móvil hay scroll largo. Esto compite con la tarea principal: definir sistema, acabado, medidas y valor comercial.
6. **El estado de avance puede prometer pasos completados.** En la captura desktop de Medidas, Despiece y Precio aparecían con marcas verdes antes de completar esos pasos.
7. **El estado de fabricación necesita jerarquía propia.** `Lista para cotizar` y `Cubicación en borrador` son dos verdades distintas. Para Veratec, la pauta tiene 40 cortes en una ventana blanca y 40 en una negra; agrupar dos ventanas blancas iguales produjo 80 cortes y 16 barras de 5,8 m. No conviene presentar ese costo parcial como precio comercial ni como validación de taller.

### Estado real Veratec usado para diseñar

| Caso QA | Pauta real | Insumos/costo observado | Lectura para la UI |
|---|---:|---|---|
| Blanco, 1200×1500 mm, 1 unidad | 40 cortes; 41 mil 216 mm acumulados; 11 barras de 5,8 m | Costo técnico parcial conocido: $194.929; falta riel, vidrio y accesorios | Mostrar subtotal técnico conocido y faltantes con nombre; nunca completar con $0 |
| Negro, 1200×1500 mm, 1 unidad | 40 cortes; 41 mil 216 mm acumulados; 11 tiras; marco negro con largo comercial 6,8 m | Costo técnico parcial conocido: $341.819; faltan junquillo, riel, vidrio y accesorios | Hacer visible que el acabado cambia presentación/largo/costo |
| Blanco, 1200×1500 mm, 2 unidades iguales | 80 cortes; 82 mil 432 mm acumulados; 16 barras consolidadas | Costo parcial: $301.831; 15 barras costeadas y riel pendiente | Mostrar el ahorro frente al cálculo separado y la trazabilidad por unidad |

Son valores de QA del piloto y no se presentan como costo final, precio vigente general ni validación de taller. El caso con insumo faltante debe seguir mostrando “pendiente” y la cobertura, sin sustituirlo por cero.

## Wireframes propuestos

Son estructuras de información para revisión, no diseños implementados ni capturas del estado actual.

### 1. Selector de línea móvil — catálogo grande y líneas propias

```text
┌──────────────────────────────────────┐
│ Línea comercial                 Cerrar│
│ PVC · Corredera · 2 hojas             │  contexto del Paso 2
│ [ Buscar línea, proveedor o código… ] │  búsqueda fija
│ [Compatibles 3] [Mis líneas] [Todas]  │  una sola navegación
│ Filtros: [PVC ▾] [Proveedor ▾]        │
│                                      │
│ COMPATIBLES                          │
│ Veratec 7400 · Corredera 2 hojas      │
│ PVC · Veratec · 7400                 │
│ $80.000/m² · mínimo $35.000     ›    │
│ Fabricación preliminar               │  secundario, una línea
│                                      │
│ MIS LÍNEAS (16)                       │  una cabecera por sección
│ Serie 20 · PVC                       │
│ $80.000/m² · precio guardado     ›   │
│                                      │
│ ¿No está? [Precio manual]            │  opción separada
└──────────────────────────────────────┘
```

La pestaña **Compatibles** solo existe cuando el contexto actual puede determinar compatibilidad; no autoelige una línea. **Mis líneas** y **Todas** mantienen el acceso actual a líneas privadas y catálogo. “Precio manual” queda como acción de escape, no como una tarjeta más del catálogo. Cada grupo se renderiza una vez y cada resultado tiene una sola identidad visual.

### 2. Paso 2 móvil — decisión guiada

```text
┌──────────────────────────────────────┐
│ Paso 2 de 3               Guardado   │
│ Tipo ━ Cantidad ━● Datos             │
│ Guiada | Constructor                 │
│                                      │
│ Ventana · Corredera · 2 hojas        │
│ PVC · Veratec 7400                    │
│ Blanco ▾                             │
│                                      │
│ Medidas                              │
│ Ancho [1200] mm  Alto [1500] mm      │
│ Composición [2 móviles]              │
│                                      │
│ Vidrio                               │
│ Monolítico 4 mm                      │
│                                      │
│ Precio de venta                      │
│ [por unidad / total del grupo]       │
│ $144.000 por ventana                 │
│                                      │
│ Fabricación  Preliminar · parcial    │
│ Costo técnico conocido      $194.929 │
│ 3 grupos de faltantes          Ver    │
│                                      │
│ [Revisar resumen]                    │  CTA persistente
└──────────────────────────────────────┘
```

El precio comercial permanece como decisión principal. El bloque técnico se resume a un estado y una cifra parcial; expandir muestra qué está resuelto y qué falta. No se cambian fórmulas ni reglas de negocio en esta propuesta.

### 3. Pre-resumen móvil — dos ítems que comparten barras

```text
┌──────────────────────────────────────┐
│ Resumen de cotización                │
│ 2 ventanas · PVC · Veratec 7400      │
│                                      │
│ 1  Blanco · 1200×1500 · 1 unidad     │
│ 2  Blanco · 1200×1500 · 1 unidad     │
│ Precio comercial            $288.000 │
│                                      │
│ Fabricación · pauta preliminar       │
│ 80 cortes · 82 mil 432 mm            │
│ 16 barras de 5,8 m compartidas       │
│ Costo técnico conocido      $301.831 │
│ Cobertura: 15 barras con precio      │
│ Pendiente: riel, vidrio, accesorios  │
│ [Ver cortes por ventana]             │
│                                      │
│ [Guardar cotización]                 │
└──────────────────────────────────────┘
```

Para dos acabados distintos, cada ítem conserva su identidad y su presentación/largo resuelto; la pauta conjunta indica qué cortes comparten barra y cuáles no. La diferencia Blanco/Negro aparece como comparación secundaria, no como alerta en el camino principal.

### 4. Pauta interna móvil — trazabilidad sin abrumar

```text
┌──────────────────────────────────────┐
│ Fabricación · revisión interna       │
│ PRELIMINAR · receta lista para validar│
│ No equivale a validación de taller   │
│                                      │
│ 16 barras · 5,8 m                    │
│ 80 cortes · costo parcial $301.831   │
│                                      │
│ Barras compartidas               ▾   │
│ Barra 1 · Veratec 7400 · Blanco     │
│ 1200 mm → ítem 1                    │
│ 1200 mm → ítem 2                    │
│ Sobrante: …                          │
│                                      │
│ Pendientes (3)                   ▾   │
│ Riel: asociación técnica pendiente  │
│ Vidrio: sin precio                  │
│ Accesorios: consumos sin precio     │
└──────────────────────────────────────┘
```

La vista inicia en totales y advertencia de estado; los detalles de corte y procedencia se expanden a demanda. Los pendientes se nombran como pendientes, nunca como cero.

### 5. Desktop — catálogo y espacio de cotización

```text
┌──────────┬───────────────────────────────────────────┬──────────────┐
│ Navegación│ Catálogo de líneas                       │ Selección    │
│          │ [Buscar…] [Material] [Proveedor] [Estado] │ Veratec 7400 │
│ Empresa  │ Compatibles | Mis líneas | Todas          │ PVC · 7400   │
│          │                                            │ $80.000/m²  │
│          │ VERATEC                                    │ Min $35.000 │
│          │ Veratec 7400 · Corredera 2 hojas  ✓       │ Fabricación │
│          │ VERATEC · PVC · precio guardado           │ preliminar  │
│          │                                            │ [Usar línea]│
└──────────┴───────────────────────────────────────────┴──────────────┘

┌──────────┬───────────────────────────────────────────┬──────────────┐
│ Navegación│ Paso 2 · Datos                           │ Resumen      │
│          │ Ventana · Corredera · 2 hojas             │ 2 ítems      │
│          │ PVC · Veratec 7400 · Blanco               │ Venta        │
│          │ Medidas / vidrio / precio                 │ $288.000     │
│          │ Fabricación: preliminar · costo parcial   │ Técnico      │
│          │ [ver detalles]                            │ $301.831     │
└──────────┴───────────────────────────────────────────┴──────────────┘
```

Desktop conserva la navegación lateral y el inspector, pero reduce el uso de tarjetas apiladas: resultados en filas escaneables y una selección contextual clara. El inspector separa venta comercial de costo técnico. El progreso marca como activo el paso actual y no pinta pasos futuros como finalizados.

## Anotaciones sobre capturas actuales

Los números apuntan a zonas visibles en las dos capturas adjuntas y en la captura del selector móvil hecha durante esta auditoría:

- **1 — Cabeceras repetidas:** “MIS LÍNEAS” vuelve a aparecer entre resultados. Consolidar en un único encabezado de sección.
- **2 — El contexto de PVC queda en subtítulo/chip:** promoverlo a contexto fijado junto a búsqueda y compatibilidad; ordenar los resultados relevantes primero sin cambiar el resolver.
- **3 — Precio manual compite con las líneas:** mantenerlo separado al pie del selector como acción secundaria.
- **4 — Tarjetas altas y repetitivas:** dejar nombre y precio como lectura primaria; material, proveedor y estado técnico como línea secundaria compacta.
- **5 — Búsqueda y resultado:** preservar búsqueda visible durante el scroll y mantener resultado/contador coherentes con el filtro actual.
- **6 — Paso 2 concentra muchos campos:** agrupar los datos en orden de decisión (configuración, medidas, vidrio, valor); plegar costos técnicos secundarios.
- **7 — Fabricación preliminar:** mostrar estado, costo conocido, cobertura y faltantes juntos, separados del precio de venta.

## Dirección visual

**Tesis:** un espacio de trabajo claro de taller; cada pantalla responde una pregunta y deja los detalles técnicos disponibles sin hacerlos competir con la cotización.

- Un solo acento para acción/selección; los estados también usan texto, no solo color.
- Jerarquía tipográfica consistente; reducir etiquetas repetidas, no el tamaño legible.
- Controles táctiles con área cómoda (objetivo de 44 px en móvil) y espacio entre acciones.
- En móvil, búsqueda/contexto/CTA permanecen fáciles de alcanzar; una sola hoja modal activa.
- En desktop, alineación de filas y panel contextual; atajos de teclado y foco visible en la búsqueda.
- Evitar nuevas tarjetas para cada dato; usar separación, encabezados y disclosure progresivo.

## Criterios de aprobación y QA posterior

Antes de implementar, aprobar o corregir los cinco wireframes y el orden `Compatibles → Mis líneas → Todas`. Después de aprobar, la revisión visual deberá hacerse en 360, 390 y 430 px, y 1280 y 1440 px; cubrir búsqueda, filtros, líneas propias, catálogo Ventora, precio manual, textos largos, estado de fabricación, Paso 2, pre-resumen, Constructor y scroll. Esta auditoría no constituye esa matriz de QA.

## Referencias de diseño consultadas

- Apple HIG: `accessibility.md` › Vision / Mobility; `layout.md` › Visual hierarchy / Adaptability; `typography.md` › Supporting Dynamic Type; `color.md` › Color and contrast.
- Apple HIG: `designing-for-ios.md` › Platform considerations; `designing-for-macos.md` › Platform considerations; `lists-and-tables.md` › Best practices; `search-fields.md` › Best practices; `sheets.md` › Best practices; `split-views.md` › Best practices; `settings.md` › Task-specific options.
- Guía de producto Ventora: flujo comercial como núcleo; fabricación opcional, interna y revisable; no presentar una receta preliminar como validada.
- Guía de interfaz de la app: workspace primario, navegación y contexto secundario; densidad legible; evitar tarjetas y chrome sin función.
