# Giro de producto Ventora — Julio 2026

**Fecha:** 2026-08-13
**Audiencia:** agentes, producto, marketing, demos a piloto  
**Jerarquía:** documento rector de producto, subordinado a `AGENTS.md`

---

## 1. En una frase

Ventora es **software comercial para maestros, talleres y empresas de vidrio/aluminio/PVC**: cotizar desde celular, tablet o computador, mantener clientes y cotizaciones sincronizados, enviar PDF por WhatsApp y, de forma opcional, configurar **recetas de fabricación** que producen cubicación, despiece, tiras y una **pauta de corte revisable**. **No** es ERP, CAD ni optimizador industrial.

**Alcance comercial actualizado:** Ventora puede calcular precios comerciales por m² y, de forma separada, generar cubicación, despiece, tiras y pauta de corte a partir de recetas configuradas por cada empresa. La empresa define sus perfiles, reglas, largos y variantes; el taller debe validar los resultados con casos reales.

---

## 2. De dónde venimos → a dónde vamos

| Antes (percepción / deuda) | Ahora (dirección vigente) |
|---|---|
| “Cotizador técnico” o ERP chico | Cierre comercial + escritorio de taller |
| Partidas genéricas Marco/Hoja como si fueran tipologías | **Recetas de componentes reales** (riel, jamba, cabezal…) |
| Ampliar tipologías en el catálogo | Tipología de venta/composición en **constructor**; receta en **línea** |
| Una sola fórmula “oficial” por línea | Pack de **variantes** (herraje/cierre) por línea |
| Prometer cobertura ilimitada | Despiece de variantes enumeradas validado por el titular + variantes no cubiertas pendientes |
| Técnico mezclado en PDF cliente | PDF comercial limpio; **resumen fabricación** interno aparte |

---

## 3. Capas del producto (no mezclar)

1. **Cierre comercial** — cotización, PDF, WhatsApp, aprobación `/presupuesto/[token]`; es el núcleo del producto.
2. **Captación complementaria** — link/QR `/solicitud/[empresa]`, centralizar solicitudes cuando la empresa lo activa.
3. **Catálogo privado** — líneas y precios (`cotizacion_line_templates`).  
4. **Constructor** — tipologías/composiciones visuales complejas.  
5. **Cubicación / pauta de corte (opcional)** — recetas + snapshot; ayuda revisable para el taller, no promesa de máquina.

Cotizar **precio** no requiere cubicación.

---

## 4. Qué se implementó en Fase 4 V1 vendible (24-07-2026, base histórica)

La fuente vigente desde el 30-07-2026 es `fabrication_recipes` +
`fabrication_recipe_tests`, con selección de recetas `validated` y snapshot formal
en `cotizacion_items.fabricacion_snapshot`. `fabricationRecipePack`,
`fabricationRecipe` y `[cub:]` permanecen solo como lectura y compatibilidad
histórica. Ver `docs/agent-map/FEATURES_MAP.md` y `DATA_MODEL_MAP.md` antes de
modificar el contrato actual.

### Modelo

- `catalog_metadata.fabricationRecipePack` — pack de recetas/variantes.  
- `catalog_metadata.fabricationRecipe` — espejo de la activa/default (compatibilidad).  
- Por receta: `id`, `recipeVersion`, `aperturaTipo`, `herrajeTipo`, `herrajeLabel`, `isActive`, usage best-effort, componentes, barras, estados.  
- Migración automática legacy `fabricationRecipe` → pack de 1.  
- Bump de versión solo en el **primer** cambio después de `validada`.  
- Snapshot cotización `[cub:]` **v2** congela pauta + receta.

### Biblioteca comercial

| Tipo | Contenido | Copy de producto |
|---|---|---|
| Recetas de despiece validadas por el taller | L5000 corredera 2H, L20 corredera 2H, L12 Shower 2H, L32 proyectante Normal 1H, L42 proyectante Normal 1H; L25 SODAL/Zeta con 18 variantes | “Despiece validado” dentro de las variantes cubiertas; conservar pendientes separados de vidrio/accesorios cuando correspondan. |
| Bases tipológicas | Paño fijo, abatible, proyectante, puerta abatible, puerta corredera | “Base pendiente de validación del taller” |
| Propia | Estructura editable | El taller arma desde cero |

Pautas documentales universales añadidas desde el Catálogo SODAL 2026: Óptima S-28 2H/3H, S-38 RPT proyectante/fijo, Serie 3200 puerta abatible, Serie 4600 vaivén hidráulica y MultiSlide S-83 4H/8H. Producen cálculo cuando variante y vidrio son compatibles; siguen diferenciadas de una validación física del taller. S-33, S-33 RPT, 4800 y L20/L25 existentes se conservan. Ver matriz y límites en `docs/fabricacion/Sodal/INTEGRACION_SODAL_2026.md`.

Las recetas anteriores se resuelven de forma universal por código para cotizaciones nuevas. La confirmación de taller fue entregada por el titular; aplica solo a las tipologías y variantes enumeradas. L20 es solo corredera: no ofrecer paño fijo. L25 se mantiene como catálogo técnico SODAL/Zeta validado en sus 18 variantes, sin editar sus fórmulas.

