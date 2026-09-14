# Pauta de auditoría: 25 líneas de Fabricación

Fecha de corte remoto: 2026-09-14. Organización auditada: `organization_id=39`. La tabla cruza el catálogo persistido con la receta activa persistida. “Pauta documentada” significa referencia técnica de catálogo/documentación; no equivale a validación de taller. `evidenceLevel` se representa en el código como `validationStatus`.

## Criterio P0

1. No se cambian descuentos ni códigos técnicos.
2. Una receta existente no prueba procedencia de taller. `workshop_validated` exige `status=validated`, `sourceType=workshop` y referencia o nombre explícito de evidencia.
3. Los descuentos se describen como **persistidos** cuando hay un ajuste guardado; si falta la fuente o el ajuste, quedan pendientes.
4. Precio configurado = línea activa con precio por m² mayor que cero. Solo entonces `quotable=true`.
5. AL-32 conserva su receta actual, incluidos 3204 y 3205. Su composición exacta sigue pendiente; no se etiqueta como “Proyectante Normal estándar”.
6. Serie 4600 debe resolver `puerta_vaiven`; Andes Monorriel debe resolver `pvc_monorriel`. Metadata histórica incompatible no puede ganar al `catalogKey` canónico.
7. Esta pauta es interna y revisable. No es CNC, nesting, promesa de corte ni validación automática.

## Auditoría post-migración

