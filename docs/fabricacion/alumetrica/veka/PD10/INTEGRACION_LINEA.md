# Expediente VEKA PD10 — Alumétrica

Consulta: 2026-10-13. Fuentes primarias: [ficha VEKA PD10](https://alumetrica.comunaclic.cl/Catalogo/Lineas/Detalle/927fda38-d3b4-4440-a2f3-09c253847f02) y [tipologías PD10](https://alumetrica.comunaclic.cl/Catalogo/Tipologias?lineaId=927fda38-d3b4-4440-a2f3-09c253847f02&fab=VEKA). En **Detalle**, cada fila de tipología despliega vidrio, plan de corte y consumo de perfiles; las ocho reglas revisadas (6 PD10, 8 Softline) estaban disponibles aunque no se veían en las tarjetas Modelos.

## Identidad y alcance

- Proveedor / línea: VEKA / PVC PD10.
- Clave canónica Ventora: `ventora:veka-pd10`.
- Ficha Alumétrica: 21 referencias, 6 tipologías, 16 herrajes. Importes `$0,00`: no son costo de taller ni precio comercial.
- Se extrajeron las seis fórmulas completas. Las seis configuraciones aparecen en catálogo/selección con los rótulos de Alumétrica: tres Corredera y tres Fijo. No se activó una receta calculable porque etiquetas, hojas y perfiles de consumo tienen contradicciones que alteran la composición; ver “Bloqueos”.
- Estado: evidencia y fórmulas documentadas; composición por confirmar; validación de taller no realizada.

## Referencias de perfiles publicadas

| Código | Nombre publicado | Sección publicada | Barra publicada |
|---|---|---:|---:|
| 142.020 | Calzo de Acristalar | 100×20 | 5.800 mm |
| 713.013 | Refuerzo - Travesaño PD1011 | — | 5.800 mm |
| 713.021 | Refuerzo 713.021 | — | 5.800 mm |
| 713.033 | Refuerzo - Hoja 35x58mm | — | 5.800 mm |
| 713.265 | Refuerzo 713.265 | — | 5.800 mm |
| 744.004 | Cinta Doble Contacto | — | 5.800 mm |
| 744.008 | Tapa Desagüe con Válvula | — | 5.800 mm |
| 744.026 | Patín Doble | — | 5.800 mm |
| AM3700 | Adaptador 4 Hojas 43x51mm | 43×51 | 5.800 mm |
| AM3800 | Recubrimiento Adaptador 4 Hojas 17x44mm | 44×17 | 5.800 mm |
| BV50T | Junquillo Flexible 8 x 19mm - Vidrio 24-25 mm | 8×19 | 5.800 mm |
| BV707191 | Junquillo Flexible 8 x 32mm - Vidrio 3-4-5 mm | 8×32 | 5.800 mm |
| BV707192 | Junquillo Flexible 8 x 21,5mm - Vidrio 18-19-20mm | 8×21,5 | 5.800 mm |
| Felpa 5x5mm | Felpa 5x5mm | — | 5.800 mm |
| PD1011 | Travesaño 110x58mm | 110×58 | 6.500 mm |
| PD1014 | Marco 38x89mm - 709.606 | 90×38 | 6.500 mm |
| PDA1018 | Riel Aluminio 12x39mm - 705.563 | 12×39 | 5.800 mm |
| SR1174 | Traslapo Fijo 44x58mm - 709.605 | 44×58 | 5.800 mm |
| SR1175 | Hoja 35x58mm - 705.336 | 35×58 | 5.800 mm |
| SR1176 | Traslapo Móvil 44x58mm - 705.337 | 44×58 | 5.800 mm |
| SR1177 | Enganche Central 35x58mm - 705.338 | 53×12 | 5.800 mm |

Guion en sección = no visible en la tabla. La ficha mezcla perfiles, refuerzos, accesorios y adaptadores; guardarlos como referencias no implica que sean necesarios para todas las tipologías. No inferir rol de corte desde el nombre.

## Fórmulas extraídas — seis variantes

Convención de origen: `X` = ancho total del vano en mm; `Y` = alto total en mm. Los destajes incluyen el rol, código, longitud literal, cantidad y ángulos como los mostró la regla.

### Variantes `1H+1F ESPEJO` (tres reglas)

En las tres: 2 hojas en resumen, 1 vidrio, ancho `X/2−64`, alto `Y−49`.

| Nombre literal / vidrio admitido | Perfil de junquillo en corte | Nota |
|---|---|---|
| `1H+1F ESPEJO - (18-19-20)mm` / TP cualquier espesor | BV707192 | Resumen: apertura Corredera, 8 fórmulas de perfil, 13 destajes. |
| `1H+1F ESPEJO - DVH (24-25)mm` / TP cualquier espesor | BV50T | Resumen: apertura Fijo, 9 fórmulas, 13 destajes. |
| `1H+1F ESPEJO - DVH (3-4-5)mm` / monolítico solamente; TP no admitido | BV707191 | Resumen: apertura Fijo, 10 fórmulas, 13 destajes. |

Destajes comunes a las tres reglas (solo cambian los cuatro renglones de junquillo indicados abajo):

| Pieza | Perfil | Largo | Cant. | Extremos |
|---|---|---:|---:|---|
| Riel | PDA1018 | X−30 | 1 | 90°/90° |
| Hoja | SR1175 | Y−51 | 1 | 45°/45° |
| Hoja | SR1175 | X/2+30 | 2 | 45°/45° |
| Enganche | SR1177 | Y−51 | 1 | 45°/45° |
| Junquillo hoja | Junquillo de la variante | X/2−52 | 2 | 45°/45° |
| Junquillo hoja | Junquillo de la variante | Y−132 | 2 | 45°/45° |
| Junquillo fijo | Junquillo de la variante | X/2−51 | 2 | 45°/45° |
| Junquillo fijo | Junquillo de la variante | Y−37 | 2 | 45°/45° |
| Traslapo fijo | SR1174 | Y−37 | 1 | 90°/90° |
| Marco | PD1014 | X+5 | 2 | 45°/45° |
| Marco | PD1014 | Y+5 | 2 | 45°/45° |
| Refuerzo | 713.021 | Y−96 | 1 | 90°/90° |
| Refuerzo | 713.033 | Y−148 | 2 | 90°/90° |

### Variantes `1F+1H+1F ESPEJO` (tres reglas)

En las tres: el nombre literal incluye `PD10`; resumen 2 hojas, apertura Corredera para bandas 17–20 y 24–25, pero Fijo para 3–5 mm; 2 vidrios; ancho por vidrio `X/3−64`, alto `Y−50`.

| Nombre literal / vidrio admitido | Junquillo usado en los seis destajes de junquillo | Resumen |
|---|---|---|
| `PD10 1F+1H+1F ESPEJO - DVH (17-18-19)mm` / TP cualquier espesor | BV707192 | 12 fórmulas de perfil, 18 destajes. |
| `PD10 1F+1H+1F ESPEJO - DVH (24-25)mm` / TP cualquier espesor | BV50T | 13 fórmulas, 18 destajes. |
| `PD10 1F+1H+1F ESPEJO - DVH (3-4-5)mm` / monolítico solamente; TP no admitido | BV707191 | 13 fórmulas, 18 destajes. |

Destajes comunes a las tres; reemplazar `J` por el junquillo listado por variante:

| Pieza | Perfil | Largo | Cant. | Extremos |
|---|---|---:|---:|---|
| Riel | PDA1018 | X−30 | 1 | 90°/90° |
| Hoja | SR1175 | X−51 | 2 | 45°/45° |
| Hoja | SR1175 | Y/2−132 | 1 | 45°/45° |
| Traslapo móvil | SR1176 | Y−51 | 1 | 90°/90° |
| Enganche central | SR1177 | X−76 | 1 | 90°/90° |
| Hoja fija (fila 1) | J | Y−37 | 2 | 45°/45° |
| Hoja fija (fila 2 duplicada literalmente) | J | Y−37 | 2 | 45°/45° |
| Hoja corredera | J | Y−132 | 2 | 45°/45° |
| Hoja corredera | J | X/3−50 | 2 | 45°/45° |
| Hoja fija | J | X/3−23 | 2 | 45°/45° |
| Hoja fija | J | X/3−47 | 2 | 45°/45° |
| Traslapo fijo | SR1174 | X−37 | 1 | 90°/90° |
| Marco | PD1014 | X+5 | 2 | 45°/45° |
| Marco | PD1011 | Y+5 | 2 | 45°/45° |
| Refuerzo | 713.013 | Y−34 | 1 | 90°/90° |
| Refuerzo | 713.021 | X−96 | 1 | 90°/90° |
| Refuerzo | 713.033 | X−148 | 2 | 90°/90° |
| Refuerzo | PD1011 | Y−10 | 1 | 90°/90° |

### Consumo lineal publicado

Cada entrada de la tabla de consumo declara **Por Perímetro**, multiplicador `1.00`, merma `10%`, fórmula `((X+Y)×2/100) × 1.00 + 10% merma`. Es una estimación de metros lineales publicada, separada del plan de cortes. No convertir merma en descuento del largo de pieza.

| Regla | Perfiles que Alumétrica enumera para consumo |
|---|---|
| 1H+1F 18–20 | 713.021, 713.033, BV707192, PD1014, PDA1018, SR1174, SR1175, SR1177 |
| 1H+1F 24–25 | 713.021, 713.033, BV50T, BV707192, PD1014, PDA1018, SR1174, SR1175, SR1177 |
| 1H+1F 3–5 | 713.021, 713.033, BV50T, BV707191, BV707192, PD1014, PDA1018, SR1174, SR1175, SR1177 |
| 1F+1H+1F 17–19 | 713.013, 713.021, 713.033, BV707191, BV707192, PD1011, PD1014, PDA1018, SR1174, SR1175, SR1176, SR1177 |
| 1F+1H+1F 24–25 | 713.013, 713.021, 713.033, BV50T, BV707191, BV707192, PD1011, PD1014, PDA1018, SR1174, SR1175, SR1176, SR1177 |
| 1F+1H+1F 3–5 | 713.013, 713.021, 713.033, BV50T, BV707191, BV707192, PD1011, PD1014, PDA1018, SR1174, SR1175, SR1176, SR1177 |

## Bloqueos de composición e integración mobile

- Los nombres `1H+1F` y `1F+1H+1F ESPEJO` no concuerdan a primera vista con “2 hojas”; además Alumétrica etiqueta como Fijo algunas filas que nombra con paños `H` y `F`. Falta dibujo/croquis que defina paños, posiciones, hoja activa, fijo y sentido de apertura. Se conservan las seis opciones y sus rótulos de origen, sin inferir equivalencias geométricas.
- La banda 3–5 mm aparece bajo nombres que incluyen `DVH`, aunque la fórmula admite solo monolítico. El nombre de la variante no determina tipo de vidrio; manda la regla de vidrio, pero hace falta corregir o confirmar su identidad comercial.
- En `1H+1F 24–25`, el plan corta junquillo BV50T pero consumo también incluye BV707192. En `1H+1F 3–5`, el plan usa BV707191 pero consumo además lista BV50T y BV707192.
- En `1F+1H+1F 17–19`, las seis longitudes de junquillo usan BV707192, pero la tabla de consumo enumera BV707191 y BV707192. Para las variantes 24–25 y 3–5 el consumo enumera los tres códigos de junquillo aunque el corte selecciona solo uno.
- En `1F+1H+1F`, el renglón de junquillo fijo `Y−37`, cantidad 2, está repetido. Se conserva como evidencia y no se deduplica sin que el proveedor confirme si es error o dos conjuntos con rol indistinguible.
- La apertura del resumen cambia a Fijo para la variante 3–5 en ambas familias, mientras otras bandas de vidrio de la misma composición marcan Corredera.
- Los conteos del resumen “fórmulas de perfil” no siempre equivalen al número de códigos únicos, sobre todo donde el consumo enumera perfiles no usados en destajes.

No hay pares inequívocos componente + sistema + composición listos para el Paso 1 móvil. Por ello no se registra compatibilidad ni slot/receta; no se crea descuento, precio ni snapshot técnico por inferencia. Tras confirmar croquis y corregir los renglones en conflicto se puede adaptar cada variante al flujo móvil común y escribir una prueba numérica independiente por fórmula. Hoy el cálculo correcto es `sin_receta`.

## Recorrido trazable

| Tramo | Estado |
|---|---|
| Evidencia fuente y fórmulas | Seis reglas desplegadas y transcritas arriba. |
| Fixture / catálogo / seed | Seis configuraciones visibles en catálogo/selección; sin receta ni precio importado. |
| Guiada / Constructor / Paso 1 | Seis configuraciones exactas: tres Corredera y tres Fijo según la ficha. Se conserva cada variante de vidrio y la composición queda pendiente. |
| Perfil / receta / snapshot | Referencias informativas; despiece debe quedar `sin_receta`. |
| Pruebas | Contrato de catálogo/referencias y `sin_receta`; sin pruebas numéricas de corte hasta resolver identidad geométrica. `pnpm fabrication:verify --build`: 181 suites y 1.512 pruebas pasaron; TypeScript y `docs:check` pasaron; build bloqueado por `EPERM` al crear `.next/server/app/api/admin`. |
| Smoke Ventora / taller | No ejecutado. Solo se inspeccionó el sitio Alumétrica; no hubo escritura en organizaciones ni base remota. Validación física pendiente. |
