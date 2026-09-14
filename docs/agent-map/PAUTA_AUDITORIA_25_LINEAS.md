# Pauta de auditoría: 25 líneas de Fabricación

Fecha de corte remoto: 2026-09-14. Organización auditada: `organization_id=39`. La tabla cruza las 25 líneas con `catalog_key` del catálogo canónico y la receta activa persistida. La línea activa histórica `id=437` sin `catalog_key` queda fuera de este mapa y debe clasificarse antes de incorporarse. “Pauta documentada” significa referencia técnica de catálogo/documentación; no equivale a validación de taller. `evidenceLevel` se representa en el código como `validationStatus`.

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
| 318 | Serie 4800 | Corredera 2H | Sí · 2 recetas v2/v3, `draft`, `manufacturer=SODAL`; v1 archivada | Sí · [Catálogo General SODAL 2018, p. 29](https://sodal.cl/wp-content/uploads/2024/03/catalogo_sodal.pdf), normal/reforzada | No · sin prueba física aportada | No · 0, configurable por taller | `calculable`; `documented`; fuente SODAL | 4801/4802 -16; 4803 0; 4804/4805 -15; 4806/4808 o 4810/4811 -32; vidrio -42/-93 | P2A: prueba física y cortes no publicados |
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
- **P2A completado documentalmente:** 318, 321, 322, 327, 328, 329 y 330 tienen recetas SODAL persistidas, versionadas, separadas por variante y documentadas; siguen pendientes de prueba física.
- **P2 siguiente:** 316, 319–326 y 331–334, 336: pedir ficha o pauta primaria; no completar por inferencia.

## Regla para cerrar una línea

Una línea se cierra como “Validada en taller” solo con receta persistida validada, `sourceType=workshop`, referencia/nombre de evidencia y prueba real aprobada. Si calcula pero no existe precio, mostrar “Precio pendiente”. Si solo tiene fuente documental, mostrar “Pauta documentada”. Los descuentos no informados permanecen pendientes.

## Evidencia remota de integridad

- Migraciones ejecutadas remotamente: `20260914120000_fabrication_recipe_provenance.sql`, `20260914142228_p1_workshop_recipe_evidence.sql` y `20260914153339_p2a_sodal_aluminum_recipes.sql` (además de cuatro migraciones históricas pendientes que estaban ausentes del historial remoto).
- Columnas verificadas: `source_name`, `source_revision`.
- RLS verificada activa en `fabrication_recipes` y `fabrication_recipe_tests`, con 6 policies en ambas tablas.
- Conteo remoto de líneas activas en organización 39: 26, de las cuales 25 tienen `catalog_key` canónico y 1 (`id=437`) es histórica/no mapeada. Recetas activas: 31; pruebas activas: 1.
- La receta anterior de cada línea P2A quedó archivada con `parent_recipe_id` en la nueva versión; no se sobrescribió ni se eliminó historia. `organization_id=39` se conserva en las 10 recetas nuevas.
- Los checks remotos confirmaron columnas `source_name/source_revision`, `relrowsecurity=true`, códigos y fórmulas esperadas, `source_type=manufacturer`, `source_name=SODAL`, status `draft` y ausencia de pruebas físicas nuevas.
- La migración es idempotente por `organization_id + line_template_id + source_reference`: una segunda ejecución no crea otra versión ni cambia precios. No se modificaron códigos técnicos globales ni precios configurables.
