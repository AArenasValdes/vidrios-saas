# Distribución preliminar desde geometría congelada

Estado: primera versión en revisión. Una simulación geométrica no valida una receta ni constituye una orden de corte.

## Matriz de cobertura comprobada

| Entrada | Vista geométrica | Cobertura operativa / PDF proveedor | Evidencia |
|---|---|---|---|
| `validated_recipe` con rectángulo, identidad, unidades y vidrio compatibles | Sí | Solo cuando la cobertura estricta completa y las reglas de proveedor se cumplen | Jest de cobertura, optimizador y API |
| `recipe_trace` con geometría explícita, identidad estable y cantidad/spec coherentes | Sí, marcada preliminar | No; `recipeStatus` no validado mantiene bloqueado el proveedor | Jest del optimizador, API y panel; smoke Playwright simulado |
| `recipe_trace` sin dimensión rectangular, identidad o cantidad coherente | No; exclusión con motivo | No | Jest de cobertura, optimizador y API; smoke Playwright simulado |
| Composición mixta con geometrías admisibles y excluidas | Solo paños admisibles; lista referencias excluidas y motivo | No si queda cobertura pendiente | Jest del panel/API y smoke Playwright simulado |
| Snapshot legacy incompleto, conflicto técnico, producto/spec incompatibles o vidrio no admitido | No | No | Guards de cobertura/normalización y pruebas existentes |
| Formato físico de plancha ausente, con paños elegibles | Sí al ingresar ancho/alto de plancha | No se habilita por ese dato solamente | Validación de formato del panel y API |

La matriz describe contratos probados con fixtures. No certifica variantes comerciales ni equivale a validación en taller.

## Recorrido técnico

- UI: `app/print/cotizaciones/[id]/fabricacion/vidrios/glass-distribution-panel.tsx` usa `isGlassPaneGeometryComplete` para simular y conserva `isGlassCoveragePaneComplete` para PDF de proveedor.
- API: `app/api/cotizaciones/[id]/optimizacion-vidrios/route.ts` entrega unidades físicas y exclusiones explicadas; `geometric_preview` calcula solo paños admisibles. `provider_pdf` conserva la compuerta de cobertura estricta.
- Elegibilidad y cobertura: `src/features/fabricacion/services/glass-distribution-coverage.service.ts` exige rectángulos enteros positivos, identidad lógica/física y snapshot, producto/especificación exactos, categoría/espesor y cantidad física coherente con cantidad comercial.
- Optimización: `src/features/fabricacion/services/glass-sheet-optimizer.service.ts` acepta `recipe_trace` solo en `geometric_preview`; `src/features/fabricacion/services/glass-sheet-plan-verifier.service.ts` aplica la misma frontera y marca la preparación como pendiente de revisión de taller.
- Extracción congelada: `src/features/fabricacion/services/glass-pane-normalization.service.ts` usa dimensiones de snapshots y mediciones guardadas. Las medidas exteriores comerciales no se convierten en vidrio.

## Advertencias y límites

- `recipe_trace` significa que el snapshot conserva dimensiones de paño, pero no prueba que la receta haya sido ejecutada o validada por el taller.
- La vista preliminar asume separación/despuntes según el contrato existente de simulación; no determina reglas productivas.
- Las referencias excluidas no se completan ni se aproximan. Se muestran su identidad disponible y la primera causa bloqueante.
- Resultados siguen siendo temporales. El refresco e invalidación H1 y la reconciliación B2 mantienen su comportamiento.
- No se agregan recetas, tipologías, reglas, descuentos ni cambios de datos.
- El smoke de navegador usa APIs simuladas; no se ejecuta persistencia autenticada contra una base QA.

## Regresiones focalizadas

- `src/features/fabricacion/services/__tests__/glass-distribution-coverage.service.test.ts`
- `src/features/fabricacion/services/__tests__/glass-sheet-optimizer.service.test.ts`
- `app/api/cotizaciones/[id]/optimizacion-vidrios/__tests__/route.test.ts`
- `app/print/cotizaciones/[id]/fabricacion/vidrios/__tests__/glass-distribution-panel.test.tsx`
- `tests/e2e/glass-distribution-panel.smoke.spec.ts`
- H1/B2: `app/print/cotizaciones/[id]/fabricacion/vidrios/__tests__/glass-distribution-panel.test.tsx`, `app/api/cotizaciones/[id]/optimizacion-vidrios/__tests__/route.persistence.integration.test.ts` y regresiones de identidad/cantidad en `src/features/fabricacion/__tests__/fabrication-identity-pricing-invalidation-glass.regression.test.ts`.
