# Catálogo de proveedor V1 · Veratec Sliding 7400

Actualizado al 2026-10-02. El alcance sigue limitado a `ventora:veratec-7400-corredera`, corredera 2H monolítico 4 mm; no cambian receta, fórmula ni estado.

## Alcance del piloto

El piloto toma perfiles, riel y refuerzos con vínculo sustentado a la receta 2H corredera monolítica 4 mm. El vidrio y los accesorios sin vínculo comercial inequívoco quedan pendientes por consumo individual; nunca se agrupan como un concepto genérico ni se valorizan a cero.

La fuente técnica (expediente Alumétrica, revisión propia) y la lista de Xelena de junio 2026 tienen revisiones y referencias separadas. La lista solo identifica el mes; `publicado_en` queda NULL. Para esta lista el administrador del catálogo confirmó CLP y que el importe neto corresponde a la presentación comercial completa (SKU + largo publicado). La confirmación se conserva solo en evidencia interna del precio; no se presenta como advertencia al maestro.

## Resolución y trazabilidad

- Las recetas se resuelven contra `codigoPerfil`/código técnico exacto del snapshot guardado. Nunca se transforma un código del SKU ni se compara por sufijo.
- `61016VER001` es el SKU oficial de Riel Sliding documentado por el pendón (p. 1) y la lista (p. 5). El vínculo al consumo de receta `AB01016-E` se guarda como `recipeComponentCodes` explícito en metadata de evidencia. No se declara que ambos códigos sean el mismo SKU; el código original de receta permanece intacto.
- Cada SKU conserva acabado, unidad, largo, precio neto y evidencia de vínculo/precio por separado. El modo de acabado es específico o explícitamente independiente (refuerzos).
- Varias presentaciones confirmadas para el mismo insumo/acabado se comparan por costo de barras reempaquetadas desde los cortes guardados. No cambian la pauta histórica ni el precio comercial de venta.
- La asociación junquillo `6306` ↔ `66306VER...` queda sustentada por evidencia descriptiva/visual del sistema; el uso del perfil 66306 en Elegans 60 y Sliding 7400 se conserva en la relación muchos-a-muchos de familias. No se afirma que la lista dé oferta/precio para Elegans 60.
- `61016VER001` se resuelve independientemente del acabado: 5,8 m, unidad M, $10.940 netos por presentación.
- El junquillo de vidrio 4 mm se resuelve para Blanco mediante `66306VER000`: 5,8 m, M, $7.582 netos. La lista no publica variante Negro para ese junquillo; no se crea una.
- El pendón ubica `Tope Estanco Sliding 2 Rieles` dentro de Sliding 7400 (p. 1) y la lista publica `61012VER000` en Blanco, PCS x 1, $1.076 netos (p. 9). Su mapping funcional explícito es al consumo de receta `Tope Corredera` (2 unidades); no se usa para `Goma Tope Corredera`.

## Auditoría de accesorios de receta contra fuentes Veratec

El consumo y cantidad vienen del expediente Alumétrica, `veratec-7400-corredera-recipe.ts` (líneas 103–115). Pendón p. 1 y lista de precios pp. 8–11 se revisaron uno por uno. Los nombres parecidos abajo no se convierten en asociaciones: la función/identidad no está documentada como la misma.

