# Auditoría de cobertura de despiece — Guiada y Constructor

Base: `ea098b9140102d87c6a0a6da8ae932999813fbda`. Matriz: [AUDITORIA_COBERTURA_DESPIECE.csv](AUDITORIA_COBERTURA_DESPIECE.csv). La primera revisión usó código y fixtures; la continuación incluye consultas de solo lectura a Ventora Test. No hubo acceso autenticado al navegador.

## Continuación: selectores y límites por organización

- **Tres slots genéricos L25:** la prueba `audit-l25-selector-coverage.test.ts` confirma que sus combinaciones de hojas y slug no coinciden con las identidades Zeta. El slot 2H usa `caracol`; los slots 3H y 4H `reforzada_pierna_abierta` construyen bases incompletas con datos pendientes. Las identidades Zeta usan variantes con vidrio, pierna y refuerzo explícitos. Esto acredita una diferencia de identidad y estado, no prueba equivalencia o incompatibilidad física entre perfiles.
- **S75 doble riel:** hay 30 entradas, diez geometrías por cada una de tres bandas de vidrio. El selector de escritorio filtra por riel y banda; dos pruebas React muestran diez opciones por banda y comprueban cambios de geometría, una en `PautaCubicacionPanel` y otra en `quote-constructor-workspace`. La suite del servicio resuelve y calcula las 30 con fixtures; la paridad automatizada integral entre ambos adaptadores sigue limitada a la variante 2H simétrica hoja 80 con monolítico. La disponibilidad en móvil y en una organización específica no se comprobó.
- Pruebas adicionales de esta continuación: selector L25 y cálculo S75, **2 suites y 32 pruebas PASS**; componentes de escritorio S75, **2 suites y 26 pruebas PASS**. Son pruebas simuladas, no comprobación en navegador real.
- L25: el componente compartido `SodalL25QuoteConfigPanel` aparece en Guiada móvil y escritorio y Constructor móvil y escritorio. La prueba `audit-l25-selector-coverage.test.ts` comprueba que las 18 identidades canónicas habilitan sus opciones de pierna y refuerzo incluso con la lista de recetas vacía; pierna cerrada reforzada queda deshabilitada en ese caso. Es una comprobación de las funciones usadas por el selector, no una prueba visual de los cuatro recorridos ni de una receta realmente guardada.
- La selección de recetas de L25 depende de los registros disponibles para la organización y la plantilla; las recetas Ventora pueden tener `line_template_id` nulo. La generación de snapshot requiere resolución de receta compatible. Por eso no se puede proporcionar un `line_template_id` universal ni concluir que las 18 identidades tengan despiece operativo en una organización concreta solo por mostrarse las opciones.
- S75 doble riel: en escritorio, `pauta-cubicacion-panel.tsx` y `quote-constructor-workspace.tsx` filtran las geometrías por riel y banda de vidrio. La matriz marca estas opciones como condicionadas; no acredita renderizado ni disponibilidad móvil. La ausencia de una referencia textual específica en los componentes móviles no demuestra por sí sola un fallo de selección.
- La matriz añade cuatro columnas independientes de selector por modo y dispositivo, identidad de plantilla, procedencia y receta de organización. Los 81 registros de fuente y los tres slots L25 sin conciliar no se convierten automáticamente en 84 variantes seleccionables.
- Validación adicional: `pnpm exec jest --runInBand --runTestsByPath src/features/fabricacion/__tests__/audit-l25-selector-coverage.test.ts src/features/fabricacion/__tests__/constructor-recipe-selection.service.test.ts src/features/fabricacion/__tests__/cotizacion-mode-technical-identity.contract.test.ts`: **3 suites, 49 pruebas PASS**. `pnpm exec tsc --noEmit` y ESLint focal: **PASS**. No se repitió la suite global.

La paridad solicitada de dos tamaños, descuentos, barras, snapshots y precio manual para todas las variantes seleccionables permanece sin comprobar. La matriz conserva los cinco casos de paridad parcial documentados abajo; no debe leerse como certificación general.

## Resultados

Las 103 filas comerciales originales se conservan. De ellas, 19 figuran como `fabricacion_configurada`; las otras 84 mantienen la clasificación comercial o pendiente del informe base. La clasificación estática no demuestra si una receta exacta funciona.

