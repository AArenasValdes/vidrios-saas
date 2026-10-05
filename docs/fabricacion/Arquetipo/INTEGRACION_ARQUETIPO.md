# Expediente de integración de línea

Copiar este archivo a la carpeta de evidencia correspondiente y completar antes del cierre. Guía: [workflow de integración](../WORKFLOW_INTEGRAR_NUEVA_LINEA.md).

## Identidad y alcance

- Proveedor: Distribuidora Arquetipo. Fabricante de cada perfil: no declarado de forma uniforme en estas fuentes.
- Familias: líneas 15, 20, 25, 4000, 5000, 35, 45, 12, 32 y 42. El catálogo de Ventora ya tiene identidades para las diez; esta integración agrega referencias de proveedor y compra, no duplica líneas comerciales.
- Fuentes: `Arquetipo_Catalogo_Aluminios.pdf` (págs. 3–25), cotización 27811 (01-10-2026, págs. 1–2). La cotización registra precios netos por presentación `TIRA`, acabado LEGNO, para 29 códigos de las líneas 20, 25, 32, 42 y 5000. Es una cotización de una compra, sujeta a stock y mercado; no es lista general publicada.
- `MOD Catalogo_SISTEMA_SUPERIOR QT.pdf` revisado. Se excluye del alcance solicitado: documenta sistemas SUPERIOR distintos, sin precios en la cotización y sin equivalencia exacta con las diez líneas; no se mezclarán por tipología visual.
- Estado inicial: árbol con cambios locales previos en catálogo, proveedor y fabricación. Preservar todos. No ejecutar escrituras remotas desde `.env.local` ni tocar recetas/snapshots históricos.
- Salida: catálogo de proveedor Arquetipo + precio privado de compra por organización. No es precio de venta por m². Largo de tira no indicado en la cotización, así que esos importes no habilitan costo por metro ni costo técnico de corte.

## Fuentes y asociación con Ventora

| Línea Arquetipo | Clave Ventora relacionada | Coincidencia observada | Límite aplicado |
|---|---|---|---|
| 15 corredera | `ventora:serie-15-corredera-2h` | Nombre y varios códigos coinciden. | No enlazar a la receta existente: el catálogo Arquetipo pág. 6 identifica 1507 como pierna y 1508 como traslapo; la receta Ventora actual usa 1506/1507 para pierna/traslapo. Revisar perfil y proveedor antes de asociar costos técnicos. |
| 20 corredera | `ventora:l20` | Familia y códigos de los productos cotizados coinciden con los perfiles documentados. | Guardar código/nombre de proveedor. No derivar largo de barra desde la sección. |
| 25 corredera | `ventora:l25` | Coincidencia de línea y códigos cotizados con el catálogo SODAL L25. | No cambiar sus 18 recetas ni estado por incorporar precios de compra. Largo de tira de la cotización no confirmado. |
| 4000 corredera | `ventora:serie-4000-corredera-2h` | Nombre similar; los códigos de perfil están desplazados frente a la receta Ventora Columbia (Arquetipo pág. 14 no documenta 4009). | No asociar a la receta Columbia ni corregir códigos usando semejanza de nombre. Sin precio en cotización 27811. |
| 5000 corredera | `ventora:l5000` | Línea y códigos 5001–5007 coinciden con la plantilla inicial. | Mantener plantilla sugerida; no elevarla a fórmula del fabricante ni validada por taller. Los precios solo aplican a acabado LEGNO de la cotización. |
| 35 puerta | `ventora:l35` | Nombre de línea compatible. | El catálogo aporta perfiles, no una pauta de cortes completa. Sin precio en cotización 27811. |
| 45 puerta | `ventora:serie-45-puerta` | Nombre similar. | No asociar a la receta SODAL/Indalum: Arquetipo pág. 20 muestra 4502/4511/4504; la receta Ventora usa 4522/4531/4534. Sin precio en cotización 27811. |
| 12 shower | `ventora:serie-12-shower-corredera` | Nombre, códigos 1201–1204 y uso coinciden. La captura del editor aporta 5 reglas y 9 cortes para shower 2H. | Descuentos capturados: 1203 ancho total −5; 1201 ancho total −5; 1202 alto total −3 ×2; 1204 ancho por hoja +5 ×4 (45°); 1204 alto de módulo −65 ×1 (ángulo sin dato). La captura deja 1 ajuste pendiente. Tira 6.000 mm es el predeterminado solicitado por el usuario, no una medida confirmada por Arquetipo. No hay precio Línea 12 en la cotización 27811. |
| 32 proyectante/paño fijo | `ventora:l32` | Códigos 3201/3202/3208 coinciden; código 3204 aparece en factura como “PILAR” y en catálogo como “PALILLO”. | Mantener la discrepancia de nombre; asociar precio por SKU/código, no por descripción aproximada. No altera receta. |
| 42 proyectante/paño fijo | `ventora:l42` | 4209/4202/4229 coinciden con la variante SODAL sin cámara documentada. | 4204 aparece como “PILAR” en factura y el catálogo separa 4204/4231 entre palillo y marco cámara; dejar relación de receta pendiente. No cambia variante ni validación. |

