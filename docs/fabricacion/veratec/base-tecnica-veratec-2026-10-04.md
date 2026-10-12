# Base técnica Veratec — estado local, 2026-10-04

## Fuentes revisadas

| Fuente | Revisión / uso | Alcance de evidencia |
|---|---|---|
| `pauta de corte veratec.xlsx` | SHA-256 `30e4dc94d47aa698c48f82a89b330c601fb2794d06aed11783ac4c2c1f16de9c` | Fórmulas de taller y ejemplos calculados por pestaña. No acredita SKU/precio ni aprobación de fábrica por sí sola. |
| `Diptico lineas de pvc.pdf` | Dossier PVC Xelena/Veratec, págs. 2–7 | Identidad de familias, perfiles y configuraciones ilustradas. |
| `PENDÓN VERATEC.pdf` | Pág. 1 | Secciones, función de perfiles/refuerzos, códigos de componentes y junquillos por espesor. |
| `Lista Junio 2026.pdf` | Revisión `2026-06`, págs. 1–12 | SKU, acabado, unidad, largo y precio neto de cada fila. CLP/base por presentación completa están confirmados por el administrador del catálogo. No es una lista “vigente” sin fecha. |
| Expediente actual 7400 | `docs/fabricacion/veratec/` + fixture Supplier Catalog V1 | Conserva la receta 2H monolítico 4 mm y su estado; el piloto Alumétrica y la evidencia comercial Xelena se mantienen como revisiones separadas. |

## Actualización 2026-10-07: procedencia y uso operacional

El usuario confirma que `pauta de corte veratec.xlsx` fue entregado por Veratec. Se corrige la conclusión anterior que lo describía como un archivo exclusivo de un taller. El archivo aporta fórmulas para más configuraciones; su procedencia permite ofrecerlas como **bases documentales preliminares**, pero no las vuelve recetas físicamente validadas ni completa SKU, largos, vidrio, junquillo, accesorios o parámetros de sierra ausentes.

La base común de Ventora ofrece cálculo preliminar editable para Compact Sliding, Sliding 7400 y otras configuraciones documentadas. La atribución de las fórmulas de hoja `FIJO`, `ABATIR INT Y OB` y `ABATIR EXT Y PROY` a Elegans quedó corregida el 2026-10-11: los códigos 65201/65212/65209 coinciden con la hoja Bahar 52 mm del libro de precios, por lo que estas tres bases se ofrecen solo en Bahar 5200. No se persiste automáticamente una receta por organización. Si el taller guarda su receta, esa receta privada toma precedencia y queda aislada por organización. Las bases conservan estado de prueba y fuente de hoja; no se marcan `validated`.

La receta productiva Sliding 7400 2H monolítico 4 mm y sus variantes TP no se modificaron. Las variantes de 7400 que el nombre comercial no distingue (3H grande/chica, monorriel grande/chico y fijo normal/rebajado) se ofrecen como elecciones explícitas; no se elige una geometría por defecto.

### Cobertura operacional incorporada