Se identificaron **81 entradas técnicas por identidad de fuente**: 18 identidades canónicas L25, 20 slots en otras ocho claves prioritarias, 30 slots de WinHouse S75 doble riel y 13 candidatas devueltas por el resolutor universal para las diez claves sin slots. Se registran aparte **tres slots genéricos L25 sin equivalencia demostrada** con las 18 identidades; no deben sumarse como variantes físicas distintas. Los slots y candidatas no prueban por sí solos su oferta real en ambas interfaces.

| Resultado automatizado | Entradas técnicas identificadas | Alcance |
|---|---:|---|
| FUNCIONAL EN AMBOS MODOS | 5 | Un tamaño por identidad; pruebas de adaptadores/servicios con datos simulados |
| FUNCIONAL SOLO EN GUIADA | 0 demostrado | No equivale a inexistencia |
| FUNCIONAL SOLO EN CONSTRUCTOR | 0 demostrado | No equivale a inexistencia |
| SIN RECETA COMPATIBLE | 0 demostrado para estas entradas | Ausencia de prueba no es rechazo comprobado |
| FALLO REPRODUCIDO | 0 | No se han probado todos los recorridos |
| NO COMPROBADA | 76 | Sobre las 81 identidades de fuente; tres slots genéricos L25 adicionales siguen sin conciliar |

**Importante:** los cinco resultados acreditan únicamente los casos automatizados indicados; no certifican integración completa, funcionamiento visual ni fabricación física. Tampoco acreditan dos tamaños por variante ni paridad de barras y documentos. El total de variantes realmente ofrecidas por todas las 19 líneas **sigue sin determinarse**: faltan otras posibles variantes de las rutas universales y comprobar qué candidatos llegan efectivamente a los selectores. Las cifras anteriores no son un porcentaje de cobertura.

## Cinco casos con paridad automatizada

| Configuración exacta | Evidencia y límite |
|---|---|
| L25 monolítico 2H abierta normal | `cotizaciones-l25-constructor-persistence.test.ts:83`: 1800×1500, receta, perfiles y guardado/reapertura mediante servicio y base en memoria; también `cotizacion-mode-technical-identity.contract.test.ts:341` compara cortes, cantidades y vidrio con cantidad comercial 2. |
| L25 monolítico 2H abierta reforzada | Prueba de persistencia simulada anterior: 1800×1500; receta y perfiles equivalentes entre modos, con pauta conjunta. |
| L25 monolítico 2H cerrada normal | Misma prueba: 1800×1500; receta y perfiles equivalentes entre modos, con pauta conjunta. |
| Veratec 7400 2H monolítico 4 mm | `fabricacion-despiece-cotizacion.service.test.ts:211`: 1200×1500; ambos modos seleccionan la misma receta y precio; perfil 6306 y vidrio comprobados. Reapertura solo de formulario en memoria. |
| WinHouse New S75 doble riel 2H simétrica hoja 80, mono 4–6 mm | `cotizacion-mode-technical-identity.contract.test.ts:341`: 1200×1000; identidad y resolución iguales con receta fixture. `fabrication-line-recipes.smoke.test.ts:38` prueba cálculo de barras en servicio, no paridad de UI. |

Las tres L25 usan 5 mm en la prueba de repositorio y snapshots de receta creados para la prueba. Las identidades y precios de organizaciones reales no se verificaron. La falta de evidencia de taller no borra los resultados automatizados.

## L25 y WinHouse: causa de la clasificación

- `line-integration-coverage.report.test.ts:41` asigna deliberadamente `pending` a cada referencia que no se clasifique como exclusivamente comercial, porque no ejecuta el contrato de variante exacta. Por eso L25 aparece pendiente en `expectativaReceta` aun cuando la referencia general figura configurada. Es una limitación del informe, no evidencia de ausencia de receta.
- L25 tiene 18 identidades SODAL/Zeta en `sodal-l25-zeta-catalog.ts`. El catálogo técnico genérico también contiene tres slots L25, dos incompletos; no se ha demostrado que sus etiquetas representen identidades adicionales o equivalentes. `constructor-recipe-selection.service.ts:160` contempla candidatas SODAL confirmadas en el filtrado del Constructor.
- WinHouse S75 doble riel aparece como pendiente en la auditoría estática general, mientras `line-base-variant-catalog.ts:674` expone 30 slots y `winhouse-new-s75-recipes.ts` define sus geometrías y bandas de vidrio. La prueba de servicio calcula las 30 con entradas de ejemplo, incluido ancho A para asimétricas; `evaluarRecetaListaParaProbar` devuelve falso en esos ejemplos por requisitos pendientes. Solo un caso tiene paridad de ambos modos acreditada en la suite identificada.

