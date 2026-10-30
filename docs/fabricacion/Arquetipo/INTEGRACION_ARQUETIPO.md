# Expediente de integración de línea

Copiar este archivo a la carpeta de evidencia correspondiente y completar antes del cierre. Guía: [workflow de integración](../WORKFLOW_INTEGRAR_NUEVA_LINEA.md).

## Identidad y alcance

- Proveedor: Distribuidora Arquetipo. Fabricante de cada perfil: no declarado de forma uniforme en estas fuentes.
- Familias: líneas 15, 20, 25, 4000, 5000, 35, 45, 12, 32 y 42. El catálogo Arquetipo aporta perfiles/códigos y una cotización de referencia; la línea Ventora se identifica como universal por número y el proveedor se mantiene en sus presentaciones de compra.
- Fuentes: `Arquetipo_Catalogo_Aluminios.pdf` (págs. 3–25), cotización 27811 (01-10-2026, págs. 1–2). La cotización registra precios netos por presentación `TIRA`, acabado LEGNO, para 29 códigos de las líneas 20, 25, 32, 42 y 5000. Es una cotización de una compra, sujeta a stock y mercado; no es lista general publicada.
- `MOD Catalogo_SISTEMA_SUPERIOR QT.pdf` revisado. Se excluye del alcance solicitado: documenta sistemas SUPERIOR distintos, sin precios en la cotización y sin equivalencia exacta con las diez líneas; no se mezclarán por tipología visual.
- Estado al importar (2026-10-05): publicación directa e idempotente en las tablas globales del catálogo compartido de producción, autorizada por el usuario para todas las organizaciones. El 2026-10-06 se aprobó el criterio universal por número de línea y la sincronización global archiva siete duplicados de catálogo por proveedor; conserva recetas/snapshots históricos.
- Salida: 84 perfiles/presentaciones de referencia para las 10 familias y 29 precios netos en CLP, cotizados para acabado LEGNO desde cotización 27811 (total CLP 513.984). Por instrucción del usuario, el precio LEGNO —el acabado de mayor costo— se usa como referencia conservadora para cualquier acabado seleccionado; esto no afirma que Arquetipo cobre lo mismo por todos los colores. Son precios por presentación TIRA para referencia de compra; no son precio de venta por m² ni una lista general del proveedor. Vigencia no indicada.
- Largo comercial: 6.000 mm aplicado como predeterminado global por instrucción del usuario. La cotización no lo confirma; no convertir los precios por tira a precio por metro. Mantener visible esta procedencia asumida.

### Qué aporta el catálogo técnico (revisión completa 2026-10-05)

El PDF contiene fichas comerciales, dibujos de secciones de perfiles, códigos y algunas dimensiones de sección. Sus páginas técnicas para las diez líneas son: L15 pp. 6–7, L20 pp. 8–9, L25 pp. 10–13, L4000 pp. 14–15, L5000 pp. 16–17, L35 pp. 18–19, L45 p. 20, L12 p. 21, L32 pp. 22–23 y L42 pp. 24–25. Estas láminas no contienen una tabla de descuentos ni fórmulas de largo para despiece/cubicación. L25 sí declara largos comerciales de 6,0 y 4,85 m para algunos perfiles; no son fórmulas de corte.

La instrucción explícita de corte que sí aporta el catálogo está en la ficha técnica de Línea 12 (página impresa 5; página 21 del PDF): marco a 90° y hojas a 45°. Combinada con la captura del editor del usuario, completa el ángulo de los dos grupos de cortes del perfil 1204; no aporta por sí sola descuentos ni define composición, vidrio o consumos de quincallería. Para las otras nueve líneas hacen falta pautas de fabricación con reglas de medida y cantidad; las secciones dibujadas no permiten deducir esos datos.

### Criterio universal confirmado por el taller (2026-10-06)

El padre del usuario confirmó que cada familia tradicional de aluminio comparte despiece, descuentos, cubicación y pauta entre vendedores. Se usa una identidad por número de línea: `universal:aluminio:l15`, `l20`, `l25`, `l4000`, `l5000`, `l35`, `l45`, `l12`, `l32` y `l42`. Proveedor deja de formar parte de la identidad comercial; las listas/precios de cada vendedor permanecen en sus presentaciones. Los precios Arquetipo LEGNO existentes sirven de referencia conservadora para cualquier color, por decisión del usuario.

El resolver conserva fórmulas por familia y variante. Cuando el código Arquetipo difiere del código Ventora, fixture declara un `recipeComponentCodes` explícito: Línea 15 (1508→1507), Línea 4000 (mapeo por rol de marco/hoja) y Línea 45 (4502→4522, 4504→4534). Los códigos con rol distinto o ambiguo se mantienen excluidos. No se modifican fórmulas/descuentos de recetas existentes ni se marcan validadas.

Línea 35 conserva solo perfiles candidatos; faltan composición seleccionada, cantidades y descuentos necesarios para una pauta completa. El acuerdo universal confirma equivalencia entre proveedores, pero no aporta esos valores por sí solo.

