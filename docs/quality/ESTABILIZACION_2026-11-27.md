# Protección documental L4000 y regresiones de cotización

Base: main 3b8fa0c4. La decisión de merge queda pendiente del gate y de la comprobación autenticada de las cotizaciones PVC 1510 y 1511.

## Trazabilidad y pendientes

- PR #41: protección documental L4000 2H adaptada, sin cambiar fórmulas; conserva el histórico y recetas independientes trazables. Las pruebas focales pasan; falta verificación integral y navegador.
- PR #16: separación L32/L42 fuera de alcance. La tarea independiente #48 conserva los enlaces al código de las cinco pruebas y registra los fallos observados, sin declararlos resueltos.
- PR #13: pendiente adaptar el alcance de precios entre acabados al modelo actual. La política de vigencia actual marca activa por política la referencia Alumco; se mantiene el SKU Titanio separado, pero otro acabado figura como estimación comercial con presentación física pendiente. Las pruebas antiguas dependen de campos y comportamiento que no existen en el modelo actual. No se aplicó el parche antiguo ni se modificaron precios guardados.
- PR #42: el fallback Guiada L42 pasa en fixture. Guardado y reapertura simulados de L20, L42 y L5000 conservan snapshot, fecha de cálculo y precio manual en las pruebas adaptadas. No se acredita persistencia remota.
- PR #3: optimización de vidrio por plancha; funcionalidad aplazada y fuera de esta consolidación.

## Conflictos L25 PA-50 a PA-53

Las cuatro transcripciones locales declaran 2400 × 1500 mm y repiten perfiles y vidrios de sus respectivas observaciones a 3000 × 1500 mm. Las pruebas registran la igualdad entre transcripciones y la discrepancia con el cálculo de 2400 mm; no certifican cuál es correcta. El manifiesto y docs/fabricacion/zeta/evidence/PENDING_CAPTURES.md identifican ausencia de captura original verificable, HTML/texto original, metadatos y hashes para estos cuatro casos. Mantener las cuatro comparaciones numéricas fuera del conjunto comparable hasta obtener evidencia primaria; no modificar fórmulas ni datos fuente.

Las 103 filas comerciales mencionadas por la PR #42 no son configuraciones de fabricación certificadas. Las 18 comparaciones no conflictivas contra transcripciones locales no acreditan por sí mismas validación física de taller.

## PVC y validación

La prueba de orden interna construye fixtures para 1510 y 1511 y verifica distribución teórica, estado draft y texto PDF. Esa prueba no lee las cotizaciones reales ni acredita precios guardados, vista móvil o Preview. El smoke real sigue pendiente.

La verificación integral se ejecutará en GitHub Actions sobre el HEAD de esta PR; el build de Preview se verifica por separado. No se ha modificado Supabase.
## Resultados locales

- Nueve suites focales después de excluir la integración parcial de la PR #16: 185 pruebas aprobadas. Incluyen L4000, fallback L42, snapshots simulados, conflictos L25 y fixture de orden/PDF PVC.
- La ejecución intermedia de fabrication:verify, antes de excluir la PR #16, terminó con 249 suites aprobadas, 7 fallidas, 2.438 pruebas aprobadas y 11 fallidas. Parte de las expectativas L4000 ya fueron adaptadas y verificadas de nuevo; el informe completo aún no ha sido repetido sobre el estado final.
- TypeScript y ESLint terminaron sin errores antes del último ajuste de pruebas; ESLint informó 177 advertencias.
- La ejecución de GitHub Actions del commit 82033467 tuvo 3 pruebas fallidas de #16 en 2 suites: ver tarea #48 y ejecución 46047422283. No se han declarado resueltas.