## Líneas prioritarias sin slots en el catálogo consultado

MultiSlide S-83 4H y 8H; Óptima S-28 2H y 3H; S-33 2H; S-33 RPT 2H; S-38 RPT; Serie 3200 puerta; Línea 45 puerta; Serie 4600 vaivén. El resolutor universal devolvió 13 candidatas con las tipologías, hojas y vidrios indicados en cada fila CSV. La prueba de cotización por servicio y resumen cubre los casos SODAL; no construye ambos modos. Se conservan como **NO COMPROBADA** para paridad de modos, no como ausencia de receta. Las consultas usaron solo esas entradas; podrían existir otras variantes.

## Pruebas y límites

- Focal: `pnpm exec jest --runInBand --runTestsByPath src/features/fabricacion/__tests__/cotizacion-mode-technical-identity.contract.test.ts src/features/cotizaciones/services/__tests__/cotizaciones-l25-constructor-persistence.test.ts src/features/fabricacion/__tests__/fabrication-line-recipes.smoke.test.ts src/features/fabricacion/__tests__/fabricacion-despiece-cotizacion.service.test.ts`: **4 suites, 122 pruebas PASS**.
- Extracción de slots: prueba temporal Jest contra `getLineVariantSlotsForFabricationTree`: **PASS**, 19 claves prioritarias y S75 doble. Fuente de identidad: `src/features/fabricacion/fixtures/line-base-variant-catalog.ts`.
- Extracción del fallback universal y pruebas focales de cotización y precios: **3 suites, 42 pruebas PASS**. Se registraron las 13 candidatas devueltas para 11 entradas; extracción temporal retirada tras guardar los resultados.
- Ejecución anterior del mismo commit: Jest 219 suites y 2.096 pruebas PASS; `pnpm exec tsc --noEmit` PASS por separado. No se repitió la suite global.
- Visual en navegador, persistencia real Supabase y taller: **NO EJECUTADO**. Los estados son independientes en CSV.
- Persisten controles pendientes por variante: selección real en móvil y desktop, dos tamaños, negativos, descuentos verificados independientemente, barras, guardado/reapertura y PDF/Excel.

## Próximas comprobaciones

1. Comparar los 13 candidatos universales con los selectores de Guiada y Constructor y buscar variantes documentadas adicionales, sin inventar combinaciones.
2. Parametrizar pruebas de adaptadores para cada identidad disponible y dos dimensiones; comparar descuentos, cortes, barras y cantidades.
3. Extender guardado/reapertura simulado y documentos por identidad. Ejecutar QA autenticado y validación física como evidencias separadas.

Esta matriz registra resultados concretos donde hay prueba y conserva como no comprobado el resto. No se modificaron recetas, código funcional, precios, snapshots ni datos remotos.

## Ventora Test: cobertura organizacional observada

Lectura acotada: proyecto Ventora, organización 3, solo SELECT; consulta de plantillas activas y recetas de esa organización. Sin sesión de navegador; sin mutaciones. Se verificaron 19 plantillas activas y ninguna preferencia de proveedor oculta registrada. Esto no comprueba la presentación de cada opción ni la selección automática de receta.