La línea 12 conserva cinco reglas de la captura y tira 6.000 mm predeterminada. La referencia de ángulos es la ficha técnica de Línea 12 (página impresa 5 / página 21 del PDF); los dibujos y códigos están en las páginas impresas 20–21.

### Estado anterior por proveedor (2026-10-05; supersedido)

El criterio anterior mantuvo siete entradas separadas por vendedor y no conectó recetas homónimas. Quedó reemplazado el 2026-10-06 por las claves universales descritas arriba; esta sección se conserva solo como registro histórico.

Las entradas Arquetipo nuevas exponen los 84 perfiles/presentaciones técnicos y los precios globales que constan en la cotización. Solo una receta compatible y configurada puede producir despiece/cubicación; este cambio de identidad no crea fórmulas para las entradas nuevas ni declara recetas de taller validadas. El snapshot de fabricación conserva su familia de proveedor y el costo técnico exige coincidencia exacta cuando está presente.

La sincronización global de líneas por organización queda en `scripts/catalog/organize-arquetipo-lineas-global.ts`; primero simula los cambios y solo escribe con `--apply`. Las filas con proveedor personalizado se conservan.

## Fuentes y asociación con Ventora

| Línea Arquetipo | Clave Ventora relacionada | Coincidencia observada | Límite aplicado |
|---|---|---|---|
| 15 corredera | `ventora:serie-15-corredera-2h` | Identidad universal por número. Fixture vincula explícitamente 1508→1507 por rol. | 1507 Arquetipo conserva rol distinto/ambiguo respecto de la receta y queda excluido; no se infiere compatibilidad solo por código. |
| 20 corredera | `ventora:l20` | Identidad universal; códigos Arquetipo asociados a la familia en fixture. | El proveedor se conserva en las presentaciones de compra. No derivar largo de barra desde la sección. |
| 25 corredera | `ventora:l25` | Identidad universal; códigos Arquetipo asociados a la familia en fixture. | No cambiar sus 18 recetas ni estado por incorporar precios de compra. Largo de tira de la cotización no confirmado; 6.000 mm es el predeterminado pedido por el usuario. |
| 4000 corredera | `ventora:serie-4000-corredera-2h` | Identidad universal y equivalencias fixture explícitas por rol para perfiles desplazados entre catálogos. | El catálogo no documenta el código Ventora 4009; equivalencias se limitan a los códigos declarados en fixture. Sin precio en cotización 27811. |
| 5000 corredera | `ventora:l5000` | Línea y códigos 5001–5007 coinciden con la plantilla inicial. | Mantener plantilla sugerida; no elevarla a fórmula del fabricante ni validada por taller. El precio LEGNO se aplica como referencia conservadora a cualquier acabado por instrucción del usuario. |
| 35 puerta | `ventora:l35` | Nombre de línea compatible. | El catálogo aporta perfiles, no una pauta de cortes completa. Sin precio en cotización 27811. |
| 45 puerta | `ventora:serie-45-puerta` | Identidad universal y equivalencias fixture explícitas por rol (4502→4522, 4504→4534). | Solo se enlazan equivalencias declaradas; no se infieren roles para otros códigos. Sin precio en cotización 27811. |
| 12 shower | `ventora:serie-12-shower-corredera` | Identidad universal; códigos 1201–1204 y uso coinciden. La captura del editor aporta 5 reglas y 9 cortes para shower 2H. La ficha técnica (página impresa 5 / PDF p. 21) confirma marco a 90° y hojas a 45°. | Descuentos capturados: 1203 ancho total −5; 1201 ancho total −5; 1202 alto total −3 ×2; 1204 ancho por hoja +5 ×4 (45°); 1204 alto de módulo −65 ×1 (45° por regla explícita de hojas). Sin captura/fuente para composición de vidrio y consumos de quincallería. Tira 6.000 mm es el predeterminado solicitado por el usuario, no una medida confirmada por Arquetipo. No hay precio Línea 12 en la cotización 27811. |
| 32 proyectante/paño fijo | `ventora:l32` | Identidad universal; códigos asociados por SKU/código. Se conserva la diferencia textual “PILAR”/“PALILLO” entre cotización y catálogo. | No se vincula por semejanza de descripción ni se altera fórmula existente. |
| 42 proyectante/paño fijo | `ventora:l42` | Identidad universal; códigos asociados por SKU/código, conservando la variante sin cámara documentada. | Las diferencias textuales/roles de 4204 y 4231 se mantienen explícitas en fixture; no cambia variante ni validación. |

### Datos de compra capturados

