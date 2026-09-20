# Sodal Serie 20 (L20) — 5 variantes Alumétrica con fórmulas

Fecha de lectura: **2026-09-20**  
Fuente: [Sodal Serie 20 — Alumétrica](https://alumetrica.comunaclic.cl/Catalogo/Lineas/Detalle/a8d4377d-5785-4e75-a57d-e63c3090928d)  
Cuenta: sesión autenticada en browser Cursor  
Método: vista **Detalle → Tipologías y Lógica de Fabricación**, acordeones expandidos.

## Contexto de la línea

| Campo | Valor |
|---|---|
| Fabricante | Sodal S.A. |
| Material | Aluminio |
| Perfiles en catálogo | 13 (2001–2021) |
| Tipologías | 5 |
| Herrajes | 8 |
| Filtros cristal | Monolítico **5** · Termopanel **5** (misma lista; ver alerta abajo) |
| Filtros apertura | Fijo **4** · Corredera **1** |

Alerta visible en Alumétrica:

> Todas las tipologías de esta línea admiten monolítico y termopanel, así que los dos filtros muestran lo mismo. Para separarlas, limita el cristal de cada una en Editar tipología → Herrajes + Cristal.

**Interpretación Ventora:** las 5 filas son **construcciones** distintas; Mono + TP es admisión de cristal al cotizar, no duplica recetas.

## Perfiles de la línea (catálogo Alumétrica)

| Código | Nombre | Peso kg/m | Sección mm | Barra mm |
|---|---|---:|---|---:|
| 2001 | Riel Superior | 0.518 | 61×22 | 6.000 |
| 2002 | Riel Inferior | 0.455 | 61×20 | 6.000 |
| 2003 | Jamba Para pierna abierta | 0.000 | 14×6 | 6.000 |
| 2004 | Cabezal | 0.346 | 17×38 | 6.000 |
| 2005 | Zócalo | 0.400 | 17×48 | 6.000 |
| 2006 | Pierna Abierta | 0.481 | 45×64 | 6.000 |
| 2009 | Jamba | 0.415 | 63×20 | 6.000 |
| 2010 | Pierna | 0.435 | 44×20 | 6.000 |
| 2016 | Traslapo TP | 0.340 | 27×27 | 6.000 |
| 2018 | Zócalo / Cabezal TP | 0.419 | 20×49 | 6.000 |
| 2019 | Traslapo | 0.403 | 27×27 | 6.000 |
| 2020 | Pierna Abierta TP | 0.401 | 44×20 | 5.800 |
| 2021 | Cabezal TP | 0.000 | — | 6.000 |

## Fórmula de vidrio común (5 variantes)

| Campo | Expresión |
|---|---|
| Cantidad | 2 piezas por ventana |
| Ancho | `X / 2 - 57 mm` (X = ancho vano) |
| Alto | `Y - 101 mm` (Y = alto vano) |
| Cristal admitido | Monolítico y termopanel; termopanel: cualquier espesor |

**Validación Haciendo 1200×1000 (variante pierna cerrada + Jamba 2009):**  
543×899 observado ≈ `1200/2-57=543` y `1000-101=899` — **coincide**.

---

## Variante 1 — Monolítico pierna abierta · Jamba 2009

| Campo | Valor |
|---|---|
| Nombre Alumétrica | Corredera AL - 20 (Monolítico Pierna Abierta - Jamba 2009) |
| Tags | Mono + TP · **Corredera** |
| Hojas | 2 |
| Fórmulas perfil (UI) | 9 |
| Destajes (plan corte) | 7 |

### Plan de corte

| Ord. | Pieza | Perfil | Fórmula largo | Cant. | Corte |
|---:|---|---|---|---:|---|
| 1 | Riel Superior | 2001 | `X − 12` | 1 | 90° / 90° |
| 2 | Riel Inferior | 2002 | `X − 12` | 1 | 90° / 90° |
| 3 | Jamba Lateral | 2009 | `Y` | 2 | 90° / 90° |
| 4 | Cabezal hoja | 2004 | `X − 4` | 2 | 90° / 90° |
| 5 | Zócalo hoja | 2005 | `X − 4` | 2 | 90° / 90° |
| 6 | Pierna Cerrada | 2006 Pierna Abierta | `Y − 28` | 2 | 90° / 90° |
| 7 | Traslapo | 2019 | `Y − 28` | 2 | 90° / 90° |

Nota: la fila 6 rotula «Pierna Cerrada» pero usa perfil **2006 Pierna Abierta** (texto Alumétrica).

### Consumo ML (perfiles en fórmula de perímetro, merma 10%)

2001, 2002, 2003, 2004, 2005, 2006, 2009, 2010, 2019 — fórmula `((X+Y)×2/100) × 1.00 + 10% merma`.

---

## Variante 2 — Monolítico pierna abierta

| Campo | Valor |
|---|---|
| Nombre Alumétrica | Corredera AL - 20 (Monolítico Pierna Abierta) |
| Tags | Mono + TP · **Fijo** |
| Hojas | 2 |
| Fórmulas perfil | 9 |
| Destajes | 7 |

### Plan de corte

| Ord. | Pieza | Perfil | Fórmula largo | Cant. |
|---:|---|---|---|---:|
| 1 | Riel Superior | 2001 | `X − 12` | 1 |
| 2 | Riel Inferior | 2002 | `X − 12` | 1 |
| 3 | Jamba Lateral | **2003** Jamba pierna abierta | `Y` | 2 |
| 4 | Cabezal hoja | 2004 | `X − 4` | 2 |
| 5 | Zócalo hoja | 2005 | `X − 4` | 2 |
| 6 | Pierna Cerrada | 2006 Pierna Abierta | `Y − 28` | 2 |
| 7 | Traslapo | 2019 | `Y − 28` | 2 |

**Diferencia vs variante 1:** jamba lateral **2003** en lugar de **2009**; tag apertura Fijo vs Corredera.

---

## Variante 3 — Monolítico pierna cerrada · Jamba 2009

| Campo | Valor |
|---|---|
| Nombre Alumétrica | Corredera AL - 20 (Monolítico Pierna Cerrada - Jamba 2009) |
| Tags | Mono + TP · Fijo |
| Hojas | 2 |
| Fórmulas perfil | 7 |
| Destajes | 7 |

### Plan de corte

| Ord. | Pieza | Perfil | Fórmula largo | Cant. |
|---:|---|---|---|---:|
| 1 | Riel Superior | 2001 | `X − 12` | 1 |
| 2 | Riel Inferior | 2002 | `X − 12` | 1 |
| 3 | Jamba Lateral | 2009 | `Y` | 2 |
| 4 | Cabezal hoja | 2004 | `X − 4` | 2 |
| 5 | Zócalo hoja | 2005 | `X − 4` | 2 |
| 6 | Pierna Cerrada | **2010** Pierna | `Y − 28` | 2 |
| 7 | Traslapo | 2019 | `Y − 28` | 2 |

**Cruce Haciendo Ventanas 1200×1000:** despiece observado coincide en códigos y largos (1188, 596, 1000, 972, 543×899×2). **Variante de referencia para fixture merge.**

---

## Variante 4 — Monolítico pierna cerrada

| Campo | Valor |
|---|---|
| Nombre Alumétrica | Corredera AL - 20 (Monolítico Pierna Cerrada) |
| Tags | Mono + TP · Fijo |
| Hojas | 2 |
| Fórmulas perfil | 7 |
| Destajes | 7 |

Plan de corte **idéntico a variante 3** (2009 Jamba + 2010 Pierna + 2019 Traslapo).

---

## Variante 5 — TP 15 mm

| Campo | Valor |
|---|---|
| Nombre Alumétrica | Corredera AL - 20 (TP 15mm) |
| Tags | Mono + TP · Fijo |
| Hojas | 2 |
| Fórmulas perfil | 9 |
| Destajes | 7 |

### Plan de corte

| Ord. | Pieza | Perfil | Fórmula largo | Cant. |
|---:|---|---|---|---:|
| 1 | Riel Superior | 2001 | `X − 12` | 1 |
| 2 | Riel Inferior | 2002 | `X − 12` | 1 |
| 3 | Jamba Lateral | 2009 | `Y` | 2 |
| 4 | Cabezal hoja | 2004 | `X − 4` | 2 |
| 5 | Zócalo hoja TP | **2018** Zócalo / Cabezal TP | `X − 4` | **4** |
| 6 | Pierna Abierta TP | **2020** | `X − 28` | 2 |
| 7 | Traslapo TP | **2016** | `X − 28` | 2 |

Perfiles TP sustituyen 2005/2010/2019 en el plan de corte; cantidad 4 en 2018 es dato observado Alumétrica.

---

## Resumen comparativo

| # | Variante | Tag apertura | Perfiles corte | Jamba | Pierna | Traslapo/zócalo especial |
|---:|---|---|---|---|---|---|
| 1 | Pierna abierta · Jamba 2009 | Corredera | 7 destajes / 9 ML | 2009 | 2006 | 2005 + 2019 |
| 2 | Pierna abierta | Fijo | 7 / 9 | **2003** | 2006 | 2005 + 2019 |
| 3 | Pierna cerrada · Jamba 2009 | Fijo | 7 / 7 | 2009 | **2010** | 2005 + 2019 |
| 4 | Pierna cerrada | Fijo | 7 / 7 | 2009 | 2010 | 2005 + 2019 |
| 5 | TP 15 mm | Fijo | 7 / 9 | 2009 | 2020 TP | **2018×4** + 2016 TP |

## Slugs sugeridos para Ventora

| # | `variantSlug` sugerido |
|---:|---|
| 1 | `pierna_abierta_jamba_2009` |
| 2 | `pierna_abierta` |
| 3 | `pierna_cerrada_jamba_2009` |
| 4 | `pierna_cerrada` |
| 5 | `tp_15mm` |

## Uso posterior (sin convertir automáticamente)

- No promover a `validated` sin prueba taller.
- Variante 3/4 validada contra Haciendo 1200×1000; variantes 1, 2 y 5 requieren despiece independiente o prueba controlada.
- Actualizar `line-base-variant-catalog.ts` y fixtures merge en paso siguiente.