| ID | Línea / sistema | Tipología canónica | Receta persistida | Pauta documentada | Validada en taller | Precio configurado | Estado técnico / evidencia | Descuentos persistidos | Prioridad |
|---:|---|---|---|---|---|---|---|---|---|
| 312 | Serie 5000 / L5000 | Corredera 2H | Sí · `draft`, `manual` | Sí · referencia Ventora | No | Sí · 80.000/m² | Calculable; evidencia `unverified` | 5005 -2; 5004 -2; 5006 -18; 5007 -18; 5001 0; 5002 0; 5003 -3 mm | P0: confirmar taller |
| 313 | Serie 20 / L20 | Corredera 2H | Sí · `draft`, `manual` | Sí · referencia Ventora | No | No · 0 | Precio pendiente; evidencia `unverified` | 2005 -2; 2004 -2; 2010 -27; 2019 -27; 2001 -12; 2002 -12; 2009 0 mm | P0: confirmar taller/precio |
| 314 | Serie 25 / L25 | Corredera 2H | Sí · `draft`, `manual` | Sí · referencia Ventora | No | No · 0 | Precio pendiente; evidencia `unverified` | 2505 0; 2504 0; 2510 -35; 2507 -35; 2501 -16; 2502 -16; 2509 0 mm | P0: confirmar taller/precio |
| 315 | AL-32 / Serie 32 | Proyectante · composición exacta pendiente | Sí · `validated`, `manual` · se conserva 3204/3205 | Sí · referencia de catálogo | No | Sí · 80.000/m² | Calculable; evidencia `unverified`; no es “Proyectante Normal estándar” | 3202 -2; 3208 -3; 3205 -1; 3201 0; 3204 -4 mm | P0: confirmar composición/taller |
| 316 | AM-35 | Puerta abatible y vaivén | Sí · propia, `draft` | No · base pendiente | No | No · 0 | Configuración técnica pendiente; evidencia `unverified` | Pendientes | P1 |
| 317 | AL-42 normal / Serie 42 | Proyectante | Sí · `draft`, `manual` | Sí · referencia Ventora | No | No · 0 | Precio pendiente; evidencia `unverified` | 4202 -18; 4229 -90; 4201 0 mm | P0: confirmar taller/precio |
| 318 | Serie 4800 | Corredera 2H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 319 | Óptima S28 2H | Corredera 2H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 320 | Óptima S28 3H | Corredera 3H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 321 | S-33 | Corredera 2H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 322 | S-33 RPT | Corredera 2H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 323 | Serie 42 cámara | Proyectante | Sí · 2 recetas `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 324 | Serie 42 sin cámara | Proyectante | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 325 | S-38 | Proyectante | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 326 | S-38 RPT | Proyectante | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 327 | MultiSlide S83 4H | Corredera 4H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P2 |
| 328 | MultiSlide S83 8H | Corredera 8H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P2 |
| 329 | Serie 3200 | Puerta abatible | Sí · `draft`, `manual` | Sí · referencia de catálogo | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 330 | Serie 4600 | `puerta_vaiven` | Sí · `draft`; receta persistida histórica no compatible | Sí · catálogo/arquetipo canónico | No | No · 0 | Identidad de receta pendiente; no usar como corredera | Pendientes | P0: revisar identidad |
| 331 | WinHouse New S75 doble riel | PVC corredera 2H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P2 |
| 332 | WinHouse New S75 triple riel | PVC corredera 3H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P2 |
| 333 | WinHouse S60 | PVC abatible | Sí · 2 recetas `draft`, `manual` | Sí · base tipológica | No | No · 0 | Elegir variante y probar; evidencia `unverified` | Pendientes | P1 |
| 334 | WinHouse Andes doble riel | PVC corredera 2H | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P1 |
| 335 | WinHouse Andes Monorriel | `pvc_monorriel` | Sí · `draft`; metadata histórica `pvc_corredera_2h` no prevalece | Sí · catálogo/arquetipo canónico | No | No · 0 | Identidad canónica pendiente de completar; evidencia `unverified` | Pendientes; PL-SLA solo referencia | P0: revisar identidad |
| 336 | WinHouse Andes proyectante | PVC proyectante | Sí · `draft`, `manual` | Sí · base tipológica | No | No · 0 | Precio pendiente; evidencia `unverified` | Pendientes | P2 |

## Orden de arreglo

- **P0:** 312, 313, 314, 315 y 317: pedir confirmación explícita de taller y precio real. AL-32 conserva la receta y 3204/3205; confirmar composición antes de nombrarla estándar. 330 y 335: mantener identidad canónica por catálogo y revisar la receta persistida sin sobrescribirla ni alterar códigos/descuentos.
- **P1:** 316, 318–326, 329 y 333–334: pedir ficha o pauta del taller; no completar por inferencia.
- **P2:** 327–328, 331–332 y 336: mantener como líneas comerciales sin prometer Fabricación hasta contar con datos verificables.

## Regla para cerrar una línea

Una línea se cierra como “Validada en taller” solo con receta persistida validada, `sourceType=workshop`, referencia/nombre de evidencia y prueba real aprobada. Si calcula pero no existe precio, mostrar “Precio pendiente”. Si solo tiene fuente documental, mostrar “Pauta documentada”. Los descuentos no informados permanecen pendientes.

## Evidencia remota de integridad

- Migración ejecutada: `20260914120000_fabrication_recipe_provenance.sql`.
- Columnas verificadas: `source_name`, `source_revision`.
- RLS verificada activa y con 3 policies en `cotizacion_line_templates`, `fabrication_recipes` y `fabrication_recipe_tests`.
- Conteos remotos post-migración de la organización auditada: 25 líneas activas, 28 recetas activas y 1 prueba activa. Conteos globales activos: 363 líneas, 320 recetas y 15 pruebas.
- Fingerprints deterministas post-migración (`md5(string_agg(to_jsonb(row)::text, '|' order by id))`): organización 39 = líneas `ee1257e875e351986db61a8b51a7ce74`, recetas `e2efefd7a63f339b15eba5aa71cb1381`, pruebas `ac3368322f7654e2041766de0c10132a`; global = líneas `71526892b83b8eda936a339d65c3dadf`, recetas `d395ebe774237b6929194019d796b6e9`, pruebas `de122e8c6ea70373345d97d57cf79afe`.
- La comparación contra el snapshot tomado antes de ejecutar la migración fue idéntica en conteos/fingerprints y `organization_id`; no hubo sobrescritura de recetas, descuentos ni códigos.
- La migración se aplicó remotamente con `db query --linked`. No se ejecutó `migration repair`: el historial remoto aún tiene migraciones anteriores pendientes y no se alteró para fabricar una marca de versión.
