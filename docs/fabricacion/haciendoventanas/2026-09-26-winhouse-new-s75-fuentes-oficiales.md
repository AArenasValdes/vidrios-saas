# WinHouse New S75 — cruce con pauta y documentación oficial

Fecha de revisión: **2026-09-26**  
Fuentes primarias consultadas: [descargas WinHouse](https://winhouse-chile.cl/descargas/), [Sliding New S75](https://winhouse-chile.cl/linea-sliding-new-s75/), fichas técnicas enlazadas por el proveedor y el Excel **Pauta de corte Sliding S75** entregado por el usuario (`pauta-corte-sliding-s75.xlsx`).

Este documento cruza la matriz observada de Haceventanas con lo que publica WinHouse. Distingue identidad/compatibilidad, fórmulas que vienen en la pauta del proveedor y límites que impiden tratarlas como receta probada de Ventora.

## Catálogo oficial de variantes

La página de producto expone cuatro configuraciones comerciales: ventana y puerta para doble riel, y ventana y puerta para triple riel. La página muestra hoja ventana de 80 mm y hoja puerta de 98 mm en sus cortes ilustrados. La pauta oficial en Excel desglosa 12 pestañas de cálculo:

| Rieles | Configuración en pauta | Hoja |
|---|---|---|
| Doble | 2 hojas simétricas | 80 mm, 98 mm |
| Triple | 3 hojas simétricas | 80 mm, 98 mm |
| Doble | 2 hojas asimétricas | 80 mm, 98 mm |
| Doble | 3 hojas simétricas | 80 mm, 98 mm |
| Doble | 4 hojas | 80 mm, 98 mm |
| Doble | 3 hojas asimétricas, centro ancho | 80 mm, 98 mm |

La hoja de cálculo no presenta una pestaña para puerta/ventana como entidad separada; resuelve el ancho de hoja (80/98) y distribución de hojas. No se deben convertir las 12 pestañas en 12 SKU comerciales ni asumir compatibilidad de cada combinación sin el catálogo/taller.

## Datos oficiales por pieza

| Pieza/sistema | Dato oficial observado | Uso en el mapeo |
|---|---|---|
| Marco doble riel New S75 | PVC, barra 6 m, sección 48 × 75 mm, 3 cámaras, refuerzo Box integrado; compatible con hojas 80/98 y traslapos con cámara | Identidad del marco y compatibilidad; no confundir con el refuerzo de acero separado de 1.2 mm que la pauta también lista |
| Marco triple riel New S75 | PVC, barra 6 m, sección 48 × 135 mm, 3 cámaras, refuerzo Box integrado; hojas 80/98 y traslapos con cámara | Base de marco 3 rieles; validar refuerzo/cantidad específica por variante |
| Hoja corredera 80 | Perfil de hoja ilustrado para ventana; aparece con marco de ambos tipos | Receta de hoja 80, junquillo y refuerzo múltiple deben formar una variante conjunta |
| Hoja/puerta corredera 98 | Perfil ilustrado como puerta; refuerzo de hoja 2 mm | Receta 98 distinta de hoja 80. La ficha dice que el marco acepta ambos anchos, pero no amplía por sí sola el catálogo comercial de aperturas |
| Refuerzo de marco New S75 | Box galvanizado, 1.2 mm en cortes/fichas; los documentos nombran también perfiles de refuerzo de 2 mm para hoja/elementos complementarios | Mantener por rol: refuerzo de marco 1.2 mm no es intercambiable con refuerzo hoja 98 de 2 mm |
| Traslapo hoja 80/98 | Barra 6 m, PVC, sección 58 × 43 mm para 80 y 58 × 53 mm para 98; ficha: cruce central 4 mm y 5 mm (la figura rotula 5.2 mm para 98) | Perfil y largo de corte dependen de hoja/posición. Conservar 5 vs 5.2 como discrepancia del documento hasta confirmación |
| Riel de aluminio y felpa | Ambas aparecen como componentes de los cortes de ventana y puerta; felpa 7 × 6 fin seal | Son componentes de pauta, no perfiles PVC. El largo/cantidad de rieles cambia con la configuración |
| Acristalamiento | La FT enumera 4 y 22 mm como límites; la página comercial declara 4, 20 y 22 mm. El póster nombra junquillos 4–5, 17–20 y 20–22 mm y acristalamientos 8–10 y 12–14 mm | Hay rangos para monolítico y termopanel, pero no se deriva un SKU/composición automática de vidrio a partir de esta evidencia |
| Barras y colores | Perfiles principales en barras de 6 m; blanco, grafito, New Black, roble y nogal | Datos de compra/identidad; merma/optimización de barra sigue una regla separada |

La ficha de traslapo indica que el componente se aclipa detrás de la hoja, que se debe retirar el exceso de folio para insertar la felpa, y que WinHouse desarrolló una pauta para simetría en el cruce. Es una instrucción de montaje, no una fórmula de corte.

## Reglas candidatas que sí entrega el Excel

La pauta tiene 12 hojas tipológicas, datos de corte en longitud, cantidad, ángulos y posición, fórmulas de vidrio y secciones de herrajes. No es solo una muestra de una medida. Estas son las familias de reglas identificables en las fórmulas, con `X` = ancho exterior, `Y` = alto exterior, dimensiones en mm:

| Rol | Fórmula/indicación en pauta | Aplicación y límite |
|---|---|---|
| Marco | Horizontales `X + 5`, verticales `Y + 5`, inglete 45° | Regla común visible en pestañas simétricas; contrastar con las asimétricas y con los topes del perfil |
| Refuerzo de marco | Cantidad por lado según rieles; largo correspondiente del marco menos 85 mm, corte 90° | El Excel muestra refuerzo marco 1.2 mm; el número de piezas varía doble/triple riel |
| Hoja 80, 2H simétrica | Horizontales `(X − 80)/2 + 45`; verticales `Y − 48 − 48 + 16 + 5`; inglete 45° | Coeficientes específicos de 2H; no generalizar a 3H/4H ni asimétricas |
| Refuerzo/junquillo 80 | Pauta calcula refuerzo múltiple desde hoja menos `62 + 62 + 25`; junquillo desde hoja menos `62 + 62 + 5`; vidrio desde junquillo menos 8 mm | Despiece de hoja simétrica mostrado; selección de junquillo depende del vidrio elegido |
| Hoja 98, 2H simétrica | Horizontal `(X − 80)/2 + 54`; vertical usa el mismo desarrollo base del marco; hoja/refuerzo y junquillo se calculan aparte | La pauta usa refuerzo hoja 98 de 2 mm; conserva diferencia respecto de hoja 80 |
| Refuerzo/junquillo 98 | Refuerzo hoja menos `80 + 80 + 25`; junquillo menos `80 + 80 + 5`; vidrio desde junquillo menos 8 mm | Fórmulas expuestas para esta familia de pestañas; la ficha de acristalamiento debe resolver el junquillo admisible |
| Riel aluminio | Fórmula visible `X − 48 − 48 − 1`; cantidad depende de rieles/hojas según pestaña | No inferir consumo ni perfil de refuerzo de PVC a partir del riel |
| Traslapo 80/98 | Largo vinculado al largo de hoja vertical menos 7 mm en pestañas simétricas | Regla visible en algunas hojas; otras disposiciones codifican posición y cantidades específicas |
| 3H/4H y asimétricas | La pauta separa anchos de hojas A/B/C(/D), usa fórmulas y constantes distintas por geometría | Requiere una receta por configuración; no promediar ni reciclar regla 2H |

Los ángulos 45°/90° y las etiquetas de posición también forman parte de la pauta. El Excel además calcula vidrio, carros, cerraderos, manillas, felpa, topes, calzos y tornillos. Esos consumos dependen de selecciones y umbrales; se deben modelar en unidades/roles por separado de la lista de perfiles.

### Reglas que cambian entre las 12 pestañas

`A`, `B`, `C` indican hojas/posiciones; `a` y `b` son los anchos para A y B que el propio formulario distribuye. En la asimétrica de tres hojas, `D` representa el valor de distribución que usa la hoja (`D15` en las fórmulas), sin reinterpretarlo como una medida de vano universal. El centro B es ancho y A/C comparten el resto. El Excel conserva algunos nombres de celdas distintos entre pestañas, así que esta tabla transcribe la lógica geométrica y no una referencia directa de celda.

| Pestañas de la pauta | Reglas de hojas y cantidad | Elementos que cambian |
|---|---|---|
| Doble riel, 2H simétrica, hoja 80 | 4 piezas horizontales de hoja por ventana, largo `(X−80)/2+45`; 4 verticales, `Y−48−48+16+5` | Refuerzo múltiple = largo de hoja −149; junquillo = largo de hoja −129; vidrio = cada junquillo menos 8; 2 traslapos; 2 rieles |
| Doble riel, 2H simétrica, hoja 98 | 4 horizontales `(X−80)/2+54`; 4 verticales `Y−48−48+16+5` | Refuerzo hoja 98 = hoja −185; junquillo = hoja −165; vidrio = junquillo −8; 2 traslapos; 2 rieles |
| Triple riel, 3H simétrica, hoja 80 | 6 horizontales `(X−48−48+16)/3+58.3`; 6 verticales `Y−48−48+16+5` | Refuerzo múltiple −149; junquillo −129; vidrio −8; 4 traslapos; 3 rieles; el campo de cantidad del refuerzo de marco usa rieles + 1 (4 cuando H10=3) |
| Triple riel, 3H simétrica, hoja 98 | 6 horizontales `(X−48−48+16)/3+70.33`; mismas 6 verticales | Refuerzo hoja 98 −185; junquillo −165; vidrio −8; 4 traslapos; 3 rieles; mismo cálculo de cantidad de refuerzo de marco |
| Doble riel, 3H simétrica, hoja 80 | 6 horizontales `(X−48−48+16)/3+5+53`; 6 verticales `Y−48−48+16+5` | Refuerzo múltiple −149; junquillo −129; vidrio −8; 4 traslapos; 2 rieles; 2 refuerzos de marco horizontales |
| Doble riel, 3H simétrica, hoja 98 | 6 horizontales `(X−48−48+16)/3+5+65`; mismas 6 verticales | Refuerzo hoja 98 −185; junquillo −165; vidrio −8; 4 traslapos; 2 rieles; 2 refuerzos de marco horizontales |
| Doble riel, 4H, hoja 80 | 8 horizontales `((X/2−48+8−3)/2)+45`; 8 verticales `Y−48−48+16+5` | Refuerzo múltiple −149; junquillo −129; 4 traslapos; 2 rieles; adaptador de cuarta hoja = `Y−5` |
| Doble riel, 4H, hoja 98 | 8 horizontales `((X/2−48+8−3)/2)+49+5`; mismas 8 verticales | Refuerzo 98 −185; junquillo −165; 4 traslapos; 2 rieles; adaptador = `Y−5` |
| Doble riel, 2H asimétrica, hoja 80 | Hojas A/B separadas: horizontales `(a−48+8)+45`, `(b−48+8)+45`; 4 verticales `Y−75` | Cada hoja recibe refuerzo/junquillo/vidrio de su propia medida; traslapo A; 2 rieles |
| Doble riel, 2H asimétrica, hoja 98 | Horizontales `(a−48+8)+54−3`, `(b−48+8)+54−3`; 4 verticales `Y−75` | Refuerzo 98 −185 y junquillo −165 por hoja; traslapo A; 2 rieles |
| Doble riel, 3H asimétrica centro ancho, hoja 80 | A/C horizontales `D/4+45` (4 piezas), B `D/2+5` (2 piezas); 6 verticales `Y−75` | Refuerzo múltiple −149 y junquillo −129 por cada ancho; 4 traslapos; 2 rieles |
| Doble riel, 3H asimétrica centro ancho, hoja 98 | A/C horizontales `D/4+63` (4), B `D/2+5` (2); 6 verticales `Y−75` | Refuerzo 98 −185 y junquillo −165 por ancho; 4 traslapos; 2 rieles |

En las dos configuraciones simétricas de tres hojas, la pauta cambia su constante horizontal en **0.3 mm** entre riel triple y doble (80: `58.3` frente a `58`; 98: `70.33` frente a `70`). Es una diferencia literal de fórmulas, no se promedia. También hay condiciones visibles para refuerzo de contraflecha a partir de altura de marco 2300 mm y selección de refuerzo Box con inclinación a partir de 2500 mm en algunas pestañas de hoja 98. Esos umbrales y los nombres de refuerzo deben probarse en medidas inmediatamente inferiores/iguales/superiores antes de migrarlos.

## Auditoría de integridad de la pauta

- El archivo tiene 12 pestañas de tipología y dos hojas auxiliares/catálogos. La página de descargas WinHouse también lista **Pauta de corte Sliding S75** como recurso de la línea.
- Las fórmulas son evidencia primaria útil para reconstruir reglas, pero una entrada existente de una pestaña usa ancho exterior 7,605 mm y calcula marco de 7,610 mm, mayor que la barra comercial de 6 m. Es un caso fuera de largo de barra simple y no se usa como fixture válido; la pauta de barras debe resolver cortes empalmados/restricción por material por separado.
- Las pestañas dependen de validaciones/listas desplegables y hay celdas editables para medidas, color, vidrio y cantidad. Los valores iniciales/cacheados no se deben confundir con ejemplos nominales; la tipología seleccionada debe probarse con un recálculo controlado antes de aceptar el resultado.
- Algunas fórmulas son condicionales a umbrales de altura/ancho, refuerzo de contraflecha, herraje, color y vidrio. El código requiere reproducir las condiciones, no copiar únicamente un ejemplo calculado.
- El archivo recibido no trae un registro de versión/compatibilidad de Excel recalculado que permita tratar las celdas cacheadas como salida oficial vigente. Fórmulas extraídas = reglas candidatas; valores visibles/cacheados ≠ prueba de corte validada.
- El póster oficial vigente se titula/identifica como versión **abril 2026**. Incluye perfiles complementarios y rangos de junquillos. Los códigos del póster deben mapearse visualmente por perfil antes de asignar códigos a `profileReferences`; las salidas de Haceventanas no los mostraban.

## Estado de cubicación, despiece y pauta para Ventora

| Capacidad | Evidencia actual | Estado de implementación |
|---|---|---|
| Cubicación | Componentes, dimensiones, cantidades y vidrio calculados por la pauta oficial | Integrada para las 12 geometrías y 3 bandas de vidrio (36 combinaciones). En 2H asimétrica se ingresa ancho A y B = X−A; en 3H centro ancho A/C = X/4 y B = X/2 |
| Despiece | Fórmulas y ángulos de perfiles por geometría | Integrado para las 36 combinaciones; en 2H asimétrica requiere ancho A. La cotización calcula aunque falte el código físico: el perfil aparece «Por asignar» y el taller puede editarlo |
| Pauta de corte | Cortes por perfil con tiras comerciales de 6000 mm | Se guarda en `fabrication_recipes`; kerf, despunte y sobrante continúan como configuración del taller. No se importa la optimización del XLSX |
| Vidrio recomendado | La pauta abre con composición DVH 19 mm (`4+10+5`) y lista junquillos 3,7–6, 17–20 y 20–22 mm | Ventora propone `DVH 4+10+5` solo como valor inicial vacío; al elegir otro vidrio reconoce la banda compatible y cambia la variante de receta. Los vidrios laminados, fuera de banda y 24 mm no reciben receta automática |
| Validación de taller | No incluida en las fuentes web/Excel | Las recetas quedan `requiere_revision`, pero esto no bloquea el cálculo preliminar ni la cotización. Cada taller puede ajustar su copia |

Implementación local en `src/features/fabricacion/fixtures/winhouse-new-s75-recipes.ts`, catálogo multi-variante y resolutor de cotización. Se registran las 12 geometrías oficiales como slots, con tres bandas de vidrio cada una (36 combinaciones). Las 2H asimétricas reciben ancho A en la cotización y derivan B como X−A; las 3H asimétricas de centro ancho usan A/C = X/4 y B = X/2. No se creó arquetipo 4H ni tabla nueva: el catálogo de variantes suministra la identidad 4H. Los códigos de perfil dependen de color y taller; el XLSX sí permite sugerir códigos de marco/hoja 80/traslapo/junquillo por color, pero no completa de manera uniforme hoja 98, refuerzos ni riel de aluminio. El índice también muestra diferencias entre la banda monolítica 3,7–6 mm y algunos códigos de junquillo coloreados listados como 3–5 mm. Por eso los códigos no se asignan automáticamente a la receta: cada perfil debe quedar mapeado por color antes de probar.

En la cotización rápida y en el editor guiado se puede escoger explícitamente una de estas geometrías; el cambio recalcula la pieza con la receta elegida y no depende de inferir hoja 80/98 o simetría desde el nombre. Cuando un código de perfil aún no está asignado, el despiece sigue disponible como preliminar y muestra «Por asignar» para que el taller lo ajuste.

Estas 12 fórmulas son las geometrías de las pestañas de la pauta, **no todas las composiciones dibujadas en el póster comercial**. La receta actual cubre 2H doble riel simétrica/asimétrica, 3H doble riel simétrica, 4H doble riel, 3H doble riel asimétrica con centro ancho y 3H triple riel simétrica, en las bandas de vidrio correspondientes. No se debe ofrecer como cubierta la hoja fija, 4H con laterales fijos ni triple riel 6H: requieren fórmula explícita y cantidades por hoja fija/móvil. “3 hojas en marco doble” solo usa esta receta si la geometría coincide exactamente con la pestaña pautada.

La pauta no activa refuerzos condicionales en altura (contraflecha desde 2300 mm y Box inclinado desde 2500 mm), ni limita el ancho a una sola barra. Hasta modelar esos casos, son condiciones de revisión manual y no cobertura completa de taller. Tampoco se transfieren 3 mm de kerf/despunte ni el algoritmo de barras del sistema de terceros.

## Fuentes oficiales

- [Descargas WinHouse](https://winhouse-chile.cl/descargas/) — índice de las FT, póster, pauta y guía de traslapo.
- [Sliding New S75](https://winhouse-chile.cl/linea-sliding-new-s75/) — cuatro aperturas comerciales, componentes, colores, acristalamiento y cortes ilustrados.
- [Sliding doble riel New S75 FT](https://winhouse-chile.cl/descargar/ft/sliding-doble-riel-new-s75.pdf).
- [Sliding triple riel New S75 FT](https://winhouse-chile.cl/descargar/ft/sliding-triple-riel-new-s75.pdf).
- [Marco doble riel New S75 FT](https://winhouse-chile.cl/descargar/ft/marco-doble-riel-new-s75.pdf).
- [Marco triple riel New S75 FT](https://winhouse-chile.cl/descargar/ft/marco-triple-riel-new-s75.pdf).
- [Traslapo hoja 80/98 New S75 FT](https://winhouse-chile.cl/descargar/ft/traslapo-hoja-80-98-new-s75.pdf).
- [Póster técnico Sliding New S75, abril 2026](https://winhouse-chile.cl/descargar/sliding-s75-poster-tecnico-winhouse-chile.pdf). El enlace recibido con `sliding-new-s75-poster` no es la ruta publicada actualmente; se localizó la ruta vigente desde el índice oficial.
- **Pauta de corte Sliding S75**: archivo adjunto por el usuario. El índice oficial la publica como descarga XLSX.
- [Matriz de resultados de Haceventanas y 12 salidas observadas](./2026-09-26-winhouse-new-s75.md).
