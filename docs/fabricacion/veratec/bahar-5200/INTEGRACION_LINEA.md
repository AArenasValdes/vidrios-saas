# Integración VERATEC Bahar 5200

## Alcance y fuentes

- Identidad: VERATEC · Bahar 5200 · PVC 52 mm (`veratec:bahar-5200`).
- Precios de perfiles: `docs/fabricacion/veratec/MATERIALES PRECIO VERATEC.xlsx`, pestaña `BAHAR`. Revisión de origen 2022-07; precios netos históricos de referencia, no confirmación de vigencia actual.
- Pautas: `docs/fabricacion/veratec/pauta de corte veratec.xlsx`. Se integran las cuatro hojas finales: `Plegable 3-3-0`, `Plegable 4-3-1`, `Plegable 6-5-1` y `Plegable 7-4-3`.
- Longitud de presentación usada: 5.800 mm, según la lista de precios Bahar.
- Todas las recetas son documentales y están `lista_para_validar`; no hay confirmación de prueba física ni validación de taller.

## Variantes incluidas

### Sistemas de apertura documentados en la lámina ProPanel

La lámina de aperturas entregada por el usuario enumera: **abatible, oscilobatiente, pivotante, proyectante, oscilante + fija, doble oscilobatiente, plegable, oscilante + batiente, batiente + oscilobatiente y fija + oscilante**. Es evidencia de configuraciones disponibles, no una pauta de corte para cada dibujo.

La hoja de corte `ABATIR EXT Y PROY` sí respalda tanto la ventana abatible exterior como la proyectante; se mantiene una sola línea comercial exterior y se elige la receta según apertura. Oscilobatiente, pivotante y las composiciones mixtas quedan identificadas como sistemas de catálogo pendientes de una pauta compatible; no se les asignan fórmulas por semejanza visual. Plegable conserva solo las cuatro composiciones con hojas de pauta: 3/3/0, 4/3/1, 6/5/1 y 7/4/3.

### Códigos impresos en la lámina de perfiles

| Perfil Bahar 5200 | Código de sección impreso |
|---|---:|
| Marco fijo | 5201 |
| Hoja de ventana interior | 5212 |
| Barra T | 5203 |
| Hoja de ventana exterior | 5209 |
| Perfil inversor | 5207 |
| Hoja de puerta interior | 5204 |
| Hoja de puerta exterior | 5210 |
| Junquillo para vidrio 4 mm | 7088 |
| Junquillo para vidrio 18 mm | 7063 |
| Junquillo para vidrio 24 mm | 7464 |

Estos son códigos de perfil impresos en la lámina de secciones. Los SKU comerciales de la planilla de precios (por ejemplo, `65201VER` y `65209VER`) se mantienen como identidades separadas; la lámina por sí sola no demuestra una equivalencia de SKU. La misma lámina indica refuerzo interior de acero galvanizado y protección anticorrosiva en extremos; su consumo no se agrega a las recetas si la pauta correspondiente no lo cuantifica.

Las variantes de ventana exterior y proyectante comparten el juego de perfiles y ajustes de la hoja `ABATIR EXT Y PROY`, pero se filtran por apertura. En el selector, las copias de una misma receta se consolidan aunque el registro genere IDs internos distintos; cambios en código de perfil, fórmula o cantidad siguen siendo opciones separadas.

| Hoja / variante | Entrada de muestra (mm) | Hojas | Corte de hoja regular (cantidad) | Hoja especial (cantidad) |
|---|---:|---:|---|---|
| Plegable 3/3/0 | 2600 × 2015 | 3 | W/3 − 48 (4 cortes) | Hoja 1: W/3 + 42 (2 cortes) |
| Plegable 4/3/1 | 2885 × 2225 | 4 | W/4 − 35,5 (6 cortes) | Hoja 1: W/4 + 54,5 (2 cortes) |
| Plegable 6/5/1 | 4955 × 2210 | 6 | W/6 − 31,333 (8 cortes) | Hoja 1: W/6 + 58,667 (2); hoja 4: W/6 + 18,667 (2) |
| Plegable 7/4/3 | 5410 × 2277 | 7 | W/7 − 39,429 (8 cortes) | Hojas 1: W/7 + 50,571 (4); hoja 4: W/7 + 10,571 (2) |

Reglas comunes transcritas de las cuatro hojas:

- Marco 65201VER: ancho W + 6, ×2; alto H − 75 + 6 (H − 69), ×2.
- Hoja interior de puerta 65204VER: alto H − 75 − 64 + 6 (H − 133), dos cortes verticales por hoja.
- Vidrio: ancho de cada hoja − 214 mm; alto H − 347 mm. La hoja de pauta separa los paños regulares y especiales según cada composición.
- Los cortes de marco y hoja están indicados a 45° en ambos extremos.
- Las fórmulas fraccionarias se redondean al milímetro más cercano en el motor de Ventora, como exige su contrato actual de corte.

Las salidas reproducen las muestras del Excel al milímetro entero. No se añadieron refuerzos, junquillos, espesores de vidrio ni accesorios: esas hojas no publican su selección o consumo para las composiciones plegables.

## Precios y alcance del costo

El archivo `src/features/proveedor-catalogos/fixtures/veratec-bahar-5200-price-list.ts` conserva los diez perfiles Bahar, cinco acabados y 50 precios netos CLP. Se cargaron al catálogo compartido 40 precios de ocho perfiles con largo comercial de 5.800 mm, vinculados a la lista que ya usa Xelena/Veratec en “Mis precios”. Para los perfiles usados por estas pautas, la presentación blanca muestra 65201VER000 a $21.790 y 65204VER000 a $35.469 por tira. Los otros acabados usan las cifras del mismo libro.

Quedaron fuera los 10 SKU de los junquillos 67063VER (18 mm en la hoja Bahar, pero 24 mm en el catálogo ya cargado) y 67464VER (24 mm en Bahar, pero asociado a Compact Sliding 20 mm). No se reemplazaron ni duplicaron esas asociaciones compartidas; necesitan resolver la diferencia de identidad antes de cargar esos precios.

El cálculo técnico puede valorizar los perfiles disponibles por acabado; el total queda **parcial** mientras falten los junquillos en conflicto y reglas de vidrio/quincallería. Los precios aparecen como referenciales y no cambian el precio comercial de venta por m². La importación global fue idempotente y no necesitó migración.

## Integración y pruebas

| Tramo | Estado |
|---|---|
| Catálogo comercial | 3 configuraciones de ventana/fijo existentes + 4 variantes plegables nuevas con claves independientes, tipo Puerta, apertura Plegable y hojas 3/4/6/7. |
| Selección de receta | Fallback exacto por `catalogKey`; la variante no se hereda a otra composición ni organización. |
| Cubicación | Prueba numérica por cada hoja con medidas nominales de la fuente, cantidades de cortes y vidrios. |
| Cotización y costo | Prueba por variante desde el ítem cotizado hasta snapshot, pauta sugerida y costo parcial CLP de 65201/65204. |
| Historial | No se altera snapshot existente; una receta nueva solo aplica a cotizaciones sin snapshot o a nuevos cálculos. |
| Supabase / navegador | Sin escrituras remotas. La UI autenticada, guardado/reapertura y vigencia real del precio no se certifican aquí. |

Estado final: **lista para probar**. No significa validada físicamente ni lista para producción. Kerf/despunte siguen configurables por cada taller.