- Moneda CLP; importe neto por tira; cantidad cotizada 1 por SKU; acabado cotizado LEGNO. La aplicación a otros acabados es una política referencial solicitada por el usuario, no una equivalencia comercial afirmada por Arquetipo.
- Los importes quedaron deliberadamente en la lista global compartida por instrucción expresa del usuario; cada taller puede ajustar la referencia con sus preferencias/override privado.
- No convertir `TIRA` a metro lineal: el largo de 6.000 mm proviene de la instrucción del usuario, no de la cotización. La fuente del precio conserva esa salvedad.
- El resumen de fabricación puede usar el precio de referencia sin exigir que el acabado del componente sea LEGNO. La salida de costo sigue identificada como referencial y solo valora cortes que ya están guardados.
- El catálogo técnico Arquetipo no presenta una lista general de precios. No crear ceros para perfiles ausentes de la cotización.
- No persistir nombre, RUT, teléfono ni dirección del cliente de la cotización dentro de fixtures, pruebas o documentación.

### Enlace de precio y pauta en cotización (2026-10-14)

- La matriz versionada conserva 84 presentaciones en diez familias y los 29 importes netos de la cotización 27811. El test `arquetipo-catalogo-2026-10-05.contract.test.ts` fija los importes por SKU/código y deja 55 presentaciones sin precio como pendientes.
- En `Líneas y precios` se muestran por separado el código técnico del perfil y el SKU Arquetipo; `2001` y `30892001` identifican campos distintos.
- Para las diez familias universales, la selección automática de costo prioriza Arquetipo. Una presentación privada explícitamente preferida por el taller conserva precedencia; no se sustituye un perfil faltante por el código o precio de otro proveedor.
- Si la receta ya calculó cortes pero falta una presentación de compra, el snapshot conjunto conserva esos cortes usando el largo guardado en la receta. SKU y costo permanecen pendientes. El predeterminado Ventora de 6.000 mm solo entra cuando la receta no declara otro largo.
- El precio de venta por m² vive en la línea comercial y no se calcula desde el precio de compra por tira. Los precios comerciales faltantes siguen editables y pendientes; las recetas no sustentadas, incluida L35, no generan cortes.
- Cotizaciones sin cambios comerciales/técnicos conservan sus snapshots. Al finalizar un borrador o guardar una edición técnica se vuelven a resolver presentaciones para el snapshot que se reconstruye.

### Cruce de precio Arquetipo y composiciones con pauta (2026-10-14)

La cotización 27811 asigna precio de compra a perfiles individuales por tira; no identifica una ventana completa ni una variante de fabricación. El catálogo describe sistemas y muestra secciones. Por eso, el hecho de que un perfil tenga precio no autoriza a formar una composición ni a trasladar su precio a otro código. En una receta calculable, los cortes se guardan aunque algún perfil de esa composición siga con costo pendiente.

| Familia | Perfiles con precio Arquetipo | Composiciones que describe el catálogo | Cobertura de receta actual y límite |
|---|---|---|---|
| L20 | 2001, 2002, 2004, 2005, 2009, 2010, 2019 | Corredera de 2–3 hojas; opciones de cámara de agua/portafelpa, monolítico/termopanel y piernas/cierres distintos. No ofrece paño fijo. | Pauta de taller confirmada solo para corredera 2H, pierna abierta y jamba 2009. Las otras composiciones requieren su variante y receta exactas; el precio de 2010/2019 no las habilita por sí mismo. |
| L25 | 2501, 2502, 2504, 2505, 2507, 2509, 2510 | Corredera de 2–4 hojas, rieles de 2/3 vías, monolítico/termopanel y piernas normal/abierta/cerrada/reforzada. | Se preservan las 18 variantes canónicas SODAL/Zeta existentes. Resolver por hojas, vidrio, pierna y refuerzo; no reemplazar sus perfiles ni fórmulas al enlazar precios. |
| L32 | 3201, 3202, 3204, 3208 | Proyectante y paño fijo; hay perfiles de marco con cámara de agua y palillo. | Pauta confirmada solo para proyectante Normal 1H (3201, 3202, 3208). 3204 es ambiguo y no integra esa receta; paño fijo y cámara de agua no están cubiertos. |
| L42 | 4202, 4204, 4209, 4229 | Proyectante y paño fijo, con alternativas de marco/cámara y junquillo para vidrio. | Normal 1H usa 4201, 4202 y 4229; queda parcial porque Arquetipo no cotizó 4201. El Constructor ofrece además **Arquetipo · Sin cámara · Monolítico**, con 4209, 4202 y 4229 valorizables; conserva la pauta de cortes SODAL/Alumétrica y se marca preliminar hasta probarla con perfiles Arquetipo. Elegirla solo para esa composición. No sustituir 4201 por 4209 en Normal: el catálogo identifica 4209 como marco de paño fijo. 4204 queda ambiguo; cámara y termopanel requieren receta propia. |
| L5000 | 5001–5007 | Corredera de 2–3 hojas, con opciones de cierre embutido/caracol y pierna normal. | Pauta de taller confirmada solo para Caracol 2H; no extender automáticamente a 3H ni a otros cierres. |
| L15 | Sin precio en cotización 27811 | Corredera de 2–3 hojas y variantes 4H con 2 o 4 rieles. | Hay recetas calculables separadas por topología; para 4H se debe seleccionar 2 o 4 rieles. No atribuirles precio Arquetipo. |
| L4000 | Sin precio en cotización 27811 | El catálogo Arquetipo describe corredera 2H. | La receta 2H existente resuelve; no atribuirle los precios de otras familias. Variantes 3H/4H necesitan evidencia propia de su sistema antes de ofrecerse como composición Arquetipo. |
| L12 | Sin precio en cotización 27811 | Shower para tina con 2 hojas correderas; receptáculo con 2 paños fijos y 2 correderas. | Pauta de taller confirmada para Shower 2H. La composición de receptáculo de 4 paños no se deriva de ella. |
| L35 | Sin precio en cotización 27811 | Puertas vaivén/abatibles con bastidor normal o liviano. | Sin receta completa: faltan composición seleccionada, cantidades y descuentos; debe permanecer sin pauta hasta contar con esa fuente. |
| L45 | Sin precio en cotización 27811 | El catálogo aporta perfiles de puerta, no las reglas de armado/corte. | Existe receta independiente de puerta abatible 1H en fuente SODAL/Indalum, calculable como preliminar. No se considera una receta extraída del catálogo Arquetipo ni validada por taller. |

