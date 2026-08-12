# Giro de producto Ventora — Julio 2026

**Fecha:** 2026-07-24  
**Audiencia:** agentes, producto, marketing, demos a piloto  
**Jerarquía:** subordinado al roadmap `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md`

---

## 1. En una frase

Ventora es **software comercial para talleres de vidrios/aluminio/PVC**: cotizar y cerrar desde el celular, preparar mejor desde desktop, catálogo de precios propio, constructor visual cuando hace falta, y —opcionalmente— **receta de fabricación** que produce **tiras** y una **pauta sugerida** revisable. **No** es ERP, CAD ni optimizador óptimo de cortes.

---

## 2. De dónde venimos → a dónde vamos

| Antes (percepción / deuda) | Ahora (dirección vigente) |
|---|---|
| “Cotizador técnico” o ERP chico | Cierre comercial + escritorio de taller |
| Partidas genéricas Marco/Hoja como si fueran tipologías | **Recetas de componentes reales** (riel, jamba, cabezal…) |
| Ampliar tipologías en el catálogo | Tipología de venta/composición en **constructor**; receta en **línea** |
| Una sola fórmula “oficial” por línea | Pack de **variantes** (herraje/cierre) por línea |
| Prometer fabricaciones universales | **Plantillas iniciales sugeridas** + bases pendientes; validar con piloto |
| Técnico mezclado en PDF cliente | PDF comercial limpio; **resumen fabricación** interno aparte |

---

## 3. Capas del producto (no mezclar)

1. **Captación** — link/QR `/solicitud/[empresa]`, centralizar leads.  
2. **Cierre comercial** — cotización, PDF, WhatsApp, aprobación `/presupuesto/[token]`.  
3. **Catálogo privado** — líneas y precios (`cotizacion_line_templates`).  
4. **Constructor** — tipologías/composiciones visuales complejas.  
5. **Cubicación / pauta (opcional)** — recetas + snapshot; ayuda al taller, no promesa de máquina.

Cotizar **precio** no requiere cubicación.

---

## 4. Qué se implementó en Fase 4 V1 vendible (24-07-2026)

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
| Plantillas iniciales sugeridas | L5000, L20, L25 corredera caracol | “Plantilla inicial sugerida por Ventora. Revísala y valídala…” |
| Bases tipológicas | Paño fijo, abatible, proyectante, puerta abatible, puerta corredera | “Base pendiente de validación del taller” |
| Propia | Estructura editable | El taller arma desde cero |

Las plantillas **no** son líneas del listado del catálogo: se eligen en el wizard de la línea, paso **Fabricación → origen**.

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
2. Probar las 3 correderas (L5000/L20/L25) con medidas reales de taller  
3. Obtener fórmulas reales para al menos paño fijo, abatible y puerta  
4. Recién entonces promocionar “las fabricaciones más comunes”

Hasta (2)+(3): marketing y demos deben decir **plantillas iniciales / bases pendientes**, nunca “verificadas” ni “listas para cualquier taller”.

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
- Desktop taller: preparar cotización clara, catálogo propio, constructor si hace falta, pauta interna opcional.  
- **No** vender Ventora como sistema de producción, inventario o CAD.

Para marketing: `AGENTS_MARKETING.md` + `docs/marketing/`.

---

## 7. Fuera de alcance (sigue congelado)

Inventario, ERP, IA de fórmulas, catálogo masivo de tipologías, optimización avanzada / nesting, historial navegable de versiones de receta, CRM/Kanban genérico, roles/equipos, `oportunidades`/`cobros`.

---

## 8. Dónde leer más

| Documento | Para qué |
|---|---|
| `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md` | Rector de desktop / fases |
| `AGENTS.md` | Estado operativo para agentes |
| `docs/agent-map/CUBICACION_PAUTA_HANDOFF.md` | Pegar a otra IA (cubicación) |
| `docs/manuales/MANUAL_LINEAS_CUBICACION_PAUTA.md` | Manual corto para taller |
| `docs/agent-map/FEATURES_MAP.md` | Archivos críticos por feature |
| `docs/ventora-master-brief.md` | Brief ejecutivo producto |
