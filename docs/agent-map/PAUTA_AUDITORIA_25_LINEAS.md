# Pauta de auditoría: catálogo canónico Ventora (31 líneas actuales)

Fecha de corte remoto del snapshot P3: 2026-09-14 (Línea 45 actualizada 2026-09-20). El nombre histórico del archivo se conserva por compatibilidad. El catálogo canónico actual tiene **31 líneas**; la tabla P3 abajo conserva el snapshot de su fecha y el addendum registra Veratec 7400. La línea activa histórica `id=437` sin `catalog_key` queda fuera de este mapa y debe clasificarse antes de incorporarse. Precio configurado significa precio definido por el taller; Ventora no entrega precios. “Pauta documentada” significa referencia técnica de catálogo/documentación; no equivale a validación de taller. `evidenceLevel` se representa en el código como `validationStatus`.

## Criterio P0

1. No se cambian descuentos ni códigos técnicos.
2. Una receta existente no prueba procedencia de taller. `workshop_validated` exige `status=validated`, `sourceType=workshop` y referencia o nombre explícito de evidencia.
3. Los descuentos se describen como **persistidos** cuando hay un ajuste guardado; si falta la fuente o el ajuste, quedan pendientes.
4. Precio configurado = línea activa con precio por m² mayor que cero. Solo entonces `quotable=true`.
5. AL-32 conserva sus perfiles actuales, incluidos 3204 y 3205. La nueva versión de taller solo confirma 3201/3202; la composición exacta sigue pendiente. No se etiqueta como “Proyectante Normal estándar”.
6. Serie 4600 debe resolver `puerta_vaiven`; Andes Monorriel debe resolver `pvc_monorriel`. Metadata histórica incompatible no puede ganar al `catalogKey` canónico.
7. Esta pauta es interna y revisable. No es CNC, nesting, promesa de corte ni validación automática.

## Auditoría P3 de consistencia semántica — snapshot 2026-09-14

Fecha de ejecución: 2026-09-14. La auditoría usa la misma identidad canónica que el catálogo y Fabricación. La columna **referencias del sistema** describe la familia documentada; **reglas activas** son solo las reglas de la variante seleccionada; **cortes** es la suma de sus cantidades; las opciones quedan fuera hasta selección explícita. “Receta persistida”, “pauta documentada”, “validada en taller” y “precio configurado” son estados independientes.

| Línea / `catalog_key` | Variante · tipología | Referencias del sistema | Receta persistida: reglas activas → cortes | Opciones no activas | Pauta documentada | Validada en taller | Precio configurado | Pauta para corregir / alerta |
|---|---|---|---|---|---|---|---|---|
| Serie 5000 / `ventora:l5000` | estándar · corredera | 5001–5007 | 5001, 5002, 5003, 5005, 5004, 5006, 5007 → 12 | — | Sí | No | Según organización | Confirmar evidencia física completa |
| Serie 20 / `ventora:l20` | estándar · corredera | 2001, 2002, 2009, 2004, 2005, 2010, 2019 | 2001, 2002, 2009, 2005, 2004, 2010, 2019 → 12 | — | Sí | No | Según organización | Confirmar evidencia física y precio del taller |
| Serie 25 / `ventora:l25` | estándar · corredera | 2501, 2502, 2509, 2504, 2505, 2507, 2510 | 2501, 2502, 2509, 2505, 2504, 2510, 2507 → 12 | — | Sí | No | Según organización | Confirmar evidencia física y precio del taller |

### Variantes L25 multi-hoja (2026-09-17)

| Hojas | Variante | Receta | Calculable | Validada | Datos pendientes |
|---:|---|---|---|---|---|
| 2 | Caracol | Sí · receta existente conservada | Sí · ajustes documentados | No | Evidencia física completa; vidrio/accesorios |
| 3 | Reforzada · Pierna abierta | Slot `draft` idempotente; sin fórmulas inventadas | No | No | Perfiles reforzados, descuentos pierna/encuentro, cantidades, 2531, vidrio/accesorios |
| 4 | Reforzada · Pierna abierta | Slot `draft` idempotente; sin fórmulas inventadas | No | No | Igual que 3H + adaptador 4ª hoja (2521) si aplica |

Referencias 2513, 2514, 2516, 2518, 2521, 2531 = metadata de catálogo; no entran al cálculo hasta configurarse en la receta. Una pieza 3H/4H **nunca** debe usar la receta 2H.