**Alcance de acristalamiento L32 Proyectante Normal 1H:** la pauta de perfiles confirmada para esta variante enumera 3201, 3202 y 3208. La receta `crearRecetaSerie32ProyectanteNormal` especifica vidrio monolítico 4 mm, sus descuentos de junquillo/vidrio y declara que no admite termopanel. Las láminas Arquetipo L32 (pp. 22–23) describen perfiles y secciones, pero no publican una matriz de espesores ni una compatibilidad ampliada de junquillos. Por ello, 4 mm monolítico identificable conserva la resolución completa existente; otros espesores, DVH, laminados, ausencia o conflicto de especificación solo pueden mostrar geometría parcial de marco 3201 y hoja 3202, con junquillo 3208 y vidrio pendientes. Esa salida parcial no certifica compatibilidad de acristalamiento ni constituye pauta completa u operativa.

La matriz distingue cuatro hechos diferentes: un perfil puede tener costo de compra; una línea puede tener precio de venta por m²; una composición puede tener receta calculable; y esa receta puede o no estar validada por el taller. Solo el tercer hecho produce el despiece. Las discrepancias de descripción en 2010, 2019, 3204 y 4204 conservan su identidad/rol; el perfil 4209 corresponde a marco fijo y no sustituye al 4201 de la receta proyectante. Ninguno se redirige a perfiles parecidos.

El CSV local de preparación, sin datos del cliente, fue reemplazado como fuente de ejecución por el fixture versionado `src/features/proveedor-catalogos/fixtures/arquetipo-catalogo-2026-10-05.ts` y el importador `scripts/catalog/import-arquetipo-global.ts`. El lote se aplicó con `--apply` al proyecto Supabase de producción `yrtrwgkaopfumpidjthk`; el preflight encontró 284 inserciones y cero conflictos. Verificación posterior: 10 familias, 84 insumos técnicos, 84 presentaciones, 29 precios y suma CLP 513.984. No se cargó información personal de la cotización.

La cotización no contiene precios para las líneas 15, 4000, 35, 45 o 12; quedaron sus códigos/presentaciones técnicas visibles sin precio, sin valores cero. La línea 15, 4000 y 45 conservan las incompatibilidades de receta descritas arriba. La publicación del catálogo no crea fórmulas para esas líneas ni las declara validadas. Las reglas de Línea 12 capturadas desde la pantalla siguen preliminares y el largo de 6.000 mm sigue siendo supuesto del usuario.

## Matriz de reglas y ejemplos independientes

Una fila por variante y rol. Expresar todas las medidas de prueba en mm. No obtener el valor esperado llamando al mismo motor bajo prueba.

| Variante estable | Tipología / hojas / riel / vidrio | Fuente: página o pestaña y celda | Rol / código / ángulo | Fórmula y cantidad | Entrada A → resultado | Entrada B → resultado | Pendiente y efecto |
|---|---|---|---|---|---|---|---|
| Completar | Completar | Completar | Completar | Completar | Completar | Completar | Completar |

Registrar redondeo, largos de barra, kerf, umbrales y unidades con su propia procedencia. Una fórmula derivada debe declararse como tal. Para cada rama condicional, incluir un caso antes, en y después del umbral.

## Recorrido de integración

| Tramo | Archivo / identidad concreta | Evidencia de que funciona |
|---|---|---|
| Fixture y reglas | | |
| Catálogo y slots | | |
| Seed por organización y reintento | | |
| Selector guiado y Constructor | | |
| Vidrio final y entradas adicionales | | |
| Resolver por línea, tipología, hojas y variante | | |
| Snapshot, guardado y reapertura | | |
| Despiece y barras | | |
| Impresión interna y PDF cliente | | |

## Pruebas exigibles

