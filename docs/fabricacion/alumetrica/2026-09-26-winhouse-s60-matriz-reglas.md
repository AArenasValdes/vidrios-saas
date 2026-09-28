# WinHouse S60 — matriz de variantes, perfiles y reglas candidatas

**Estado:** matriz documental de trabajo; fórmulas todavía no son recetas ejecutables ni validadas.  
**Fecha:** 2026-09-26  
**Línea Ventora:** `ventora:winhouse-s60` · PVC · WinHouse.  
**Objetivo:** relacionar las 32 tarjetas de Alumétrica con las tipologías y perfiles que WinHouse publica, separar cubicación, despiece y pauta, y dejar visibles los vacíos para resolver en orden.

## 1. Fuentes leídas y alcance de cada una

| Fuente | Aporta | No acredita por sí sola |
|---|---|---|
| [WinHouse S60 — página de línea](https://winhouse-chile.cl/linea-s60/) | Familia de aperturas estándar, despieces de sección de ventana/puerta, vidrio 4–32 mm y características generales. | Fórmulas de largo por pieza, cantidades de perfiles, barra comercial o pérdidas de corte. |
| [S60 FT](https://winhouse-chile.cl/descargar/ft/s60-ft-winhouse-chile.pdf) | Secciones de ventana y puerta con perfiles etiquetados, medidas de sección y límites recomendados por hoja. | Pauta de corte por ancho y alto del vano. |
| [S60 Tríptico](https://winhouse-chile.cl/descargar/linea-s60-triptico-haustek.pdf) | Secciones, medidas recomendadas, espesores, desempeño y aperturas ilustradas. Revisión impresa: 15-09-2024. | Reglas completas por cada combinación de apertura, vidrio y puerta. |
| [S60 Poster Técnico](https://winhouse-chile.cl/descargar/s60-poster-tecnico-winhouse-chile.pdf) | Catálogo gráfico de perfiles principales/complementarios, refuerzos, accesorios, códigos, cotas de sección y junquillos. Versión indicada: julio de 2026. | Identidad inequívoca entre cada alias de Alumétrica y el código interno del fabricante; cortes del marco/hoja a una medida de vano. |
| [Guía de ventanas plegables S60](https://winhouse-chile.cl/descargar/guia-plegable-2026-winhouse-chile.pdf) | 15 configuraciones plegables, orden de hojas, componentes, reglas de uso de hoja interior, herrajes y dibujos de armado. El riel plegable se entrega en formatos de 4 y 6 m. | Fórmulas de corte de cada perfil para cada ancho/alto, ni confirmación de fabricación exterior probada. |
| [Ficha WinHouse S60 de Alumétrica](https://alumetrica.comunaclic.cl/Catalogo/Lineas/Detalle/c76bbfe8-e94b-4864-a304-4b4686ea15b0) | 32 tarjetas con fórmulas, perfiles y herrajes declarados por tarjeta. Transcritas en [auditoría Alumétrica](2026-09-26-winhouse-s60-auditoria.md). | Que los campos de apertura, cantidad de hojas, vidrio y fórmulas estén mutuamente consistentes o validados por WinHouse/taller. |

## 2. Estados de evidencia que usaremos

- **Fabricante — identidad/sección:** WinHouse nombra o dibuja la pieza y publica su sección. Sirve para reconocer función y geometría del perfil.
- **Alumétrica — regla candidata:** la ficha declara una fórmula o cantidad. Puede iniciar el despiece documental; no se convierte automáticamente en fórmula Ventora.
- **Cruce nominal candidato:** abreviatura de Alumétrica parece corresponder al nombre de WinHouse; requiere confirmar código/sección cuando el corte depende de esa pieza.
- **Conflicto:** fuentes/campos se contradicen o falta un eje/cantidad. No generar salida calculable hasta resolverlo.
- **Prueba de taller pendiente:** una receta documental podrá calcular y probarse, pero no pasa a validada sin casos reales aprobados.

Variables de trabajo: `X` = ancho exterior terminado del elemento; `Y` = alto exterior terminado; milímetros. Esta convención sigue la ficha Alumétrica auditada. Los tamaños de sección dibujados por WinHouse **no** son descuentos ni sustituyen `X`/`Y`.

## 3. Universo de variantes publicado por WinHouse

La lámina de aperturas estándar muestra 18 dibujos: 7 de ventana y 11 de puerta. Las ventanas plegables son una familia adicional, con 15 configuraciones XYZ en su guía; no se deben confundir con 15 nuevas fórmulas de perfil.

| Familia oficial | Variantes dibujadas/publicadas |
|---|---|
| Ventana fija | Fijo |
| Ventana proyectante | Proyectante |
| Ventana practicable | Abatible simple interior; abatible simple exterior |
| Ventana oscilobatiente | Oscilobatiente |
| Ventana de dos hojas | Abatible doble interior; abatible doble exterior |
| Puerta simple | Simple interior; simple interior con zapata; simple interior paso libre; simple exterior; simple exterior con zapata; simple exterior paso libre |
| Puerta doble | Doble interior; doble interior con zapata; doble exterior; doble exterior con zapata; doble exterior paso libre |

La guía plegable lista: `220`, `202`; `330`, `303`, `321`, `312`; `440`, `404`, `431`, `413`; `550`, `505`, `541`, `514`; `633`. Indica 2–6 hojas, tres bisagras por pliegue y hoja ventana interior bajo 1800 mm; desde 1801 mm prescribe hoja puerta interior. La guía fija límites propios para esas hojas y declara que no se han realizado pruebas para fabricación exterior. Mantenerlas como `ventana_plegable_s60`, con configuración XYZ separada de `leaves_count`; no encajarlas en abatible estándar.

## 4. Cruce de perfiles

Las cotas son las publicadas en los dibujos de sección de WinHouse (mm); se conservan como cotas de perfil, no como reglas de largo de corte.

| Función WinHouse | Cotas de sección publicadas | Alias Alumétrica relacionado | Cruce | Nota |
|---|---:|---|---|---|
| Marco fijo S60 | 66.5 / 60 / 48 | `MARCOS60` | Nominal candidato | No asumir que “2 hojas” de las tarjetas de fijo signifique dos marcos o dos módulos. |
| Hoja ventana interior | 56.7 / 60 / 58; apoyo cerradero 7×7 | `HVIS60` | Nominal candidato | Separar de hoja exterior. |
| Hoja ventana exterior | 38 / 60 / 76.5; apoyo cerradero 9×9 | `HVES60` | Nominal candidato | Página técnica rotula esta pieza también en el esquema de puerta; Ficha/Brochure la corrigen a hoja puerta exterior para puerta. |
| Hoja puerta interior | 93 / 60 / 94.5 | `HPIS60` | Nominal candidato | Refuerzo de bisagra de puerta se publica separado. |
| Hoja puerta exterior | 74.5 / 60 / 113 | `HPES60` | Nominal candidato | La ficha, brochure y poster usan “Hoja puerta exterior S60”. |
| Poste T S60 | 80 / 60 / 43 | `PT60` | Nominal candidato | Comprobar compatibilidad con poste T real de las tarjetas. |
| Poste inversor o batiente | 46 / 59 / 63 | `PIBS60` | Nominal candidato | Confirmar si el alias refiere a este perfil y cuándo aparece en abatible doble. |
| Junquillo S60 | Vidrio 4–5; 17–20; 22–24 | `Jun4-5mm`, `Jun17-20`, `Jun22-24` | Nominal candidato | El fabricante presenta junquillos interiores. Seleccionar variante por acristalamiento. |
| Zapata puerta aluminio 60 mm | 62.8 × 20; barra indicada 3 m | `Zapata` / “solera” Alumétrica | Accesorio confirmado en línea; uso por variante candidato | El poster confirma que existe en S60. No resuelve si cada tarjeta “solera” usa esa misma sección y conector. |

### Refuerzos y auxiliares publicados

| Nombre/código WinHouse | Sección o espesor | Uso que admite documentar |
|---|---:|---|
| Ref. New Múltiple `PL-CMP-TC-MLT-12` | 1.2 mm; sección 33 × 24.6, retornos dibujados | Múltiple; asignar a marco/hoja solo según tarjeta y armado coincidente. |
| Ref. New Múltiple `PL-CMP-TC-MLT-2` | 2.0 mm; sección equivalente publicada | Variante más gruesa del múltiple; no combinar con 1.2 mm por inferencia. |
| Ref. Poste T `PL-S60-TC-PST-12` | 1.2 mm | Poste T. |
| Ref. Inercia T `PL-CMP-TC-INT-2` | 2.0 mm | Inercia T. |
| Ref. Box marco fijo inclinado `PL-S60-TC-BMF-12` | 1.2 mm | Marco fijo inclinado. |
| Ref. hoja puerta S60 `PL-S60-TC-HPF-15` | 1.5 mm | Hoja puerta; no equiparar con refuerzo de hoja de ventana. |
| Ref. Box esquinero 90° `PL-S60-TC-EQF-15` | 1.5 mm | Esquinero 90°. |
| Ref. tubular 60×100 `PL-REF-TC-TUB-2` | 2.0 mm; sección 87 × 52 | Refuerzo tubular. |
| Apoyo cerradero `HL-ACC-7X7-APOC-MA` / `HL-ACC-9X9-APOC-MA` | 7×7 / 9×9 | Asociaciones de apoyo publicadas para hoja interior/exterior respectivamente. |
| Ref. bisagra hoja puerta `PI-REF-BHP-NA` | 1.2 mm | Fijación de bisagra de hoja puerta. |

Los códigos de esta tabla sí están impresos en el poster oficial. Los códigos de los perfiles de PVC principales no aparecen en el mismo nivel de detalle; no reemplazar los códigos de estudio existentes en Ventora por equivalencias supuestas. Las referencias actuales de estudio (`7160Z00013`, `7160Z00016`, `716CZ00001`–`716CZ00003`, etc.) quedan en una columna de referencias separada hasta cotejar sección/código.

## 5. Variantes Alumétrica ↔ variantes oficiales

La asignación oficial expresa la familia funcional; no declara resueltos los subtipos interiores/exteriores, herrajes o cantidades que Alumétrica no especifica de forma consistente.

| Tarjetas Alumétrica | Nombre/familia Alumétrica | Familia oficial candidata | Regla/evidencia aprovechable | Estado de cruce |
|---:|---|---|---|---|
| 1–2 | Abatible mono/TP 4–5 | Proyectante **o** abatible simple | Vidrio `X−202 × Y−202`; tarjetas nombran abatible pero su cuerpo dice proyectante. | Conflicto de apertura; separar cuando WinHouse/armado confirme herraje y hoja. Tarjeta 2 además mezcla TP con 4–5 mm. |
| 3–5 | Abatible doble 17–20 / 22–24 / 4–5 | Abatible doble interior/exterior | Vidrio `X/2−166 × Y−202`; el medio ancho sugiere un paño por cada una de dos hojas. | 3–4 candidatas; definir sentido interior/exterior y conteo de vidrio. 5 bloqueada por TP vs monolítico. |
| 6–8 | Abatible izquierda TP | Abatible simple interior/exterior, mano por determinar | Vidrio `X−202 × Y−202`, cortes resumidos como hoja única. | Campo de 2 hojas contradice nombre/vidrio; la variante de mano no queda respaldada con fórmula diferenciada. |
| 9–11 | Marco fijo mono/TP | Fijo | Vidrio `X−104 × Y−104`. | Fórmula candidata; ficha marca 2 hojas en fijo. Corregir semántica de hoja/módulo antes de mapear al schema Ventora. |
| 12–14 | Oscilobatiente mono/TP | Oscilobatiente | Vidrio `X−204 × Y−204`. | Bloqueada: cortes verticales incompletos/duplicados; #13 contradice monolítico vs cuerpo TP. |
| 15–17 | Proyectante mono/TP 17–20/22–24 | Proyectante | Vidrio `X−202 × Y−202`. | Fórmula candidata; las tarjetas dicen 2 hojas aunque la variante oficial dibujada es de hoja simple. 16–17 requieren consistencia de vidrio TP. |
| 18–20 | Puerta con solera de aluminio mono/TP | Puerta simple interior/exterior con zapata | Vidrio `X−277 × Y−249`; WinHouse confirma zapata S60 60 mm como accesorio. | Candidata, no equivalencia cerrada: decidir “solera” vs zapata exacta, interior/exterior y conteo. #20 mezcla monolítico con regla TP. |
| 21–23 | Puerta doble paso libre mono/TP | Puerta doble paso libre | Vidrio `(X/2)−239 × Y−238`. | Familia geométrica candidata; doble hoja sugiere dos paños, pero “1 vidrio” en la tarjeta no define si el número es por elemento o por hoja. |
| 24–26 | Puerta doble perimetral mono/TP | Puerta doble | Vidrio `(X/2)−239 × Y−275`. | Falta equivalencia oficial para “perimetral”; confirmar diferencia de construcción y cantidad de paños. |
| 27–29 | Puerta paso libre mono/TP | Puerta simple paso libre | Vidrio `X−275 × Y−238`. | Familia candidata; las tarjetas declaran 2 hojas y 1 vidrio. Resolver cantidad/semántica. |
| 30–32 | Puerta perimetral mono/TP | Puerta simple o doble por confirmar | Vidrio `X−275 × Y−275`. | #31 tiene 1 hoja frente a 2 paralelas; la lámina oficial no llama “perimetral” a una apertura. |

**Lectura útil de cantidades:** diagramas oficiales distinguen visualmente fijo, hoja simple y hoja doble; las fórmulas de vidrio con `X/2` son coherentes con dos paños de ancho repartido. Esto permite proponer correcciones de conteo como hipótesis de reconciliación, pero conservar en la matriz tanto el campo original de Alumétrica como el valor candidato y su fuente; no sobrescribir la evidencia original.

## 6. Reglas candidatas separadas por salida

### A. Cubicación — componentes y cantidades

| Familia | Estructura visible/candidata | Datos por completar antes de calcular cantidad |
|---|---|---|
| Fijo | Marco S60 + junquillo + 1 paño fijo; refuerzo del marco según tarjeta. | Cantidad de cortes por eje y si el campo “hojas” de Alumétrica representa paños, hojas abribles o módulos. |
| Proyectante / abatible simple | Marco + 1 hoja + junquillo + vidrio; refuerzos de marco/hoja; herraje de apertura. | Diferenciar proyectante de abatible; orientación; cantidad y pertenencia de refuerzos; herrajes reales por mano. |
| Abatible doble | Marco + 2 hojas + poste inversor/batiente + junquillo y vidrio por hoja; refuerzos. | Confirmar si el poste inversor se usa en cada doble; si X se reparte simétricamente; cantidades de refuerzos/herrajes. |
| Oscilobatiente | Marco + hoja + junquillos/vidrio + refuerzos y herraje OB. | Tabla completa por X e Y, kit y cantidad de herrajes por tamaño. |
| Puerta simple/doble | Marco + hoja(s) puerta + hoja/s de vidrio + refuerzo bisagra y refuerzos correspondientes; zapata solo en variante con zapata. | Resolver paso libre/perimetral, cantidad real de paños, marco/zapata, poste y accesorios por variante. |
| Plegable XYZ | Marco/riel + hojas interiores de ventana o puerta + batientes/postes + carros/guías/bisagras + cremona según configuración. | Traducir XYZ a número por rol y cortes por orientación; peso máximo/rango de herrajes no está tabulado por medida en la guía. |

### B. Despiece — largos candidatos por perfil

Las siguientes expresiones vienen de las tarjetas Alumétrica auditadas. Son la base más concreta para iniciar recetas `draft`; el catálogo WinHouse ayuda a mapear **qué perfil físico es**, pero no publica esos descuentos. `X/Y` significa fórmula separada en el eje correspondiente, no división ni elección libre.

| Familia | Componente Alumétrica | Regla candidata documentada | Perfil WinHouse candidato | Estado |
|---|---|---|---|---|
| Fijo | `MARCOS60` | Horizontal `X+5`; vertical `Y+5`; 2 por lado según ficha | Marco fijo S60 | Fórmula identificada; verificar inglete/escuadra y unidades/cantidades exactas. |
| Fijo | Refuerzo de marco | `X−116`; `Y−116` | Refuerzo por posición, probablemente múltiple/box según armado | Descuento de fuente; tipo de refuerzo/ubicación requiere correspondencia. |
| Fijo | Junquillo | `X−96`; `Y−96` | Junquillo correspondiente al acristalamiento | Fórmula candidata; conteo y tipo de junquillo separados. |
| Hoja simple/proyectante/abatible | Marco | `X/Y+5` | Marco fijo S60 | Solo tarjetas cuya construcción confirme este patrón. |
| Hoja simple/proyectante/abatible | Hoja | `X/Y−75` | Hoja ventana interior o exterior, según variante | Perfil/ángulo requieren confirmación. |
| Hoja simple/proyectante/abatible | Refuerzo marco / hoja | `X/Y−116` / `X/Y−214` | Box/múltiple para marco; refuerzo propio de hoja | Mantener dos componentes separados. |
| Hoja simple/proyectante/abatible | Junquillo / vidrio | `X/Y−194` / `X/Y−202` | Junquillo por espesor / vidrio por hoja | No es intercambiable con fijo (`−96` / `−104`). |
| Abatible doble | Hoja | `X/2−39`; `Y−75` | Dos hojas de ventana | Regla candidata; distribuir ancho y cantidades explícitamente. |
| Abatible doble | Refuerzos | Marco `X/Y−116`; hoja `X/2−177` y `Y−214` | Refuerzo según marco/hoja | Requiere definir cada perfil y cantidad. |
| Abatible doble | Junquillo / poste / vidrio | `X−158`; `Y−194`; poste `Y−140`; vidrio `(X/2)−166` × `Y−202` | Junquillo, poste inversor, paños por hoja | Coherente como hipótesis para 2 hojas; cantidad de vidrios está ambigua en Alumétrica. |
| OB | Vidrio | `X−204 × Y−204` | Hoja OB y junquillo adecuado | Faltan largos de componentes verticales; no hay receta completa. |
| Puerta simple con zapata (tarjetas 18–20) | Vidrio | `X−277 × Y−249` | Hoja de puerta + junquillo/vidrio | Solo regla de vidrio resumida; las tarjetas dicen 2 hojas. La 20 además cruza monolítico con reglas TP. |
| Puerta simple paso libre (tarjetas 27–29) | Marco / hoja | Marco `X+5`, `Y+3`; hoja `X−75`, `Y−37` | Marco S60 + hoja puerta interior/exterior por confirmar | Patrón Alumétrica de una hoja; tarjetas dicen 2 hojas, por lo que queda candidato y no se activa. |
| Puerta simple paso libre (tarjetas 27–29) | Refuerzos marco / hoja | Marco `X/Y−116`; hoja `X−287`, `Y−252` | Refuerzo de marco / refuerzo de hoja puerta | Alias y código exacto de cada refuerzo sin cruzar; una hoja solo como hipótesis. |
| Puerta simple paso libre (tarjetas 27–29) | Junquillo / vidrio | Junquillo según espesor; vidrio `X−275 × Y−238` | Junquillo compatible + paño | Cantidad de paños no conciliada con tarjeta. |
| Puerta simple perimetral (tarjetas 30–32) | Marco / hoja | Marco `X/Y+5`; hoja `X/Y−75` | Marco S60 + hoja puerta interior/exterior por confirmar | Patrón de una hoja; tarjeta 31 dice 1 hoja y las #30/#32 dicen 2. No asignar en lote automáticamente. |
| Puerta simple perimetral (tarjetas 30–32) | Refuerzos marco / hoja | Marco `X/Y−116`; hoja `X/Y−287` | Refuerzo de marco / refuerzo de hoja puerta | Perfil/código y cantidad por lado pendientes. |
| Puerta simple perimetral (tarjetas 30–32) | Junquillo / vidrio | Junquillo `X/Y−267`; vidrio `X−275 × Y−275` | Junquillo compatible + paño | Cantidad y tipo de vidrio siguen en conflicto con tarjetas. |
| Puerta doble paso libre | Vidrio | `(X/2)−239 × Y−238` | Hoja puerta × 2 | Definir 2 vidrios como valor candidato por hoja y confirmar origen. |
| Puerta doble perimetral | Vidrio | `(X/2)−239 × Y−275` | Hoja puerta × 2 | Igual conflicto de conteo; “perimetral” sin definición oficial. |
| Puerta simple paso libre | Vidrio | `X−275 × Y−238` | Hoja puerta simple | Conteo de tarjeta contradice familia simple. |
| Puerta perimetral | Vidrio | `X−275 × Y−275` | Hoja puerta simple candidata | #31 tiene hojas distintas de #30/#32. |

Las expresiones de puerta anteriores son transcripción del patrón Alumétrica de una hoja, no una asignación automática a las tarjetas dobles. En doble puerta, la fuente disponible aquí aporta expresiones de vidrio con `X/2`, pero no queda reconciliado el conteo por hoja, la variante perimetral ni qué perfil de puerta corresponde a cada mano; esos campos permanecen bloqueados.

### C. Pauta — cortes por barra

| Dato requerido por el motor de pauta | Evidencia encontrada | Resultado |
|---|---|---|
| Largos de los cortes | Candidatos `X±c`, `Y±c` anteriores | Permite listar largos candidatos una vez fijadas tipología, cantidad y perfil. |
| Largo comercial de barras de cada perfil PVC/refuerzo | No observado para el surtido S60 en los documentos revisados | Pendiente por perfil. No copiar 4/6 m del riel plegable a los perfiles S60. |
| Riel de plegable | Guía indica formatos de 4 m y 6 m | Dato específico de `riel_plegable`; no determina holguras ni corte final. |
| Zapata de puerta | Poster indica barra de 3 m | Aplicable solo a zapata y variante que la use. |
| Kerf, despunte y tolerancia del taller | No documentados para S60 | Pendientes. No usar 10% de merma Alumétrica como largo de pieza ni como sustituto de kerf. |
| Perfil compartible entre variantes/casos | No definido | Separar por código confirmado; la pauta multi-medida solo puede consolidar perfiles idénticos. |

Conclusión: **podemos avanzar el despiece documental por familia**, pero la pauta de barras de perfiles PVC queda parcial hasta tener largo comercial por perfil, kerf/despunte y estructura de componentes sin contradicciones. FFD de Ventora distribuirá cortes de referencia, no optimización óptima.

## 7. Estado de Ventora observado

- El catálogo comercial tiene `ventora:winhouse-s60`, sin `ventoraPlantillaId` propio.
- La plantilla S60 recomienda inicialmente `Incoloro monolítico 4mm`, que corresponde a las tarjetas de fijo/proyectante monolítico 4–5 mm.
- Al cotizar, Ventora conserva el vidrio elegido en el ítem. La configuración S60 traduce `monolítico 4/5 mm`, `DVH 4+12+4` (20 mm), `DVH 4+16+4` (24 mm) o espesores explícitos compatibles a la variante documental de la tipología seleccionada.
- No se infiere una variante cuando el vidrio es laminado, el espesor queda fuera de 17–20/22–24 mm o la combinación de apertura/hojas no está incluida. La elección no cambia el estado `draft` ni acredita validación de taller.
- El catálogo de vidrio recomendado se rellena solo cuando el campo S60 está vacío; se conserva cualquier recomendación configurada por la empresa.
- El arquetipo `pvc_s60` actual es “PVC S60 abatible / doble contacto”: tipología abatible, 1 hoja y 1 módulo, con perfiles PVC genéricos. No modela las 18 aperturas estándar ni configuraciones plegables.
- `WINHOUSE_S60_PROFILES` hoy trae diez referencias de estudio: pilar fijo, elevación, ángulo de revestimiento, tres junquillos y cuatro refuerzos. Faltan referencias de los perfiles principales de PVC del catálogo oficial y el cruce con aliases Alumétrica.
- Desde la integración del 2026-09-26 existe `src/features/fabricacion/fixtures/winhouse-s60-recipes.ts`: registra ocho variantes documentales desde las tarjetas 3, 4, 9–11 y 15–17. Fijos mono/TP 17–20/22–24 usan ya los aliases, largos, cantidades y ángulos publicados para producir cálculo y pauta **preliminares**; conservan el estado `draft` y requieren validación real. Ventora usa su preset sugerido de barra de 6.000 mm porque Alumétrica no publica el largo comercial S60. Proyectantes y abatibles dobles continúan bloqueadas por cruces de perfil, cantidades o composición pendientes.
- Se agregó `ventora:winhouse-s60` al catálogo de slots multi-variante. El flujo existente los puede sembrar idempotentemente por organización como `draft`; no se consultó ni modificó la base remota durante esta implementación.
- El flujo nuevo soporta varias recetas por línea, tipología, `leaves_count` y variante. Por tanto, representar la familia requiere recetas separadas, no una receta S60 genérica que cambie de regla de acuerdo con el nombre.

## 8. Orden de trabajo propuesto

1. **Cerrar el diccionario de perfiles**: comparar 7 perfiles principales, nombres Alumétrica y referencias de estudio; dejar equivalencias dudosas como `pendiente`, no asignar SKUs por parecido.
2. **Abrir primero el lote estándar**: fijo; proyectante mono/TP; abatible simple interior/exterior mono/TP; abatible doble interior/exterior; OB; puertas simples/dobles, paso libre/zapata. Una fila por tipología × apertura × acristalamiento realmente soportado.
3. **Normalizar cantidades**: distinguir hojas abribles, paños de vidrio, módulos, refuerzos y accesorios. Conservar valores originales Alumétrica y la corrección candidata con su evidencia WinHouse.
4. **Borradores S60 ya cargados:** ocho slots conservan reglas de Alumétrica como `draft`. Fijos tarjetas 9–11 permiten cálculo y pauta preliminares; el snapshot muestra los ángulos de corte publicados. Proyectantes y abatibles dobles continúan bloqueadas hasta cerrar identidad de perfil y conflictos de cantidad/composición. Ninguna receta se valida por ese cálculo.
5. **Completar política de pauta**: largo comercial de cada PVC y acero, kerf/despunte y si las puntas se ingletean, cortan a tope o mecanizan.
6. **Tratar plegable como lote independiente**: codificar XYZ, hojas/perfiles, 3 bisagras por pliegue y kits; mantener por ahora solo despiece candidato del riel, sin declarar cortes de hoja derivados de dibujos.
7. **Ejecutar casos del laboratorio y validación de taller** antes de activar/snapshot en cotización.

**Siguiente candidato que vale la pena resolver:** proyectante de una hoja. Fijo ya calcula preliminarmente con Alumétrica; proyectante necesita completar el alias de la hoja y el cruce de refuerzos. La pauta por barras conserva 6.000 mm como preset Ventora hasta configurar la medida real de cada perfil.
