# Control automatizado de integración de línea — Ventora

Extensión de `pnpm fabrication:verify`. No añade un verificador alternativo ni toca bases de datos.

## Origen y denominadores

- `line-integration.json` se crea en `test-results/fabrication/` desde la suite Jest existente, con el catálogo canónico (`VENTORA_DEFAULT_LINE_CATALOG`), auditorías de catálogo e integridad y pares de compatibilidad de `getCatalogProductConfigurations`.
- Una fila representa **una combinación comercial explícita**. Si la fuente no declara ningún par exacto, queda una única fila `sin_configuracion_exacta` pendiente. Nunca se calcula un producto cartesiano de listas independientes.
- `lineas` cuenta claves de catálogo únicas; `configuraciones` cuenta filas auditadas. Cada capa incluye `total`, `aprobado`, `pendiente`, `ambiguo`, `fallido` y `noComprobada`. `total` se mide en configuraciones, NO en perfiles o referencias de vidrio; estos denominadores se conservan como `null` mientras no se hayan leído sus identidades reales. Un estado `pendiente` no es un fallo; `no_comprobada` se expresa además mediante `verificacion` y `pasoManual`.
- `origin: fixtures_locales` y `remote.consultas=0`, `remote.escrituras=0` separan la revisión de catálogo del estado de las organizaciones. No afirmar precios vigentes ni validaciones de taller a partir de seeds o ejemplos.
- El informe de referencia técnica conserva `estadoCatalogo`, `listaParaProbar` y `evidencia` por separado. Su existencia no acredita que **la variante exacta** funcione. Solo los fixtures de contrato de variante específicos pueden acreditar una geometría concreta.

## Qué verifica realmente

Cada fila del inventario incluye `coberturaDespiece` con identidad disponible y cuatro recorridos de interfaz. Estos se marcan `no_comprobado` mientras la fila no esté vinculada a una ejecución específica. Un resultado de Jest aislado no certifica automáticamente la paridad de todos los modos ni un navegador real. El informe registra el smoke autenticado QA como no ejecutado cuando no existe configuración de QA aislada en el job.

## Diagnóstico de PR #42

- **Conflicto de evidencia L25:** PA-50 a PA-53 declaran 2400 × 1500, pero cada par de perfiles y vidrios coincide numéricamente con su equivalente 3000 × 1500. Los rieles anotados son 2984 mm y el motor devuelve 2384 mm. Las transcripciones locales repiten la discrepancia y sus sidecars no identifican captura, HTML ni ejecución original verificable. Las pruebas comprueban el conflicto y dejan cuatro comparaciones numéricas como TODO. No se ha establecido cuál fuente debe corregirse.
- **FAIL de interfaz L42:** con el hook simulado ya sin carga y sin recetas, Guiada muestra «Esta línea no tiene pauta activa» y no produce snapshot. El resolvedor de cotización ofrece fallback L42 y el panel solo busca fallbacks para 45 y 4800. El hook real inicia la siembra asíncrona y puede entregar una lista vacía, pero el estado persistente y la organización real no se comprobaron. Una PR funcional debe alinear la resolución manteniendo organización, receta privada e histórico.
- **FAIL de guardado simulado L20, L5000 y L42:** el servicio compara el registro de base sin `[frid:]` con el borrador rehidratado con el ID del snapshot. `fabricationInputKey` incluye ese ID y marca el ítem para resolver. En la ejecución instrumentada `finalizingDraft=false` e `itemIdsToResolve` contenía el ID existente; la regeneración cambió `calculatedAt`. L20: ID inicial `item-L20`, antes/después `4/5`, tiempo `20:17:54.982/20:17:55.104Z`. L5000 y L42: ID inicial `item-L5000`/`item-L42`, antes/después `2/3`, tiempos `20:17:55.202/20:17:55.247Z` y `20:17:55.322/20:17:55.376Z`. El cambio de ID físico se debe al reemplazo de ítems. La prueba usa precio con origen por margen, por lo que no acredita persistencia de un precio manual. El diagnóstico reproduce el servicio con repositorio en memoria y requiere una PR funcional separada.

**Cobertura:** 103 filas comerciales no equivalen a variantes técnicas ejecutadas. L25 tiene 18 comparaciones de evidencia ejecutadas y cuatro conflictos pendientes. Las comparaciones de cantidad incluyen las 22 observaciones. Guiada L42 y los tres guardados anteriores usan fixtures. Paridad completa de modos, navegador autenticado, recetas por organización QA y documentos por variante permanecen no comprobados. El gate considera los cuatro TODO como pendientes y falla hasta conciliarlos.

