# Matriz Ventora ↔ Alumétrica ↔ Haciendo Ventanas

Fecha de consulta: **2026-09-19**  
Fuente Haciendo Ventanas: [https://www.haceventanas.com/#appMain](https://www.haceventanas.com/#appMain)  
Fuente Alumétrica comparada: `docs/fabricacion/alumetrica/2026-09-19-matriz-lineas.md` y
`docs/fabricacion/alumetrica/2026-09-19-formulas-observadas.md`.

## Regla de lectura

Haciendo Ventanas fue consultado en sesión autenticada. Cada modelo se agregó solo
como borrador temporal para abrir la vista previa del PDF de taller; no se guardó un
proyecto. Las longitudes de este documento son salidas observadas para **1200 × 1000
mm**, barra **6000 mm**, kerf **3 mm**. No se convierten en fórmulas generales.

`Observado` es texto o número visible. `Derivado` es una correspondencia de identidad
entre fuentes. `Asumido` no completa ningún campo técnico; aquí se usa `no asumido`.

## Resumen

| Familia Ventora | Alumétrica | Haciendo Ventanas | Clasificación global |
|---|---|---|---|
| Serie 3200 | Serie 3200, aluminio, puerta abatir 1H | `Abatir Serie 3200 — 1 hoja` | posible equivalencia técnica; fórmula pendiente |
| Óptima S-28 2H | S-28 termopanel, 2 hojas | `Óptima S-28 — 2 hojas (termopanel)` | coincidencia de identidad; validar salida contra Zeta |
| Óptima S-28 3H | S-28 termopanel, 3 hojas; tarjeta Alumétrica muestra alerta de 2H | `Óptima S-28 — 3 hojas (termopanel)` | conflicto de cantidad/tarjeta; validar en Zeta |
| S-38 RPT | S-38 RPT, fijo/proyectante, 2 hojas | `S-38 RPT — Proyectante` | conflicto de módulo/variante; validar en Zeta |
| Serie 20 | Serie 20, corredera 2H | `Serie 20 — 2 hojas` | coincidencia de identidad y varios códigos; validar fórmula |
| Serie 4800 | Serie 4800, corredera 2H normal/reforzada | `Serie 4800 — 2 hojas` | coincidencia de identidad; códigos Alumétrica faltantes |
| Serie 5000 | Serie 5000, corredera 2H | no aparece en selector visible | no encontrado en Haciendo |
| S-33 | S-33, corredera 2H termopanel | `S-33 — 2 hojas` | coincidencia de identidad y códigos principales |
| S-33 RPT | S-33 RPT, corredera 2H termopanel | `S-33 RPT — 2 hojas (termopanel)` | coincidencia de identidad y códigos principales |
| Serie 25 | Alumet Serie 25, corredera 2H mono/TP | `Serie 25 — 2 hojas` | conflicto de salida de vidrio; validar en Zeta |
| AL-15 | Línea AL-15, corredera 2H | no aparece en selector visible | no encontrado en Haciendo |
| AL-45 | Línea AL-45, puerta 1H | no aparece en selector visible | no encontrado en Haciendo |
| AM-35 | AM-35, puerta abatible/vaivén | no aparece en selector visible | no encontrado en Haciendo |
| S60 | Winhouse S60, varias tipologías PVC | no aparece en selector visible | no encontrado en Haciendo |

## Detalle por línea

### 1. Serie 3200

| Campo | Dato observado / derivado | Comparación |
|---|---|---|
| Modelo | `Abatir Serie 3200 — 1 hoja` | coincide con la identidad de línea; nombre no idéntico al de Alumétrica |
| Línea / serie | Serie 3200; categoría visible `Puertas` | coincide |
| Material | Alumétrica: aluminio. Haciendo no muestra material específico en el selector | falta en Haciendo Ventanas |
| Apertura / módulos | abatir, 1 hoja | coincide |
| Variantes | PDF: `—`; UI no expone bastidor chico/grande/TP como selector separado | falta en Haciendo Ventanas; diferencia con las 3 tipologías Alumétrica |
| Perfiles y códigos | PDF: `Marco 3222` 1×1200; `Marco 3222` 2×1000; `Bastidor Grande 3225` 2×1158; `Bastidor Grande 3225` 2×971 | códigos 3222/3225 coinciden; resto de perfiles Alumétrica no aparece |
| Vidrio | PDF: `Vidrio`, lectura visual `1023 × 930 mm`, cantidad 1 | diferencia frente a la ficha Alumétrica de bastidores/variantes; medida debe revalidarse |
| Fórmula de vidrio | no expuesta; solo resultado de medida | falta en Haciendo Ventanas |
| Fórmula de corte | no expuesta; solo longitudes del PDF | falta en Haciendo Ventanas |
| Despiece | observado en `despieces-observados.md` | coincide como evidencia de salida; no es fórmula general |
| Accesorios | no visibles en PDF | falta en Haciendo Ventanas |
| Medida de referencia | 1200×1000 mm; barra 6000; kerf 3 | dato observado, no fórmula |
| Restricciones | 1 hoja en modelo; material/variante no parametrizados visiblemente | diferencia / pendiente |
| URL / fecha | `https://www.haceventanas.com/#appMain` · 2026-09-19 | trazabilidad completa de consulta |

### 2. Serie 4800

| Campo | Dato observado / derivado | Comparación |
|---|---|---|
| Modelo | `Serie 4800 — 2 hojas`; selector adicional `Reforzada` visible al elegir la línea | coincide; la variante Reforzada existe en ambas fuentes |
| Línea / serie | Serie 4800, categoría `Correderas` | coincide |
| Material | Alumétrica: aluminio. Haciendo no lo rotula en el modelo | falta en Haciendo Ventanas |
| Apertura / módulos | corredera, 2 hojas | coincide |
| Variantes | Haciendo muestra `Reforzada`; PDF generado con variante `—` | diferencia de estado: salida observada es normal, no reforzada |
| Perfiles y códigos | `Riel Inferior 4801`, `Riel Superior 4802`, `Jamba 4803`, `Zócalo 4804`, `Cabezal 4805`, `Traslapo 4806`, `Pierna con Aleta 4808` | Alumétrica no dejó códigos completos en esta pasada; falta comparación completa |
| Vidrio | PDF: `Vidrio`, alto 907, cantidad 2; ancho visible en captura, no se considera validado | falta en Alumétrica para esta lectura; medida pendiente de confirmación |
| Fórmula de vidrio | no expuesta | falta en Haciendo Ventanas |
| Fórmula de corte | no expuesta; solo resultado 1184, 1000, 585 y 968 mm | falta en Haciendo Ventanas |
| Despiece | 4801 1×1184; 4802 1×1184; 4803 2×1000; 4804 2×585; 4805 2×585; 4806 2×968; 4808 2×968 | diferencia pendiente contra las 7 fórmulas/destajes Alumétrica |
| Accesorios | ninguno visible en el PDF; Alumétrica sí registra 7 herrajes | falta en Haciendo Ventanas |
| Medida / restricciones | 1200×1000; barra 6000; kerf 3 | observado |
| URL / fecha | URL app · 2026-09-19 | trazabilidad completa |

### 3. Serie 20

| Campo | Dato observado / derivado | Comparación |
|---|---|---|
| Modelo | `Serie 20 — 2 hojas` | coincide |
| Material / apertura / módulos | Alumétrica: aluminio; corredera; 2H. Haciendo rotula corredera 2H, no material | material falta en Haciendo; apertura y módulos coinciden |
| Variantes | selector `Con termopanel` visible; PDF de referencia con variante `—` | diferencia de variante activa |
| Perfiles y códigos | 2001 Riel Superior 1×1188; 2002 Riel Inferior 1×1188; 2004 Cabezal 2×596; 2005 Zócalo 2×596; 2009 Jamba 2×1000; 2010 Pierna 2×972; 2019 Traslapo 2×972 | códigos coinciden con subset visible Alumétrica; perfiles TP adicionales no aparecen |
| Vidrio | `Vidrio` 543×899 mm, cantidad 2 | dato Haciendo; composición exacta no expuesta |
| Fórmula de vidrio / corte | no expuestas; solo resultado de medida y longitudes | falta en Haciendo Ventanas |
| Despiece | tabla completa en `despieces-observados.md` | coincidencia de códigos; equivalencia algebraica pendiente |
| Accesorios | no visibles en PDF | falta en Haciendo Ventanas |
| Restricciones | Alumétrica advierte mezcla mono/TP; Haciendo separa variante de termopanel en UI | diferencia de representación; no elegir fórmula |
| URL / fecha | URL app · 2026-09-19 | trazabilidad completa |

### 4. Serie 25

| Campo | Dato observado / derivado | Comparación |
|---|---|---|
| Modelo | `Serie 25 — 2 hojas` | coincide con la identidad de línea |
| Material / apertura / módulos | Alumétrica: aluminio, corredera 2H. Haciendo expone corredera 2H | material falta en Haciendo; apertura y módulos coinciden |
| Variantes | toggles visibles `Reforzada` y `Con termopanel`; PDF usado quedó en `—` | coincide en disponibilidad, no en variante aplicada |
| Perfiles y códigos | 2501 Riel Superior 1×1184; 2502 Riel Inferior 1×1184; 2504 Cabezal 2×603; 2505 Zócalo 2×600; 2507 Traslapo 2×965; 2509 Jamba E 2×1000; 2510 Pierna 2×965 | parte de los códigos coincide con Alumétrica; no se vio todo el conjunto Alumétrica |
| Vidrio | `Vidrio` 534×872 mm, cantidad 1 en PDF | **conflicto**: modelo es 2 hojas y Alumétrica describe 2 hojas; no elegir cantidad/fórmula |
| Fórmula de vidrio / corte | no expuestas; solo resultados | falta en Haciendo Ventanas; salida de vidrio conflictiva |
| Despiece | tabla completa en `despieces-observados.md` | códigos coinciden parcialmente; cantidad de vidrio requiere Zeta |
| Accesorios | no visibles en PDF | falta en Haciendo Ventanas |
| Restricciones | toggles mono/TP y reforzada; combinación aplicada no queda en PDF como fórmula general | diferencia / conflicto de parametrización |
| URL / fecha | URL app · 2026-09-19 | trazabilidad completa |

### 5. Óptima S-28 — 2 hojas

| Campo | Dato observado / derivado | Comparación |
|---|---|---|
| Modelo / apertura | `Óptima S-28 — 2 hojas (termopanel)`, corredera | coincide |
| Material / módulos | Alumétrica: aluminio, TP, 2H. Haciendo no rotula material, sí TP y 2H | material falta en Haciendo; módulo coincide |
| Variantes | termopanel incorporado en el nombre, sin toggle | coincide con variante TP visible |
| Perfiles y códigos | S281 Riel 2×1200 + 2×1000; S282 Hoja TP 4×939 + 4×603; S283 Traslapo 2×939; S286 Cortagotera 1×1200 | códigos coinciden; S284/S285 no aparecen en esta salida 2H |
| Vidrio | `Termopanel` 493×829 mm, cantidad 2 | coincide en tipo y cantidad; composición no expuesta |
| Fórmulas | no expuestas; salida observada únicamente | falta en Haciendo Ventanas |
| Despiece / accesorios | despiece en archivo de observaciones; accesorios no visibles | despiece observado; accesorios faltantes |
| Restricciones / medida | 1200×1000; barra 6000; kerf 3; 2H | observado |
| URL / fecha | URL app · 2026-09-19 | trazabilidad completa |

### 6. Óptima S-28 — 3 hojas

| Campo | Dato observado / derivado | Comparación |
|---|---|---|
| Modelo / apertura | `Óptima S-28 — 3 hojas (termopanel)`, corredera | Haciendo coincide con la intención 3H; Alumétrica muestra una tarjeta rotulada 3H pero texto general que aparece como 2H |
| Material / módulos | Alumétrica: aluminio, TP, 3H; Haciendo: TP, 3H sin material explícito | material falta; **conflicto** de rotulado Alumétrica vs salida precisa Haciendo |
| Variantes | termopanel incorporado | coincide |
| Perfiles y códigos | S282 Hoja TP 6×939 + 6×424; S283 Traslapo 4×939; S285 Riel Triple 2×1200 + 2×1000; S286 Cortagotera 1×1200 | códigos coinciden; la salida confirma uso de S285 en 3H |
| Vidrio | `Termopanel` 314×829 mm, cantidad 2 | diferencia/alerta: 3 hojas pero 2 unidades de termopanel visibles |
| Fórmulas | no expuestas | falta en Haciendo Ventanas |
| Despiece / accesorios | despiece observado; accesorios no visibles | accesorios faltantes |
| Restricciones / medida | 1200×1000; barra 6000; kerf 3; 3H | observado; requiere Zeta |
| URL / fecha | URL app · 2026-09-19 | trazabilidad completa |

### 7. S-33

| Campo | Dato observado / derivado | Comparación |
|---|---|---|
| Modelo / apertura | `S-33 — 2 hojas`, corredera | coincide |
| Material / variante | Alumétrica: aluminio, TP, normal/reforzada. Haciendo no rotula material ni toggle de variante en este modelo | material y variante faltan en Haciendo |
| Perfiles y códigos | 3303 Traslapo 2×928; 3308 Hoja TP 4×928 + 4×600; 3324 Riel Cámara 2×1200 + 2×1000 | códigos principales coinciden con Alumétrica |
| Vidrio | `Vidrio` 488×816 mm, cantidad 2 | dato observado; Alumétrica no dejó fórmula dimensional equivalente en esta pasada |
| Fórmula de vidrio / corte | no expuestas | falta en Haciendo Ventanas |
| Despiece | tabla completa en `despieces-observados.md` | coincide en códigos observados; equivalencia algebraica pendiente |
| Accesorios / restricciones | no visibles; 2H del modelo | faltan accesorios; módulo coincide |
| URL / fecha | URL app · 2026-09-19 | trazabilidad completa |

### 8. S-33 RPT

| Campo | Dato observado / derivado | Comparación |
|---|---|---|
| Modelo / apertura | `S-33 RPT — 2 hojas (termopanel)`, corredera | coincide |
| Material / variante | Alumétrica: aluminio, TP, RPT; material no rotulado de forma específica por Haciendo | material falta; TP/RPT coincide por nombre |
| Perfiles y códigos | 3303 Traslapo 2×936; 3308R Hoja TP RPT 4×936 + 4×602; 3324R Riel RPT 2×1200 + 2×1000 | códigos principales coinciden con Alumétrica |
| Vidrio | `Termopanel` 491×825 mm, cantidad 2 | coincide en tipo/cantidad; composición no expuesta |
| Fórmula de vidrio / corte | no expuestas | falta en Haciendo Ventanas |
| Despiece | tabla completa en `despieces-observados.md` | coincide en códigos observados; fórmula pendiente |
| Accesorios / restricciones | no visibles; 2H | accesorios faltantes; módulo coincide |
| URL / fecha | URL app · 2026-09-19 | trazabilidad completa |

### 9. S-38 RPT

| Campo | Dato observado / derivado | Comparación |
|---|---|---|
| Modelo / apertura | `S-38 RPT — Proyectante`; categoría `Fijos y proyectantes` | familia coincide; Haciendo no ofrece selector fijo/2H separado |
| Material / variante | Alumétrica: aluminio, RPT, fijo/proyectante; Haciendo no rotula material, modelo sí RPT | material falta; variante de apertura parcialmente expuesta |
| Perfiles y códigos | `Marco RPT S381R` 2×1200 + 2×1000; `Hoja RPT TP S386R` 2×1167 + 2×967 | S381R/S386R coinciden con códigos Alumétrica; otros perfiles no aparecen en salida |
| Vidrio | `Termopanel` 1067×867 mm, cantidad 1 | **conflicto** con la ficha Alumétrica que registra 2 hojas y varias tipologías |
| Fórmula de vidrio / corte | no expuestas | falta en Haciendo Ventanas |
| Despiece | tabla completa en `despieces-observados.md` | resultado observado; requiere resolver apertura/módulo |
| Accesorios / restricciones | no visibles; modelo único proyectante | accesorios faltantes; conflicto de módulo/tipología |
| URL / fecha | URL app · 2026-09-19 | trazabilidad completa |

## Líneas exactas no encontradas

En el selector visible de Haciendo Ventanas no apareció un modelo con identidad
verificable para estas cinco líneas. No se probaron nombres alternativos ni se
investigaron candidatas nuevas.

| Ventora / Alumétrica | Material, apertura y módulos según Alumétrica | Campos Haciendo |
|---|---|---|
| AL-15 | aluminio; corredera; 2H | nombre, serie, variantes, perfiles, códigos, vidrio, corte, despiece, accesorios y medidas: **falta en Haciendo Ventanas** |
| AL-45 | aluminio; puerta; 1H | mismos campos: **falta en Haciendo Ventanas** |
| AM-35 | aluminio; puerta abatible/vaivén; 1H o 2H según tipología | mismos campos: **falta en Haciendo Ventanas** |
| Serie 5000 | aluminio; corredera; 2H | mismos campos: **falta en Haciendo Ventanas** |
| S60 | PVC; fijo/proyectante/abatible/oscilobatiente/puertas; 1–2H según tarjeta | mismos campos: **falta en Haciendo Ventanas** |

## Fórmulas, accesorios y reglas

Haciendo Ventanas comunica en su FAQ que calcula una pauta por línea y optimiza
barras, pero en esta consulta no mostró la expresión algebraica de las fórmulas.
La pauta PDF solo mostró resultados para las medidas de referencia. Por tanto:

- fórmula de vidrio: `falta en Haciendo Ventanas` en todas las líneas;
- fórmula general de corte: `falta en Haciendo Ventanas` en todas las líneas;
- despiece: `observado` solo para los PDFs listados;
- accesorios: `no observado` en los PDFs de esta pasada;
- ninguna diferencia de fuente se resuelve eligiendo una fórmula;
- Serie 25, Óptima S-28 3H y S-38 RPT pasan como conflictos explícitos a Sistema Zeta.

## Próximo paso seguro

Validar en Sistema Zeta, sin crear recetas productivas:

1. Serie 25: cantidad de vidrios y efecto de `Reforzada`/`Con termopanel`.
2. Óptima S-28: separación real 2H/3H, uso de S285 y cantidad de termopaneles.
3. S-38 RPT: relación entre `Proyectante`, `2 hojas` y la salida de un termopanel.
4. Serie 3200, Serie 4800, Serie 20, S-33 y S-33 RPT: confirmar fórmula algebraica
   contra el resultado PDF y la matriz Alumétrica.

