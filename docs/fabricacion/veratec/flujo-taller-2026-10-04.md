# Veratec: bases documentales y configuración del taller

Estado: implementación local de bases documentales preliminares; sin cambios de base de datos
Actualizado: 2026-10-11
Responsable: ingeniería

## Fuentes y límite

- `Diptico lineas de pvc.pdf`, págs. 2–7: identidad de familias, configuraciones dibujadas y perfiles.
- `PENDÓN VERATEC.pdf`, p. 1: función de perfiles, refuerzos y junquillos.
- `Lista Junio 2026.pdf`, págs. 1–12: SKU, acabado, unidad, largo y precio neto. La lista no demuestra por sí sola qué consume una receta.
- El usuario confirma el 2026-10-07 que `pauta de corte veratec.xlsx` fue entregado por Veratec. Sus fórmulas se reutilizan como **bases documentales preliminares**; no equivalen a validación física de taller ni completan datos ausentes. SHA-256 `30e4dc94d47aa698c48f82a89b330c601fb2794d06aed11783ac4c2c1f16de9c`.

El fixture familiar local contiene **60 insumos técnicos únicos, 63 relaciones insumo-familia y 121 presentaciones**. Los totales por familia se solapan porque un insumo compartido no se clona. El piloto previo Sliding 7400 es otro lote y el importador debe reutilizar sus identidades existentes. Estas cifras describen archivos locales, no estado remoto.

| Familia | Configuraciones comerciales | Perfiles/componentes identificados | Presentaciones de la lista familiar | Base de fabricación |
|---|---:|---|---:|---|
| Elegans 60 | 5 | Marco fijo, hojas interior/exterior, puerta interior/exterior, barra T, inversor, refuerzos y junquillos; díptico p. 2, lista pp. 1–3 y 12 | 58 | Bases de ventana/puerta interior y exterior, y fijo normal/rebajado desde las pestañas citadas abajo; el vidrio de puertas y los códigos sin equivalencia siguen pendientes |
| Compact Sliding | 3 | Marco, hoja, traslapo, riel, junquillos 4/20, cuarta hoja y refuerzos; díptico p. 3, lista p. 4 y 12 | 22 | Bases 2/3/4H; junquillo marcado «todos», accesorios y sierra pendientes |
| Sliding 7400 | 4 | Marcos 2/3 rieles, monorriel, hojas grande/chica, traslapos, rieles, refuerzos y junquillos; díptico p. 4, pendón p. 1, lista pp. 5–7, 9 y 12 | 54 | Receta productiva 2H monolítico 4 mm sin cambios; bases preliminares 3H, monorriel y 4H chica con 67415 según configuración operacional del taller. Excel aún muestra 67414; no se considera validación física |
| Inova | 1 | Marco, hoja, barra T, remates, junquillo y refuerzos; díptico p. 5 | 0 | Base editable de marco nominal y ancho de hoja (vano/2+12 mm), indicada por el usuario; códigos, altura y vidrio pendientes. No se atribuye al fabricante |
| Elevadora | 2 configuraciones con slot de fabricación (esquemas A y C) | Configuraciones del díptico p. 6; códigos insuficientes para asociar perfiles | 0 | Base de configuración sin perfiles ni fórmulas; cuatro esquemas permanecen sin slot técnico, no se crean insumos ficticios |
| EKO 130 | 1 | Marco, hojas, traslapos, riel y junquillos; díptico p. 7 | 0 | Sin fórmula |
| EKO 82 | 1 | Marco, hoja, traslapos, riel, junquillos y hoja guillotina; díptico p. 7 | 0 | Sin fórmula |

### Incorporación documental de esta pasada

`61004VER003`, **Cuarta hoja Sliding**: pendón p. 1 + lista junio p. 9 (`M`, 5,8 m, **$44.437 neto**). Se añade como insumo/presentación de la familia Sliding 7400, independiente del acabado. La evidencia no lo conecta a una receta 4H concreta: no genera consumo ni cortes automáticamente.

La comparación textual detectó otras referencias de la lista en pp. 8–12 (perfiles auxiliares, uniones, topes y refuerzos). Se conservan pendientes cuando el documento no identifica la familia/configuración o el consumo de receta. No se convierten precios de lista en relaciones técnicas por semejanza de código.

## Recorrido local