| AL-32 / `ventora:l32` | normal · proyectante, composición pendiente | 3201, 3202, 3204, 3205, 3208 | 3201, 3201, 3202, 3202, 3208, 3208 → 12 | — | Parcial | No | Según organización | No declarar “Proyectante Normal estándar”; confirmar qué composición representan 3204/3205 |
| AM-35 / `ventora:l35` | abatible · puerta abatible | 3502, 3501, 3508, 3503, 3504, 3506, 3507, 3509 | 3502, 3501, 3509 → 3 | 3508, 3503, 3504, 3506, 3507 (5) | Pendiente | No | Según organización | Confirmar composición y separar vaivén si corresponde |
| Línea 15 / `ventora:serie-15-corredera-2h` | composición por resolver · corredera | 1501–1508 | 1501, 1502, 1503, 1504, 1505 → 10 | 1506, 1507, 1508 (3) | ALAR | No | Según organización | Resolver si 1506/1507/1508 son alternativas o simultáneos |
| Línea 4000 / `ventora:serie-4000-corredera-2h` | normal · corredera | 4001–4005, 4007, 4008 | 4001, 4002, 4003, 4004, 4005, 4007, 4008 → 12 | — | Arquetipo | No | Según organización | Completar medidas de corte |
| Línea 45 / `ventora:serie-45-puerta` | puerta 1 hoja · puerta abatible | 4522, 4531, 4534 | destajes 1–10 → 14 cortes | — | Sodal/Indalum | No | Según organización | Validar en taller |
| Línea 12 / `ventora:serie-12-shower-corredera` | tina · shower | 1201–1204 | 1201, 1202, 1203, 1204 → 8 | — | Arquetipo | No | Según organización | Confirmar receptáculo, herrajes y pauta |
| AL-42 / `ventora:l42` | normal · proyectante | 4201, 4209, 4202, 4204, 4229, 4206, 4231, 4220, 4230, 4250 | 4201, 4201, 4202, 4202, 4229 vertical → 10 | 4229 horizontal (1 regla · 2 cortes) | Parcial | No | Según organización | Aplicar migración local para completar el par de junquillos; no convertir la referencia en validación |
| Serie 4800 / `ventora:serie-4800-corredera-2h` | normal y reforzada · corredera | 4801–4806, 4808, 4810, 4811 | normal: 4801–4806, 4808 → 12; reforzada: 4801–4805, 4810, 4811 → 12 | — | SODAL Diamond | No | Según organización | Validar en taller; Zeta 1:1 solo 2H 1800×1500 y 3H 3000×1500 |
| Óptima S-28 2H / `ventora:optima-s28-corredera-2h` | estándar · corredera | Sin códigos publicados | 7 reglas → 12 | — | Base tipológica | No | Según organización | Reemplazar base por fuente primaria y prueba |
| Óptima S-28 3H / `ventora:optima-s28-corredera-3h` | estándar · corredera | Sin códigos publicados | 7 reglas → 16 | — | Base tipológica | No | Según organización | Reemplazar base por fuente primaria y prueba |
| S-33 / `ventora:s33-corredera-2h` | normal · corredera | 3301, 3302, 3303, 3304, 3308 | 3324, 3324, 3308, 3308, 3303 → 14 | — | SODAL | No | Según organización | Resolver diferencia 3324 frente a referencias 3301/3302/3304 |
| S-33 RPT / `ventora:s33-rpt-corredera-2h` | RPT · corredera | 3324, 3308, 3303, 3304, 3470 | 3324R, 3324R, 3308R, 3308R, 3303 → 14 | — | SODAL | No | Según organización | Confirmar códigos RPT de la fuente y su equivalencia |
| Serie 42 cámara / `ventora:serie-42-proyectante-camara` | con cámara · proyectante | 4201, 4209, 4202, 4204, 4229, 4206, 4231, 4220, 4230, 4250 | 4231, 4231, 4202, 4202 → 4 | 4209, 4209, 4204, 4229, 4229, 4206, 4206 (7) | Base tipológica | No | Según organización | Confirmar composición y separar referencias opcionales |
| Serie 42 sin cámara / `ventora:serie-42-proyectante-sin-camara` | sin cámara · proyectante | 4201, 4209, 4202, 4204, 4229, 4206, 4231, 4220, 4230, 4250 | 4201, 4201, 4202, 4202 → 4 | 4209, 4209, 4204, 4229, 4229, 4206, 4206 (7) | Base tipológica | No | Según organización | Confirmar composición y separar referencias opcionales |
| S-38 / `ventora:s38-proyectante` | estándar · proyectante | 3801, 3802N, 3803–3807 | 8 reglas → 10 | — | Base tipológica | No | Según organización | Fuente primaria y códigos pendientes |
| S-38 RPT / `ventora:s38-rpt-proyectante` | estándar · proyectante | 381R, 384R, 386R, 383, 387 | 8 reglas → 10 | — | Base tipológica | No | Según organización | Fuente primaria y códigos pendientes |
| MultiSlide S-83 4H / `ventora:multislide-s83-4h` | 4 hojas · corredera | S831–S834 | S831, S832, S833, S834 → 8 | — | SODAL | No | Según organización | Validar fabricación real |
| MultiSlide S-83 8H / `ventora:multislide-s83-8h` | 8 hojas · corredera | S831–S834 | S831, S832, S833, S834 → 12 | — | SODAL | No | Según organización | Validar fabricación real |
| Serie 3200 / `ventora:serie-3200-puerta-abatible-1h` | bastidor 3221/3225 · puerta abatible | 3222, 3221, 3225, 3227, 3223 | 3222×3 + bastidor×2 → 7 por variante | — | SODAL | No | Según organización | Confirmar bastidor y prueba física |
| Serie 4600 / `ventora:serie-4600-puerta-vaiven` | quicio mecánico · `puerta_vaiven` | 4601, 4603, 4604, 4602 | 4601, 4603 → 4; quicio hidráulico: 4604, 4602 → 4 | — | SODAL | No | Según organización | Nunca mezclar las 4 referencias como una sola variante activa |
| WinHouse New S75 doble / `ventora:winhouse-new-s75-doble-riel` | estándar · corredera | Sin códigos publicados | 10 reglas → 19 | — | Base tipológica | No | Según organización | Fuente primaria y prueba |
| WinHouse New S75 triple / `ventora:winhouse-new-s75-triple-riel` | estándar · corredera | Sin códigos publicados | 10 reglas → 26 | — | Base tipológica | No | Según organización | Fuente primaria y prueba |
| WinHouse S60 / `ventora:winhouse-s60` | estándar · abatible | 7160Z00013, 7160Z00016, 720000200, 716CZ00001–716CZ00003, 726332612N, 2433242N, 4040BOX15, 78200010001 | 6 reglas → 7 | — | Base tipológica | No | Según organización | Fuente primaria y prueba |
| WinHouse Andes doble / `ventora:winhouse-andes-doble-riel` | estándar · corredera | PL-SLA-TC-H66-12, PL-SLA-TC-H66-15, PL-SLA-TC-MCA-12 | 10 reglas → 19 | — | Base tipológica | No | Según organización | Fuente primaria y prueba |
| WinHouse Andes Monorriel / `ventora:winhouse-andes-monorriel` | estándar · `pvc_monorriel` | PL-SLA-TC-MLT-12, PL-SLA-TC-H54-12, HL-ACC-5X5-APOC-MA | 10 reglas → 19 | — | Identidad canónica | No | Según organización | Nunca `pvc_corredera_2h`; completar receta específica |
| WinHouse Andes proyectante / `ventora:winhouse-andes-proyectante` | estándar · proyectante | Sin códigos publicados | 6 reglas → 7 | — | Base tipológica | No | Según organización | Fuente primaria y prueba |

