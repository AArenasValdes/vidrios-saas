# Verificación de hallazgos Veratec — 2026-10-04

Este cruce toma el informe externo como una lista de afirmaciones que verificar. No modifica datos remotos ni promueve recetas. Evidencia local: `Diptico lineas de pvc.pdf`, `PENDÓN VERATEC.pdf`, `Lista Junio 2026.pdf`, `pauta de corte veratec.xlsx` (SHA-256 `30e4dc94d47aa698c48f82a89b330c601fb2794d06aed11783ac4c2c1f16de9c`) y el expediente de recetas del repositorio.

## Hallazgos y decisión

| N.º | Resultado | Evidencia rastreable | Cambio / alcance |
|---|---|---|---|
| 1. Largo de `67401VER` | **SKU observados:** `000`, `153`, `043`, `199` = 5.800 mm; `200`, `079` = 6.800 mm. | `Lista Junio 2026.pdf`, p. 5, filas de cada SKU. El nombre/código de `67401VER` como marco Sliding 7400 se identifica en `Diptico lineas de pvc.pdf`, p. 4. | El fixture conserva los seis SKU y largos; el alias funcional de receta `7401` → insumo comercial `67401VER` se registra explícitamente como derivado de descripción/familia, no equivalencia literal ni conversión de sufijo. La prueba recorre las seis filas y sus largos/precios. **Gap de motor:** el costo parcial escoge y empaqueta por el largo del SKU/acabado; la pauta de trabajo se construye antes, desde los snapshots por ítem. La receta actual 7400 2H aún fija 5.800 mm y el snapshot de trabajo no consulta Supplier Catalogs. Por eso el total de barras compartidas del trabajo todavía no está demostrado para Negro/Negro Mate. No se cambia esa receta automáticamente en esta pasada.
| 2. `Sliding 4 hojas chicas` | **Bloqueada.** La fórmula existe pero su identidad de hoja es contradictoria. | XLSX, pestaña `Sliding 4 hojas chicas`: B1 dice “CORREDERA GRANDE 4 HOJASCHICAS”; C11/C12=`67414VER`, D11/D12=`Hoja chica`; E11=`(C3/4)+18.3`, E12=`C4-88`; F11/F12=`x8`. Dossier local p. 4 identifica `67414` como hoja grande y `67415` como chica. | No reemplazar el código. Los cálculos para 3.445×2.100 mm arrojan 879,55×8 y 2.012×8 para la hoja indicada, pero no demuestran que sean válidos para `67415`. No se agrega selector/receta de 4H chica.
| 3. Refuerzos de hoja | **Nombres confirmados; compatibilidad física no concluida.** | `PENDÓN VERATEC.pdf`, p. 1: `69069STL000` refuerzo de hoja corredera grande y `69071STL000` refuerzo de hoja corredera chica 7400. `Lista Junio 2026.pdf`, p. 12, repite códigos/descripciones. | Se conservan insumos separados por función. Ninguna nota afirma incompatibilidad física; falta una sección/detalle mecánico o confirmación de Xelena para tal conclusión.
| 4. Junquillos 20 mm | **Identidades separadas por familia/código.** | `Diptico lineas de pvc.pdf`, p. 2: `66307VER` Elegans; p. 3: `67464VER` Compact Sliding; p. 4: `66307VER` Sliding 7400. Lista junio, pp. 3–4, las filas comerciales respectivas. | `66307VER` se reutiliza como el mismo insumo observado en Elegans/7400. `67464VER` permanece como otro insumo de Compact. No se intercambian ni se declara que sean física o comercialmente intercambiables/incompatibles.
| 5. Vidrio de 5 mm | **Pendiente; no se habilita.** | Dossier local, p. 4, indica 4–24 mm en Sliding 7400 y asigna `66306VER` a 4 mm; la hoja piloto identifica `6306` como junquillo 4 mm. ASAŞ Sliding 74–76 enumera 4/20/24/30 mm, pero no demuestra 5 mm ni que el junquillo de 4 mm lo admita. | Se registra el enlace funcional exacto `6306` → `66306VER` para consumo 4 mm solamente. No se agrega 5 mm a la matriz. El rango ASAŞ de 30 mm y el dossier local (máximo 24 mm) no se armonizan sin confirmación local de Xelena. |
| 6. `61011VER999` | **No mapeado.** | XLSX pestaña `FIJO`: C7=`61011VER999`, D7=`Refuerzo`; la lista p. 12 incluye perfiles/refuerzos con códigos distintos pero no una fila de equivalencia. | Se conserva únicamente como alias/código interno en el candidato documental; no se asocia a `69019STL000`, `69026STL000` ni otro SKU. No participa en compra valorizada sin asociación explícita.
| 7. Inova | **No existe una regla universal habilitada.** | Dossier local p. 5 identifica “Inova Insulated PVC Sliding System” y 24 mm. ASAŞ publica por separado Inova 76 Window y Inova Sliding; sus fichas listan 24–50 mm para esas variantes concretas. | El catálogo local contiene Inova corredera como familia comercial, pero no receta/selector técnico. No se hereda un rango entre Inova ventana y corredera; tampoco se crea una variante de ventana ni se activa una whitelist nueva en esta pasada.
| 8. Ceros, vacíos, `todos` y ambigüedad | **No deben convertirse en pauta confirmada.** | XLSX `Sliding monoriel 4 hojas grande`: D10:D13 y D16:D17 son `0`; B18:B22 incluyen `todos`. `FIJO`: C8=`todos`; `Sliding 4 hojas chicas`: C15:C16=`todos`. En otras pestañas hay celdas de corte/cantidad vacías. | Las recetas candidatas mantenidas omiten esos consumos y no se exponen variantes monorriel 4H ni 4H chica. La pauta 3H candidata sigue `lista_para_validar`, incompleta y sin auto-seed; no se presenta como pedido completo.