| Familia/configuración | Fuente del Excel | Resultado que ya puede calcularse | Pendiente que limita pauta completa |
|---|---|---|---|
| Compact Sliding 2H/3H/4H | pestañas `compact sliding 2/3/4 hojas`, celdas de medidas y cortes filas 9–24 | perfiles y medidas de vidrio según las fórmulas; la presentación con largo conocido participa en pauta | `todos` para junquillo, accesorios, vidrio final/espesor y parámetros de sierra; los perfiles sin presentación/largo quedan pendientes |
| Elegans 60 | Dossier de perfiles Elegans; las pestañas de pauta no se asignan a esta familia | La identidad comercial y referencias de perfil se conservan, sin receta universal habilitada para estas variantes | Las hojas de pauta citan códigos 65201/65212/65209 que coinciden con Bahar 52 mm; puertas también mezclan 65212/65210/65204. Se requieren fórmulas atribuibles a los códigos Elegans antes de habilitar cortes |
| Bahar 5200 fijo/ventanas y plegables | `FIJO`, `ABATIR INT Y OB`, `ABATIR EXT Y PROY`, `Plegable 3-3-0`, `Plegable 4-3-1`, `Plegable 6-5-1`, `Plegable 7-4-3` | Fórmulas calculables; las cuatro hojas plegables usan 65201 como marco y 65204 como hoja de puerta, ambos con precio en la lista `BAHAR` | Refuerzos de ventanas sin precio; vidrio/junquillo/espesor/accesorios de plegables pendientes y parámetros de sierra por taller |
| Sliding 7400 3H grande/chica, 2 rieles | `corred2riel3hojas2mismoriel`, `corred2rieles3hojas2mismoriel`, filas 9–24 | marco, hojas correctas (67414 grande / 67415 chica), refuerzos, traslapo, riel y vidrio medible | `67401` requiere largo de la presentación elegida por acabado; junquillo `todos` sin cotas; accesorios/espesor/kerf/despunte pendientes |
| Sliding 7400 monorriel grande/chica | `sliding mono riel hoja grande`, `sliding mono riel hoja chica`, filas 9–34 y 7–32 | perfiles con reglas explícitas y paño móvil + fijo calculables | junquillos `todos`, remate/perfiles sin largo/precio asociado, accesorios/espesores/sierra pendientes |

El fallback de cotización se usa solo cuando la organización no tiene receta guardada para esa línea; si la selección no define grande/chica o normal/rebajado, devuelve opciones en vez de escoger. La pauta de barras queda parcial si falta presentación/largo y el costo no se presenta como total. Consultar pruebas deterministas en `src/features/fabricacion/__tests__/veratec-workbook-recipes.test.ts` y `fabricacion-despiece-cotizacion.service.test.ts`.

## Estado inicial auditado el 2026-10-04 (superado por la actualización del 2026-10-07)

La siguiente tabla conserva el inventario y las brechas encontrados en la auditoría inicial. Su conclusión de que las fórmulas no se publicarían como bases comunes quedó reemplazada por la decisión del usuario y la implementación documentada arriba. La receta existente `ventora:veratec-7400-corredera` 2H monolítico 4 mm no se modificó.

### Cálculo candidato

| Variante | Hoja / salida de fórmula | Componentes cuya identidad y largo (5,8 m) están documentados | Estado y bloqueo concreto |
|---|---|---|---|
| Compact Sliding 2H | `compact sliding 2 hojas`; marco 67460, hoja 67461, traslapo 67463, refuerzos 69083/69041 y riel de origen `61013ver`; fórmulas de vidrio desde la pestaña | 67460, 67461, 67463, 69083STL001, 69041STL000 y riel oficial 61013VER001 | Fórmula observada en el Excel del taller, no disponible como receta común. Los códigos/precios con respaldo oficial sí se integran al catálogo. Junquillo “todos” no se aplica automáticamente; espesor y SKU deben configurarse para cada taller. |
| Compact Sliding 3H | `compact sliding 3 hojas`; misma base, hoja `W/3 + 24`, vidrio desde `E13−116` | Igual que 2H | Fórmula del taller no se habilita como receta común. |
| Compact Sliding 4H | `compact sliding 4 hojas`; hoja `W/4 + 17,8`, vidrio desde `E13−116` | Igual que 2H | Fórmula del taller no se habilita como receta común. |
| Sliding 7400 3H grande, 2 rieles iguales | `corred2riel3hojas2mismoriel`; marco 67401, hoja 67414, traslapo 67418 y riel fuente `61016ver` | 69014STL001, 67414VER, 69069STL000, 67418VER y riel oficial 61016VER001: 5,8 m | Fórmula del taller no se habilita como receta común. Los SKU/largos oficiales no convierten esa fórmula en universal. |
| Sliding 7400 3H chica, 2 rieles iguales | `corred2rieles3hojas2mismoriel `; marco 67401, hoja 67415, traslapo 67418, riel fuente `61016ver` | 69014STL001, 67415VER, 69071STL000, 67418VER y 61016VER001: 5,8 m | Fórmula del taller no se habilita como receta común; se mantiene documentada aparte la discrepancia de hoja en 4H chica. |