## Addendum 2026-09-21 — VERATEC 7400

Se agrega la línea canónica `ventora:veratec-7400-corredera`, fabricante VERATEC, material PVC y barra documentada de 5.800 mm. La ficha Alumétrica lista 12 destajes por variante, vidrio `X/2−158` / `Y−177` y 13 consumos de herrajes por ventana. La variante monolítica 4 mm está documentada y lista para probar; TP 20 mm y TP 24 mm no se pueden probar ni seleccionar hasta resolver las discrepancias de tipo de cristal y código de junquillo. Ninguna receta nueva está validada en taller. Evidencia completa: `docs/fabricacion/alumetrica/2026-09-21-veratec-7400.md`.

Resultado de la auditoría: **29/29 claves únicas**, sin `OPTIONAL_PROFILE_COUNTED_AS_ACTIVE`, sin mezcla de variantes en Serie 4600 y con tipologías canónicas `puerta_vaiven` y `pvc_monorriel`. Las diferencias de referencias frente a reglas activas son advertencias de trazabilidad, no autorización para copiar todas las referencias a Fabricación. El auditor no altera datos ni reemplaza recetas persistidas.

### Corrección P0 adicional: Serie 42 normal

La receta persistida remota de la organización auditada (`organization_id=39`, `line_template_id=317`) conserva procedencia `workshop`, revisión `P1-L42-MARCO-HOJA-17` y estado `draft`. Antes de aplicar la corrección local, el junquillo `4229` horizontal está guardado como opcional y el vertical como obligatorio; por eso Fabricación muestra 5 reglas y 10 cortes, aunque el catálogo documenta la familia completa.

La migración local `20260914170000_l42_normal_double_junquillo.sql` cambia únicamente la bandera `requerido` del junquillo horizontal `4229` a `true`. Conserva código, cantidad 2, descuento `-90 mm`, procedencia, vidrio, accesorios y estado de validación. Tras aplicarla, la receta tendrá 6 reglas y 12 cortes, pero seguirá pendiente porque vidrio/accesorios y la validación física completa no están confirmados. No se marca `workshop_validated`.