| Línea / plantilla QA | Disponibilidad | Recetas registradas | Guiada / Constructor | Despiece y reapertura | Problema reproducido |
|---|---|---|---|---|---|
| Serie 20 · 206 | Plantilla activa; selector no verificado | draft 5, testing 1; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| Serie 25 · 207 | Plantilla activa; selector no verificado | draft 3, testing 7, validated 18; compatibilidad exacta no resuelta | No comprobado en sesión QA | Tres variantes 2H: paridad y reapertura simulada en memoria; sin QA autenticado | Ninguno demostrado |
| AL-32 · Ventana proyectante · 208 | Plantilla activa; selector no verificado | draft 1; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| AL-42 · 210 | Plantilla activa; selector no verificado | draft 6; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| Serie 5000 · 205 | Plantilla activa; selector no verificado | validated 1; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| MultiSlide S-83 — 4 hojas · 220 | Plantilla activa; selector no verificado | draft 1, testing 1; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| MultiSlide S-83 — 8 hojas · 221 | Plantilla activa; selector no verificado | draft 1; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| Óptima S-28 — Corredera 2 hojas · 212 | Plantilla activa; selector no verificado | draft 2; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| Óptima S-28 — Corredera 3 hojas · 213 | Plantilla activa; selector no verificado | draft 1; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| S-33 — Corredera 2 hojas · 214 | Plantilla activa; selector no verificado | draft 1; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| S-33 RPT — Corredera 2 hojas · 215 | Plantilla activa; selector no verificado | draft 1; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| S-38 RPT — Proyectante y paño fijo · 219 | Plantilla activa; selector no verificado | draft 1, testing 4; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| Línea 15 — Corredera 2 hojas · 538 | Plantilla activa; selector no verificado | draft 5; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| Serie 3200 — Puerta abatible 1 hoja · 222 | Plantilla activa; selector no verificado | draft 1, testing 1; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| Línea 4000 — Corredera 2 hojas · 539 | Plantilla activa; selector no verificado | draft 5; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| Línea 45 — Puerta · 540 | Plantilla activa; selector no verificado | draft 1; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| Serie 4600 — Puerta vaivén · 223 | Plantilla activa; selector no verificado | draft 1; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| Serie 4800 — Corredera 2 hojas · 211 | Plantilla activa; selector no verificado | draft 2; compatibilidad exacta no resuelta | No comprobado en sesión QA | No comprobado con datos QA | Ninguno demostrado |
| Veratec 7400 — Corredera 2 hojas · 1135 | Plantilla activa; selector no verificado | draft 3; compatibilidad exacta no resuelta | No comprobado en sesión QA | 2H mono 4 mm: paridad y reapertura de formulario simuladas; sin QA autenticado | Ninguno demostrado |

WinHouse S75 doble riel se evalúa aparte: plantilla 224 activa; 31 registros propios draft (30 variantes técnicas y una entrada genérica). Su paridad en 2H simétrica mono se cubrió con fixture, no con datos QA efectivos.

### Observaciones de identidad

- L25 (207): 18 registros Zeta validated, un genérico draft, dos genéricos reforzados draft y siete registros testing adicionales. Cinco de estos últimos comparten 2H monolithic_open_normal y versión 2. La consulta no acredita conflicto en ejecución ni decide precedencia sin ejecutar el resolver con esas definiciones.
- L5000 (205): una receta validated, variante estandar, fuente de arquetipo. No asumir identidad con caracol; resolver por el contrato exacto.
- L20 (206): una receta testing estándar y cinco draft, incluida pierna_abierta_jamba_2009; la selección efectiva y cualquier fallback permanecen por probar con datos QA.
- L32 (208), L42 (210) y Veratec 7400 (1135): recetas draft; la presencia y la etiqueta no prueban cálculo operativo. L42 incluye varias entradas ALAR con variante repetida; la ambigüedad efectiva no se ha reproducido.
- S-38 RPT (219): existen registros etiquetados como proyectante cuya variante menciona paño fijo. La tipología dentro de las definiciones y su resolución deben comprobarse antes de catalogarlo como defecto.

### Pruebas de esta continuación

- Cinco suites focales de componentes de los cuatro recorridos y persistencia L25 en repositorio de prueba: **86 pruebas PASS**. Los tests React usan fixtures; no acreditan sesión autenticada ni todas las líneas.
- Tres suites focales adicionales de catálogo, identidad de modos y recetas universales: **43 pruebas PASS**. Usan fixtures; no prueban que las definiciones guardadas de Ventora Test sean idénticas ni demuestran paridad para todas las variantes.
- Consulta SQL limitada a plantillas y recetas de Ventora Test. No se consultaron otras organizaciones ni se escribieron datos.
- La cobertura de dos tamaños, perfiles, descuentos, barras, precio manual y guardado/reapertura para todas las variantes QA sigue sin comprobarse; el estado global no debe interpretarse como aprobación completa.

## Seguimiento focal: L42 móvil, cotizaciones QA 1403 y 1404