### Referencias comerciales confirmadas añadidas al fixture local

| Insumo técnico | SKU oficial | Familia(s) | Presentación/precio de lista junio | Evidencia y uso |
|---|---|---|---|---|
| 61013VER001 | 61013VER001 | Compact Sliding | M, 5,8 m, $9.493 neto | Díptico p. 3 + lista p. 4. El libro escribe `61013ver`; `recipeComponentCodes` guarda esa relación funcional explícita. `61013VER000` es Tope estanco monorriel (lista p. 9), no el riel. |
| 69083STL001 | 69083STL001 | Compact Sliding + Sliding 7400 | M, 5,8 m, $7.885 neto | La pauta lo usa como refuerzo marco Compact/monorriel; lista p. 12. Un insumo compartido, no clonado por familia. |
| 69041STL000 | 69041STL000 | Compact Sliding | M, 5,8 m, $7.882 neto | Pauta de hoja Compact + lista p. 12. |
| 69071STL000 | 69071STL000 | Sliding 7400 | M, 5,8 m, $9.153 neto | Pauta/pendón para hoja chica + lista p. 12. |
| 69060STL001 | 69060STL001 | Sliding 7400 | M, 5,8 m, $10.344 neto | Pauta monorriel + lista p. 12. |
| 61016VER001 | 61016VER001 | Sliding 7400 | M, 5,8 m, $10.940 neto | Pendón p. 1 + lista p. 5. El consumo Alumétrica `AB01016-E` y el origen Excel `61016ver` son aliases funcionales explícitos; ninguno se declara SKU literal. `61016VER000` es Tope estanco Compact Sliding (lista p. 9), no riel. |

El lote familiar local ahora tiene 60 insumos técnicos, 63 relaciones de familia y 121 presentaciones; incluye los refuerzos y la Cuarta hoja Sliding documentados en las fuentes. No se ejecutó importación por esta pasada. Las revisiones de fuente técnica y precio siguen independientes. La importación del piloto y del fixture de familias son lotes separados; los SKU 7400 existentes deben reutilizarse. Cobertura actual por familia/componente: [flujo-taller-2026-10-04.md](flujo-taller-2026-10-04.md).

## Inventario de las 45 pestañas del Excel