- [ ] Todas las variantes del alcance tienen prueba numérica y procedencia; las excluidas se identifican sin inventar equivalencias.
- [ ] Dos geometrías válidas, cantidad mayor que uno, cero/negativos y límites relevantes.
- [ ] Selección por identidad exacta; vidrio final soportado y no soportado; entrada adicional ausente/inválida.
- [ ] Cambiar línea, vidrio, geometría o medida invalida el cálculo vivo correspondiente.
- [ ] Receta propia calculable conserva sus ajustes; seeds no reemplazan recetas editadas/probadas.
- [ ] Otra organización, otra línea, archivados y eliminados no intervienen en la selección.
- [ ] Snapshot histórico permanece congelado; recálculo nuevo solo por la acción prevista.
- [ ] Barras conservan piezas y no mezclan perfiles incompatibles; largos imposibles se advierten.
- [ ] Estado preliminar y aviso visible; pasar tests no cambia validación de taller.
- [ ] `pnpm fabrication:verify` aprobado; si hay fallos, describirlos y no cerrar como aprobado.
- [ ] Build cuando se cambia aplicación; smoke de navegador según recorrido inferior.

Tests numéricos en `src/features/fabricacion/__tests__/<linea>-numerical-contract.test.ts`; regresiones del recorrido en las suites del servicio, hook o componente afectado. Referencia real: `winhouse-s75-numerical-contract.test.ts`. El verificador los incluye sin editar una lista de comandos.

## Smoke de navegador

Usar una cuenta QA ya autorizada y datos identificados como prueba. No guardar credenciales en este expediente ni en tests.

| Variante / dimensiones / vidrio | Ruta real e ítem QA | Resultado esperado vs observado | Guardado y reapertura | Pauta interna / PDF cliente | Evidencia o bloqueo |
|---|---|---|---|---|---|
| Completar | Completar | Completar | Completar | Completar | Completar |

Para declarar toda la línea integrada, recorrer todas las configuraciones nuevas en cotización. Automatizar mediante casos de UI cuando sea estable; si se muestrea, declarar exactamente qué quedó sin recorrer. Los tests del motor no sustituyen esta cobertura.

## Entrega

- Comando, fecha, commit y cambios locales de la ejecución:
- Informe `test-results/fabrication/verification.json` (generado, no versionar):
- Pruebas automáticas / navegador / build: aprobado, fallido o no ejecutado por separado:
- Variantes calculables y bloqueadas con motivo concreto:
- Escrituras realizadas en cuenta QA; base remota, migraciones y despliegue si los hubo:
- Archivos y documentación actualizados; riesgos reales y siguiente paso:

### Hallazgos de integración (2026-10-05)

- Revisión documental de las 10 líneas y cruce nominal con las identidades Ventora existentes; no se duplicaron líneas comerciales. La receta base local de Línea 12 sí se amplió; no se escribió sobre recetas persistidas.
- Captura local de las 29 filas con precio de la cotización 27811; se omitieron identificadores del cliente.
- La captura de Línea 12 se incorporó como cinco reglas preliminares (9 cortes). Para 1.200 × 1.500 mm / 2 hojas: 1203=1.195 mm ×1; 1201=1.195 mm ×1; 1202=1.497 mm ×2; 1204=605 mm ×4; 1204=1.435 mm ×1. El ángulo antes pendiente de 1204 se completa a 45° con la instrucción expresa de la ficha técnica del catálogo (PDF p. 5). Pauta a 6.000 mm: 4 barras en el motor; composición de vidrio/herrajes y largo comercial siguen pendientes. La receta queda `ejemplo_no_validado`.
- Suite dirigida `traditional-p2u-recipes.test.ts`: aprobada (5 pruebas). `pnpm fabrication:verify`: aprobado; 163 suites, 1.252 pruebas, TypeScript y `docs:check`.
- Al iniciar esa integración, una lectura de esquema confirmó presentes las tablas de catálogo/precios; todavía no se habían leído filas ni escrito datos. La autorización posterior del usuario cambió el destino a la lista global compartida.
- `pnpm fabrication:verify --build`: suites, tipos y docs pasaron; el build terminó con `Another next build process is already running`. No se detuvo ese proceso ni se reintentó para no interferir con otro build.
- No se ejecutó QA de navegador. La validación física de taller sigue pendiente. El catálogo de Arquetipo no aporta descuentos/fórmulas completos para las otras nueve líneas ni resuelve las diferencias de identidad descritas en este expediente.

### Publicación global (2026-10-05)

> Registro histórico de la primera importación; el modelo de asociación por proveedor descrito aquí fue actualizado el 2026-10-06.

- Importador ejecutado por código contra producción, con preflight y escritura global autorizada por el usuario; sin flujo QA ni smoke de navegador.
- Reejecución idempotente para corregir páginas/notas de 43 evidencias: 0 filas nuevas, 241 ya exactas, 43 metadatos corregidos, 0 conflictos. Conteos finales: 84 insumos, 84 presentaciones, 29 precios; suma leída de producción CLP 513.984.
- Ajuste no destructivo posterior al 2026-10-05: se agregaron relaciones a claves `arquetipo:*` y exclusiones para discrepancias. El 2026-10-06 se añadieron asociaciones a claves universales y se conservaron aquellas relaciones legacy por seguridad referencial; el código de aplicación debe desplegarse para normalizarlas al resolver.
- El valor predeterminado TIRA=6.000 mm queda etiquetado como supuesto solicitado; la cotización no declara el largo ni su vigencia.
- Las fórmulas disponibles de Ventora permanecen independientes de esta carga. El catálogo Arquetipo no acredita cortes para las diez líneas ni validación de taller.