## Auditoría post-migración P2U (corte vigente)

| Línea / `catalog_key` | Tipología | Receta persistida | Pauta documentada | Validada en taller | Precio configurado | Estado técnico / evidencia | Próximo arreglo |
|---|---|---|---|---|---|---|---|
| Serie 5000 / `ventora:l5000` | Corredera 2H | Sí · `draft`, `workshop` | Sí | No | Según organización | Calculable; no `workshop_validated` automático | Completar evidencia física |
| Serie 20 / `ventora:l20` | Corredera 2H | Sí · `draft`, `workshop` | Sí | No | Según organización | Calculable; no validada | Completar evidencia y precio |
| Serie 25 / `ventora:l25` | Corredera 2H | Sí · `draft`, `workshop` | Sí | No | Según organización | Calculable; no validada | Completar evidencia y precio |
| AL-32 / `ventora:l32` | Proyectante · composición pendiente | Sí · P1, conserva 3204/3205 | Sí | No | Según organización | No declarar “Proyectante Normal estándar” | Confirmar composición, vidrio y accesorios |
| AM-35 / `ventora:l35` | Abatible y vaivén | Sí · 2 variantes `draft`, `manufacturer` | Sí · Arquetipo + Alumet | No | Según organización | Incompleta; tradicional/multiproveedor | Obtener composición y pauta |
| Línea 15 / `ventora:serie-15-corredera-2h` | Corredera 2H | Sí · `draft`, `supplier=ALAR` | Sí · Arquetipo + ALAR p. 109 | No | Pendiente · 0 | Incompleta; 1506/1507/1508 opcionales pendientes | Resolver alternativas/simultaneidad |
| Línea 4000 / `ventora:serie-4000-corredera-2h` | Corredera 2H | Sí · `draft`, `manufacturer=Arquetipo` | Sí · Arquetipo | No | Pendiente · 0 | Incompleta; faltan medidas de corte | Obtener pauta numérica |
| Línea 45 / `ventora:serie-45-puerta` | Puerta abatible | Sí · Serie 45 practicable 1H | Sí · 4522/4531/4534 | No | Pendiente · 0 | Calculable; no validada en taller | Confirmar evidencia física |
| Línea 12 / `ventora:serie-12-shower-corredera` | Shower Door | Sí · `draft`, `manufacturer=Arquetipo` | Sí · estructura 90°/45° | No | Pendiente · 0 | Incompleta; consumos y cortes pendientes | Confirmar receptáculo, herrajes y pauta |
| AL-42 / `ventora:l42` | Proyectante | Sí · `draft`, `workshop`; 5 reglas/10 cortes visibles actualmente | Sí | No | Según organización | Configuración técnica pendiente; no validada automáticamente | Aplicar migración local para activar el junquillo 4229 horizontal; completar evidencia, vidrio, accesorios y precio |
| Serie 4800 / `ventora:serie-4800-corredera-2h` | Corredera 2H | Sí · SODAL Diamond destajes | Sí · 4801–4808 / 4810–4811 | No | Según organización | Calculable; no validada en taller | Confirmar evidencia física |
| Óptima S-28 2H / `ventora:optima-s28-corredera-2h` | Corredera 2H | Sí · base `draft` | Sí · base tipológica | No | Según organización | Pendiente | Fuente primaria y prueba |
| Óptima S-28 3H / `ventora:optima-s28-corredera-3h` | Corredera 3H | Sí · base `draft` | Sí · base tipológica | No | Según organización | Pendiente | Fuente primaria y prueba |
| Serie 42 cámara / `ventora:serie-42-proyectante-camara` | Proyectante | Sí · base `draft` | Sí · base tipológica | No | Según organización | Pendiente | Fuente primaria y prueba |
| Serie 42 sin cámara / `ventora:serie-42-proyectante-sin-camara` | Proyectante | Sí · base `draft` | Sí · base tipológica | No | Según organización | Pendiente | Fuente primaria y prueba |
| S-38 / `ventora:s38-proyectante` | Proyectante | Sí · base `draft` | Sí · base tipológica | No | Según organización | Pendiente | Fuente primaria y prueba |
| S-38 RPT / `ventora:s38-rpt-proyectante` | Proyectante | Sí · base `draft` | Sí · base tipológica | No | Según organización | Pendiente | Fuente primaria y prueba |
| S-33 / `ventora:s33-corredera-2h` | Corredera 2H | Sí · SODAL P2A | Sí | No | Según organización | Calculable/documentada | Validar fabricación real |
| S-33 RPT / `ventora:s33-rpt-corredera-2h` | Corredera 2H | Sí · SODAL P2A | Sí | No | Según organización | Calculable/documentada | Validar fabricación real |
| MultiSlide S83 4H / `ventora:multislide-s83-4h` | Corredera 4H | Sí · SODAL P2A | Sí | No | Según organización | Calculable/documentada | Validar fabricación real |
| MultiSlide S83 8H / `ventora:multislide-s83-8h` | Corredera 8H | Sí · SODAL P2A | Sí | No | Según organización | Calculable/documentada | Validar fabricación real |
| Serie 3200 / `ventora:serie-3200-puerta-abatible-1h` | Puerta abatible | Sí · SODAL P2A | Sí | No | Según organización | Calculable/documentada | Validar fabricación real |
| Serie 4600 / `ventora:serie-4600-puerta-vaiven-1h` | `puerta_vaiven` | Sí · SODAL P2A | Sí | No | Según organización | Calculable/documentada; no corredera | Validar fabricación real |
| WinHouse New S75 doble / `ventora:winhouse-new-s75-doble-riel` | PVC corredera 2H | Sí · base `draft` | Sí · base tipológica | No | Según organización | Pendiente | Fuente primaria y prueba |
| WinHouse New S75 triple / `ventora:winhouse-new-s75-triple-riel` | PVC corredera 3H | Sí · base `draft` | Sí · base tipológica | No | Según organización | Pendiente | Fuente primaria y prueba |
| WinHouse S60 / `ventora:winhouse-s60` | PVC abatible | Sí · base `draft` | Sí · base tipológica | No | Según organización | Pendiente | Fuente primaria y prueba |
| WinHouse Andes doble / `ventora:winhouse-andes-doble-riel` | PVC corredera 2H | Sí · base `draft` | Sí · base tipológica | No | Según organización | Pendiente | Fuente primaria y prueba |
| WinHouse Andes Monorriel / `ventora:winhouse-andes-monorriel` | `pvc_monorriel` | Sí · `draft` | Sí · identidad canónica | No | Según organización | Nunca `pvc_corredera_2h` | Completar receta específica |
| WinHouse Andes proyectante / `ventora:winhouse-andes-proyectante` | PVC proyectante | Sí · base `draft` | Sí · base tipológica | No | Según organización | Pendiente | Fuente primaria y prueba |