| Pestañas | Interpretación actual | Estado técnico |
|---|---|---|
| 1–23: `FIJO`, `fijo con marco rebajado`, `fijo con barra T horizontal/vertical`, puertas interior/exterior, con/sin zapata, marco perimetral, 2 hojas y compuestas | Fórmulas de paño fijo/puerta/abatible Elegans en códigos internos de planilla (65201, 61011VER999, etc.); hoja `BASE` indica Soluex. La documentación Xelena y la lista usan perfiles oficiales distintos (66311/66312/66403/66048/66404/66313/66044 y refuerzos STL). | No mapear por nombre “Elegans” ni generar recetas seleccionables. Junquillos `todos`/matriz del Excel contradicen espesores/códigos del pendón; accesorios de hoja no tienen SKU inequívoco. Falta equivalencia escrita entre códigos Soluex y SKU oficial, además de revisar fórmulas por puerta/variante. Los dos fijos existentes son candidatos de cálculo documental, no se siembran. |
| 24: `BASE` | Tablas/códigos auxiliares; declara códigos de terceros/Soluex en algunas secciones. | Evidencia de transcripción, no fuente de equivalencia comercial Veratec. |
| 25: `SLIDING HOJA GRANDE` | Corredera 7400 2H grande; el expediente actual 2H proviene de otro set/fórmula. | No reemplaza ni modifica la receta vigente. Registrar discrepancia para comparar con taller antes de cualquier migración a esa fórmula. |
| 26: `Sliding 4 hojas grandes` | 4H grande con fórmulas explícitas de marco, hoja, refuerzos, traslapo, riel y vidrio. | El díptico revisado no confirma esta variante 4H para la identidad comercial; pendiente confirmación de configuración y mapping/junquillo. No queda habilitada. |
| 27: `Hoja1` | Hoja vacía o auxiliar sin pauta interpretable. | Excluida; no hay fórmula que integrar. |
| 28: `SLIDING HOJA CHICA` | 2H chica. | Fórmula presente, pero queda pendiente reconciliar como variante comercial con receta 2H actual y revisar perfil/junquillo; no se sustituye el piloto. |
| 29: `Sliding 4 hojas chicas` | 4H chica. El Excel usa 67414 pese a nombrarla chica; catálogo/precio identifica 67414 como grande y 67415 como chica. | La base operativa indicada por el taller usa 67415 para hoja chica y reserva 67414 para grande/reforzada. Se conserva anotado el conflicto de fuente; sigue pendiente validación física y no se declara equivalencia certificada por fabricante. |
| 30 y 32: `sliding mono riel hoja grande/chica` | Monorriel con móvil + fijo; perfiles/cortes y dos paños. | Fórmulas de perfiles aparecen, pero el junquillo se marca `todos` y faltan cotas de sus cortes; además hay que conciliar variante/composición, terminaciones y complementos con configuración de catálogo. No generar receta completa. |
| 31: `Monoriel hoja grande desplazada` | Incluye ancho A ingresado; varias filas de junquillo/riel/remate tienen medida vacía. | No calculable completo sin ancho A válido y reglas faltantes para componentes; medidas de vidrio en la hoja no llenan las cotas de corte del perfil. |
| 33: `Sliding monoriel 4 hojas grande` | Fórmula con filas de refuerzo en cero. | Bloqueada. Los ceros no se interpretan como cortes de longitud cero ni como componentes opcionales. |
| 34 y 36: `corre 2y3 rieles 3 hojas grande/chicas` | Alterna marco 67401/67413 y cantidad 2/3 rieles; algunas filas de refuerzo sin medida/cantidad. | Ambigua; no se crea receta que contenga `A o B` ni que elija automáticamente. Requiere que fabricante/taller confirme sistema de rieles y variante de marco, más completar filas vacías. |
| 35 y 37: `corred2riel3hojas2mismoriel`, `corred2rieles3hojas2mismoriel` | 3H grande/chica, dos rieles, corre en el mismo riel; códigos y fórmulas identificables. | Candidatos de corte parcial registrados como `lista_para_validar`; marco pendiente por largo del acabado, junquillo sin cotas, accesorios/vidrio/kerf y revisión de taller. |
| 38: `corredera grande 3 riele 6 hoja` | 6H/3 rieles; algunas piezas de refuerzo sin cantidad/corte y junquillo sin especificar. | Bloqueada para pauta completa; no inventar cortes para filas en blanco. |
| 39–41: Compact Sliding 2H/3H/4H | Fórmulas y perfiles observados en la planilla de un taller; la lista oficial documenta SKU/largo/precio para algunos perfiles. | Familia y perfiles oficialmente documentados disponibles; fórmulas del Excel no se ofrecen como recetas comunes. Un taller que quiera usarlas debe configurar y probar su propia receta. Junquillo, vidrio, accesorios y parámetros de merma siguen por resolver en esa receta. |
| 42–45: `Plegable 4-3-1`, `3-3-0`, `6-5-1`, `7-4-3` | Fórmulas de sistemas plegables, sin identificación inequívoca Veratec en estas pestañas. | No atribuir a Veratec. Excluidas del catálogo técnico Veratec hasta que se entregue identidad/fuente del fabricante. |

## Pendientes de producto y datos por partida