### Smoke inicial de cotización mobile (2026-10-07; hallazgos reemplazados abajo)

Prueba histórica en navegador sobre una cotización nueva sin guardar. Los importes son **precios de venta** visibles en Ventora, no precios de compra Arquetipo. Esta tabla registra lo observado antes de las correcciones documentadas abajo. Un despiece calculado indica que Ventora resolvió y calculó las reglas configuradas; la validación física del taller se mantiene como dato aparte.

| Familia probada | Configuración / medidas | Precio mostrado | Resultado de fabricación en la cotización | Variantes observadas |
|---|---|---:|---|---|
| 15 | Corredera 2 hojas, 1.200 × 1.500 mm | $135.000/m²; sugerido $243.000 | Despiece calculado: 7 perfiles, 12 cortes, 7 tiras de referencia; vidrio 616 × 1.420 mm ×2 | El catálogo de variantes contempla 2 hojas, 3 hojas/3 rieles, 4 hojas/2 rieles y 4 hojas/4 rieles. Se probó 2 hojas. |
| 20 corredera | Corredera 2 hojas, 1.200 × 1.500 mm | $60.000/m²; sugerido $108.000 | Al elegir “Pierna abierta · Jamba 2009”, calculó 7 perfiles, 12 cortes y 7 tiras de referencia | La revisión ofreció “Pierna abierta · Jamba 2009” y “Estándar”. La selección desapareció tras elegir; falta permitir cambiarla por cotización. |
| 20 paño fijo (fila retirada) | No aplica | No aplica | No corresponde a una configuración de Línea 20 y se excluyó de nuevas selecciones | La clave se conserva para leer registros históricos, sin borrar cotizaciones guardadas. |
| 25 | Corredera 2 hojas, 1.200 × 1.500 mm | $80.000/m²; sugerido $144.000 | Despiece calculado en la prueba guiada actual: 7 perfiles, 12 cortes y 7 barras de referencia | Pierna abierta + Normal; 13.580 mm de perfil. La conclusión anterior de “configuración pendiente” era incorrecta. |
| 4000 | Corredera 2 hojas, 1.200 × 1.500 mm | $80.000/m²; sugerido $144.000 | Despiece calculado | El catálogo de variantes contempla 2 hojas, 3 hojas/3 rieles, 4 hojas/2 rieles y 4 hojas/4 rieles. Se probó 2 hojas. |
| 5000 | Corredera 2 hojas, 1.200 × 1.500 mm | $80.000/m²; sugerido $144.000 | Despiece calculado | Corredera 2 hojas; se probó esa configuración. |
| 35 | Puerta abatible 1 hoja, 900 × 2.100 mm | $140.000/m²; sugerido $265.000 | Sin fabricación | El flujo no mostró variante. La pauta sigue incompleta: faltan composición, cantidades y descuentos. |
| 45 | Puerta abatible 1 hoja, 900 × 2.100 mm | $120.000/m²; sugerido $227.000 | Despiece calculado | Puerta abatible de 1 hoja; se probó esa configuración. |
| 12 | Shower corredera frontal, 2 hojas, 1.200 × 2.000 mm | $75.000/m²; sugerido $180.000 | La pauta de 5 reglas/9 cortes ahora tiene fallback universal en código; smoke UI pendiente | La cotización anterior no llegó a resolver la variante; el smoke debe repetirse en una cotización nueva. |
| 32 | Proyectante, 1 hoja, 1.200 × 1.500 mm | $60.000/m²; sugerido $108.000 | Despiece calculado | Normal, 1 hoja; se probó esa configuración. |
| 42 | Proyectante, 1 hoja, 1.200 × 1.500 mm | $80.000/m²; sugerido $144.000 | Despiece calculado con Normal | La UI mostró varias variantes; hay que aclarar etiquetas repetidas para poder distinguirlas. |

#### Hallazgo histórico corregido

- La cotización anterior no resolvió L12 porque faltaba fallback universal para cuentas sin receta propia. El código ahora lo incorpora con las reglas del usuario; falta repetir el smoke de navegador en una cotización nueva.
- La primera prueba etiquetó L25 como “configuración pendiente” porque no reprodujo la selección guiada correcta. La prueba actual sí genera 12 cortes y 7 barras de referencia; reemplaza esa conclusión anterior.
- L20 fijo no corresponde a la Serie 20 y ya no se ofrece para cotizaciones nuevas. La interfaz aún debe mantener visible el selector para cambiar variantes de L20 corredera.
- Fallbacks para L12, L15, L4000, L45 y S-33/S-33 RPT pasan contratos automáticos. No hubo escritura de cotizaciones, commit, push ni deploy.

