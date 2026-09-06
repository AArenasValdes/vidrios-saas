# Video Ventora — 25 líneas: configura en PC, cotiza en móvil

Estado: brief listo para grabar  
Fecha: 2026-09-05  
Audiencia: maestros, dueños de taller y equipos comerciales de vidrio, aluminio y PVC en Chile

## Objetivo

Explicar una sola idea:

> En PC dejas tus líneas comerciales y, si quieres, la fabricación configurada. En el celular eliges esas líneas para cotizar rápido. La pauta y la cubicación se revisan en PC.

Resultado esperado: que una persona pueda distinguir **precio comercial**, **línea por pieza** y **receta interna de fabricación** sin explicación externa.

## Verdad de producto que debe respetar el video

- El catálogo base muestra **25 líneas canónicas**: 19 de aluminio y 6 de PVC.
- Las 25 líneas no deben presentarse como “todas las líneas del mercado” ni como fórmulas universalmente validadas.
- Cada línea puede comenzar con **Precio pendiente**. El taller define su precio antes de usarla comercialmente.
- Precio comercial: precio por m², metro lineal, unidad o valor manual; también puede incluir mínimo cobrable y redondeo.
- Reglas comerciales avanzadas: costo de referencia, merma, margen objetivo, proveedor, sistema y vigencia.
- En móvil se puede crear o editar la identidad comercial y el precio, elegir el uso de la línea y usarla en una cotización.
- En móvil no se edita la receta: no se editan perfiles, códigos, descuentos de corte, largos comerciales ni pauta.
- En fabricación, **descuento** significa ajuste de corte en mm de un perfil. No significa descuento de precio al cliente.
- **Tira que compras** define el largo comercial usado para barras, sobrantes y pauta. No cambia las medidas de las piezas.
- Una receta puede partir desde plantilla sugerida, base tipológica o configuración propia. El taller debe probarla con un vano real y validarla.
- La pauta de Ventora es interna, referencial y revisable. No es optimización de barras, CNC ni fabricación automática.
- Una cotización puede mezclar líneas: cada pieza conserva su propia línea. La barra **Línea para todas** es una ayuda para aplicar una línea a varias piezas; no reemplaza la revisión por pieza.

## Arquitectura recomendada

No meter todo en un solo video corto. Grabar un master horizontal y sacar un recorte móvil:

| Pieza | Formato | Duración | Función |
|---|---:|---:|---|
| Master principal | 16:9, 1920×1080 | 2:10–2:30 | Enseñar PC → móvil → PC técnico |
| Recorte activación | 9:16, 1080×1920 | 0:50–0:65 | Mostrar elegir línea y cotizar desde una pieza |
| Ayuda contextual | 16:9 | 1:20–1:40 | Solo configuración de receta, descuentos y pauta |

El master explica el mapa. La ayuda contextual explica el detalle técnico. No narrar los 25 nombres uno por uno.

## Datos de demo

Usar cuenta de staging y datos ficticios:

- Línea ejemplo: `Serie 5000 — Corredera 2 hojas`.
- Sistema visible: `L5000`.
- Precio de ejemplo: `$120.000/m²`.
- Mínimo de ejemplo: `$40.000`.
- Redondeo de ejemplo: `$1.000`.
- Vano de prueba: `1.200 × 1.000 mm`.
- Tira de ejemplo: `6,00 m`.
- Cliente ficticio: `Cliente Demo`.

Rotular el precio como **ejemplo de demo**, no como precio recomendado por Ventora.

## Guion master — 16:9

Subtítulos: máximo 8 palabras por bloque. Voz tranquila, directa, sin jerga innecesaria.