1. **Acabado → largo comercial antes de la pauta física:** la lista junio 2026 p. 5 distingue `67401VER000/153/043/199` = 5,8 m y `67401VER200/079` = 6,8 m. La pauta conjunta toma el SKU/presentación elegidos; la base editable de 6.000 mm no se presenta como dato confirmado y solo aplica mientras no exista selección exacta. Costo por metro y longitud física siguen siendo datos independientes.
2. **Espesor → junquillo Compact:** existe matriz documental 4 mm→67062VER y 20 mm→67464VER; el cálculo necesita usar el vidrio/espesor final de esa partida, no el valor `todos` de la hoja. La UI de despiece todavía no ofrece esta selección ni guarda una respuesta de alcance de trabajo. Mientras tanto el componente no aparece como corte y la pauta es parcial.
3. **Junquillo 7400 3H/monorriel:** hay códigos del pendón por espesor, pero las pestañas no entregan longitudes de sus cortes (`todos` o medidas vacías). No basta escoger SKU: hace falta la regla dimensional por cada hoja/paño.
4. **Datos de fabricación:** kerf, despunte inicial, mínimo de sobrante aprovechable y validación de los ejemplos en taller siguen sin una fuente de esta entrega. El motor no los inventa.
5. **Captura por trabajo solicitada:** aún no se implementó en UI/persistencia una respuesta técnica desde el despiece ni una oferta de guardarla como preferencia opt-in. No existe una preferencia por defecto ni se actualiza receta global. Ese cierre requiere contrato de respuesta per-work que preserve el snapshot histórico y actor/organización/fecha; no se realizó una migración por esta tarea.

## Verificación contra ejemplos independientes del libro

El contrato automatizado contrasta la salida de 1200×1500 con las fórmulas/celdas del Excel para Compact 2H/3H/4H y 7400 3H grande/chica. También revisa largo de barras, alias exactos, ausencia de largos desconocidos y estado `lista_para_validar`. Estos son ejemplos de la propia planilla, no validación externa ni smoke autenticado.

## Actualización local 2026-10-10: bases operacionales preliminares

- **Sliding 7400:** 2H monolítico 4 mm permanece sin cambios. 3H y monorriel usan 6.000 mm como largo de referencia editable donde no hay SKU exacto; 67401 usa el SKU/acabado resuelto por la pauta conjunta. La base 4H chica usa 67415 según la configuración operacional solicitada por el taller. El Excel todavía muestra 67414; esa diferencia queda en procedencia, no como bloqueo del cálculo. La base no está validada físicamente.
- **Compact Sliding:** conserva las fórmulas 2H/3H/4H de las pestañas correspondientes. Rodamientos (2 por hoja móvil), cierre central, felpa calculada desde los cortes de perfil `Hoja` en metros, y kit de tapas/topes son consumos provisionales editables. Sin precio asociado, el costo queda parcial.
- **Elegans 60:** las longitudes de referencia parten en 6.000 mm y las presentaciones seleccionadas prevalecen. En puertas se añadió ancho/alto de vidrio = dimensión de hoja menos 110 mm como regla preliminar indicada por el usuario, no como fórmula de fabricante.
- **Inova:** la base editable contiene marco nominal a 45° y ancho de hoja = vano/2 +12 mm. No inventa códigos ni altura de hoja; esa parte queda sin cálculo.

## Actualización operacional 2026-10-11 — Sliding 7400 4H chica