| Consumo de receta | Función | Código receta | SKU Veratec | Unidad | Precio neto | Evidencia lista / pendón | Estado |
|---|---|---|---|---|---:|---|---|
| Cremona Corredera E7.5 800mm ×2 | Cierre/manilla | — | — | unidad (receta) | — | Lista pp. 8–11 y pendón p. 1: sin SKU coincidente | Pendiente |
| Anti-falsa maniobra ×1 | Bloqueo de maniobra | — | — | unidad (receta) | — | Lista pp. 8–11 y pendón p. 1: sin SKU coincidente | Pendiente |
| Burlete Traslapo Sliding74 ×1 | Sello en traslapo | — | — | unidad (receta) | — | Lista p. 9 ofrece `61018VER000` burlete cubre ranura, KG, $559; identidad/función no coincide de forma demostrada | Pendiente |
| Calzo de 5mm para taqueado ×16 | Calce de vidrio | — | — | unidad (receta) | — | Lista p. 11 ofrece calzos de 2, 3 y 4 mm, no 5 mm | Pendiente |
| Cerradero Corrediza (Todas…) ×4 | Cerradero | — | — | unidad (receta) | — | Lista pp. 8–11 y pendón p. 1: sin SKU coincidente | Pendiente |
| Goma Tope Corredera ×2 | Tope amortiguador | — | — | unidad (receta) | — | Lista p. 9 ofrece `61012VER000` Tope estanco Sliding blanco, PCS, $1.076; función/identidad no confirmada | Pendiente |
| Kit T3 ACCES 68-77 L.100x8 ×2 | Herraje/kit | — | — | unidad (receta) | — | Lista pp. 8–11 y pendón p. 1: sin SKU coincidente | Pendiente |
| MAN.TIRAD PLACA L C/ACC IN ×2 | Tirador | — | — | unidad (receta) | — | Lista pp. 8–11 y pendón p. 1: sin SKU coincidente | Pendiente |
| RUEDA SIMPLE 12/21 50 KG I ×4 | Rodamiento | — | — | unidad (receta) | — | Lista pp. 8–11 y pendón p. 1: sin SKU coincidente | Pendiente |
| SA01005 - Cepillo / Felpa ×1 | Sello/cepillo | SA01005 | — | unidad (receta) | — | Lista pp. 8–11 y pendón p. 1: el SKU `SA01005` no aparece | Pendiente |
| Sell Acrílico x 330 grs ×2 | Sellador | — | — | unidad (receta) | — | Lista pp. 8–11 y pendón p. 1: sin SKU coincidente | Pendiente |
| Tope Corredera ×2 | Tope | — | `61012VER000` | PCS | $1.076 c/u | Pendón p. 1: Tope Estanco Sliding 2 Rieles en Sliding 7400; lista p. 9: Tope estanco Sliding blanco, PCS x 1 | Asociado funcionalmente / valorizado |
| Tornillo fijación refuerzo ×17 | Fijación de refuerzo | — | — | unidad (receta) | — | Lista p. 11 ofrece `55029VER060/061` tapas de tornillo, unidad, $100; son tapas, no tornillos de fijación | Pendiente |

La unidad de la lista aplica solo a las filas que sí tienen un SKU. Los pendientes conservan cantidad y unidad de consumo por receta, no precio inventado.

## Operación de QA

La capa "Mis precios" usa las tablas de `20261002171539_organization_supplier_purchase_prices.sql`; las presentaciones privadas usan `20261004221000_workshop_supplier_presentations.sql`. Su existencia en Supabase producción se verificó el 2026-10-05 mediante consultas de solo lectura. El ajuste se guarda por proveedor/organización; el precio propio por presentación/organización. El costo congelado conserva referencia, precio efectivo, fuente, revisión, moneda y timestamp. Cambios posteriores no recalculan snapshots. La importación genérica clasifica cada fila como INSERT, EXISTENTE o CONFLICTO antes de escribir, y aborta con conflictos.
El piloto mantiene `ventora:veratec-7400-corredera` como línea autorizada por defecto; `SUPPLIER_CATALOG_V1_CATALOG_LINE_KEYS` permite declarar explícitamente otras claves en un QA futuro sin condicionales por proveedor en el motor. No se ha incorporado otro proveedor en esta entrega.

`SUPPLIER_CATALOG_V1_ENABLED` debe habilitarse explícitamente, `SUPPLIER_CATALOG_V1_QA_ORGANIZATION_IDS` debe contener organizaciones autorizadas, `SUPPLIER_CATALOG_V1_NEW_QUOTES_AFTER` limita el primer snapshot a cotizaciones nuevas posteriores al corte, y `SUPPLIER_CATALOG_V1_SUPPLIER_KEY` + `SUPPLIER_CATALOG_V1_PRICE_LIST_REVISION` fijan la lista exacta (piloto: `xelena` / `2026-06`). Solo admin allowlist ve la ruta interna. Un snapshot existente es inmutable; las cotizaciones anteriores no se recalculan.

El costo conocido se presenta como **parcial**, nunca como costo total de la cotización. Un dato desconocido se omite y se enumera como faltante, no se representa con `$0`. No escribe `precio_m2`, costos comerciales, receta, pauta ni PDF de cliente.

## Próxima validación antes de habilitar

1. Resolver/documentar un baseline local completo que permita aplicar migraciones en orden; después verificar la migración y sus grants/policies efectivos en Supabase local.
2. Importar el fixture con la función server-side e inspeccionar conteos/duplicados.
3. Ejecutar `supabase/tests/supplier_catalogs_v1_security.test.sql` y verificar bloqueo para organización/rol no autorizado.
4. Probar una cotización nueva y verificar el SKU/largo elegido por acabado, incluidos los vínculos funcionales explícitos.
5. Verificar endpoints públicos, PDF cliente y WhatsApp sin costo técnico.