- Catálogo: presencia de clave, duplicación, pares explícitos de tipología/apertura, advertencias de nomenclatura. No demuestra presentación visual en Guiada y Constructor.
- Venta: precio base declarado en catálogo; normalmente pendiente, ya que el valor privado del taller no se consulta.
- Compra: utilidad `checkExactPurchase` solo valida identidad estricta cuando recibe una presentación/registro de prueba. Ausencia de metadatos en histórico es `pendiente`; candidatos múltiples son `ambiguo`. Los perfiles reales no se vuelven a asociar de forma implícita.
- Fuente importada: `checkImportedReference` exige código y nombre originales. `auditImportedCatalog` compara internamente `technicalKey` explícita, código/nombre de los insumos y descripción de las presentaciones Arquetipo; diferencias ya documentadas quedan `ambiguo`, no se corrigen. Las 84 presentaciones y 29 precios del fixture llevan un denominador adicional, sin equipararlo a datos remotos o a cotejo independiente con los PDF originales del proveedor.
- Receta: `commercial_only` no exige despiece; `pending` no se trata como fallo; `calculable`/`validated` exigen contrato exacto en pruebas focalizadas. `validated` exige además procedencia de taller.
- Vidrio: se audita independientemente de perfiles. Una referencia completa y otra pendiente implican cobertura parcial; no se atribuye cantidad física a un paño sin dimensiones.
- Snapshot: sólo compara persistencia si existe pareja guardado/reapertura de un fixture; jamás reescribe o recalcula históricos.
- PDF/Excel: la suite focalizada de paridad importa `createWorkMaterialsPdf`, `buildWorkMaterialsWorkbook` y `resolveProfileSupplierPrice`, y compara código, presentación, barras y costos desde un `WorkMaterialsDocument` sintético. Las demás variantes quedan `no_comprobada` en la matriz.

## Ejecución y entrega diaria

El único workflow `.github/workflows/fabrication-verify.yml` corre en PR, push a `main`, ejecución manual y diariamente a las **08:17 `America/Santiago`**. GitHub aplica la zona IANA y sus cambios de horario estacional. Conserva `pnpm install --frozen-lockfile`, `pnpm fabrication:verify`, timeout de 15 minutos y concurrencia por rama/PR; no duplica ejecuciones creando otro workflow.

`pnpm fabrication:verify` ejecuta las pruebas Node del gate y del resumen, Jest (incluyendo los tests nuevos por autodescubrimiento), TypeScript y drift documental. Invalida los informes previos al iniciar, antes de cualquier salida temprana. El proceso falla si un informe requerido falta/es inválido, hay pruebas o pasos fallidos, hay denominadores incoherentes o existe una capa `fallido`. Los estados legítimos `pendiente`, `ambiguo` y `no_comprobada` se reportan sin convertirlos artificialmente en error.

El paso «Resumen de verificación» se ejecuta aun cuando una prueba anterior falla y agrega al Job Summary el estado, fecha, commit, suites/tests, fallos relevantes y conteos por capa. Si no existen informes, los marca como incompletos. El paso de subida conserva con `if: always()` los archivos presentes en `test-results/fabrication/`, incluidos `verification.json`, `line-integration.json` e informes Jest, por 14 días. Se consultan en Actions → ejecución → Artifacts; el Job Summary queda visible en esa ejecución.

Para recibir alertas, el usuario debe estar suscrito al repositorio y elegir GitHub → Settings → Notifications → System → Actions → **Only notify for failed workflows** (o Email / On GitHub). GitHub envía avisos de los schedules a la cuenta que modificó el cron. No se necesita secreto ni integración externa.

Las notificaciones programadas pueden retrasarse por carga de GitHub. El workflow se ejecuta sobre el último commit de la rama por defecto. No publicar ni ejecutar migraciones desde este control.

## Limitaciones para el cierre

- La ejecución diaria queda activa cuando este cambio llegue a la rama por defecto. El schedule no se puede comprobar aquí antes de publicarlo; después se puede comprobar desde Actions con `workflow_dispatch` y esperar el primer schedule.
- Las últimas ejecuciones disponibles de la versión anterior completaron en aproximadamente 1:25 y 1:43. No hay evidencia de que el límite actual de 15 minutos sea insuficiente; mantenerlo evita aumentar minutos/costos sin causa.

- No se comprueba Supabase remota, precios efectivamente pagados, preferencia por organización, acceso multi-tenant real o comportamiento de un navegador.
- No se declara validación de taller por aprobar tests ni por tener documentación del fabricante.
- No se acredita la totalidad de costos, cortes, cantidades y PDF/Excel de las 102 líneas sin fixtures por variante y recorrido autenticado de QA.
- Cuando se suman declaraciones calculables, cada variante necesita una suite numérica independiente e identidad de receta exacta. Si no existe, deberá quedar pendiente o bloquear su cierre técnico.
- No se toca el PDF comercial de cliente ni rutas de producción.