1. **Líneas y precios:** proveedor → familia explícita → configuración. La falta de receta o precio de compra no oculta la configuración comercial.
2. **Mis precios:** desde una configuración Veratec se puede ajustar una presentación oficial ya existente, o crear una presentación privada vinculada a un insumo oficial, o un perfil privado con código y nombre propios. La presentación privada exige SKU propio; largo y costo pueden quedar pendientes, nunca equivalen a cero. Puede marcarse expresamente como elegida para esa configuración; si varias candidatas siguen sin elección, el packing queda pendiente en lugar de escoger automáticamente. Se almacena por organización/familia/configuración con revisión. Requiere aplicar primero `20261004221000_workshop_supplier_presentations.sql` en un entorno autorizado.
3. **Configurar fabricación:** Elegans 60, Compact Sliding y Sliding 7400 ofrecen bases preliminares con referencia, pestaña y revisión; Inova ofrece solo las reglas editables indicadas arriba y Elevadora solo sus esquemas A/C. El taller puede guardar su variante desde el editor existente. Todo queda **Listo para probar**, sin certificación; los descuentos comerciales permanecen separados de las medidas de corte. Los largos de referencia son editables y los SKU exactos los reemplazan al preparar la pauta conjunta.
4. **Cotización nueva:** el gate QA existente limita resolución de presentaciones/costo a identidad autorizada. Una presentación privada se filtra por organización y configuración. Cuando falta asociación, largo o precio, el resultado queda parcial y da motivo. Los snapshots guardados conservan receta/variante y presentación/largo seleccionados; los históricos no se recalculan.

## Smoke local de variantes y costo — 2026-10-11

Ejecución automatizada con medidas 1200×1500 mm, acabado Blanco, fixtures locales de la lista neta junio 2026, packing sugerido y costo técnico. **No usa Supabase remoto, no modifica cotizaciones y no es una prueba visual ni validación física de taller.** El monto mostrado es solo el subtotal neto de componentes con SKU, presentación y precio resueltos; nunca se presenta como costo total cuando quedan faltantes.

| Familia / variante | Cortes | Barras | Neto conocido CLP | Resultado |
|---|---:|---:|---:|---|
| Sliding 7400 2H monolítico 4 mm | 40 | 11 | $208.021 | Parcial; vidrio y 12 insumos sin vínculo/precio permanecen pendientes |
| Sliding 7400 2H · ficha 20 mm | 40 | 11 | $192.857 | Parcial preliminar; el rótulo “Monolítico 20 mm” contradice la categoría TP. El conflicto queda visible y el despiece se puede editar en la cotización |
| Sliding 7400 2H · TP 24 mm | 40 | 11 | $192.857 | Parcial preliminar; se mantiene sin código/precio el junquillo por la discrepancia 7063 vs. 6307. El taller puede ajustar cortes en la cotización |
| Sliding 7400 4H chica · 67415 | 46 | 9 | $195.460 | Parcial; vidrio, rodamientos, cierres, felpa y goma sin precio |
| Sliding 7400 3H grande · 2 rieles | 36 | 8 | $176.070 | Parcial; falta vidrio. Se añadieron vínculos explícitos 7414→67414 y 7418→67418 sustentados por código/identidad de fuentes |
| Sliding 7400 3H chica · 2 rieles | 36 | 8 | $152.196 | Parcial; falta vidrio |
| Sliding 7400 monorriel · hoja grande | 25 | 7 | $134.109 | Parcial; falta vidrio |
| Sliding 7400 monorriel · hoja chica | 25 | 7 | $122.172 | Parcial; falta vidrio |
| Compact Sliding 2H | 28 | 8 | $125.495 | Parcial; vidrio y cuatro grupos de accesorios sin precio |
| Compact Sliding 3H | 38 | 8 | $125.495 | Parcial; vidrio y cuatro grupos de accesorios sin precio |
| Compact Sliding 4H | 46 | 10 | $162.652 | Parcial; vidrio y cuatro grupos de accesorios sin precio |
| Elegans 60 ventana interior/exterior, puerta interior/exterior y fijo normal/rebajado | 8–16 por variante | 2–4 por variante | Sin valorización | Cortes calculados, pero los códigos de receta del Excel (`65201VER`, `65212VER`, `65209VER`, `65204VER`, `65210VER`, `61011VER999`, entre otros) no tienen equivalencia demostrada con los SKU oficiales; no se inventó la asociación |

El test cubre 17 slots documentales y **los 17 generan cortes y barras** para el caso 1200×1500 mm: ocho variantes Sliding 7400, tres Compact Sliding y seis Elegans 60. Once tienen un subtotal parcial con precios oficiales enlazados; seis Elegans calculan despiece, pero siguen sin costo de perfiles por falta de equivalencias demostradas entre códigos del Excel y SKU oficiales. Los dos casos TP de 7400 ya no se bloquean: las contradicciones permanecen visibles y se evita costear el junquillo TP24 con el código de 20 mm. El botón “Editar despiece” guarda ajustes en esa cotización. Inova (una base estructural sin códigos/altura suficientes) y Elevadora (esquemas sin perfiles ni fórmulas) no forman parte de estos 17 slots porque todavía no tienen composición calculable. Detalle reproducible: `src/features/proveedor-catalogos/services/__tests__/veratec-variant-coverage.smoke.test.ts`.

## Verificación pendiente y límite de liberación

Esta integración local no aplica migraciones ni escribe en Supabase. La edición de preferencias privadas usa el contrato de persistencia existente. Tampoco se certifica una receta por prueba física: un test o preview no convierten una pauta preliminar en compra confirmada.
