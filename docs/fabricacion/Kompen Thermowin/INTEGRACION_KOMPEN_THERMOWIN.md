# Expediente de integración — Thermowin Kompen

Estado: **catálogo documental y precios de compra 2026 preparados localmente**. Fecha: 2026-10-16. Alcance: los cuatro sistemas de esta carpeta. Guía: [workflow de integración](../WORKFLOW_INTEGRAR_NUEVA_LINEA.md).

## Identidad y alcance

| Sistema | `catalog_key` | `familyKey` | Catálogo fuente | Uso comercial publicado |
|---|---|---|---|---|
| Prime Line KOM 700 | `ventora:kompen-prime-line-700` | `thermowin:kom-700` | `NUEVA PRIME LINE 700 2025 (2).pdf`, p. 1–21 | Ventanas y puertas fijas/abatibles |
| Form Line KOM 800 | `ventora:kompen-form-line-800` | `thermowin:kom-800` | `NUEVO FORM LINE 800 2025 (1).pdf`, p. 1–13 | Ventanas y puertas correderas; marcos de uno, dos y tres rieles |
| Star Line KOM 500 | `ventora:kompen-star-line-500` | `thermowin:kom-500` | `NUEVA STAR LINE 500 2025.pdf`, p. 1–3 | Ventanas fijas/abatibles |
| Americana PVC S-70 TW | `ventora:thermowin-americana-s70` | `thermowin:americana-s70` | `NUEVO CATALOGO LINEA AMERICANA S-70 TW 2022.pdf`, p. 1–5 | Ventanas correderas, fijas, guillotina y celosía |

SHA-256 de los archivos conservados, en el mismo orden: `9E17573F771A74D218EFE658F9050CA590B91F6383090A5DF16783DADA18D54C`, `C35DCC1A42F3766EC547C51F80EF79CC702376C99A5BCFB855F5E2DBA463922C`, `C477B4C7D857BD27429E1294AE26FF5D4BA43B8F364E6898ED6A1ACBAE018994`, `33630F311285405342529723189344B296BF4865D636722C05D681C574AE23C7`.

`Catalogo de herrajes 2024 corregido.pdf 06.12.pdf` tiene 73 páginas de imagen sin capa de texto (SHA-256 `8858503FF0252F81872FEAE4C8CFDD85172263DFA1FA85E213F953D34096C9F1`). Se inspeccionaron visualmente portada y primeras páginas; la p. 2 muestra manillas y códigos por acabado. Falta inventariar visualmente el resto y vincular herrajes a composiciones concretas. No se asigna herraje a ninguna receta por su presencia en el catálogo.

### Alcance de esta etapa

- Cuatro líneas canónicas PVC sembrables por organización chilena. El precio comercial por m², mínimo y redondeo siguen siendo propios de cada taller.
- Lista inicial de códigos y roles de perfiles como **referencias de catálogo** en `workshopProfiles`, con página fuente. No es inventario exhaustivo de auxiliares/herrajes; no son piezas de una receta ni llevan cantidades.
- Se transcribió un lote global de 46 precios de compra para perfiles de Prime 700, Form 800 y Americana S-70 en `src/features/proveedor-catalogos/fixtures/thermowin-kompen-precios-2026.ts`. Todos son netos CLP y vigentes durante 2026 según confirmación del usuario. Los perfiles de Prime/Form están presentados como `TR`; S-70 conserva la unidad `UN` que muestra su lista. Para cubicación de compra se registran 6.000 mm, indicados por el usuario; ese largo no se ve impreso en las imágenes.
- Las filas se enlazan por proveedor + `familyKey` + código técnico + acabado + presentación. El lote es global en el catálogo de proveedor, y cada organización puede ocultar Thermowin Kompen desde la visibilidad de sus líneas; no se modifica ni precarga el precio de venta por m². Un precio propio del taller conserva su precedencia.
- Compatibilidad comercial explícita por tipo de componente y sistema de apertura. El número de hojas queda abierto porque los catálogos no publican una matriz de composiciones fabricables.
- La lámina comercial Kompen/Thermowin aportada por el titular (2026-10-16) identifica, además, estas configuraciones: Form 800 mono/doble/triple riel; Prime 700 oscilobatiente, proyectante, fijo y puerta abatible; Star 500 proyectante, abatible exterior y fijo; Americana S-70 corredera, guillotina, celosía y fijo. Se registran como configuraciones comerciales distintas en `default-line-catalog.ts`; las variantes Form mantienen `thermowin:kom-800` y heredan solo referencias/precios de esa misma familia. Las hojas de Form no se deducen de los diagramas.
- El precio de venta para cotizar sigue siendo el precio comercial por m² configurado por cada organización. Los valores importados en esta etapa son precios de compra de perfiles por TR o UN y están disponibles en Mis precios. Que una configuración pueda elegirse y cotizarse no exige receta/descuento; en cambio, el costo de materiales de una ventana no se calcula sumando esos precios sin el metraje/cantidad de cada perfil.
- Prime 700, Form 800 y Americana S-70 tienen perfiles con presentaciones/precios de compra en el lote cargado. Star 500 dispone de referencias técnicas, pero no se encontró una lista de precios suya entre las imágenes; queda sin precio de compra hasta recibir evidencia. No se reutilizan precios de otra familia.
- **Ninguna variante recibe receta de despiece, vidrio calculado, barras o estado `validated` desde estos PDF.** Tampoco se escriben precios, recetas o presentaciones en Supabase remoto por documentar esta base.