Línea 15: la pauta ALAR es `1501=1×X`, `1502=1×X`, `1503=2×(Y−7)`, `1504=4×(X/2−3)`, `1505=2×(X/2−3)`, `1506=2×(Y−26)`, `1507=2×(Y−26)`, `1508=2×(Y−26)`. Para W=1200/H=1000: 1200, 1200, 993, 597, 597 y 974 mm. 1506/1507/1508 quedan no obligatorios hasta resolver si son alternativas o simultáneos.

### Código, sistema y descuentos P2U

| Línea | Sistema / tipología | Códigos documentados | Descuentos persistidos | Decisión |
|---|---|---|---|---|
| AM-35 | Línea 35 · abatible y vaivén | 3502, 3501, 3508, 3503, 3504, 3506, 3507, 3509 | Ninguno inferido; ajustes pendientes por variante | No reutilizar 3200/4600; separar variantes |
| Línea 15 | Corredera 2 hojas | 1501–1508 | 1501/1502 0; 1503 −7; 1504/1505 −3; 1506/1507/1508 −26 documentados por ALAR, opcionales hasta resolver composición | Única pauta numérica P2U |
| Línea 4000 | Corredera 2 hojas | 4001, 4002, 4003, 4004, 4005, 4007, 4008 | Pendientes; no hay pauta numérica primaria encontrada | Mostrar “faltan medidas de corte” |
| Línea 45 | Puerta abatible | 4522, 4531, 4534 | 4522 `X`/`Y`; 4531 `X−158`/`Y−28`; 4534 `X−158`/`Y−177`; vidrio `X−170`×`Y−183` | Destajes 2026-09-20; X=ancho vano, Y=alto vano |
| Serie 4800 | Corredera 2H | 4801–4806, 4808, 4810, 4811 | rieles `X−16`; jamba `Y`; zócalo/cabezal `X/2−15`; traslapo/pierna `Y−32`; vidrio `X/2−44`×`Y−93` | Destajes Diamond 2026-09-20; solo monolítico |
| Línea 12 | Shower Door · corredera colgante | 1201, 1202, 1203, 1204 | Pendientes; solo cortes estructurales 90°/45° documentados | Confirmar receptáculo, herrajes y pauta |

La columna “descuentos persistidos” no implica validación física del ajuste. Todas las recetas P2U son `draft`; `manufacturer`/`supplier` acredita documentación, no validación física.

