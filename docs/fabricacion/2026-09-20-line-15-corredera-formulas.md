# Línea AL-15 corredera — destajes oficiales

Fecha: **2026-09-20**  
X = **ancho total del vano**. Y = **alto total del vano**.  
Equivalente Ventora: `ventora:serie-15-corredera-2h` · Línea 15 — Corredera 2 hojas.

Estado `lista_para_validar`; no es validación de taller.

## Vidrio / cristal (2H)

Solo monolítico 3, 4 o 5 mm.

| Campo | Valor |
|---|---|
| Cantidad | 2 piezas por ventana |
| Ancho | `X / 2 + 16 mm` |
| Alto | `Y − 80 mm` |

## Plan de corte — 2 hojas

| N° | Pieza | Perfil | Fórmula | Cant. | Corte |
|---:|---|---|---|---:|---|
| 1 | Riel Superior | 1501 | `X` | 1 | 90° / 90° |
| 2 | Riel Inferior | 1502 | `X` | 1 | 90° / 90° |
| 3 | Jamba | 1503 | `Y − 50` | 2 | 90° / 90° |
| 4 | Cabezal | 1504 | `X / 2 − 62` | 2 | 90° / 90° |
| 5 | Zócalo | 1505 | `X / 2 − 62` | 2 | 90° / 90° |
| 6 | Pierna | 1506 | `Y − 35` | 2 | 90° / 90° |
| 7 | Traslapo | 1507 | `Y − 35` | 2 | 90° / 90° |

## Ejemplo 1200 × 1000

| Código | Largo mm | Cant. |
|---|---:|---:|
| 1501 | 1200 | 1 |
| 1502 | 1200 | 1 |
| 1503 | 950 | 2 |
| 1504 | 538 | 2 |
| 1505 | 538 | 2 |
| 1506 | 965 | 2 |
| 1507 | 965 | 2 |
| Vidrio | 616 × 920 | 2 |

## Variantes cabezal / zócalo

| Variante | Fórmula cabezal y zócalo |
|---|---|
| 3 hojas · 3 rieles | `(X + 16) / 3` |
| 4 hojas · 2 rieles | `(X + 6) / 4` |
| 4 hojas · 4 rieles | `(X + 45) / 4` |

Rieles, jamba, pierna y traslapo se mantienen como en 2H. Vidrio de variantes: pendiente de validar; cotización usa fórmula 2H como preliminar.