### Wizard (Configuración → Líneas)

1. Datos básicos (precio).  
2. Uso: solo cotizar / estimación / cubicación y pauta.  
3. Fabricación: origen → tipología/herraje → perfiles → barras.  
4. Validación: “Validé esta receta para mi taller”.

### Cotización

- Tipología de la pieza ya elegida → filtra recetas compatibles.  
- 1 activa → se usa.  
- Varias activas → pedir solo **herraje / variante**.  
- Despiece + pauta + snapshot.  
- Barras = **distribución referencial**.

### Print interno

- Ruta: `/print/cotizaciones/[id]/fabricacion`  
- Enlace en detalle de cotización: “Resumen fabricación”.  
- Separado del PDF comercial del cliente.

### Archivos clave

```text
src/features/cotizaciones/line-templates/types/fabrication-recipe.ts
src/features/cotizaciones/line-templates/types/fabrication-recipe-commercial-templates.ts
src/features/cotizaciones/line-templates/types/fabrication-quote-summary.ts
src/features/cotizaciones/line-templates/services/fabrication-recipe.service.ts
src/features/cotizaciones/line-templates/components/fabrication-recipe-editor.tsx
src/features/cotizaciones/line-templates/components/line-template-form-wizard.tsx
app/print/cotizaciones/[id]/fabricacion/page.tsx
docs/agent-map/CUBICACION_PAUTA_HANDOFF.md
docs/manuales/MANUAL_LINEAS_CUBICACION_PAUTA.md
```

---

## 5. Madurez / go-to-market (orden cerrado)

1. Implementar motor multi-tipología + bases configurables ← **hecho**
2. Ampliar pruebas de otras variantes de L5000/L20 y calibrar líneas todavía sin cobertura
3. Obtener fórmulas reales para al menos paño fijo, abatible y puerta
4. Recién entonces promocionar “las fabricaciones más comunes”

La confirmación de taller para L5000, L20, L12, L32 y L42 aplica solo a las tipologías y variantes indicadas en esta guía; L25 mantiene su validación SODAL/Zeta completa. No generalizar estas validaciones a otras variantes ni a otras líneas.

### Catálogo prioritario desde investigación documental (2026-08-01)

Fuente de apoyo: `C:\Users\aless\OneDrive\Escritorio\deep-research-report.md`. Usar este reporte para decidir **qué nombres reconocer y en qué orden integrarlos**, no para deducir descuentos, cortes, cantidades ni fórmulas de cubicación.

**Aluminio de lanzamiento:** Serie 20, Serie 25, Serie 32, Serie 42, Serie 4800, Serie 5000 y Puerta 3200.

**Primeras recetas a validar, cuando haya casos reales:** Serie 20 dos hojas monolítico pierna abierta/cerrada/DVH; Serie 25 dos hojas monolítico pierna abierta/cerrada/DVH; Serie 32 fijo/proyectante; Serie 42 fijo/proyectante; Serie 4800 o 5000 dos hojas monolítico; Puerta 3200 una hoja.

**Aluminio de expansión:** Sodal 3800; Indalum S24 y S33 monolítico/DVH; X27; X43 ventana/puerta; X69 antepecho/piso a cielo; Plexa 49.

**PVC posterior:** DVP Aspen/Advance, Winhouse Sliding y Deceuninck SL/DL322. Winsa CD73/CD92, Veratec 7400/5200, Proline SLD70/SLD84 y Tehmco histórico quedan bajo demanda con manual o caso real aportado por el taller.

**Regla cerrada:** la biblioteca puede mostrar líneas reconocidas con estado, pero solo se marca como “Lista para cubicar” una receta validada con manual/pauta real y pruebas de taller. El reporte no habilita crear fórmulas.

---

## 6. Mensajes comerciales vigentes

- Principal: *“Cotiza desde el celular, envía un PDF profesional y deja de llegar a casa a hacer presupuestos.”*  
- Captación: *“Capturo leads mientras estoy ocupado o dormido…”*  
- Desktop taller: preparar cotización clara, catálogo propio, constructor si hace falta, y revisar cubicación, despiece, tiras y pauta de corte configurada.
- **No** vender Ventora como sistema de producción, inventario o CAD.

Para marketing: `AGENTS_MARKETING.md` + `docs/marketing/`.

---

## 7. Fuera de alcance (sigue congelado)

Inventario, ERP, IA de fórmulas, catálogo masivo de tipologías, optimización avanzada / nesting, historial navegable de versiones de receta, CRM/Kanban genérico, roles/equipos, `oportunidades`/`cobros`.

---

## 8. Dónde leer más

| Documento | Para qué |
|---|---|
| `AGENTS.md` | Reglas y estado operativo para agentes |
| `docs/agent-map/CUBICACION_PAUTA_HANDOFF.md` | Pegar a otra IA (cubicación) |
| `docs/manuales/MANUAL_LINEAS_CUBICACION_PAUTA.md` | Manual corto para taller |
| `docs/agent-map/FEATURES_MAP.md` | Archivos críticos por feature |
| `docs/ventora-master-brief.md` | Brief ejecutivo producto |
