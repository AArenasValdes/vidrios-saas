# Expediente de integración — Línea 15 corredera 2H

Base examinada: `162824d9e6ecc16238a17633e9a9fef0dfa781e5`. Estado: **pendiente de evidencia; NO GO para despiece verificable**. Una prueba de software no constituye confirmación de taller.

## Identidad y alcance

- Catálogo: `ventora:serie-15-corredera-2h`; familia de compra `universal:aluminio:l15`.
- Alcance solicitado: ventana corredera de aluminio, dos hojas. Las otras variantes no forman parte de esta integración.
- Fuente primaria encontrada: [catálogo ALAR, página impresa 109](https://www.alumet.cl/wp-content/uploads/2020/05/alar_catalogo_2011.pdf), tabla Serie 15. No se ha demostrado que sea equivalente a la receta precargada.
- Fuente de la receta precargada: `docs/fabricacion/2026-09-20-line-15-corredera-formulas.md`; no identifica documento primario ni página para las fórmulas de perfiles o vidrio.

## Contradicción documental que bloquea la integración

Con X = ancho y Y = alto, la receta existente usa 1503 = Y−50; 1504 y 1505 = X/2−62; 1506 y 1507 = Y−35. El catálogo ALAR presenta 1503 = Y−7; 1504 y 1505 = X/2−3; y 1506, 1507 y 1508 = Y−26. El catálogo identifica 1506 como pierna reforzada, 1507 como pierna y 1508 como traslapo reforzado; la receta existente identifica 1506 como pierna y 1507 como traslapo. La tabla ALAR no establece aquí si 1506, 1507 y 1508 son alternativas o se emplean simultáneamente. No sustituir una pauta por otra sin resolver la identidad exacta del sistema y sus componentes.

Para 1200 × 1000 mm, la receta existente calcula 1503 de 950 mm y 1504/1505 de 538 mm; la tabla ALAR indica 993 mm y 597 mm, respectivamente. Para 1600 × 1200 mm, los valores son 1150 mm y 738 mm frente a 1193 mm y 797 mm. Estos son ejemplos de discrepancia, no cortes autorizados.

La receta existente establece dos vidrios de `X/2+16` × `Y−80` y limita su texto a monolítico de 3, 4 o 5 mm; no se encontró la fuente primaria de esa fórmula. La tabla ALAR citada no aporta ese dato de vidrio.

## Estado de conexiones

- El catálogo y la receta preliminar existen; el fallback identifica la fuente como ALAR, atribución que debe corregirse cuando se identifique la fuente real.
- Antes de esta intervención, una prueba sintética de cotización en 1200 × 1000 con `DVH 6 mm` o `Monolítico 6 mm`, sin recetas privadas, devolvió `calculado`. Ambas combinaciones están fuera de lo declarado por el texto de la receta. Ahora la resolución viva de cotización deja pendiente la receta documental, sus copias y los registros con procedencia ambigua, independientemente del vidrio, hasta confirmar su fuente. Una receta de taller debe tener un origen independiente trazable para calcular.
- El bloqueo es exclusivo de la resolución de cotización; el laboratorio/editor aún puede mostrar la definición precargada. No se han modificado recetas guardadas ni snapshots.
- En L15, cuando la pauta viva queda pendiente, el fallback histórico no presenta el snapshot como cálculo de medidas, cantidad, receta o variante explícitamente cambiadas; también comprueba el vidrio si el histórico conserva su identidad. El flujo de preparación de guardado invalida el snapshot ante edición técnica. Los históricos antiguos que no registran identidad de vidrio no permiten demostrar ese cambio a partir del snapshot por sí solo. No se alteró la regla de otras líneas.
- Hay pruebas generales de selección, despiece y snapshot; no demuestran el recorrido específico completo Guiada → Constructor → guardado/reapertura para esta línea ni la precedencia privada específica de L15.
- No se ha verificado precio de compra por código, acabado, presentación y organización; no inferir precios comerciales ni costos técnicos. No se han ejecutado escritura de datos, QA autenticado ni validación física.
- Las recetas privadas y snapshots históricos existentes deben conservarse; no reemplazarlos con la receta global ni actualizarlos silenciosamente.

## Información requerida para cerrar

1. Documento primario, versión y página de la pauta actualmente implementada, o identificación inequívoca de proveedor/sistema que permita asignarle una identidad distinta de ALAR.
2. Confirmación de los roles y la selección exacta de perfiles 1506, 1507 y 1508 para la composición 2H elegida, incluidas cantidades y alternativas.
3. Fuente verificable de descuentos y cantidad de vidrio por espesor y tipo, incluidos los tipos no compatibles.
4. Confirmación por el taller de dos medidas, cortes, vidrio y pauta de barras; solo entonces evaluar su estado de validación.
5. Tras resolver lo anterior: regresiones de Guiada y Constructor, dos medidas, cantidad mayor que uno, vidrio/configuración no soportados, aislamiento y precedencia de receta privada, precio, snapshot y reapertura.

Hasta reunir esta evidencia, no se agregan ni modifican fórmulas y no se afirma que la pauta existente sea correcta o esté validada. Permanece abierto el riesgo del laboratorio/editor y de registros cuya procedencia no puede identificarse con certeza.

## Verificación de esta intervención

- Regresión focal: 5 suites, 58 pruebas aprobadas; cubren la pauta documental pendiente en dos tamaños y vidrio no respaldado, copia persistida, receta propia, otra organización y reapertura simulada.
- `pnpm fabrication:verify --build`: 248 suites, 2314 pruebas, TypeScript y `docs:check` aprobados; el comando completo falló en build local por `ENOTFOUND fonts.googleapis.com` y `ENOSPC` al escribir la caché de webpack. No se repitió el build.
- Smoke autenticado: `not_run`; no existe entorno QA aislado documentado para esta tarea. Sin escrituras en base remota ni migraciones. Sin confirmación física de taller.
