# Catálogo Veratec/Xelena por familias — V1

## Alcance y límites

El catálogo comercial se organiza en familias y configuraciones independientes de recetas, costos o precios de venta. Una configuración puede seleccionarse y cotizarse sin pauta; el precio comercial por m² sigue siendo responsabilidad de cada taller. Los precios de compra de Xelena nunca reemplazan ese valor.

La fuente técnica del lote se versiona como `xelena-veratec-pvc-diptico-2026-v1`. La lista de precios es independiente: Xelena/Veratec, revisión `2026-06`, CLP, neto por presentación completa. No se crean tablas ni se importa este fixture automáticamente.

El usuario confirma que `docs/fabricacion/veratec/pauta de corte veratec.xlsx` fue entregado por Veratec. Desde 2026-10-07, las fórmulas claras de Elegans 60, Compact Sliding y Sliding 7400 se ofrecen como bases comunes preliminares, con fuente y pestaña visibles; no están validadas físicamente ni completan datos ausentes.

## Matriz comercial y técnica

| Familia | Configuraciones disponibles en catálogo | Perfiles técnicos con código documentado | Presentaciones/precios de junio 2026 | Estado de receta |
|---|---|---|---|---|
| Elegans 60 | Ventana abatible, hoja interior/exterior; puerta abatible, hoja interior/exterior; paño fijo | Marco fijo, hojas, barra T, inversor, junquillos 10/20/24 mm y cuatro refuerzos cuyo nombre comercial especifica Elegans. Junquillo 4 mm reutiliza el insumo técnico compartido de la 7400. | Filas transcritas de págs. 1–3 y refuerzos de p. 12; acabado, SKU, largo y valor por fila. | Base preliminar para ventana y puerta interior/exterior, y fijo normal/rebajado. Vidrio de puertas y códigos sin equivalencia quedan pendientes. |
| Compact Sliding | Corredera 2, 3 y 4 hojas, según esquemas pág. 3 | Marco 67460, hoja 67461, traslapo 67463, riel oficial 61013VER001, junquillos 67062/67464, refuerzos 69083/69041 y cuarta hoja 61014VER001 identificada como Compact Sliding en lista. | Filas transcritas de págs. 4, 9 y 12; SKU/largos/precios directos. | Base preliminar 2/3/4H. Junquillo «todos», accesorios y sierra quedan pendientes; el packing requiere presentación/largo exacto. |
| Sliding 7400 | Familia `veratec:sliding-7400`, con configuraciones 2H, 3H y monorriel. Se conserva la clave heredada `ventora:veratec-7400-corredera` para la configuración 2H. | Perfiles 2H y sus presentaciones permanecen en el piloto; el lote familiar añade monorriel, triple riel, hoja chica, barra T, traslapo chico, remate, refuerzo marco 3 rieles y zapata de aluminio con Sliding 7400 explícito en la lista. Perfiles compartidos 66307/67063 conservan una sola identidad. | La configuración 2H conserva la importación piloto existente; el lote agrega solo SKU no repetidos. El marco 67401 es 5,8 o 6,8 m según acabado. | Se conserva la receta productiva 2H monolítico 4 mm sin cambios. Hay bases preliminares 3H grande/chica y monorriel grande/chica. TP20/TP24 siguen preliminares. |
| Inova | Corredera representada en pág. 5 | Marco, hoja, barra T, remates, junquillo y cuatro referencias de refuerzo codificadas. | No se encontraron presentaciones/precios asociables en la lista revisada. | Sin receta. |
| Elevadora | Seis esquemas: 2 paños 1 fijo/1 móvil; 2 móviles; 3 paños 2 fijos/1 móvil; 3 paños 1 fijo/2 móviles; 4 móviles; 4 paños 2 fijos/2 móviles. | El folleto no muestra códigos de perfiles suficientes; no se crea ningún insumo técnico. | Sin presentaciones/precios asociados. | Sin receta. |
| EKO 130 | Identidad comercial de familia; el folleto presenta perfiles, no una composición completa de ventana. | Ocho códigos de perfil de la pág. 7. | Sin filas de precios asociables en la lista revisada. | Sin receta. |
| EKO 82 | Identidad comercial de familia; el folleto presenta perfiles, no una composición completa de ventana. | Ocho códigos de perfil de la pág. 7. | Sin filas de precios asociables en la lista revisada. | Sin receta. |

### Reutilización entre familias

- `66306VER` ya está representado por el piloto 7400 y asociado a Sliding 7400 + Elegans 60. El fixture nuevo no replica su insumo ni sus tres presentaciones existentes.
- `66307VER` y `67063VER` aparecen una vez cada uno en el fixture, con `familyKeys` Elegans 60 + Sliding 7400. Sus SKU de acabado siguen siendo presentaciones distintas del mismo insumo técnico, no insumos clonados.
- Cada código EKO/Inova documentado aparece una vez, aunque carezca de fila de precio. Ausencia de precio limita costo, no visibilidad de la familia.
- Ninguna relación usa sufijos de SKU ni similitud automática de nombres.
- `pauta de corte veratec.xlsx` se atribuye a Veratec según la confirmación del usuario. Sus fórmulas claras se usan en bases preliminares comunes; ambigüedades, contradicciones y datos ausentes siguen pendientes. La procedencia no implica validación física ni convierte SKU, largos y precios en universales: requieren sus propias filas de catálogo o fuente identificable.

## Preflight local del fixture

Prueba estática del lote frente al fixture piloto conocido (no es lectura del estado remoto):

| Objeto | Acción esperada |
|---|---:|
| Insumos técnicos nuevos | 59 INSERT potenciales |
| Relaciones insumo/familia solicitadas | 62 INSERT potenciales; perfiles compartidos conservan una sola identidad y sus relaciones explícitas |
| Presentaciones nuevas de lista | 120 INSERT potenciales |
| SKU repetidos dentro del lote | 0 |
| SKU del lote repetidos frente al piloto 7400 | 0 |
| Insumos/perfiles Elevadora | 0 |
| Fuente técnica nueva | 1 INSERT potencial |
| Lista de precios | revisión `2026-06` compartida; el estado remoto requiere preflight ejecutado antes de importar |

La importación real debe ejecutar `preflightSupplierCatalogBatch()` y abortar ante cualquier `CONFLICTO`. El preflight de repositorio ahora detecta SKU del proveedor que ya existan bajo otra revisión técnica; no deben duplicarse por familia. Este documento y las pruebas no escriben en Supabase.

La extensión de siete filas usa exclusivamente descripciones/SKU de Lista Junio 2026: `69048STL000`, `69018STL000`, `69019STL000` y `69076STL000` nombran Elegans (p. 12); `69026STL000` nombra marco 3 rieles 7400 (p. 12); `61014VER001` identifica cuarta hoja Compact Sliding y `67412VER001` zapata de aluminio Sliding 7400 (p. 9). Se incorporan como catálogo/precio de compra y no se insertan en recetas. Otros auxiliares/accesorios sin sistema explícito se mantienen fuera de las siete familias; por ejemplo, Cuarta hoja Sliding no identifica 7400 específicamente y no se fuerza dentro de esa familia.

## Verificación

`supplierCatalogImportSchema` requiere correspondencias técnicas explícitas por `technicalKey`, evita códigos técnicos duplicados en el mismo lote y admite que un insumo declare varias familias. No acepta filas de presentación sin referencia a un insumo del lote. Los precios desconocidos no se convierten en cero.
