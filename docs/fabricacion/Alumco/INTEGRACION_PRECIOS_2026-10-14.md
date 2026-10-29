# Alumco · precios de perfiles de aluminio

**Estado:** importado y verificado en el catálogo global el 17-10-2026.  
**Fuentes:** notas de venta 000000984 y 000000986, emitidas el 14-10-2026 por Alumco NOR Limitada.  
**Vigencia impresa:** 7 días para la cotización/oferta (hasta 21-10-2026); no vence los precios de perfiles. Los precios siguen vigentes hasta que Alumco publique una lista que los reemplace.
**Unidad y moneda:** precio neto CLP por tira (`TR`).
**Etiqueta en Mis precios:** `2026` (la fuente original conserva fecha 14-10-2026).

## Reglas de importación

- Se usa `supplierKey: alumco`, nombre visible **Alumco** y se registra “continuidad comercial de ALAR” como nota de identidad. Las referencias históricas `alar` de fórmulas/catálogos no se renombran ni se mezclan.
- Por confirmación del titular, los precios de perfiles Alumco aplican a todos sus colores y se mantienen hasta que otra lista los actualice. Esta regla de precio no cambia la identidad física de los SKU: `TI` sigue identificando una presentación Titanio y no se asigna como presentación de compra para otro acabado.
- Se usa largo de 6.000 mm por tira por instrucción del titular, no porque aparezca impreso en la nota.
- Se transcriben los precios unitarios de cada fila. No se vuelve a restar el descuento de pronto pago: la suma de las filas coincide exactamente con el NETO de cada nota y el documento presenta el descuento como condición aparte.
- `RO3506P` (Tapa) y `RO3507P` (Portafelpa) son físicamente independientes del color por confirmación del titular. No se les exige acabado ni se presentan como perfiles de color.
- Para L25, el titular precisa que **2509 = Jamba cerrada** y **2510 = Pierna cerrada**. Sus referencias de precio son las mismas que usan las recetas L25 cerradas; se resuelven por código exacto y familia `universal:aluminio:l25`. La identidad física de los SKU de origen es Titanio y su presentación mide 6.000 mm; el precio aplica a todos los colores. No se aplican a pierna abierta (códigos de receta 2503/2506); esos perfiles quedan pendientes hasta tener sus presentaciones correspondientes.
- Los códigos de perfil se asocian por familia numérica y referencias existentes. El único alias hacia receta es `4502 → 4522`, ya documentado en el catálogo Arquetipo para Línea 45. `4511` queda como referencia comercial separada; no se usa para sustituir un perfil de receta.
- La integración agrega perfiles y precios de compra a catálogo; no agrega recetas, reglas, descuentos de corte ni fórmulas. El precio de venta por m² y los históricos no cambian.

## Resolución de precio y acabado

- La vigencia impresa en las notas se interpreta como vigencia de la oferta. En la selección automática, Alumco conserva esta lista de precios hasta que una lista posterior la reemplace.
- El alcance del precio (`todos los colores`) se resuelve por separado del acabado físico de la presentación. Una cotización negra puede consultar el importe Alumco confirmado, pero `TI…` no se registra ni se muestra como SKU físico negro; para compra, la presentación exacta del acabado sigue pendiente hasta estar asociada.
- No se modifican montos ni preferencias de proveedor de organizaciones. La política se aplica al leer precios Alumco y no cambia qué proveedor queda seleccionado por defecto.

## Cobertura transcrita

| Familia Ventora | Referencias con precio | Total neto en nota |
|---|---:|---:|
| Línea 12 | 4 | $59.210 |
| Línea 20 | 7 | $104.976 |
| Línea 25 | 7 | $140.765 |
| Línea 32 | 4 | $55.395 |
| Línea 35 | 7 (incluye Tapa y Portafelpa) | $111.157 |
| Línea 42 | 4 | $80.285 |
| Línea 45 | 2 | $41.745 |
| Línea 5000 | 7 | $90.810 |

Nota 000000984: 21 referencias, suma de filas **$336.551**, igual a NETO impreso.  
Nota 000000986: 21 referencias (incluye Tapa y Portafelpa), suma de filas **$347.792**, igual a NETO impreso.  
Total lote: **42 SKU** y **$684.343** (no es total de compra de una cotización; es suma de precios unitarios por tira).

La transcripción completa de códigos, nombres, SKU y precios está en `src/features/proveedor-catalogos/fixtures/alumco-aluminio-notas-venta-2026-10-14.ts`. El contrato valida ambos totales y el cambio explícito a Alumco por familia/código sin modificar los códigos del despiece. Las recetas L5000, L12, L20, L25 y L32 tienen precio para sus códigos comprobados; la receta L42 requiere `4201`, ausente en esta fuente, y mantiene ese costo pendiente en vez de sustituirlo por `4209` (marco fijo).

## Publicación

La carga se realiza mediante el importador idempotente de catálogos existente. La autorización para importar fue dada por el titular; el importador comprueba conflictos antes de escribir, no sustituye filas existentes y verifica presentaciones y precios después de la carga. No se crea tabla ni se ejecuta migración.

```powershell
node --conditions=react-server --experimental-strip-types scripts/catalog/import-alumco-global.ts
node --conditions=react-server --experimental-strip-types scripts/catalog/import-alumco-global.ts --apply
```

Resultado remoto: el preflight encontró 171 inserciones y ningún conflicto; la importación insertó el lote y verificó **42 presentaciones y 42 precios**. `RO3506P` y `RO3507P` quedaron con `modo_acabado=independiente`, sin código ni nombre de acabado. No se modificaron filas preexistentes. No se ejecutó migración porque el esquema existente ya admite presentaciones y precios independientes del acabado.
