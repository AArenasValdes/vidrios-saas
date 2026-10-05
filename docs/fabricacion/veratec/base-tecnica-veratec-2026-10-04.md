# Base técnica Veratec — estado local, 2026-10-04

## Fuentes revisadas

| Fuente | Revisión / uso | Alcance de evidencia |
|---|---|---|
| `pauta de corte veratec.xlsx` | SHA-256 `30e4dc94d47aa698c48f82a89b330c601fb2794d06aed11783ac4c2c1f16de9c` | Fórmulas de taller y ejemplos calculados por pestaña. No acredita SKU/precio ni aprobación de fábrica por sí sola. |
| `Diptico lineas de pvc.pdf` | Dossier PVC Xelena/Veratec, págs. 2–7 | Identidad de familias, perfiles y configuraciones ilustradas. |
| `PENDÓN VERATEC.pdf` | Pág. 1 | Secciones, función de perfiles/refuerzos, códigos de componentes y junquillos por espesor. |
| `Lista Junio 2026.pdf` | Revisión `2026-06`, págs. 1–12 | SKU, acabado, unidad, largo y precio neto de cada fila. CLP/base por presentación completa están confirmados por el administrador del catálogo. No es una lista “vigente” sin fecha. |
| Expediente actual 7400 | `docs/fabricacion/veratec/` + fixture Supplier Catalog V1 | Conserva la receta 2H monolítico 4 mm y su estado; el piloto Alumétrica y la evidencia comercial Xelena se mantienen como revisiones separadas. |

## Resultado de implementación local

El libro `pauta de corte veratec.xlsx` fue entregado por un taller específico. Sus fórmulas pueden describir su método de trabajo, pero no se tratan como reglas universales de fabricante ni como recetas comunes para todos los talleres. Las funciones de transcripción y sus pruebas permanecen como evidencia local; no se registran como variantes en el catálogo común ni se auto-siembra ninguna receta. La receta existente `ventora:veratec-7400-corredera` 2H monolítico 4 mm no se modificó.

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
| 29: `Sliding 4 hojas chicas` | 4H chica. La fórmula usa código de hoja 67414 a pesar de nombrarla chica; el catálogo identifica hoja chica como 67415. | Contradicción de identidad SKU; bloqueada. No corregir usando similitud de nombre. |
| 30 y 32: `sliding mono riel hoja grande/chica` | Monorriel con móvil + fijo; perfiles/cortes y dos paños. | Fórmulas de perfiles aparecen, pero el junquillo se marca `todos` y faltan cotas de sus cortes; además hay que conciliar variante/composición, terminaciones y complementos con configuración de catálogo. No generar receta completa. |
| 31: `Monoriel hoja grande desplazada` | Incluye ancho A ingresado; varias filas de junquillo/riel/remate tienen medida vacía. | No calculable completo sin ancho A válido y reglas faltantes para componentes; medidas de vidrio en la hoja no llenan las cotas de corte del perfil. |
| 33: `Sliding monoriel 4 hojas grande` | Fórmula con filas de refuerzo en cero. | Bloqueada. Los ceros no se interpretan como cortes de longitud cero ni como componentes opcionales. |
| 34 y 36: `corre 2y3 rieles 3 hojas grande/chicas` | Alterna marco 67401/67413 y cantidad 2/3 rieles; algunas filas de refuerzo sin medida/cantidad. | Ambigua; no se crea receta que contenga `A o B` ni que elija automáticamente. Requiere que fabricante/taller confirme sistema de rieles y variante de marco, más completar filas vacías. |
| 35 y 37: `corred2riel3hojas2mismoriel`, `corred2rieles3hojas2mismoriel` | 3H grande/chica, dos rieles, corre en el mismo riel; códigos y fórmulas identificables. | Candidatos de corte parcial registrados como `lista_para_validar`; marco pendiente por largo del acabado, junquillo sin cotas, accesorios/vidrio/kerf y revisión de taller. |
| 38: `corredera grande 3 riele 6 hoja` | 6H/3 rieles; algunas piezas de refuerzo sin cantidad/corte y junquillo sin especificar. | Bloqueada para pauta completa; no inventar cortes para filas en blanco. |
| 39–41: Compact Sliding 2H/3H/4H | Fórmulas y perfiles observados en la planilla de un taller; la lista oficial documenta SKU/largo/precio para algunos perfiles. | Familia y perfiles oficialmente documentados disponibles; fórmulas del Excel no se ofrecen como recetas comunes. Un taller que quiera usarlas debe configurar y probar su propia receta. Junquillo, vidrio, accesorios y parámetros de merma siguen por resolver en esa receta. |
| 42–45: `Plegable 4-3-1`, `3-3-0`, `6-5-1`, `7-4-3` | Fórmulas de sistemas plegables, sin identificación inequívoca Veratec en estas pestañas. | No atribuir a Veratec. Excluidas del catálogo técnico Veratec hasta que se entregue identidad/fuente del fabricante. |

