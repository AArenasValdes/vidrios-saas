# Integración de pautas SODAL 2026

**Fecha:** 2026-10-07  
**Alcance:** recetas compartidas en código para cotizaciones nuevas de todas las organizaciones. No se escribieron recetas en Supabase ni se modificaron snapshots históricos.

## Matriz de cobertura

| Identidad Ventora | Fuente | Variantes cubiertas | Estado de la evidencia |
|---|---|---|---|
| Óptima S-28 — corredera 2 hojas | Catálogo SODAL 2026, p. 23 | Termopanel 20 mm | Pauta completa de perfiles, vidrio y quincallería; respetar la composición de vidrio publicada. |
| Óptima S-28 — corredera 3 hojas | Catálogo SODAL 2026, p. 23 | Termopanel 20 mm | Pauta completa de perfiles, vidrio y quincallería; respetar la composición de vidrio publicada. |
| S-38 RPT — proyectante | Catálogo SODAL 2026, p. 29 | Proyectante | Pauta completa de perfiles, vidrio y accesorios. Solo compatible con termopanel según la ficha. |
| S-38 RPT — paño fijo | Catálogo SODAL 2026, p. 29 | Junquillo S383 o S387 | La ficha publica dos perfiles alternativos con la misma fórmula. Se presentan como variantes explícitas; no se suman entre sí. |
| Serie 3200 — puerta abatible 1 hoja | Catálogo SODAL 2026, p. 7 | Bastidor 3221 o 3225 | Pautas separadas de perfil y vidrio. No se infiere equivalencia entre etiquetas L/ST/TP y códigos de bastidor. |
| Serie 4600 — puerta vaivén | Catálogo SODAL 2026, p. 9 | Quicio hidráulico MAB | Perfiles y vidrio publicados. La ficha no declara cantidad ni SKU de quincallería MAB; queda pendiente y no se inventa una unidad. La alternativa mecánica de una fuente anterior no se ofrece como variante universal. |
| MultiSlide S-83 | Catálogo SODAL 2026, p. 31 | 4 hojas y 8 hojas | Reglas separadas por número de hojas, vidrio y accesorios. |

Las líneas S-33, S-33 RPT y Serie 4800 ya tenían fixtures y resolución de cotización; no se duplicaron. Línea 25, L20 y las otras recetas confirmadas previamente permanecen intactas.

## Reglas de alcance

- Estas recetas son globales en el código Ventora y aplican a cotizaciones nuevas aunque la organización conserve un borrador genérico automático. Solo se sustituye esa precarga identificada por `base-ventora:` o `ventora-arquetipo:`; una receta propia o validada conserva prioridad. Las nuevas precargas se guardan con fuente SODAL 2026.
- Las fórmulas documentadas pueden calcular despiece y pauta. Su estado no certifica una prueba física del taller. Las recetas nuevas permanecen en `testing` hasta validación correspondiente.
- La pauta S-28 solo publica Termopanel 20 mm. Si la cotización declara otro vidrio, no se aplica ese cálculo.
- La pauta S-38 RPT está publicada para termopanel; paño fijo exige elegir junquillo S383 o S387.
- Serie 3200 exige escoger bastidor 3221 o 3225 si hay más de una alternativa compatible.
- El catálogo de origen no proporciona SKU de compra del taller ni confirma los largos comerciales. Los SKU quedan pendientes y los 6.000 mm son el preset Ventora, no una medida atribuida al proveedor.

## Fuentes excluidas

- S-38 sin RPT: no se incorpora como completo; la pauta consultada conserva ambigüedades de perfiles/alternativas y no entrega una pauta fija completa.
- El kit Shower Door de acero inoxidable no reemplaza la receta de aluminio de Línea 12.
- No se crean equivalencias entre S-3200 y Línea 32, ni entre S-4600 y Línea 45.

## Implementación

- Fixture exacto del Catálogo SODAL 2026: `src/features/fabricacion/fixtures/sodal-catalogo-2026-recipes.ts`.
- Variantes existentes de 3200, 4600 y S-83 conectadas a fallback global; MultiSlide S-83 actualizado a las medidas de la ficha 2026.
- Resolución universal: `src/features/fabricacion/services/fabricacion-receta-universal-fallback.service.ts` y `src/features/fabricacion/services/fabricacion-despiece-cotizacion.service.ts`.
- Las recetas estructurales automáticas de S-28 y S-38 RPT se generan desde la pauta documental, no desde arquetipos sin descuentos.
- Las líneas SODAL cubiertas se muestran bajo el grupo **SODAL** del catálogo de proveedores, separadas de las diez líneas universales. Las filas antiguas sin proveedor toman esta identidad solo para agruparse en pantalla; no se reescribe el proveedor ni el precio guardado.

## Edición por taller

- Las fórmulas de S-28, S-38 RPT, S-83, Serie 3200, Serie 4600 hidráulica MAB, S-33, S-33 RPT y Serie 4800 se precargan desde código en **Configuración del sistema**, junto a la composición de hojas. Código, función, base de medida y ajuste son visibles con la variante seleccionada.
- No hay una acción para cargar la base: la variante ya está seleccionada y lista para revisar o editar. Abrir Fabricación no escribe en Supabase; al guardar cambios, el taller conserva su propia receta sin modificar la referencia SODAL compartida.
- L25 conserva sus 18 variantes Zeta y su flujo existente; L20 y las demás recetas confirmadas tampoco se sustituyen por estas sugerencias.
