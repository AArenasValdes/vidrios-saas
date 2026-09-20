# Serie 45 practicable — puerta 1 hoja

Fecha: **2026-09-20**  
X = **ancho total del vano**. Y = **alto total del vano**.  
Equivalente Ventora: `ventora:serie-45-puerta` · Línea 45 — Puerta.

No usar destajes 4581/4584 de lecturas Alumétrica. Esta pauta es la que entra a Ventora.

## Vidrio / cristal

La línea admite vidrio monolítico y termopanel (DVH) de cualquier espesor, eligiendo el junquillo adecuado.

| Campo | Valor |
|---|---|
| Cantidad | 1 pieza por vano |
| Ancho | `X − 170 mm` |
| Alto | `Y − 183 mm` |

Ejemplo 1200 × 1000: vidrio **1030 × 817**.

## Plan de corte

| N° | Pieza | Perfil | Fórmula | Cant. | Corte L1/L2 |
|---:|---|---|---|---:|---|
| 1 | Marco Superior | 4522 Marco | `X` | 1 | 45° / 45° |
| 2 | Jamba | 4522 Marco | `Y` | 2 | 45° / 90° |
| 3 | Cabezal | 4531 Bastidor | `X − 158` | 1 | 90° / 90° |
| 4 | Junquillo | 4534 Junquillo | `X − 158` | 2 | 90° / 90° |
| 5 | Zócalo | 4531 Bastidor | `X − 158` | 1 | 90° / 90° |
| 6 | Junquillo | 4534 Junquillo | `X − 158` | 1 | 90° / 90° |
| 7 | Pierna | 4531 Bastidor | `Y − 28` | 1 | 90° / 90° |
| 8 | Junquillo | 4534 Junquillo | `Y − 177` | 2 | 45° / 45° |
| 9 | Pierna | 4531 Bastidor | `Y − 28` | 1 | 90° / 90° |
| 10 | Junquillo | 4534 Junquillo | `Y − 177` | 2 | 90° / 90° |

## Ejemplo 1200 × 1000

| N° | Código | Largo mm | Cant. |
|---:|---|---:|---:|
| 1 | 4522 | 1200 | 1 |
| 2 | 4522 | 1000 | 2 |
| 3 | 4531 | 1042 | 1 |
| 4 | 4534 | 1042 | 2 |
| 5 | 4531 | 1042 | 1 |
| 6 | 4534 | 1042 | 1 |
| 7 | 4531 | 972 | 1 |
| 8 | 4534 | 823 | 2 |
| 9 | 4531 | 972 | 1 |
| 10 | 4534 | 823 | 2 |

## Consumo ML (documental, no persistido en receta)

`((Ancho + Alto) × 2 / 1000) × 1.00 + 10% merma` para 4522, 4531 y 4534.

## Receta Ventora

- Fixture: `src/features/fabricacion/fixtures/serie-45-practicable-recipe.ts`
- Estado: `lista_para_validar`. No es validación de taller.
- UI: no mostrar marca Alumétrica.