## Pendientes de producto y datos por partida

1. **Acabado → largo comercial antes de la pauta física:** la lista junio 2026 p. 5 distingue `67401VER000/153/043/199` = 5,8 m y `67401VER200/079` = 6,8 m. La pasada posterior al documento original conecta la presentación seleccionada con la pauta nueva; conservar esta prueba numérica al ampliar configuraciones. El costo por metro y la longitud física siguen siendo datos independientes.
2. **Espesor → junquillo Compact:** existe matriz documental 4 mm→67062VER y 20 mm→67464VER; el cálculo necesita usar el vidrio/espesor final de esa partida, no el valor `todos` de la hoja. La UI de despiece todavía no ofrece esta selección ni guarda una respuesta de alcance de trabajo. Mientras tanto el componente no aparece como corte y la pauta es parcial.
3. **Junquillo 7400 3H/monorriel:** hay códigos del pendón por espesor, pero las pestañas no entregan longitudes de sus cortes (`todos` o medidas vacías). No basta escoger SKU: hace falta la regla dimensional por cada hoja/paño.
4. **Datos de fabricación:** kerf, despunte inicial, mínimo de sobrante aprovechable y validación de los ejemplos en taller siguen sin una fuente de esta entrega. El motor no los inventa.
5. **Captura por trabajo solicitada:** aún no se implementó en UI/persistencia una respuesta técnica desde el despiece ni una oferta de guardarla como preferencia opt-in. No existe una preferencia por defecto ni se actualiza receta global. Ese cierre requiere contrato de respuesta per-work que preserve el snapshot histórico y actor/organización/fecha; no se realizó una migración por esta tarea.

## Verificación contra ejemplos independientes del libro

El contrato automatizado contrasta la salida de 1200×1500 con las fórmulas/celdas del Excel para Compact 2H/3H/4H y 7400 3H grande/chica. También revisa largo de barras, alias exactos, ausencia de largos desconocidos y estado `lista_para_validar`. Estos son ejemplos de la propia planilla, no validación externa ni smoke autenticado.

## Límites de esta entrega

- Cambios exclusivamente locales; sin escrituras, preflight ni lecturas en Supabase remoto.
- No se creó tabla, migración, commit, push ni deploy.
- Sin nueva validación visual en navegador ni validación física de fabricación.
- Inova/Elevadora/EKO 130/EKO 82 permanecen como familias comerciales/inventario documentado; no se inventan recetas. El libro no contiene reglas atribuibles con evidencia suficiente a esas familias.
- El catálogo común ya no ofrece recetas derivadas del XLSX del taller. Cada taller configura su propia receta en el espacio privado de fabricación; el catálogo compartido conserva perfiles, SKU, largos y precios respaldados por fuentes oficiales.
- Auditoría puntual de los ocho hallazgos externos, con referencias de página/celda y distinción entre costo por presentación y packing conjunto: `auditoria-cruce-hallazgos-2026-10-04.md`.