| Tiempo | Visual | Texto en pantalla | Locución | Evidencia obligatoria |
|---|---|---|---|---|
| 0:00–0:07 | Placa Ventora + pantalla del catálogo | `25 líneas para ordenar tu catálogo` | “Tus líneas, precios y formas de trabajo pueden quedar ordenados en un solo catálogo.” | Logo oficial; no prometer cobertura total |
| 0:07–0:18 | PC en `/configuracion/empresa/lineas-precios` | `Primero: configura en PC` | “La configuración completa parte en el computador, donde ves tus líneas, buscas por proveedor o material y filtras por estado de fabricación.” | Filtros `Proveedor`, `Material`, `Fabricación`; contador `25 líneas` |
| 0:18–0:25 | Grid de tarjetas, zoom suave | `Aluminio · PVC · 25 líneas` | “Aquí aparecen las 25 líneas base de Ventora: aluminio y PVC.” | Mosaico con 25; no leer cada nombre |
| 0:25–0:40 | Tarjeta de Serie 5000; abrir precio | `Define cuánto cobras` | “Cada línea parte con su identidad comercial. Si dice Precio pendiente, agregas el valor que cobras en tu taller.” | `Precio pendiente` → `Agregar precio` |
| 0:40–0:54 | Editor de precio | `Precio · mínimo · redondeo` | “Guardas el precio por metro cuadrado, el mínimo cobrable y el redondeo. Ese valor queda disponible para futuras cotizaciones.” | Campos y botón `Guardar precio`; no guardar durante toma sin staging |
| 0:54–1:05 | `Agregar más detalles` abierto | `Reglas comerciales opcionales` | “También puedes dejar costo de referencia, merma, margen objetivo, proveedor, sistema y vigencia.” | Mostrar acordeón; ocultar datos innecesarios tras 2 segundos |
| 1:05–1:17 | Paso `Uso de la línea` | `Cotizar primero` | “Luego defines si la línea será solo comercial, si entregará una estimación o si prepararás cubicación y pauta.” | Opciones `Solo cotizar`, `Cotizar con estimación`, `Cubicación y pauta` |
| 1:17–1:28 | Paso `Fabricación` y aviso técnico | `La receta se configura aparte` | “El precio queda listo para cotizar. La receta técnica se configura en un espacio separado.” | Mensaje `Primero guardamos esta línea` |
| 1:28–1:43 | Receta en PC: `Piezas de la ventana` | `Perfiles · códigos · funciones` | “En PC defines las piezas reales de tu ventana, sus funciones y los códigos que usa tu taller.” | `Riel superior`, `Jamba`, `Pierna`; campo `Código` |
| 1:43–1:55 | Drawer de pieza | `Descuento de corte (mm)` | “El descuento aquí es un ajuste de corte en milímetros. No es descuento de precio.” | Campo `Descuento (mm)`; no usar palabra “rebaja” |
| 1:55–2:04 | `Tira que compras` | `Elige tu tira comercial` | “La tira que compras define barras, sobrantes y pauta; no cambia las medidas de las piezas.” | Chips `6,00 m`, `5,95 m`, `5,90 m` |
| 2:04–2:15 | `Probar con una medida real` → resultado | `Prueba antes de validar` | “Pruebas un vano real, comparas las medidas del taller y corriges lo necesario.” | `1.200 × 1.000 mm`; estados `Coincide` / `Requiere ajuste` |
| 2:15–2:24 | Pauta y resumen interno | `Pauta interna revisable` | “Cuando coincide con tu fabricación, la dejas lista para cotizar. La pauta es interna y revisable.” | `Pauta de corte`; `Tiras`; aviso referencial |
| 2:24–2:38 | Transición PC → móvil | `Después, cotiza desde el celular` | “Desde el celular no repites la configuración: eliges una línea que ya dejaste preparada.” | Corte visual claro PC / móvil |
| 2:38–2:50 | Móvil: pieza, material, selector de línea | `Línea y precio por pieza` | “En cada pieza eliges aluminio o PVC, seleccionas la línea y Ventora trae el precio configurado.” | Selector filtrado por material; resumen de precio |
| 2:50–3:00 | Móvil: dos piezas con líneas distintas | `Cada pieza puede tener su línea` | “Puedes mezclar líneas en una misma cotización. Cada pieza conserva su propia elección.” | Pieza 1 y pieza 2 con líneas distintas |
| 3:00–3:09 | Barra `Línea para todas` | `Aplica una línea en segundos` | “Si varias piezas usan la misma línea, Línea para todas acelera el trabajo. Después puedes cambiar una pieza.” | Acción explícita de aplicar; no mostrar cristal en línea global |
| 3:09–3:19 | Nota técnica móvil + regreso a PC | `Pauta y cubicación: PC` | “La pauta y la cubicación no se editan en el celular. Para eso vuelves al computador.” | Nota `Se revisa en desktop` |
| 3:19–3:30 | Cierre con cotización/PDF | `Configura en PC. Cotiza móvil.` | “Ventora: configura tus líneas en PC, cotiza desde el celular y revisa tu fabricación con orden.” | CTA único: `Escríbeme DEMO` |

La duración estimada supera 3 minutos si se dejan todos los tiempos. Para el master final, eliminar pausas y compactar escenas 1:17–2:24 a 55 segundos. El master objetivo queda en 2:30–2:45; la versión larga sirve como ayuda de producto.

## Recorte vertical — 9:16

| Tiempo | Visual | Subtítulo | Locución |
|---|---|---|---|
| 0:00–0:04 | Split PC/móvil | `¿Dónde configuro mis líneas?` | “La línea se prepara en PC y se usa desde el celular.” |
| 0:04–0:12 | Catálogo PC | `25 líneas · busca y filtra` | “En Líneas y precios ordenas tus líneas de aluminio y PVC.” |
| 0:12–0:20 | Precio | `Precio y mínimo cobrable` | “Defines cuánto cobrarás y guardas ese valor para futuras cotizaciones.” |
| 0:20–0:29 | Móvil, selector de línea | `Elige línea por pieza` | “En el celular eliges la línea y el precio se carga en la pieza.” |
| 0:29–0:38 | Dos piezas distintas | `Puedes mezclar líneas` | “Una cotización puede tener distintas líneas, una por cada pieza.” |
| 0:38–0:48 | Nota técnica móvil | `Pauta y cubicación: PC` | “Si necesitas pauta o cubicación, la dejas configurada y revisable en el computador.” |
| 0:48–0:58 | Logo + CTA | `Escríbeme DEMO` | “Escríbeme DEMO y te muestro el flujo completo.” |