## Alcance verificable de packing

`buildPartialTechnicalCostSnapshot()` empareja una receta con una presentación confirmada y utiliza el `commercialLengthMm` de esa presentación para calcular barras del costo. La regresión usa la revisión `2026-06`: para el mismo perfil el resultado recibe 5.800 mm en blanco/nogal/roble/antracita y 6.800 mm en negro/negro mate.

La pauta física conjunta usa `cotizacion_items.fabricacion_snapshot.pautaBarras` y vuelve a empacar esos cortes, pero no lee proveedor/SKU ni reemplaza el largo de cada corte. Además, el constructor actual de la receta 7400 2H fija 5.800 mm. Cambiar ese contrato exige integrar el acabado/presentación **antes** de generar la pauta por ítem y conservar el SKU/largo elegido en el snapshot; queda identificado como cambio pendiente del motor, no se declara resuelto por el fixture del catálogo. La entrega de esta auditoría no cambia esa fórmula ni recalcula históricos.

## Variantes y estado

- Se conserva la receta existente `ventora:veratec-7400-corredera`, 2H monolítico 4 mm, y su estado. No se siembra ni se promueve ninguna receta.
- 7400 3H grande/chica con 2 rieles y Compact Sliding 2H/3H/4H continúan candidatos `lista_para_validar`; sus tests usan ejemplos de la planilla, no validación de fábrica/taller. Las líneas son pautas parciales mientras junquillo, acabado/largo de barra cuando dependa de SKU, merma y accesorios estén pendientes.
- 4H chica, 4H grande, monorriel 4H, variantes ambiguas de 2/3 rieles, junquillos `todos` y código de refuerzo `61011VER999` no quedan utilizables como pauta/compra completa.
- La variante Elegans fija permanece candidata incompleta y no se vincula al catálogo comercial por nombre solamente.

## Confirmación requerida

1. Xelena/taller: si la pestaña `Sliding 4 hojas chicas` realmente debía usar `67415VER`, y si sus ajustes de corte se calcularon para ese perfil.
2. Xelena: sección/cámara y confirmación del refuerzo grande/chico para decidir compatibilidad física.
3. Xelena: si `66306VER` admite monolítico 5 mm; el rango general no basta para confirmar el encaje.
4. Xelena: si las variantes Inova ventana y corredera permiten la misma composición/espesores en el catálogo comercial chileno.
5. Taller: política de packing por SKU/acabado, kerf, despunte, largos mínimos aprovechables y celdas cero de refuerzos monorriel.
6. Origen de `61011VER999`: código fuente, sección y correspondencia comercial explícita, si existe.
