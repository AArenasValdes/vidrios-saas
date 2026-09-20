# Haciendo Ventanas — despieces observados

Fecha de consulta: **2026-09-19**  
URL de la aplicación: [https://www.haceventanas.com/#appMain](https://www.haceventanas.com/#appMain)

## Condiciones comunes

- Medida de vano mostrada en los PDFs: **1200 × 1000 mm**.
- Barra comercial visible: **6000 mm**.
- Kerf visible en la pantalla: **3 mm**.
- Cantidad del proyecto: **1 unidad**.
- Evidencia: vista previa real `PDF taller (pauta + presupuesto)` dentro de la
  aplicación. La captura fue inspeccionada en vivo; no existe un archivo PDF o
  screenshot persistido en este repositorio.
- Los valores son longitudes resultantes para esa medida. No son fórmulas.

## Serie 3200 — Abatir 1 hoja

Fragmento visible del PDF:

| Perfil visible | Código | Cantidad | Largo observado |
|---|---|---:|---:|
| Marco | `3222` | 1 | 1200 mm |
| Marco | `3222` | 2 | 1000 mm |
| Bastidor Grande | `3225` | 2 | 1158 mm |
| Bastidor Grande | `3225` | 2 | 971 mm |

Vidrios: `Vidrio`, lectura visual de la captura `1023 × 930 mm`, cantidad 1.
La lectura del ancho debe confirmarse antes de usarla como evidencia formal.

Optimización visible: `Marco (3222)` en una barra de 6000 mm con piezas
`1200 + 1000` y sobrante visible `2794`; `Bastidor Grande (3225)` en una barra
con `1158 + 1158 + 971 + 971` y sobrante visible `1733`.

## Serie 4800 — 2 hojas

| Perfil visible | Código | Cantidad | Largo observado |
|---|---|---:|---:|
| Riel Inferior | `4801` | 1 | 1184 mm |
| Riel Superior | `4802` | 1 | 1184 mm |
| Jamba | `4803` | 2 | 1000 mm |
| Zócalo | `4804` | 2 | 585 mm |
| Cabezal | `4805` | 2 | 585 mm |
| Traslapo | `4806` | 2 | 968 mm |
| Pierna con Aleta | `4808` | 2 | 968 mm |

Vidrios: `Vidrio`, alto visible `907 mm`, cantidad 2. El ancho aparece en la
captura, pero no se considera confirmado por lectura textual.

## Serie 20 — 2 hojas

| Perfil visible | Código | Cantidad | Largo observado |
|---|---|---:|---:|
| Riel Superior | `2001` | 1 | 1188 mm |
| Riel Inferior | `2002` | 1 | 1188 mm |
| Cabezal | `2004` | 2 | 596 mm |
| Zócalo | `2005` | 2 | 596 mm |
| Jamba | `2009` | 2 | 1000 mm |
| Pierna | `2010` | 2 | 972 mm |
| Traslapo | `2019` | 2 | 972 mm |

Vidrios: `Vidrio`, `543 × 899 mm`, cantidad 2.

## Serie 25 — 2 hojas

| Perfil visible | Código | Cantidad | Largo observado |
|---|---|---:|---:|
| Riel Superior | `2501` | 1 | 1184 mm |
| Riel Inferior | `2502` | 1 | 1184 mm |
| Cabezal | `2504` | 2 | 603 mm |
| Zócalo | `2505` | 2 | 600 mm |
| Traslapo | `2507` | 2 | 965 mm |
| Jamba E | `2509` | 2 | 1000 mm |
| Pierna | `2510` | 2 | 965 mm |

Vidrio: `Vidrio`, `534 × 872 mm`, cantidad **1**. Este valor es un conflicto
visible para un modelo de 2 hojas y no se convierte en fórmula.

## Óptima S-28 — 2 hojas (termopanel)

| Perfil visible | Código | Cantidad | Largo observado |
|---|---|---:|---:|
| Riel | `S281` | 2 | 1200 mm |
| Riel | `S281` | 2 | 1000 mm |
| Hoja TP | `S282` | 4 | 939 mm |
| Hoja TP | `S282` | 4 | 603 mm |
| Traslapo | `S283` | 2 | 939 mm |
| Cortagotera | `S286` | 1 | 1200 mm |

Vidrios: `Termopanel`, `493 × 829 mm`, cantidad 2. `S284` y `S285` no aparecen
en esta salida 2H.

## Óptima S-28 — 3 hojas (termopanel)

| Perfil visible | Código | Cantidad | Largo observado |
|---|---|---:|---:|
| Hoja TP | `S282` | 6 | 939 mm |
| Hoja TP | `S282` | 6 | 424 mm |
| Traslapo | `S283` | 4 | 939 mm |
| Riel Triple | `S285` | 2 | 1200 mm |
| Riel Triple | `S285` | 2 | 1000 mm |
| Cortagotera | `S286` | 1 | 1200 mm |

Vidrios: `Termopanel`, `314 × 829 mm`, cantidad 2. La relación 3 hojas / 2
termopaneles queda como conflicto pendiente.

## S-33 — 2 hojas

| Perfil visible | Código | Cantidad | Largo observado |
|---|---|---:|---:|
| Traslapo | `3303` | 2 | 928 mm |
| Hoja TP | `3308` | 4 | 928 mm |
| Hoja TP | `3308` | 4 | 600 mm |
| Riel Cámara | `3324` | 2 | 1200 mm |
| Riel Cámara | `3324` | 2 | 1000 mm |

Vidrios: `Vidrio`, `488 × 816 mm`, cantidad 2.

## S-33 RPT — 2 hojas (termopanel)

| Perfil visible | Código | Cantidad | Largo observado |
|---|---|---:|---:|
| Traslapo | `3303` | 2 | 936 mm |
| Hoja TP RPT | `3308R` | 4 | 936 mm |
| Hoja TP RPT | `3308R` | 4 | 602 mm |
| Riel RPT | `3324R` | 2 | 1200 mm |
| Riel RPT | `3324R` | 2 | 1000 mm |

Vidrios: `Termopanel`, `491 × 825 mm`, cantidad 2.

## S-38 RPT — Proyectante

| Perfil visible | Código | Cantidad | Largo observado |
|---|---|---:|---:|
| Marco RPT | `S381R` | 2 | 1200 mm |
| Marco RPT | `S381R` | 2 | 1000 mm |
| Hoja RPT TP | `S386R` | 2 | 1167 mm |
| Hoja RPT TP | `S386R` | 2 | 967 mm |

Vidrio: `Termopanel`, `1067 × 867 mm`, cantidad **1**. El resultado se conserva
como conflicto contra la descripción Alumétrica de 2 hojas/fijo-proyectante.

## Lectura de fórmulas

No se observó ninguna expresión del tipo `X/2 - ...`, `Y - ...` o equivalente en
la interfaz o el PDF. La aplicación mostró longitudes calculadas, agrupación en
barras y sobrantes. Por trazabilidad, este documento conserva el resultado y no
reconstruye la fórmula.

## Evidencia no observada

- accesorios y herrajes por modelo;
- composición exacta de vidrio/termopanel;
- reglas visuales de fabricación;
- restricciones dimensionales fuera de 1200×1000 mm;
- HTML o PDF descargable persistido como archivo.

