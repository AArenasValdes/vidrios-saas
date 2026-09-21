# Serie 42 por proveedor: ALAR y SODAL

Estado: recetas documentales en borrador; no validadas en taller.

## Alcance

Las recetas se ofrecen como variantes distintas de la línea comercial `ventora:l42` para no mezclar cortes de proveedores. No reemplazan ni editan la receta existente del taller.

## ALAR

Fuente: pauta de corte aportada por el usuario el 2026-09-21.

### Marco fijo 4201

- Marco 4201: 2 cortes horizontales `A`, 45°/45°; 2 verticales `H`, 45°/45°.
- Hoja 4202: 2 cortes horizontales `A−11 mm` y 2 verticales `H−11 mm`, 45°/45°.
- La pauta también contempla una rama de cámara de agua 4204: sustituye el umbral inferior por 1 corte `A` de 4204 y cambia la hoja vertical a `H−35 mm`. El corte de 4204 queda expresado por la fuente como 45° o 90° según ensamble.
- 4209 corresponde al marco doble contacto; no se elige automáticamente en la receta de marco fijo 4201.

Datos pendientes que bloquean la pauta completa:

- La fuente dice que 4229/4206 se cortan a la luz interior de la hoja armada, pero no entrega una fórmula numérica para calcularla.
- No se entregó una fórmula para las dimensiones del vidrio.
- No se agregan esos perfiles ni vidrio al cálculo hasta contar con esas medidas.

## SODAL Serie 4200

Fuente primaria: [ficha de Alumétrica](https://alumetrica.comunaclic.cl/Catalogo/Lineas/Detalle/f0fbde7f-5752-455c-85dd-a753cffe64ee); variante **Fijo/Proyectante sin Cámara**, monolítico, 1 hoja.

- Marco 4209: 2 cortes horizontales `X` y 2 verticales `Y`, 45°/45°.
- Hoja 4202: 2 horizontales `X−14 mm` y 2 verticales `Y−14 mm`, 45°/45°.
- Junquillo monolítico 4229: 2 horizontales `X−86 mm`, 34°/34°; 2 verticales `Y−86 mm`, 90°/90°.
- Vidrio monolítico: `X−93 mm` por `Y−93 mm`.

La ficha declara `((X+Y)×2/100) × 1.00 + merma`: 4202 +8%, 4209 +5% y 4229 +8%. El motor actual conserva los cortes exactos y distribuye barras a partir de ellos; no aplica esos porcentajes como largos de pieza ni agrega barras por merma. Se dejan explícitos en las notas de receta para no confundir consumo de catálogo con pauta de corte.

## Integración

- Las variantes se guardan como recetas privadas `draft` con procedencia `source_type` y `source_name` de ALAR o SODAL.
- La receta existente del taller no se etiqueta automáticamente como ALAR: el registro previo de P1 (2026-09-14) anotaba `4202 −17 mm`, distinto de la pauta ALAR recibida (`−11 mm`).
- ALAR queda bloqueada para cálculo completo por la luz interior del junquillo y la medida del vidrio pendientes.
- SODAL queda calculable como pauta documentada, pero no validada en taller.
- Las variantes con cámara/termopanel de SODAL, la variante abatible L42, bisagras, y el marco doble contacto ALAR 4209 requieren recetas separadas y no se infieren desde estas dos variantes proyectantes.
- Al cargarse, las variantes nuevas se agregan solo si faltan. La receta actual `normal` y los snapshots históricos permanecen intactos.