### Correcciones del smoke mobile (2026-10-09; local)

- L12 ya acepta el nombre comercial “Shower Door · Corredera frontal” cuando la pieza es `shower` de 2 hojas. La apertura comercial se normaliza a `shower` para resolver la única pauta confirmada; no cambian descuentos ni cortes.
- El selector ya no antepone “Arquetipo” al nombre de líneas importadas. Las presentaciones de compra y su fuente conservan sus datos.
- Se hicieron únicas las claves React para faltantes repetidos de presentación en el resumen desktop, mobile y pauta conjunta.
- L35 sigue sin despiece: la evidencia disponible no define la composición activa, cantidades ni descuentos. “Completo” en la tarjeta indica que los datos comerciales del componente están completos; no certifica una receta.
- El navegador local sí cargó el resumen guardado de la cotización 1079: aparecen pautas listas para V1/L15, V3/L25, V4/L4000, V5/L5000, P2/L45 y V6/L32 (6/10). La vista “Por componente” solo lista los seis con pauta; el detalle de la cotización redirigió al dashboard, así que no se pudieron identificar los otros cuatro desde esa ruta. Los snapshots históricos no se recalcularon. Las opciones repetidas de variante no se fusionan sin comparar sus reglas.
- Pruebas dirigidas: `fabricacion-despiece-universal-precios.test.ts` y `sodal-l25-presentation.service.test.ts`, 24 pruebas aprobadas. Esto verifica servicios/etiquetas, no sustituye smoke de navegador con los datos de la cuenta.

### Auditoría corregida de aluminio en cotización (2026-10-07)

La primera pasada no incluyó S-33 y confundió “no se probó” con “no calcula”. La corrección se basa en el selector completo de Aluminio, una prueba guiada reproducible de L25 y contratos de cálculo del resolver. La captura tenía 25 referencias globales, incluida la fila antigua “Serie 20 — Paño fijo”; el código nuevo la deja fuera de los selectores y mantiene la referencia histórica, por lo que se esperan 24 globales seleccionables más cinco líneas propias. No se guardó la cotización. El estado de receta (`testing`/sin validación física) se conserva separado de la disponibilidad del despiece.

| Referencia en el selector | Precio de venta observado | Configuración / estado de pauta | Evidencia en esta revisión |
|---|---:|---|---|
| Serie 5000 — Corredera 2 hojas | $80.000/m² | Despiece validado por el taller; variante Caracol 2H | La resolución universal usa descuentos confirmados por el titular. |
| Serie 20 — Corredera 2 hojas | $60.000/m² | Despiece validado por el taller; variante Pierna abierta · Jamba 2009 | L20 solo es corredera. La clave fija antigua permanece fuera del catálogo de nuevas selecciones. |
| Serie 20 — Paño fijo (fila antigua) | $70.000/m² | **No existe como configuración de Serie 20.** Se excluyó del catálogo nuevo y de los selectores; se conserva la clave solo para históricos. | La regresión automática comprueba que no se ofrece para piezas nuevas. |
| Serie 25 — Corredera 2 hojas | $80.000/m² | **Despiece disponible** con Pierna abierta + Normal: 7 perfiles, 12 cortes, 7 barras de referencia; 13.580 mm de perfil. | Reproducido ahora en “Cotizar por ítems” → Guiada con 1.200 × 1.500 mm, 1 unidad y vidrio monolítico 5 mm. Resultado de venta sugerido: $144.000. |
| Serie 32 — Proyectante / paño fijo | $60.000/m² | Proyectante Normal 1H: despiece validado por el taller | La confirmación cubre la variante Normal. Paño fijo no está cubierto por esta pauta. |
| Serie 35 — Puerta abatible y vaivén | $140.000/m² | Sin pauta completa; hay perfiles candidatos, pero faltan composición y descuentos | No mostrar como despiece disponible hasta completar la receta. |
| Serie 15 — Corredera 2 hojas | $135.000/m² | Despiece 2H y variantes de hojas documentadas | Smoke anterior: 7 grupos de perfil, 12 cortes, 7 barras de referencia. |
| Serie 4000 — Corredera 2 hojas | $80.000/m² | Despiece 2H y variantes documentadas | Smoke anterior de cotización; calculó. |
| Serie 45 — Puerta abatible 1 hoja | $120.000/m² | Despiece calculable | Smoke anterior de cotización. |
| Serie 12 — Shower Door corredera 2 hojas | $75.000/m² | Despiece de perfiles validado por el taller: 5 reglas y 9 cortes | Confirmación del titular basada en la pauta revisada con su padre. Vidrio y quincallería se gestionan aparte. |
| AL-42 — Proyectante / paño fijo | $80.000/m² | Proyectante Normal 1H: despiece validado por el taller | No extender a las variantes separadas con/sin cámara ni a paño fijo. |
| Serie 4800 — Corredera 2 hojas | $65.000/m² | Existen recetas SODAL en código; no se probó en esta cuenta durante esta revisión | Precio observado; cálculo de esta fila no confirmado en navegador. |
| Óptima S-28 — Corredera 2 hojas | $65.000/m² | Receta de esta referencia no confirmada en esta revisión | Precio observado; cálculo no confirmado. |
| Óptima S-28 — Corredera 3 hojas | Sin precio | Receta de esta referencia no confirmada en esta revisión | Sin precio observado. |
| S-33 — Corredera 2 hojas | $65.000/m² | Se habilitó fallback universal desde la pauta SODAL de 2H | Contrato automático de resolver aprobado; falta smoke de navegador tras recargar el servidor. |
| S-33 RPT — Corredera 2 hojas | $65.000/m² | Se habilitó fallback universal desde su pauta SODAL RPT separada | Contrato automático de resolver aprobado; falta smoke de navegador tras recargar el servidor. |
| Serie 42 — Proyectante con cámara | Sin precio | Receta específica no confirmada en esta revisión | Sin precio observado. |
| Serie 42 — Proyectante sin cámara | Sin precio | Receta específica no confirmada en esta revisión | Sin precio observado. |
| S-38 — Proyectante | Sin precio | Sin configuración completa confirmada | Sin precio observado. |
| S-38 RPT — Proyectante | Sin precio | Sin configuración completa confirmada | Sin precio observado. |
| MultiSlide S-83 — 4 hojas | Sin precio | Receta SODAL existe; esta cuenta no se probó | Sin precio observado; cálculo no confirmado. |
| MultiSlide S-83 — 8 hojas | Sin precio | Receta SODAL existe; esta cuenta no se probó | Sin precio observado; cálculo no confirmado. |
| Serie 3200 — Puerta abatible 1 hoja | Sin precio | Recetas SODAL tienen alternativas de bastidor; no se debe elegir una silenciosamente | Sin precio observado; selección de variante y cálculo no confirmados en navegador. |
| Serie 4600 — Puerta vaivén | Sin precio | Recetas SODAL tienen alternativas de quicio; requiere variante explícita | Sin precio observado; selección de variante y cálculo no confirmados en navegador. |
| Arquetipo · Línea 32 — Proyectante y paño fijo | Sin precio | Referencia duplicada; no se debe confundir con precio de perfil o asumir cobertura de paño fijo | Precio pendiente observado; la clave Arquetipo comparte fórmula L32 solo cuando su variante/tipología coincide. |

