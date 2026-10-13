# Expediente de integración — Thermowin Kompen

Estado: **base comercial y referencias documentales**. Fecha: 2026-10-12. Alcance solicitado: los cuatro sistemas de esta carpeta. Guía: [workflow de integración](../WORKFLOW_INTEGRAR_NUEVA_LINEA.md).

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

- Cuatro líneas canónicas PVC sembrables por organización chilena, sin precio sugerido. Cada taller configura su precio por m², mínimo y redondeo.
- Lista inicial de códigos y roles de perfiles como **referencias de catálogo** en `workshopProfiles`, con página fuente. No es inventario exhaustivo de auxiliares/herrajes; no son piezas de una receta ni llevan cantidades.
- Compatibilidad comercial explícita por tipo de componente y sistema de apertura. El número de hojas queda abierto porque los catálogos no publican una matriz de composiciones fabricables.
- **Ninguna variante recibe receta de despiece, vidrio calculado, barras o estado `validated` desde estos PDF.** Tampoco se escriben precios, recetas o presentaciones en Supabase remoto por documentar esta base.

## Matriz de reglas y ejemplos independientes

Los catálogos muestran secciones, dimensiones de perfil y refuerzos. **No muestran reglas de longitud de corte, cantidades por pieza, ángulos de unión, descuentos de vidrio ni ejemplos de entrada/salida**. La cota de una sección (por ejemplo, marco KOM 701 de 61 × 62 mm en Prime p. 2, o KOM 801 de 71 × 47 mm en Form p. 2) no se transforma en descuento de fabricación.

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
| Perfil con precio de compra | Enlace **Perfiles y costos** de cada línea → `/configuracion/empresa/mis-precios?supplier=thermowin&family=…&lineTemplateId=…` → `/api/proveedor-catalogos/taller-presentaciones` | La API autoriza rol, línea activa y `organization_id`; acepta las cuatro familias canónicas. El maestro puede elegir una referencia documental para completar código/nombre y guardar una presentación privada con SKU, acabado, largo y costo propios. No convierte la referencia en insumo oficial ni en receta |
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
