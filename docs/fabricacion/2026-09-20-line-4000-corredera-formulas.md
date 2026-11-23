# Línea 4000 corredera — transcripción histórica de destajes

Fecha: **2026-09-20**  
X = **ancho total del vano**. Y = **alto total del vano**.  
Equivalente Ventora: `ventora:serie-4000-corredera-2h` · Línea 4000 — Corredera 2 hojas.

Estado `lista_para_validar`; no es validación de taller.

## Expediente de discrepancia de la corredera 2H

La transcripción del 20 de septiembre no identifica el manual, modelo ni página de origen. El catálogo Alumet de junio de 2012 identifica la Columbia **VC4000M-AMNC**, con dos hojas móviles, vidrio monolítico y riel normal. La jamba publicada es **4003, Y − 3**; la transcripción usa **4005, Y − 53**. Para el vidrio, Alumet indica **X/2 − 42 × (Y − 76)** y la transcripción emplea **X/2 + 34 × (Y − 105)**. [Catálogo Alumet, p. 21](https://www.alumet.cl/wp-content/uploads/2020/02/202700803-ALUMET-ALUMCO-ALUMINIO.pdf#page=21)

| Vano en mm | Vidrio por hoja en la receta existente | Vidrio por hoja en la ficha de Alumet |
|---|---|---|
| 1200 × 1000 | 634 × 895 | 558 × 924 |
| 1400 × 1100 | 734 × 995 | 658 × 1024 |

En cotización, el fallback `ventora:universal:l4000:2h`, su semilla `ventora:line-4000-corredera:2h:v1`, las copias con esa ascendencia y los registros 2H de origen ambiguo quedan pendientes. Una receta compatible con origen independiente trazable en el taller conserva su elegibilidad. Los cortes congelados siguen disponibles para consultar la pieza original.

**Pendiente para habilitar el despiece documental** — Identificar fabricante, modelo y revisión de la pauta transcrita, verificar roles, códigos, descuentos y vidrio contra la fuente primaria y contrastar el armado físico con el taller. Los valores siguientes registran lo que hacía el fixture.

## Vidrio / cristal (2H)

Monolítico o termopanel hasta 15 mm con junquillo adaptado.

| Campo | Valor |
|---|---|
| Cantidad | 2 piezas por ventana |
| Ancho | `X / 2 + 34 mm` |
| Alto | `Y − 105 mm` |

## Plan de corte — 2 hojas

| N° | Pieza | Perfil | Fórmula | Cant. | Corte |
|---:|---|---|---|---:|---|
| 1 | Riel Superior | 4002 | `X` | 1 | 90° / 90° |
| 2 | Riel Inferior | 4003 | `X` | 1 | 90° / 90° |
| 3 | Jamba | 4005 | `Y − 53` | 2 | 90° / 90° |
| 4 | Cabezal | 4008 | `X / 2 + 8` | 2 | 90° / 90° |
| 5 | Zócalo | 4004 | `X / 2 + 8` | 2 | 90° / 90° |
| 6 | Pierna | 4007 | `Y − 40` | 2 | 90° / 90° |
| 7 | Traslapo | 4009 | `Y − 40` | 2 | 90° / 90° |

## Ejemplo 1200 × 1000

| Código | Largo mm | Cant. |
|---|---:|---:|
| 4002 | 1200 | 1 |
| 4003 | 1200 | 1 |
| 4005 | 947 | 2 |
| 4008 | 608 | 2 |
| 4004 | 608 | 2 |
| 4007 | 960 | 2 |
| 4009 | 960 | 2 |
| Vidrio | 634 × 895 | 2 |

## Variantes cabezal / zócalo

| Variante | Fórmula cabezal y zócalo |
|---|---|
| 3 hojas · 3 rieles | `(X + 46) / 3` |
| 4 hojas · 2 rieles | `(X + 36) / 4` |
| 4 hojas · 4 rieles | `(X + 90) / 4` |

Rieles, jamba, pierna y traslapo se mantienen como en 2H. Vidrio de variantes: pendiente de validar; cotización usa fórmula 2H como preliminar.