### Precios de compra extraídos

Importes CLP netos por unidad indicada en origen. En las listas Prime/Form la unidad es `TR`; para Americana S-70 se conserva `UN`. El sufijo interno de presentación identifica código y acabado cuando la columna de SKU de algunas fotos quedó fuera del recorte; no se presenta como SKU impreso del proveedor. La lista no lleva fecha impresa, por lo que “vigente en 2026” proviene de la confirmación del titular.

| Familia | Perfil/código técnico | Acabado | Unidad | Precio neto |
|---|---|---|---|---:|
| Prime 700 | KOM 701 | Nogal | TR | $31.421 |
| Prime 700 | KOM 701 | Blanco | TR | $18.831 |
| Prime 700 | KOM 701 | Antracita | TR | $32.993 |
| Prime 700 | R701 | Independiente | TR | $8.003 |
| Prime 700 | KOM 607 | Nogal | TR | $9.940 |
| Prime 700 | KOM 607 | Antracita | TR | $10.436 |
| Prime 700 | KOM 427/701 | Nogal | TR | $15.796 |
| Prime 700 | KOM 427/701 | Blanco | TR | $12.981 |
| Prime 700 | KOM 427/701 | Antracita | TR | $16.587 |
| Prime 700 | KOM 709 | Antracita | TR | $43.109 |
| Prime 700 | R709 | Independiente | TR | $7.318 |
| Prime 700 | KOM 617 | Blanco | TR | $7.008 |
| Form 800 | KOM 801 | Nogal | TR | $39.194 |
| Form 800 | KOM 801 | Blanco | TR | $22.838 |
| Form 800 | KOM 801 | Antracita | TR | $41.154 |
| Form 800 | KOM 802 | Antracita | TR | $53.934 |
| Form 800 | KOM 804 | Nogal | TR | $43.088 |
| Form 800 | KOM 804 | Blanco | TR | $25.740 |
| Form 800 | KOM 804 | Antracita | TR | $45.243 |
| Form 800 | R802T | Antracita | TR | $16.725 |
| Form 800 | KOM 822 | Nogal | TR | $44.848 |
| Form 800 | KOM 822 | Antracita | TR | $47.090 |
| Form 800 | R822 | Independiente | TR | $16.200 |
| Form 800 | KOM 817 | Nogal | TR | $17.689 |
| Form 800 | KOM 817 | Blanco | TR | $7.382 |
| Form 800 | KOM 817 | Antracita | TR | $18.574 |
| Form 800 | KOM 506 | Nogal | TR | $8.388 |
| Form 800 | KOM 506 | Antracita | TR | $8.807 |
| Form 800 | KOM 826 | Antracita | TR | $14.226 |
| Form 800 | KOM 505 | Blanco | TR | $4.516 |
| Form 800 | KOM 426/801 | Nogal | TR | $14.703 |
| Form 800 | KOM 426/801 | Blanco | TR | $11.886 |
| Form 800 | KOM 426/801 | Antracita | TR | $15.437 |
| Form 800 | R801T | Independiente | TR | $10.158 |
| Form 800 | R804 | Independiente | TR | $8.214 |
| Form 800 | Riel 800 | Negro | TR | $6.948 |
| Form 800 | Riel 800 | Mate | TR | $6.948 |
| Americana S-70 | 70-001 Marco fijo corredero | Blanco | UN | $11.025 |
| Americana S-70 | 70-002 Mullion | Blanco | UN | $15.191 |
| Americana S-70 | 70-003 Traslapo fijo | Blanco | UN | $7.350 |
| Americana S-70 | 70-004 Traslapo móvil | Blanco | UN | $5.444 |
| Americana S-70 | 70-005 Hoja corredera | Blanco | UN | $4.729 |
| Americana S-70 | 70-006 Riel guía | Blanco | UN | $2.089 |
| Americana S-70 | 70-007 Junquillo simple | Blanco | UN | $1.045 |
| Americana S-70 | R70-003 Refuerzo traslapo fijo | Independiente | UN | $9.404 |
| Americana S-70 | R70-004 Refuerzo traslapo móvil | Independiente | UN | $8.451 |