## Ayuda contextual — receta, descuentos y pauta

Esta pieza debe ir separada del video de catálogo. Orden visual:

1. Línea comercial guardada.
2. `Administrar fabricación`.
3. Elegir plantilla sugerida, base tipológica o receta propia.
4. Revisar `Piezas de la ventana`.
5. Abrir una pieza y mostrar `Función`, `Perfil`, `Código` y `Descuento (mm)`.
6. Elegir `Tira que compras`.
7. Revisar barras y sobrantes como distribución referencial.
8. `Probar con una medida real`.
9. Comparar medidas del taller.
10. `Dejar lista para cotizar` solo después de validar.

Frase obligatoria:

> La receta la configura y valida cada taller con sus medidas reales. La pauta ayuda a revisar; no reemplaza un optimizador industrial.

## Placa final de las 25 líneas

Mostrarla como mosaico, agrupada por material y sin narrar nombres:

### Aluminio

Serie 5000 · Serie 20 · Serie 25 · Serie 32 · AM-35 · Serie 42 · Serie 4800 — Corredera 2 hojas · Óptima S-28 — Corredera 2 hojas · Óptima S-28 — Corredera 3 hojas · S-33 — Corredera 2 hojas · S-33 RPT — Corredera 2 hojas · Serie 42 — Proyectante con cámara · Serie 42 — Proyectante sin cámara · S-38 — Proyectante · S-38 RPT — Proyectante · MultiSlide S-83 — 4 hojas · MultiSlide S-83 — 8 hojas · Serie 3200 — Puerta abatible 1 hoja · Serie 4600 — Puerta vaivén

### PVC

WinHouse New S75 — Doble riel · WinHouse New S75 — Triple riel · WinHouse S60 · WinHouse Andes — Doble riel · WinHouse Andes Monorriel · WinHouse Andes — Proyectante

Rótulo recomendado: `25 líneas base · revisa precio y fabricación antes de cotizar`.

## Dirección de grabación

- PC: 1920×1080, captura limpia, cursor visible, zoom de 110–125% en campos.
- Móvil: 390×844 o 430×932, grabación vertical, safe areas respetadas.
- Usar solo staging y datos ficticios. No mostrar teléfonos, correos, clientes ni producción.
- Mostrar un ejemplo completo, no 25 configuraciones incompletas.
- Mantener la pantalla real; textos explicativos en marco lateral o rótulo inferior.
- Un rótulo por escena. No apilar “precio + fabricación + pauta” sobre la misma pantalla.
- Color de acento: azul Ventora `#1E88FF`; fondo oscuro para placas; app interna conserva su superficie clara.
- Voz posterior al master. Subtítulos grandes, máximo 8 palabras por bloque.
- Silenciar audio original de captura; cortar cargas, búsquedas y esperas.

## CTA y publicación

CTA único: **Escríbeme DEMO**.

Caption:

> Ordena tus líneas y precios en PC. Después cotiza desde el celular usando las líneas que realmente ocupas. Y si tu taller necesita pauta o cubicación, déjala configurada y revisable en computador. Escribe **DEMO**.

No decir: “las 25 líneas más usadas”, “fabricación automática”, “corte exacto”, “optimiza perfiles”, “sirve para cualquier taller” o “reemplaza tu cotizador técnico”.

## Medición

### Hechos de producto

- 25 líneas canónicas en `default-line-catalog.ts`.
- Precio comercial separado de receta.
- Receta/pauta configurada en PC.
- Uso de línea por pieza en cotización móvil.

### Supuestos de audiencia

- Maestros y talleres chilenos que cotizan por m², precio directo, margen o valor final.
- El usuario entiende mejor un ejemplo completo que una lista de 25 pantallas.

### KPI de decisión

- Retención al 50%, 75% y 95%.
- Conversaciones con `DEMO`.
- Demos que llegan a configuración de una línea.
- Primera cotización creada usando una línea.
- Porcentaje que distingue `precio comercial` de `pauta interna` en la demo.

No usar visualizaciones, reproducciones totales o “25 líneas” como prueba de demanda. Las 25 líneas describen cobertura del catálogo, no tamaño de mercado ni validación de fabricación.

## Checklist de grabación

- [ ] Cuenta staging exclusiva, datos ficticios.
- [ ] Precio de ejemplo rotulado como demo.
- [ ] Catálogo muestra 25 líneas sin promesa de cobertura total.
- [ ] Se ve `Precio pendiente` → `Agregar precio`.
- [ ] Se ve mínimo y redondeo.
- [ ] Se distingue `descuento (mm)` de descuento comercial.
- [ ] Se ve `Tira que compras` y aviso de efecto en barras/sobrantes.
- [ ] Se prueba un vano real y se compara con taller.
- [ ] Se muestra que pauta/cubicación se revisa en PC.
- [ ] Se muestra línea por pieza y mezcla de líneas en móvil.
- [ ] PDF cliente no muestra pauta ni costos internos.
- [ ] CTA único: `Escríbeme DEMO`.
- [ ] Subtítulos sincronizados, máximo 8 palabras.
- [ ] Revisar cuadro a cuadro privacidad antes de publicar.