La confirmación de taller cubre únicamente las variantes enumeradas: L5000 Caracol 2H, L20 corredera 2H, L12 Shower 2H, L32 proyectante Normal 1H y L42 proyectante Normal 1H. L25 mantiene las 18 variantes canónicas SODAL/Zeta validadas; esta integración no toca sus fórmulas ni estados. Las demás variantes y familias se auditan después, por separado.

**Mis líneas** también mostró cinco referencias separadas (dos Serie 32, una S-38 copia, y dos Corredera 2 hojas propias, una sin precio). No son referencias del catálogo global; su pauta depende de cada receta de empresa y requiere inspección individual. La captura anterior al filtro reportó 30 líneas en total; tras ocultar la referencia L20 fija legado, se esperan 29.

#### Corrección de estado y lenguaje

- Cuando el motor genera snapshot de perfiles y cortes con una receta seleccionada, la cotización muestra **Despiece disponible** (o **Fabricación lista** si la receta está validada por el taller). “No validada físicamente” se conserva como estado separado en Fabricación; no bloquea la presentación del cálculo.
- Una fórmula incompleta, variante no elegida, dato geométrico faltante o ausencia real de receta conserva **Configuración pendiente** / **Sin fabricación**. No convertir esos estados en cortes inventados.
- La columna de precio en el selector es precio comercial de venta por m²; los precios de compra de perfiles siguen siendo una fuente aparte.
- El smoke UI de L12 y S-33/S-33 RPT de esta revisión está pendiente. Sus pruebas automáticas no sustituyen esa comprobación de navegador.

### Corrección de Serie 42 y sincronización de revisión (2026-10-11; local)

- La variante ALAR `marco fijo 4201` cargada como opción heredada podía quedar seleccionada al cotizar y bloquear la receta universal Normal confirmada por el taller. En cotizaciones nuevas, esa referencia ALAR se normaliza a la variante universal `normal` para `ventora:l42`; el borrador de proveedor y las recetas personalizadas del taller no se sobrescriben.
- Smoke en navegador local: Serie 42 proyectante 1H, 1.500 × 1.600 mm, generó 12 cortes (4201, 4202 y 4229) y vidrio 1.407 × 1.507 mm. La cotización no se guardó.
- Línea 35 sigue sin despiece. Los manuales solo identifican perfiles candidatos: faltan composición activa, cantidades y descuentos. No habilitar cortes hasta contar con esa pauta.
- La sincronización automática de snapshots usa una clave semántica estable y excluye UUID internos recreados en render; así evita repetir `setDraft` ante una misma salida técnica.
- Pruebas dirigidas: 29 pruebas aprobadas entre resolución universal y sincronización del snapshot. Consola del smoke local sin errores tras recargar.