Fuentes primarias: [Catálogo Arquetipo](https://arquetipo.cl/catalogos/Perfiles%20Aluminio%20-%20Catalogo%20Linea%20Estandar.pdf), [Catálogo ALAR distribuido por Alumet](https://www.alumet.cl/wp-content/uploads/2020/05/alar_catalogo_2011.pdf) y [Catálogo Alumet](https://www.alumet.cl/wp-content/uploads/2020/02/202700803-ALUMET-ALUMCO-ALUMINIO.pdf).

## Snapshot histórico P0/P1/P2A

La tabla siguiente conserva el corte detallado anterior para trazabilidad. No debe usarse para afirmar que el catálogo actual tiene 25 líneas: la sección anterior es el corte vigente de 29.

| ID | Línea / sistema | Tipología canónica | Receta persistida | Pauta documentada | Validada en taller | Precio configurado | Estado técnico / evidencia | Descuentos persistidos | Prioridad |
|---:|---|---|---|---|---|---|---|---|---|
| 312 | Serie 5000 / L5000 | Corredera 2H | Sí · `draft`, `workshop` | Sí · referencia Ventora + fuente taller P1 | No · evidencia parcial, no prueba física completa | Sí · 80.000/m² | Calculable; `unverified`; receta y ajustes persistidos | 5005 -2; 5004 -2; 5006 -18; 5007 -18; 5001 0; 5002 0; 5003 -3 mm | P1: adjuntar comprobación física completa |
| 313 | Serie 20 / L20 | Corredera 2H | Sí · `draft`, `workshop` | Sí · referencia Ventora + fuente taller P1 | No · evidencia parcial, no prueba física completa | No · 0 | Calculable; `unverified`; receta y ajustes persistidos | 2005 -2; 2004 -2; 2010 -27; 2019 -27; 2001 -12; 2002 -12; 2009 0 mm | P1: adjuntar comprobación física y precio |
| 314 | Serie 25 / L25 | Corredera 2H | Sí · `draft`, `workshop` | Sí · referencia Ventora + fuente taller P1 | No · evidencia parcial, no prueba física completa | No · 0 | Calculable; `unverified`; receta y ajustes persistidos | 2505 0; 2504 0; 2510 -35; 2507 -35; 2501 -16; 2502 -16; 2509 0 mm | P1: adjuntar comprobación física y precio |
| 315 | AL-32 / Serie 32 | Proyectante · composición exacta pendiente | Sí · v2 `review_required`, `workshop`; v1 archivada; conserva 3204/3205 | Sí · referencia de catálogo + marco/hoja confirmados por taller | No · evidencia parcial | Sí · 80.000/m² | Calculable; `unverified`; no es “Proyectante Normal estándar” | 3201 0; 3202 -21 confirmados; 3208 -3, 3205 -1, 3204 -4 persistidos sin validar | P1: confirmar vidrio, accesorios y composición completa |
| 316 | AM-35 | Puerta abatible y vaivén | Sí · propia, `draft` | No · base pendiente | No | No · 0 | Configuración técnica pendiente; evidencia `unverified` | Pendientes | P1 |
| 317 | AL-42 normal / Serie 42 | Proyectante | Sí · `draft`, `workshop`; 5 reglas/10 cortes actuales | Sí · referencia Ventora + marco/hoja confirmados por taller | No · evidencia parcial | No · 0 | Configuración técnica pendiente; `unverified`; precio pendiente | 4201 0; 4202 -17 persistidos con evidencia P1; 4229 -90 persistido sin validación física | P0 local: completar junquillo 4229 horizontal; luego confirmar vidrio, accesorios y prueba real |
| 318 | Serie 4800 | Corredera 2H | Sí · 2 recetas v2/v3, `draft`, `manufacturer=SODAL`; v1 archivada | Sí · Diamond destajes 2026-09-20 + [Catálogo General SODAL 2018, p. 29](https://sodal.cl/wp-content/uploads/2024/03/catalogo_sodal.pdf), normal/reforzada | No · sin prueba física aportada | No · 0, configurable por taller | `calculable`; `documented`; fuente SODAL | rieles `X−16`; jamba `Y`; zócalo/cabezal `X/2−15`; traslapo/pierna `Y−32`; vidrio `X/2−44` / `Y−93` | Validar en taller; Zeta 1:1 solo 2H 1800×1500 y 3H 3000×1500 |
| 319 | Óptima S28 2H | Corredera 2H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 320 | Óptima S28 3H | Corredera 3H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 321 | S-33 | Corredera 2H | Sí · v2, `draft`, `manufacturer=SODAL`; v1 archivada | Sí · [Catálogo General SODAL 2018, p. 41](https://sodal.cl/wp-content/uploads/2024/03/catalogo_sodal.pdf) | No · sin prueba física aportada | No · 0, configurable por taller | `calculable`; `documented`; fuente SODAL | 3324 0; 3308 -4/-72; 3303 -72; vidrio -117/-186 | P2A: prueba física |
| 322 | S-33 RPT | Corredera 2H | Sí · v2, `draft`, `manufacturer=SODAL`; v1 archivada | Sí · [Ficha S-33 RPT SODAL](https://sodal.cl/wp-content/uploads/2023/12/S33RPT.pdf) | No · sin prueba física aportada | No · 0, configurable por taller | `calculable`; `documented`; fuente SODAL | 3324R 0; 3308R +4/-64; 3303 -64; TP -108/-176 | P2A: prueba física |
| 323 | Serie 42 cámara | Proyectante | Sí · 2 recetas `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 324 | Serie 42 sin cámara | Proyectante | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 325 | S-38 | Proyectante | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 326 | S-38 RPT | Proyectante | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 327 | MultiSlide S83 4H | Corredera 4H | Sí · v2, `draft`, `manufacturer=SODAL`; v1 archivada | Sí · [Catálogo General SODAL 2018, p. 45](https://sodal.cl/wp-content/uploads/2024/03/catalogo_sodal.pdf) | No · sin prueba física aportada | No · 0, configurable por taller | `calculable`; `documented`; fuente SODAL | S831/S832 -26; S833 0; S834 -11; vidrio -11/-86 | P2A: prueba física |
| 328 | MultiSlide S83 8H | Corredera 8H | Sí · v2, `draft`, `manufacturer=SODAL`; v1 archivada | Sí · [Catálogo General SODAL 2018, p. 45](https://sodal.cl/wp-content/uploads/2024/03/catalogo_sodal.pdf) | No · sin prueba física aportada | No · 0, configurable por taller | `calculable`; `documented`; fuente SODAL | S831/S832 -26; S833 0; S834 -7; vidrio -8/-86 | P2A: prueba física |
| 329 | Serie 3200 | Puerta abatible | Sí · 2 recetas v2/v3, `draft`, `manufacturer=SODAL`; v1 archivada | Sí · [Catálogo General SODAL 2018, p. 21](https://sodal.cl/wp-content/uploads/2024/03/catalogo_sodal.pdf); variantes 3221/3225 separadas | No · sin prueba física aportada | No · 0, configurable por taller | `calculable`; `documented`; fuente SODAL | Marco 3222 0; bastidor -42/-29; vidrio 3221 -141/-128 o 3225 -190/-177 | P2A: mapear L/ST/TP y resolver advertencia 3225/3227 |
| 330 | Serie 4600 | `puerta_vaiven` | Sí · 2 recetas v2/v3, `draft`, `manufacturer=SODAL`; v1 corredera archivada | Sí · [Catálogo General SODAL 2018, p. 23](https://sodal.cl/wp-content/uploads/2024/03/catalogo_sodal.pdf); quicio mecánico/hidráulico separados | No · sin prueba física aportada | No · 0, configurable por taller | `calculable`; `documented`; fuente SODAL; no es corredera | Mecánico 4601 -21/4603 -118; hidráulico 4604 -18/4602 -118; vidrio -102/-195 o -192 | P2A: prueba física |
| 331 | WinHouse New S75 doble riel | PVC corredera 2H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P2 |
| 332 | WinHouse New S75 triple riel | PVC corredera 3H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P2 |
| 333 | WinHouse S60 | PVC abatible | Sí · 2 recetas `draft`, `manual` | Sí · base tipológica | No | No · 0 | Elegir variante y probar; evidencia `unverified` | Pendientes | P1 |
| 334 | WinHouse Andes doble riel | PVC corredera 2H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 335 | WinHouse Andes Monorriel | `pvc_monorriel` | Sí · `draft`; metadata histórica `pvc_corredera_2h` no prevalece | Sí · catálogo/arquetipo canónico | No | No · 0 | Identidad canónica pendiente de completar; evidencia `unverified` | Pendientes; PL-SLA solo referencia | P0: revisar identidad |
| 336 | WinHouse Andes proyectante | PVC proyectante | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P2 |

## Auditoría P1: primeras recetas reales de taller

La migración P1 registra procedencia de taller sin convertirla en `workshop_validated`. En las cinco líneas no existe evidencia física completa de todos los componentes obligatorios; por eso ninguna se marca automáticamente como “Validada en taller”.

| Línea | Receta persistida | Pauta documentada | Validada en taller | Precio configurado | Cotizable | Evidencia/reglas de taller | Pendientes |
|---|---|---|---|---|---|---|---|
| Serie 5000 | `draft`, `source_type=workshop`; 7 reglas conservadas | Sí | No | Sí · 80.000/m² | Sí | 5005 -2; 5004 -2; 5006 -18; 5007 -18; 5001 0; 5002 0; 5003 -3 | Comprobación física completa |
| Serie 20 | `draft`, `source_type=workshop`; 7 reglas conservadas | Sí | No | No · 0 | No | 2005 -2; 2004 -2; 2010 -27; 2019 -27; 2001 -12; 2002 -12; 2009 0 | Comprobación física completa y precio |
| Serie 25 | `draft`, `source_type=workshop`; 7 reglas conservadas | Sí | No | No · 0 | No | 2505 0; 2504 0; 2510 -35; 2507 -35; 2501 -16; 2502 -16; 2509 0 | Comprobación física completa y precio |
| AL-32 / Serie 32 | v2 `review_required`, `source_type=workshop`; v1 archivada; 3204/3205 conservados | Sí | No | Sí · 80.000/m² | Sí | 3201 marco W/H, 0 mm, 2H+2V; 3202 hoja W/H por hoja, -21 mm, 2H+2V | 3208, 3205, 3204, vidrio, accesorios y composición completa |
| AL-42 normal / Serie 42 | `draft`, `source_type=workshop` | Sí | No | No · 0 | No | 4201 marco W/H, 0 mm, 2H+2V; 4202 hoja W/H por hoja, -17 mm, 2H+2V | 4229, vidrio, accesorios y precio |

### Prueba de medida de referencia

Con W=1000 mm y H=1200 mm, el motor P1 debe producir: AL-32 marco 1000/1200; AL-32 hoja 979/1179; AL-42 marco 1000/1200; AL-42 hoja 983/1183. La salida 982/1182 para AL-42 queda expresamente descartada.

### Regla de evidencia P1

`source_type=workshop` significa procedencia declarada de taller. `workshop_validated` exige además `status=validated`, prueba real aprobada y evidencia explícita de la receta completa. Los ajustes conocidos se llaman **persistidos**; solo pueden llamarse confirmados cuando la regla específica tiene evidencia física explícita.

## Orden de arreglo

- **P0:** 335: mantener identidad canónica `pvc_monorriel`; clasificar la línea histórica sin `catalog_key` antes de auditarla.
- **P1:** 312, 313, 314, 315 y 317: incorporar comprobación física completa, vidrio/accesorios y precio donde falte. AL-32 conserva 3204/3205; confirmar composición antes de nombrarla estándar. AL-42 usa -17 mm para esta receta de taller; la referencia externa histórica -18 mm queda trazada, no aplicada.
- **P0 local Serie 42:** aplicar `20260914170000_l42_normal_double_junquillo.sql` para activar el junquillo 4229 horizontal y dejar dos orientaciones obligatorias de 2 cortes; después repetir prueba real sin marcar validación automáticamente.
- **P2A completado documentalmente:** 318, 321, 322, 327, 328, 329 y 330 tienen recetas SODAL persistidas, versionadas, separadas por variante y documentadas; siguen pendientes de prueba física.
- **P2 siguiente:** 316, 319–326 y 331–334, 336: pedir ficha o pauta primaria; no completar por inferencia.

## Regla para cerrar una línea

Una línea se cierra como “Validada en taller” solo con receta persistida validada, `sourceType=workshop`, referencia/nombre de evidencia y prueba real aprobada. Si calcula pero no existe precio, mostrar “Precio pendiente”. Si solo tiene fuente documental, mostrar “Pauta documentada”. Los descuentos no informados permanecen pendientes.

## Evidencia remota de integridad

- Migraciones ejecutadas remotamente: `20260914120000_fabrication_recipe_provenance.sql`, `20260914142228_p1_workshop_recipe_evidence.sql` y `20260914153339_p2a_sodal_aluminum_recipes.sql` (además de cuatro migraciones históricas pendientes que estaban ausentes del historial remoto).
- Columnas verificadas: `source_name`, `source_revision`.
- RLS verificada activa en `fabrication_recipes` y `fabrication_recipe_tests`, con 3 policies por tabla.
- Conteo remoto de líneas activas en organización 39: 26, de las cuales 25 tienen `catalog_key` canónico y 1 (`id=437`) es histórica/no mapeada. Recetas activas: 31; pruebas activas: 1.
- La receta anterior de cada línea P2A quedó archivada con `parent_recipe_id` en la nueva versión; no se sobrescribió ni se eliminó historia. `organization_id=39` se conserva en las 10 recetas nuevas.
- Los checks remotos confirmaron columnas `source_name/source_revision`, `relrowsecurity=true`, códigos y fórmulas esperadas, `source_type=manufacturer`, `source_name=SODAL`, status `draft` y ausencia de pruebas físicas nuevas.
- La migración es idempotente por `organization_id + line_template_id + source_reference`: una segunda ejecución no crea otra versión ni cambia precios. No se modificaron códigos técnicos globales ni precios configurables.
