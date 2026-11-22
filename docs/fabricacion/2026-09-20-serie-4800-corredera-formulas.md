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

Las recetas `zeta:confirmed:sodal/4800/` siguen valiendo solo para **2H 1800×1500** (`PA-56`) y **3H 3000×1500** (`PA-54`). En cualquier otra medida, cotización usa los destajes paramétricos Diamond como referencia documental (`testing`), exclusivamente para **corredera normal 2H** con vidrio float monolítico compatible.

## Comparación documental: Diamond 2H Normal vs Zeta PA-56 (`1800×1500`)

| Elemento | Diamond (`serie-4800-corredera-recipe.ts`) | Zeta `PA-56` (`monolitico_2h_1800x1500.json`) | Diferencia exacta y criterio |
|---|---|---|---|
| **Fuente y alcance** | Tablas Diamond SODAL (fórmula paramétrica, `estado: lista_para_validar`, `testing`) | Plan de armado `PA-56`, proyecto `46409`, **solo medida observada `1800×1500`** | Fuentes distintas: **no fusionar** sus descuentos ni generalizar `PA-56`. |
| **Trazabilidad** | Documental paramétrica (`7` perfiles, sin `4807/4809`, `0` acc.) | Sidecar `partial`, `ventoraStatus: testing`, `productionReady: false` (faltan `screenshot.png` y hashes 1:1) | No promover a `validated` sin prueba física real en taller. |
| **`4801` Riel inferior** | `1` × `X − 16` = **`1784 mm`**, `90°/90°` | `1` × **`1784 mm`**, `90°/90°` | Sin diferencia (`0 mm`). |
| **`4802` Riel superior** | `1` × `X − 16` = **`1784 mm`**, `90°/90°` | `1` × **`1784 mm`**, `90°/90°` | Sin diferencia (`0 mm`). |
| **`4803` Jamba** | `2` × `Y` = **`1500 mm`**, `90°/90°` | `2` × **`1500 mm`**, `90°/90°` | Sin diferencia (`0 mm`). |
| **`4804` Zócalo** | `2` × `X/2 − 15` = **`885 mm`**, `90°/90°` | `2` × **`886 mm`**, `90°/90°` | **`+1 mm` en `PA-56`** (`X/2 − 14` observado puntual). |
| **`4805` Cabezal** | `2` × `X/2 − 15` = **`885 mm`**, `90°/90°` | `2` × **`886 mm`**, `90°/90°` | **`+1 mm` en `PA-56`** (`X/2 − 14` observado puntual). |
| **`4806` Traslapo (normal)** | `2` × `Y − 32` = **`1468 mm`**, `90°/90°` | `2` × **`1468 mm`**, `90°/90°` | Sin diferencia (`0 mm`). `4810/4811` (reforzada) solo en Diamond. |
| **`4808` Pierna con aleta** | `2` × `Y − 32` = **`1468 mm`**, `90°/90°` | `2` × **`1468 mm`**, `90°/90°` | Sin diferencia (`0 mm`). |
| **`4807` / `4809`** | No presentes | No presentes | **Excluidos:** no incorporar sin evidencia adicional. |
| **Vidrio (`1800×1500`)** | `2` × **`856 × 1407 mm`** (`X/2 − 44 × Y − 93`), float monolítico (termopanel no admitido) | `2` × **`858 × 1406 mm`**, `CTI5` (`Cristal Templado Incoloro 5mm`) | **`+2 mm` ancho / `−1 mm` alto** en `PA-56`; **no equiparar `CTI5` templado con float monolítico**. |
| **Herrajes** | `0` (`accesorios: []`) | `12` ítems observados (`18000000637` ×4, `18000000832` ×4, `1040100140950` ×4, `CARACOLGENERICO` ×1, etc.) | Se conservan en evidencia Zeta; no se copian a Diamond ni habilitan costos en esta etapa. |