Consulta de solo lectura limitada a las cotizaciones 1403/1404 y a plantillas/recetas de Ventora Test (organización 3). No se editaron cotizaciones ni snapshots. Base de código: `ea098b9140102d87c6a0a6da8ae932999813fbda`.

| Evidencia | QA 1403 · Guiada móvil | QA 1404 · Constructor móvil |
|---|---|---|
| Organización y plantilla | org 3; `line_template_id=210`; `ventora:l42` | org 3; `line_template_id=210`; `ventora:l42` |
| Identidad comercial | Sistema Proyectante; esquema 1 hoja | Sistema Personalizado; esquema vacío |
| Identidad técnica | Proyectante, 1 hoja/módulo, apertura proyectante, variante normal; `fabricacionConfiguracionId=ventora:l42:proyectante`; sin `fabricationRecipeId` | Proyectante, 1 hoja/módulo, apertura proyectante, variante normal; sin `fabricacionConfiguracionId`; `fabricationRecipeId=ventora:universal:l42:normal` |
| Geometría y vidrio | 1200 × 1000 mm; cantidad 2; monolítico 4 mm | 1200 × 1000 mm; cantidad 2; monolítico 4 mm |
| Resultado persistido | Sin snapshot por ítem ni snapshot conjunto | Snapshot por ítem y snapshot conjunto presentes; perfiles suman 25.536 mm (25,536 ml) |

Las dos piezas coinciden en plantilla, `catalog_key`, tipología, hojas, apertura, variante, dimensiones, cantidad y vidrio. **No son entradas idénticas para la resolución:** Guiada conserva el ID exacto de configuración comercial y Constructor conserva una referencia explícita al fallback, con sistema comercial `Personalizado` y esquema vacío. La diferencia determinante para el defecto fue el ID de configuración.

### Causa reproducida y corrección

`resolveFabricacionDespieceForQuoteItem` filtra por identidad exacta. Guiada guarda `ventora:l42:proyectante`; `buildReferenceRecipe` generaba el fallback L42 sin ese `configurationId` (solo el fallback L32 propagaba su ID exacto). Por ello la candidata L42 era rechazada y `saveWorkflow` persistía el ítem sin snapshot. Constructor, al llevar el `fabricationRecipeId` del fallback y no llevar el `configurationId`, sí resolvió y persistió el snapshot. No se cambió ninguna fórmula ni el estado de la receta.

Corrección focal en `fabricacion-receta-universal-fallback.service.ts`: cuando el fallback sea L42 Normal 1H y reciba exactamente `ventora:l42:proyectante`, propaga ese ID a la identidad de la definición, igual que el caso L32. No amplía compatibilidad a otras variantes.

### Evidencia automatizada posterior

- Regresión de resolución exacta junto al registro organizacional L42 `draft`: **PASS**; la identidad exacta resuelve al fallback canónico; la receta organizacional draft no se promueve ni altera.
- Guardado y reapertura mediante `buildItemFromForm`, servicio real de cotizaciones y repositorio/base en memoria para `mobile_guiada` y `mobile_constructor`: **PASS** en 1200 × 1000 y 1800 × 1200 mm, cantidad 2; snapshot por ítem y pauta conjunta presentes tras reapertura; perfiles iguales entre modos al comparar código, función, largo y cantidades. IDs UUID de reglas generados por ejecución se excluyen de la comparación.
- Negativo: tipología `corredera` con la configuración L42 proyectante: **PASS**, queda `sin_receta`, sin snapshot.
- Comandos focales posteriores al cambio: dos suites, **33 pruebas PASS** (`fabricacion-despiece-universal-precios.test.ts` y `cotizaciones-l25-constructor-persistence.test.ts`).

### Alcance de la evidencia

Las consultas acreditan el estado realmente persistido de 1403 y 1404 antes de corregir; no se reabrieron ni modificaron esas cotizaciones. Las regresiones de ambos modos usan adaptador/formulario, servicio y persistencia simulada en memoria, no navegador autenticado ni Supabase. La comprobación visual de Guiada/Constructor en móvil, una nueva reapertura autenticada, generación documental y validación física de taller siguen **NO EJECUTADAS**. Los 25,536 mm de 1404 corresponden a cálculo de perfiles/pauta teórica con pérdida de sierra 2 mm y despunte 12 mm; sus parámetros físicos están pendientes, por lo que no acreditan autorización operativa de corte.