No se incorporaron herrajes ni accesorios en esta matriz. El rodamiento `P22115` aparece con $3.448 y $2.758 en imágenes distintas; queda pendiente de confirmación y no se elige uno automáticamente. La base no completa referencias o acabados ausentes en otras filas.

## Revisión de la pauta Excel recibida — 2026-10-25

Se revisó `Pauta%20Kompen.xlsx` en modo de solo lectura. La hoja `500 y 802` declara “Perfil Kompen”, color blanco y fecha 2018-04-16. Contiene bloques con fórmulas para `PROYECTANTE 500`, `FIJO 500` y varias composiciones correderas monorriel/triple riel. `Pauta Original` y `Hoja1` contienen reglas y ejemplos con etiquetas 700 y medidas de obras; no identifican de forma consistente la línea y configuración exactas. No se encontró un bloque rotulado 802 ni un cruce explícito entre sus resultados y códigos de perfil.

Reglas legibles en la hoja `500 y 802`:

- `PROYECTANTE 500`: hoja `ancho − 52` / `alto − 52`; TMP `ancho − 166` / `alto − 166` (a partir de la fórmula de hoja menos 114).
- `FIJO 500`: TMP `ancho − 84` / `alto − 84`.
- Las secciones monorriel muestran cálculos para hoja/TMP y ejemplos de entrada, pero no asignan cada resultado a códigos KOM concretos ni especifican la lista y cantidad completa de cortes del marco, encuentros, uniones y ángulos.

Estas expresiones sirven para reproducir resultados parciales de vidrio/hoja, pero **no bastan para sembrar una receta de corte**: faltan cantidades y cortes completos por componente, el cruce inequívoco de cada bloque con una variante/código de catálogo y dos resultados independientes por variante. No se trasladan a recetas cotizables ni a pauta operativa por ahora, y no se marca ninguna familia como lista para probar o validada. Los códigos de perfiles de los PDF de catálogo no se usan para completar esos vacíos por similitud de nombre.

## Matriz de reglas y ejemplos independientes

Los catálogos PDF muestran secciones, dimensiones de perfil y refuerzos, no reglas de corte. La pauta Excel agrega las expresiones parciales descritas arriba, pero no resuelve por sí sola la lista de cortes y su identidad por variante. La cota de una sección (por ejemplo, marco KOM 701 de 61 × 62 mm en Prime p. 2, o KOM 801 de 71 × 47 mm en Form p. 2) no se transforma en descuento de fabricación.

