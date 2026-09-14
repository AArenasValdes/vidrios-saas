# Pauta de auditoría: 25 líneas de Fabricación

Fecha de corte remoto: 2026-09-14. Organización auditada: `organization_id=39`. La tabla cruza el catálogo persistido con la receta activa persistida. “Pauta documentada” significa referencia técnica de catálogo/documentación; no equivale a validación de taller. `evidenceLevel` se representa en el código como `validationStatus`.

## Criterio P0

1. No se cambian descuentos ni códigos técnicos.
2. Una receta existente no prueba procedencia de taller. `workshop_validated` exige `status=validated`, `sourceType=workshop` y referencia o nombre explícito de evidencia.
3. Los descuentos se describen como **persistidos** cuando hay un ajuste guardado; si falta la fuente o el ajuste, quedan pendientes.
4. Precio configurado = línea activa con precio por m² mayor que cero. Solo entonces `quotable=true`.
5. AL-32 conserva sus perfiles actuales, incluidos 3204 y 3205. La nueva versión de taller solo confirma 3201/3202; la composición exacta sigue pendiente. No se etiqueta como “Proyectante Normal estándar”.
6. Serie 4600 debe resolver `puerta_vaiven`; Andes Monorriel debe resolver `pvc_monorriel`. Metadata histórica incompatible no puede ganar al `catalogKey` canónico.
7. Esta pauta es interna y revisable. No es CNC, nesting, promesa de corte ni validación automática.

## Auditoría post-migración

| ID | Línea / sistema | Tipología canónica | Receta persistida | Pauta documentada | Validada en taller | Precio configurado | Estado técnico / evidencia | Descuentos persistidos | Prioridad |
|---:|---|---|---|---|---|---|---|---|---|
| 312 | Serie 5000 / L5000 | Corredera 2H | Sí · `draft`, `workshop` | Sí · referencia Ventora + fuente taller P1 | No · evidencia parcial, no prueba física completa | Sí · 80.000/m² | Calculable; `unverified`; receta y ajustes persistidos | 5005 -2; 5004 -2; 5006 -18; 5007 -18; 5001 0; 5002 0; 5003 -3 mm | P1: adjuntar comprobación física completa |
| 313 | Serie 20 / L20 | Corredera 2H | Sí · `draft`, `workshop` | Sí · referencia Ventora + fuente taller P1 | No · evidencia parcial, no prueba física completa | No · 0 | Calculable; `unverified`; receta y ajustes persistidos | 2005 -2; 2004 -2; 2010 -27; 2019 -27; 2001 -12; 2002 -12; 2009 0 mm | P1: adjuntar comprobación física y precio |
| 314 | Serie 25 / L25 | Corredera 2H | Sí · `draft`, `workshop` | Sí · referencia Ventora + fuente taller P1 | No · evidencia parcial, no prueba física completa | No · 0 | Calculable; `unverified`; receta y ajustes persistidos | 2505 0; 2504 0; 2510 -35; 2507 -35; 2501 -16; 2502 -16; 2509 0 mm | P1: adjuntar comprobación física y precio |
| 315 | AL-32 / Serie 32 | Proyectante · composición exacta pendiente | Sí · v2 `review_required`, `workshop`; v1 archivada; conserva 3204/3205 | Sí · referencia de catálogo + marco/hoja confirmados por taller | No · evidencia parcial | Sí · 80.000/m² | Calculable; `unverified`; no es “Proyectante Normal estándar” | 3201 0; 3202 -21 confirmados; 3208 -3, 3205 -1, 3204 -4 persistidos sin validar | P1: confirmar vidrio, accesorios y composición completa |
| 316 | AM-35 | Puerta abatible y vaivén | Sí · propia, `draft` | No · base pendiente | No | No · 0 | Configuración técnica pendiente; evidencia `unverified` | Pendientes | P1 |
| 317 | AL-42 normal / Serie 42 | Proyectante | Sí · `draft`, `workshop` | Sí · referencia Ventora + marco/hoja confirmados por taller | No · evidencia parcial | No · 0 | Calculable; `unverified`; precio pendiente | 4201 0; 4202 -17 confirmados; 4229 -90 persistido sin validar | P1: confirmar vidrio, accesorios y precio |
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

- **P0:** 330 y 335: mantener identidad canónica por catálogo y revisar la receta persistida sin sobrescribirla ni alterar códigos/descuentos.
- **P1:** 312, 313, 314, 315 y 317: incorporar comprobación física completa, vidrio/accesorios y precio donde falte. AL-32 conserva 3204/3205; confirmar composición antes de nombrarla estándar. AL-42 usa -17 mm para esta receta de taller; la referencia externa histórica -18 mm queda trazada, no aplicada.
- **P1 siguiente:** 316, 318–326, 329 y 333–334: pedir ficha o pauta del taller; no completar por inferencia.
- **P2:** 327–328, 331–332 y 336: mantener como líneas comerciales sin prometer Fabricación hasta contar con datos verificables.

## Regla para cerrar una línea

Una línea se cierra como “Validada en taller” solo con receta persistida validada, `sourceType=workshop`, referencia/nombre de evidencia y prueba real aprobada. Si calcula pero no existe precio, mostrar “Precio pendiente”. Si solo tiene fuente documental, mostrar “Pauta documentada”. Los descuentos no informados permanecen pendientes.

## Evidencia remota de integridad

- Migraciones ejecutadas: `20260914120000_fabrication_recipe_provenance.sql` y `20260914142228_p1_workshop_recipe_evidence.sql`.
- Columnas verificadas: `source_name`, `source_revision`.
- RLS verificada activa y con 3 policies en `cotizacion_line_templates`, `fabrication_recipes` y `fabrication_recipe_tests`.
- Conteos remotos post-P1 de la organización auditada: 25 líneas activas, 28 recetas activas y 1 prueba activa; incluyendo archivados: 26 líneas, 29 recetas y 1 prueba. Conteos globales activos: 363 líneas, 320 recetas y 15 pruebas.
- Fingerprints deterministas post-P1 (`md5(string_agg(to_jsonb(row)::text, '|' order by id))`), incluyendo filas no eliminadas: organización 39 = líneas `57527753f24efa4be6ddd51db8313dbb`, recetas `22ac33fb018611689369295466bd432b`, pruebas `ac3368322f7654e2041766de0c10132a`.
- La segunda ejecución de la migración produjo los mismos conteos y fingerprints. `organization_id` intacto. Serie 5000/20/25 no tuvo cambios en definition, descuentos ni códigos. AL-32 versionó y archivó la receta anterior; AL-42 cambió solo 4202 de -18 a -17 por evidencia directa de taller.
- La migración se aplicó remotamente con `db query --linked`. No se ejecutó `migration repair`: el historial remoto aún tiene migraciones anteriores pendientes y no se alteró para fabricar una marca de versión.
