# Extracción textual Alumétrica ↔ Ventora

Estado: borrador de evidencia documental
Fecha de lectura: 2026-09-19
Fuente: catálogo visible de Alumétrica / VentanasSaaS

## Alcance

Esta carpeta separa información visible de Alumétrica de la evidencia Sistema Zeta.
No alimenta `docs/fabricacion/zeta/confirmed/`. La copia a recetas Ventora `testing`
es una decisión de producto, no un ingest automático.

La lectura se hizo sobre fichas de línea y listado visible del catálogo. Por instrucción
del usuario no se guardaron screenshots ni HTML. La trazabilidad disponible en esta pasada
es: URL, fecha, fabricante, material, conteos visibles, variantes visibles y fragmentos
textuales literales de la interfaz.

Campos no visibles o no recolectados quedan `no observado`; no se derivan fórmulas,
compatibilidades ni reglas de fabricación.

## Archivos

- `2026-09-21-veratec-7400.md`: ficha VERATEC 7400, perfiles, fórmulas, herrajes y contradicciones preservadas; monolítico 4 mm listo para probar, TP 20/24 bloqueados.
- `2026-09-19-matriz-lineas.md`: matriz Alumétrica ↔ Ventora, líneas nuevas y brechas.
- `2026-09-19-formulas-observadas.md`: índice de fórmulas visibles; L5000 en este archivo,
  Serie 20 en documento dedicado.
- `2026-09-20-serie-20-variantes-formulas.md`: 5 construcciones Serie 20 con destajes.

## Límite operativo

- No escribir en `docs/fabricacion/zeta/confirmed/`.
- No llamar `zeta:ingest`, `zeta:validate` ni `zeta:coverage`: esta fuente no es Zeta.
- Las fórmulas observadas **no** entran solas a `fabrication_recipes`. Una decisión explícita
  de producto puede incorporarlas como borradores documentales `manufacturer` (Serie 20,
  VERATEC 7400); esto no acredita equivalencia ni validación de taller.
- Antes de validar una equivalencia, cruzar contra Haciendo Ventanas y Sistema Zeta.
- La UI de Ventora no muestra marca Alumétrica.