| Variante candidata | Tipología / hojas / riel / vidrio | Fuente | Perfiles identificados | Fórmula y cantidad | Ejemplos A/B | Pendiente y efecto |
|---|---|---|---|---|---|---|
| Prime fijo | Paño fijo; hojas/composición por confirmar | Prime p. 2, 4, 15–16 | KOM 701, 703; junquillos 607/608/617/506/512 según espesor | Sin pauta | No disponibles | Confirmar composición, cortes, vidrio y unión; sin despiece |
| Prime ventana abatible | Interior/exterior por confirmar; hojas por confirmar | Prime p. 3, 7–9 | KOM 702, 709, 711, R702/R709/R700B | Sin pauta | No disponibles | KOM 711 figura con dos combinaciones de refuerzo en p. 8–9; resolver contradicción antes de usarlo |
| Prime puerta abatible | Interior/exterior; hojas por confirmar | Prime p. 5–6 | KOM 706/707, R706/R700B | Sin pauta | No disponibles | Confirmar marco, hoja, cantidad, corte, herraje y vidrio |
| Form ventana corredera | Monorriel/doble/triple; hojas por confirmar | Form p. 2–4, 6–9 | KOM 801/802/824, 804, 817/822 | Sin pauta | No disponibles | Asociar riel, hojas móviles/fijas, traslapos, corte y vidrio por variante |
| Form puerta corredera | Monorriel/doble/triple; hojas por confirmar | Form p. 2–3, 5, 7–9 | KOM 801/802/824, 815, 820 | Sin pauta | No disponibles | Confirmar combinaciones de marco, hojas, corte y herrajes |
| Star fijo/abatible | Ventana; hojas por confirmar | Star p. 1–3 | KOM 501, 503, R501, junquillos 505/506/512/608 | Sin pauta | No disponibles | El mismo KOM 503 se rotula «Pilar y hoja»; separar roles y cantidades con fuente técnica |
| Americana corredera/fijo | Ventana; hojas por confirmar | Americana p. 1–3 | 70-001 a 70-006 | Sin pauta | No disponibles | Definir marco, móvil/fijo, cortes y vidrio |
| Americana guillotina/celosía | Ventana; composición por confirmar | Americana p. 1, 4–5 | 70-008 (guillotina); perfil de celosía sin identificación específica | Sin pauta | No disponibles | No extrapolar la hoja 70-008 a celosía; falta composición/corte de ambas |

Los junquillos tienen **bandas de vidrio distintas según sistema**. El código `KOM 506` aparece como TP 31–33 mm en Prime p. 16 y TP 18–20 mm en Form/Star p. 8/p. 3. Se mantienen familias independientes: no se comparte presentación, precio ni regla por coincidencia de código hasta aclaración del proveedor/taller.

## Recorrido de integración

| Tramo | Archivo / identidad concreta | Evidencia o límite actual |
|---|---|---|
| Fuente y referencias | Estos PDF + `ventora-profile-references.ts` | Códigos y páginas; sin descuento ni precio |
| Catálogo y seed | `default-line-catalog.ts` + `catalog_key` | Cuatro entradas PVC; seed idempotente por clave y `organization_id`, sin reemplazar precios |
| Selector cotización y Paso 1 móvil | `line-template-compatibility.service.ts`, `workflow-ui.ts`, `fabricacion-mobile-product-step.tsx` | Pares exactos componente/apertura del catálogo; las hojas quedan fuera de la selección hasta confirmarlas en el Plan de armado. El CTA móvil va a **Perfiles y descuentos** |
| Precio de venta | `line-template-price-editor.tsx` → `cotizacion_line_templates` | Precio por m² editable por organización; no tomarlo del PDF |
| Perfil con precio de compra | Enlace **Perfiles y costos** de cada línea → `/configuracion/empresa/mis-precios?supplier=thermowin&family=…&lineTemplateId=…` → `/api/proveedor-catalogos/taller-presentaciones` | El catálogo global importado se resuelve por proveedor/familia/código/acabado/presentación. Una presentación privada de la organización conserva precedencia. La API existente autoriza rol, línea activa y `organization_id` para costos privados. No convierte una referencia en receta |
| Fixture y slots | `src/features/fabricacion/fixtures/` y `line-base-variant-catalog.ts` | Pendientes: sin fórmulas ni ejemplos independientes no crear slot `complete` |
| Resolver de receta | `fabricacion-receta-resolver.service.ts` | Exigir `line_template_id + tipología + hojas + variante + vidrio` cuando haya receta; sin receta debe devolver `sin_receta` |
| Snapshot y guardado | `cotizacion_items.fabricacion_snapshot` | Solo tras cálculo completo; conservar historial cuando el taller edite la receta |
| Despiece y barras | `fabricacion-despiece-cotizacion.service.ts` | Bloqueado para estas cuatro líneas hasta regla calculable; código referencial no habilita salida |
| Impresión | `/print/cotizaciones/[id]/fabricacion` y PDF cliente | Pauta técnica solo interna; PDF cliente mantiene precio y descripción comercial |