- Configuración operacional: hoja chica `67415VER`; `67414VER` se reserva para hoja grande/reforzada. Catálogo y Lista Junio 2026 p. 5 dan nombre/SKU/precio a ambos perfiles. El Excel (`Sliding 4 hojas chicas`, C11:E12) mantiene `67414VER`; se documenta como discrepancia de fuente y no como confirmación física.
- Ancho de hoja: `W/4 + 18,3 mm`, que conserva el Excel (`C3/4 + 18,3`) y equivale algebraicamente a `(W + 3×26 − 2×2,4)/4`. Los 2,4 mm son el espesor efectivo deducido del intercepto Excel para expresar la fórmula solicitada; no son una cota publicada por Veratec. Altura de hoja `H−88 mm`, compartida con las variantes 67414/67415 del workbook.
- Vidrio base operativo 4 mm: ancho de hoja menos 86 mm; alto de hoja menos 86 mm. Vidrio de 5 mm sigue sin habilitarse hasta confirmar compatibilidad. Se propone goma/cuña directa, sin junquillo rígido; consumo lineal = perímetro de los cuatro paños calculados.
- Cortes de marco/riel/jamba y bastidor 67415: 45°/45° en esta base operacional. Refuerzos y traslapos conservan sus cortes rectos existentes.
- Consumos de quincallería propuestos por unidad: 8 rodamientos, 2 cierres de extremos, 1 juego central y felpa calculada por el perímetro de las cuatro hojas. Sin SKU/precio de taller, costo queda **parcial en CLP**; no se inventan precios. Falta completar SKU/precio de rodamientos, cierres, felpa y goma, además de validar kerf/despunte y prueba física.
- **Elevadora:** se habilitan para configurar solo los esquemas A (1 fijo + 1 móvil) y C (2 fijos + 2 móviles). No hay perfiles ni fórmulas de corte; la base queda sin despiece. Los otros cuatro esquemas comerciales permanecen sin slots técnicos.
- Todas las bases se mantienen en `lista_para_validar` / **Listo para probar**, con kerf/despunte y validación física pendientes. Los precios propios y referenciales no se deducen del largo.

## Límites de esta entrega

### Actualización 2026-10-11 — Bahar 5200

La hoja `BAHAR` de `MATERIALES PRECIO VERATEC.xlsx` identifica sistema 52 mm y aporta 10 perfiles, 5 acabados y presentaciones de 5.800 mm con precio de lista neto CLP. Se transcribieron 50 precios a un fixture separado con revisión de origen `2022-07`; son una referencia histórica, no una afirmación de vigencia actual. Las fórmulas de `FIJO`, `ABATIR INT Y OB` y `ABATIR EXT Y PROY` se conectan como bases preliminares a Bahar por coincidencia literal de SKU. También se incorporan las composiciones `Plegable 3-3-0`, `4-3-1`, `6-5-1` y `7-4-3`, que identifican 65201 y 65204, ambos con precio por acabado.

Las cuatro pautas plegables calculan perfiles y dimensiones de vidrio, y su costo de perfiles queda parcial. No especifican espesor de vidrio, junquillo ni quincallería, así que no se agregaron consumos ni precios para esos conceptos. Las pestañas de puertas convencionales continúan fuera por su mezcla de códigos 65212/65210/65204. La importación del fixture a la base compartida y el smoke de navegador no se realizaron; los tests usan los datos locales y no modifican Supabase.

### Incidente de cotización 2026-10-11 — Sliding 7400 4H chica

- Causa: el panel de cotización solo resolvía recetas persistidas por empresa, aunque existía una base preliminar común; además, el gate de composición estructural descartaba el ítem antes del resolver.
- Corrección local: el panel usa la base común para nuevas cotizaciones y permite la combinación exacta 4 hojas / 4 móviles si el croquis conserva cuatro módulos correderos. El resumen marca revisión manual cuando hay ajustes visuales; si la geometría cambia a fija u otra cantidad, no fuerza esta receta.
- Pruebas automáticas: contrato de despiece, panel sin receta persistida, resumen y rechazo de composición incompatible.
- Smoke de navegador y escritura/guardado en Supabase no realizados en esta corrección; no se cambió validación física ni estado `testing`.

- Cambios exclusivamente locales; sin escrituras, preflight ni lecturas en Supabase remoto.
- No se creó tabla, migración, commit, push ni deploy.
- Sin nueva validación visual en navegador ni validación física de fabricación.
- Inova/Elevadora/EKO 130/EKO 82 permanecen como familias comerciales/inventario documentado; no se inventan recetas. El libro no contiene reglas atribuibles con evidencia suficiente a esas familias.
- El catálogo común ya no ofrece recetas derivadas del XLSX del taller. Cada taller configura su propia receta en el espacio privado de fabricación; el catálogo compartido conserva perfiles, SKU, largos y precios respaldados por fuentes oficiales.
- Auditoría puntual de los ocho hallazgos externos, con referencias de página/celda y distinción entre costo por presentación y packing conjunto: `auditoria-cruce-hallazgos-2026-10-04.md`.
