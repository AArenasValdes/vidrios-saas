# Serie 4800 corredera 2 hojas — destajes SODAL

Fecha: **2026-09-20**  
X = **ancho total del vano**. Y = **alto total del vano**.  
Equivalente Ventora: `ventora:serie-4800-corredera-2h` · Serie 4800 — Corredera 2 hojas.

Fuente: tablas Diamond SODAL (variante normal y reforzada). Estado `lista_para_validar`; no es validación de taller.  
No mezclar con recetas Zeta 1:1 (`1800×1500` / `3000×1500`) ni con lecturas Alumétrica.

## Vidrio / cristal

Solo monolítico. Termopanel no admitido.

| Campo | Valor |
|---|---|
| Cantidad | 2 piezas por ventana |
| Ancho | `X / 2 − 44 mm` |
| Alto | `Y − 93 mm` |

Ejemplo 1200 × 1000: vidrio **556 × 907**.

## Plan de corte — Normal

| N° | Pieza | Perfil | Fórmula | Cant. | Corte |
|---:|---|---|---|---:|---|
| 1 | Riel Inferior | 4801 | `X − 16` | 1 | 90° / 90° |
| 2 | Riel Superior | 4802 | `X − 16` | 1 | 90° / 90° |
| 3 | Jamba | 4803 | `Y` | 2 | 90° / 90° |
| 4 | Zócalo | 4804 | `X / 2 − 15` | 2 | 90° / 90° |
| 5 | Cabezal | 4805 | `X / 2 − 15` | 2 | 90° / 90° |
| 6 | Traslapo | 4806 | `Y − 32` | 2 | 90° / 90° |
| 7 | Pierna con aleta | 4808 | `Y − 32` | 2 | 90° / 90° |

## Plan de corte — Reforzada

Igual a la normal, cambiando destajes 6 y 7:

| N° | Pieza | Perfil | Fórmula | Cant. | Corte |
|---:|---|---|---|---:|---|
| 6 | Traslapo reforzado | 4810 | `Y − 32` | 2 | 90° / 90° |
| 7 | Pierna reforzada | 4811 | `Y − 32` | 2 | 90° / 90° |

Zócalo y cabezal se interpretan como **ancho por hoja** (`X/2 − 15`): en 2 hojas, un `X − 15` de vano completo no cierra el marco. La pierna es vertical (`Y − 32`), igual que el traslapo; coincide con el plan Zeta 2H 1800×1500 (4808 = 1468 mm).

## Ejemplo 1200 × 1000

| N° | Código | Largo mm | Cant. |
|---:|---|---:|---:|
| 1 | 4801 | 1184 | 1 |
| 2 | 4802 | 1184 | 1 |
| 3 | 4803 | 1000 | 2 |
| 4 | 4804 | 585 | 2 |
| 5 | 4805 | 585 | 2 |
| 6 | 4806 o 4810 | 968 | 2 |
| 7 | 4808 o 4811 | 968 | 2 |

## Consumo ML

El `+10%` merma por perímetro es **documental**. El motor de Ventora usa los destajes de la tabla, no esa fórmula de metros lineales.

## Zeta

Las recetas `zeta:confirmed:sodal/4800/` siguen valiendo solo para **2H 1800×1500** y **3H 3000×1500**. En cualquier otra medida, cotización usa estos destajes Diamond como cálculo preliminar.
