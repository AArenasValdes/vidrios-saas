# Veratec: bases documentales y configuración del taller

Estado: implementación local de bases documentales preliminares; sin cambios de base de datos
Actualizado: 2026-10-07
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
| Sliding 7400 | 3 | Marcos 2/3 rieles y monorriel, hojas grande/chica, traslapos, riel, barra T, refuerzos, junquillos y cuarta hoja; díptico p. 4, pendón p. 1, lista pp. 5–7, 9 y 12 | 54 | Receta productiva 2H monolítico 4 mm sin cambios; bases preliminares 3H grande/chica y monorriel grande/chica. 4H chica sigue bloqueada por contradicción 67414/67415 |
| Inova | 1 | Marco, hoja, barra T, remates, junquillo y refuerzos; díptico p. 5 | 0 | Sin fórmula atribuible a esa configuración exacta |
| Elevadora | 2 | Configuraciones visibles en díptico p. 6; códigos insuficientes para asociar perfiles | 0 | Sin insumos ficticios ni receta |
| EKO 130 | 1 | Marco, hojas, traslapos, riel y junquillos; díptico p. 7 | 0 | Sin fórmula |
| EKO 82 | 1 | Marco, hoja, traslapos, riel, junquillos y hoja guillotina; díptico p. 7 | 0 | Sin fórmula |

### Incorporación documental de esta pasada

`61004VER003`, **Cuarta hoja Sliding**: pendón p. 1 + lista junio p. 9 (`M`, 5,8 m, **$44.437 neto**). Se añade como insumo/presentación de la familia Sliding 7400, independiente del acabado. La evidencia no lo conecta a una receta 4H concreta: no genera consumo ni cortes automáticamente.

La comparación textual detectó otras referencias de la lista en pp. 8–12 (perfiles auxiliares, uniones, topes y refuerzos). Se conservan pendientes cuando el documento no identifica la familia/configuración o el consumo de receta. No se convierten precios de lista en relaciones técnicas por semejanza de código.

## Recorrido local

1. **Líneas y precios:** proveedor → familia explícita → configuración. La falta de receta o precio de compra no oculta la configuración comercial.
2. **Mis precios:** desde una configuración Veratec se puede ajustar una presentación oficial ya existente, o crear una presentación privada vinculada a un insumo oficial, o un perfil privado con código y nombre propios. La presentación privada exige SKU propio; largo y costo pueden quedar pendientes, nunca equivalen a cero. Puede marcarse expresamente como elegida para esa configuración; si varias candidatas siguen sin elección, el packing queda pendiente en lugar de escoger automáticamente. Se almacena por organización/familia/configuración con revisión. Requiere aplicar primero `20261004221000_workshop_supplier_presentations.sql` en un entorno autorizado.
3. **Configurar fabricación:** las configuraciones documentadas de Elegans 60, Compact Sliding y Sliding 7400 ofrecen una base común de Ventora con fuente, pestaña y revisión. El taller puede guardar su propia variante desde el editor existente. Las bases comunes quedan en prueba (`testing`), no certificadas; el editor admite ancho, alto, hojas y módulos, además de cortes en mm. Los descuentos comerciales permanecen separados de las medidas de corte.
4. **Cotización nueva:** el gate QA existente limita resolución de presentaciones/costo a identidad autorizada. Una presentación privada se filtra por organización y configuración. Cuando falta asociación, largo o precio, el resultado queda parcial y da motivo. Los snapshots guardados conservan receta/variante y presentación/largo seleccionados; los históricos no se recalculan.

## Verificación pendiente y límite de liberación

Esta integración local no aplica migraciones ni escribe en Supabase. La edición de preferencias privadas usa el contrato de persistencia existente. Tampoco se certifica una receta por prueba física: un test o preview no convierten una pauta preliminar en compra confirmada.
