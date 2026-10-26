# Control automatizado de integración de línea — Ventora

Extensión de `pnpm fabrication:verify`. No añade un verificador alternativo ni toca bases de datos.

## Origen y denominadores

- `line-integration.json` se crea en `test-results/fabrication/` desde la suite Jest existente, con el catálogo canónico (`VENTORA_DEFAULT_LINE_CATALOG`), auditorías de catálogo e integridad y pares de compatibilidad de `getCatalogProductConfigurations`.
- Una fila representa **una combinación comercial explícita**. Si la fuente no declara ningún par exacto, queda una única fila `sin_configuracion_exacta` pendiente. Nunca se calcula un producto cartesiano de listas independientes.
- `lineas` cuenta claves de catálogo únicas; `configuraciones` cuenta filas auditadas. Cada capa incluye `total`, `aprobado`, `pendiente`, `ambiguo`, `fallido` y `noComprobada`. `total` se mide en configuraciones, NO en perfiles o referencias de vidrio; estos denominadores se conservan como `null` mientras no se hayan leído sus identidades reales. Un estado `pendiente` no es un fallo; `no_comprobada` se expresa además mediante `verificacion` y `pasoManual`.
- `origin: fixtures_locales` y `remote.consultas=0`, `remote.escrituras=0` separan la revisión de catálogo del estado de las organizaciones. No afirmar precios vigentes ni validaciones de taller a partir de seeds o ejemplos.
- El informe de referencia técnica conserva `estadoCatalogo`, `listaParaProbar` y `evidencia` por separado. Su existencia no acredita que **la variante exacta** funcione. Solo los fixtures de contrato de variante específicos pueden acreditar una geometría concreta.

## Qué verifica realmente

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