### Contrato de edición y precedencia

1. Precio de venta de línea y precio neto de presentación pertenecen a la organización; jamás se reemplazan al actualizar el catálogo documental.
2. Cada receta propia conserva código, ajuste en mm, cantidad, largo comercial y versión. Un seed futuro solo agrega variantes ausentes; una receta propia calculable tiene prioridad sobre una base sugerida del mismo sistema/configuración.
3. El matching técnico debe usar identidad estable de línea y composición elegida en la pieza; ninguna coincidencia textual o de código entre familias puede redirigir perfiles/precios.
4. Cambiar línea, sistema, hojas, vidrio, variante o medida invalida el cálculo vivo. La cotización guardada conserva su snapshot hasta una acción explícita de recálculo.
5. Si faltan geometría o fórmulas, mostrar configuración pendiente. Precio comercial configurado no implica despiece disponible.

## Pruebas exigibles

- [x] Identidades únicas, fuente, referencias por familia, filtro de sistemas Guiada y ausencia de receta documentados en `kompen-thermowin-integration.contract.test.ts`.
- [x] Ruta de presentaciones: cuatro familias, `organization_id`, alta privada con costo y rechazo al rol de solo lectura en `kompen-thermowin-presentations-route.test.ts`.
- [x] Paso 1 móvil: opciones de componente derivadas del catálogo, sin hojas genéricas, y descuentos en el siguiente paso; incompatibilidades de componente/apertura cubiertas por contrato.
- [ ] Por cada variante de despiece: dos geometrías y resultados independientes del motor, cero/negativos, límites y casos no soportados.
- [ ] Cuatro sistemas: recorrido real Guiada y Constructor con sistema, composición, hojas y vidrio; guardar/reabrir sin redirigir a otra línea.
- [ ] Precedencia de receta propia editada, precio privado, aislamiento por organización y snapshot histórico para recetas Kompen reales.
- [ ] Smoke autenticado del editor **Perfiles y costos**: cuatro enlaces, lectura por empresa, alta desde referencia, edición de costo y revisión; sin escribir en producción.
- [x] `pnpm fabrication:verify --build` local aprobado; smoke QA pendiente.

## Smoke de navegador

| Sistema / dimensiones / vidrio | Ruta e ítem QA | Resultado esperado vs observado | Guardado y reapertura | Pauta interna / PDF cliente | Evidencia o bloqueo |
|---|---|---|---|---|---|
| Prime 700 | Pendiente | Línea comercial con precio; fabricación pendiente | Pendiente | Pendiente | Faltan pautas de corte |
| Form 800 | Pendiente | Línea comercial con precio; fabricación pendiente | Pendiente | Pendiente | Faltan pautas de corte |
| Star 500 | Pendiente | Línea comercial con precio; fabricación pendiente | Pendiente | Pendiente | Faltan pautas de corte |
| Americana S-70 | Pendiente | Línea comercial con precio; fabricación pendiente | Pendiente | Pendiente | Faltan pautas de corte |

## Entrega

- Comando: `pnpm fabrication:verify --build` el 2026-10-12, sobre commit `25a6cbb8b967d9caa20875f721df398cce68db5b` con cambios locales. La ejecución aprobada usó permisos fuera del sandbox; dos intentos dentro del sandbox fallaron en `mkdir .next` (`EPERM`).
- Informe `test-results/fabrication/verification.json`: `passed`, 178 suites y 1.500 pruebas aprobadas; TypeScript, `docs:check` y build de producción aprobados. El informe es generado y no se versiona.
- Navegador QA: no ejecutado. Se inspeccionaron sesiones de navegador, pero no se probó ni persistió una cotización QA local con los cuatro sistemas. Base remota y validación física del taller: no comprobadas.
- Estado: **catálogo documental local**, despiece pendiente de Plan de armado/pauta con fórmulas y validación de taller. Ninguna escritura remota, migración o despliegue.
- Próximo insumo confirmado por el titular: subirá pautas o Plan de armado del fabricante. Para cada sistema y composición hacen falta medidas de entrada, lista completa de perfiles y vidrios, cantidad, regla de corte, ángulos, riel/hojas y dos trabajos de ejemplo. Cada documento se revisará por variante antes de crear una receta calculable; Zeta solo sirve si se captura la configuración exacta y el Plan de armado, con fuente y salida verificables.