### Datos de compra capturados

- Moneda CLP; importe neto por tira; cantidad cotizada 1 por SKU; acabado LEGNO.
- La revisión de precio debe ser privada de la organización dueña de la cotización. No insertar esos importes como referencia global para otros talleres.
- No convertir `TIRA` a metro lineal: la cotización no informa el largo comercial. Conservar precio editable en **Mis precios** y bloquear cálculo técnico hasta verificar largo.
- El catálogo técnico Arquetipo no presenta una lista general de precios. No crear ceros para perfiles ausentes de la cotización.
- No persistir nombre, RUT, teléfono ni dirección del cliente de la cotización dentro de fixtures, pruebas o documentación.

Se dejó un CSV local de preparación, sin datos del cliente, en `../../../.tmp/arquetipo/compra-privada-cot-27811.csv` (29 perfiles, 5 líneas: 20, 25, 32, 42 y 5000). La suma neta transcrita es CLP 513.984. El archivo conserva SKU, código técnico, acabado, unidad TIRA, precio neto, página y estado de asociación. Es insumo para carga privada; **no** es fixture de catálogo global ni confirma que los datos estén guardados en Ventora.

La cotización no contiene perfiles ni precios de las líneas 15, 4000, 35, 45 o 12. El catálogo técnico sí identifica sus perfiles, pero no informa precio; no se generaron precios para ellas. La línea 15, 4000 y 45 además conservan las incompatibilidades de código descritas en la tabla anterior.

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

### Estado de esta pasada (2026-10-05)

- Revisión documental de las 10 líneas y cruce nominal con las identidades Ventora existentes; no se duplicaron líneas comerciales. La receta base local de Línea 12 sí se amplió; no se escribió sobre recetas persistidas.
- Captura local de las 29 filas con precio de la cotización 27811; se omitieron identificadores del cliente.
- La captura de Línea 12 se incorporó como cinco reglas preliminares (9 cortes). Para 1.200 × 1.500 mm / 2 hojas: 1203=1.195 mm ×1; 1201=1.195 mm ×1; 1202=1.497 mm ×2; 1204=605 mm ×4; 1204=1.435 mm ×1. Pauta a 6.000 mm: 4 barras en el motor; el ajuste pendiente y vidrio/herrajes no incluidos siguen visibles. La receta queda `ejemplo_no_validado`.
- Suite dirigida `traditional-p2u-recipes.test.ts`: aprobada (5 pruebas). `pnpm fabrication:verify`: aprobado; 163 suites, 1.252 pruebas, TypeScript y `docs:check`.
- Lectura de solo esquema en Supabase de producción confirmó presentes las 10 tablas de catálogos/precios privados; no se leyeron filas ni se escribió nada. El CLI Supabase no está disponible en este entorno.
- Sin escritura de base ni migración. Hay cambios de aplicación locales, pero no desplegados. La ruta actual de presentaciones privadas exige el piloto QA Veratec y no admite las familias Arquetipo; falta una ruta segura habilitada para el taller/organización que aplique estos precios privados. La interfaz local `:3002` no respondió para identificar sesión/organización.
- `pnpm fabrication:verify --build`: suites, tipos y docs pasaron; el build terminó con `Another next build process is already running`. No se detuvo ese proceso ni se reintentó para no interferir con otro build.
- No se cargaron importes en las tablas globales de referencia. El CSV con importes se mantiene ignorado por Git en `.tmp/arquetipo/`.
- Smoke de navegador y validación física de taller: no ejecutados. Los documentos de Arquetipo no aportan los descuentos de las otras líneas ni completan las reglas/códigos que tienen conflictos documentados.
