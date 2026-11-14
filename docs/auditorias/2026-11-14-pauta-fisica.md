# Pauta de perfiles: parámetros físicos y alcance de verificación

La cotización QA 1388 conserva cuatro cortes de 1.500 mm del perfil 2503 en una barra de 6.000 mm. La suma geométrica deja 0 mm; el snapshot registra pérdida y despunte cero, pero no acredita que esos parámetros hayan sido confirmados. No se modificó la cotización. El formateador del PDF trataba cero como dato ausente.

El motor común emplea una pérdida por cada pieza más un despunte inicial por barra. No hay evidencia aquí de que los descuentos de receta incluyan el ancho de sierra ni de que otro procedimiento de corte sea equivalente. Cuando falta confirmación, el cálculo conserva sus supuestos teóricos y no se presenta como operativo. Un cero solo es confirmado si se registran expresamente los valores, el procedimiento por pieza, la fuente y la confirmación de largos comerciales. La confirmación de parámetros y la coherencia aritmética no sustituyen una validación física del taller.

Los snapshots anteriores no se reescriben: sin la nueva procedencia se leen como teóricos. No hay migración ni cambio de recetas; tampoco se incorpora una pantalla para confirmar parámetros. La distribución conjunta rechaza inconsistencias y comprueba trazabilidad y cantidades contra los cortes individuales.

La [matriz generada por pruebas](2026-11-14-pauta-fisica-matriz.csv) distingue cuatro familias probadas con variantes representativas y las familias sin cobertura. No certifica variantes adicionales, presentaciones reales ni fabricación de taller. Las pruebas PDF generadas localmente reproducen la estructura de 1388 mediante fixtures; no son una descarga autenticada de la cotización.