### Actualización de precios de compra — 2026-10-16

- Lote cargado y releído en el catálogo global Supabase (`yrtrwgkaopfumpidjthk`): proveedor `thermowin-kompen`, lista `2026`, 30 códigos técnicos, 30 vínculos de familia, 46 presentaciones y 46 precios netos. Suma de precios unitarios de referencia: $829.081 CLP (no representa el valor de compra de un trabajo). Importación idempotente, solo inserta filas faltantes y detiene conflictos; script `scripts/qa/import-thermowin-kompen-prices-guarded.ts`.
- Las imágenes se volvieron a revisar por título y contenido: Prime 700 Nogal, proyectante Prime 700 Antracita, Form 800 Antracita mono/doble, Form 800 Nogal doble/monorriel, lista Form 800 + Prime 700 Blanco, refuerzos 800, Americana S-70 y Mullion S-70. Los títulos determinan las familias/acabados; no se cruzan entre filas por similitud.
- La lista blanca distingue `R800-0003 · Riel 800 aluminio mate` del riel negro `R800-8518`; “Mate/Negro” describe el acabado del riel de aluminio, no el color del PVC. Al cotizar una pieza cuyo perfil técnico sea solo `Riel 800`, el resolver no usará ninguno por inferencia a partir de Nogal/Antracita; queda pendiente hasta que la configuración/receta identifique el acabado del riel.
- El precio de Americana S-70 conserva `UN` según la columna de unidad de la imagen. Prime/Form conserva `TR`. La nota de evidencia registra la unidad correspondiente y el largo 6.000 mm indicado por el usuario.
- El logo fuente `logo_KOMPEN.png` se copia a `public/Icon-Empresas/kompen.png` y se muestra en la cabecera del proveedor de `/configuracion/empresa/mis-precios`.
- No hay precios extraídos para Star Line KOM 500 en las imágenes disponibles.
- Confirmación del usuario: precios vigentes durante 2026, netos CLP, largo comercial estándar 6.000 mm. La presentación de Americana conserva `UN` como unidad impresa; Prime/Form conservan `TR`.
- Las comprobaciones del fixture prueban esquema, conteo, montos, acabados PVC, largo, resolución por familia/proveedor y el aislamiento del acabado del riel. El script realizó preflight (155 inserciones posibles, cero filas previas), insertó las filas y releyó/contrastó todas las 155 filas. El `GET /api/proveedor-catalogos/mis-precios` ya consume estas tablas globales y aplica los ajustes/overrides por organización al leerlas.
- Visibilidad global compatible con preferencia de cada organización: `organization_quote_provider_visibility`, `useQuoteProviderVisibility` y `quote-provider-visibility.service.ts` permiten ocultar Thermowin Kompen de sus líneas/cotizaciones. No se creó una tabla nueva.
- Excluido por discrepancia: rodamiento `P22115`, visto a $3.448 y $2.758. También se excluyeron los demás herrajes/accesorios; esta matriz cubre perfiles.
- Referencias internas para perfiles antracita cuando la foto recorta la columna SKU usan `código técnico + acabado`; la evidencia lo declara como identificador interno y no como SKU Thermowin impreso. El panel debe seguir mostrando al maestro el código técnico y el acabado.
- La carga de precios de compra no crea fórmulas, recetas ni costo de materiales para una cotización. Las familias Kompen continúan sin recetas productivas; el costo automático solo podrá calcularse cuando una composición compatible aporte códigos técnicos y geometría. El precio comercial por m² de cada línea permanece separado.
