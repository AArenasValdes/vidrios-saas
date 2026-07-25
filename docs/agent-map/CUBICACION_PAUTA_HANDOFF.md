# Handoff autocontenido — Cubicación y pauta (Ventora)

**Fecha:** 2026-07-24  
**Para:** IA web / ChatGPT / Claude / Gemini / agente sin acceso al repo  
**Cómo usar:** copia **TODO este archivo** y pégalo en el chat. No necesita abrir otros archivos.  
**Idioma de respuesta esperado:** español.

---

## INSTRUCCIÓN PARA LA IA (léela primero)

Eres un asesor/implementador de producto y UX para **Ventora**, software comercial para talleres de vidrios, aluminio y PVC.

Este documento es tu **única fuente de verdad** sobre cubicación, pauta de cortes, catálogo de líneas y constructor.  
Si el usuario te pide algo que contradiga este handoff, **explícalo y recomienda seguir el modelo de recetas**, no inventes un ERP técnico.

Reglas:
1. Responde en español, claro y accionable.
2. No asumas acceso a GitHub, rutas locales ni código.
3. No propongas nesting, CAD libre, optimizador de barras, inventario, fabricación automática ni CRM/Kanban.
4. No propongas ampliar el selector de “partida” con tipologías (bow, abatible ventana, proyectante, etc.).
5. Distingue siempre: **precio (línea)** ≠ **estimación (partida)** ≠ **tipología (constructor)**.
6. L5000 / L20 / L25 = **“Plantillas iniciales sugeridas”**, no “verificadas”, hasta probar fabricaciones reales.
7. Abatible / proyectante / puertas / paño fijo como base = **“Base pendiente de validación del taller”** — no vender como cubicación lista sin fórmulas validadas.
8. En cotización: filtrar por tipología ya elegida en la pieza; pedir solo herraje/variante si hay varias recetas activas.

---

## 1. Qué es Ventora (contexto mínimo)

Ventora ayuda a talleres a:
- cotizar desde celular y desktop,
- enviar PDF profesional por WhatsApp,
- ordenar clientes / obras / cotizaciones,
- usar un **catálogo privado de líneas y precios**,
- configurar visualmente trabajos no estándar (constructor),
- opcionalmente estimar materiales con una **pauta revisable** (no fabricación automática).

Promesa comercial vigente:  
**“Cotiza desde el celular, envía un PDF profesional y deja de llegar a casa a hacer presupuestos.”**

Ventora **no** es:
- ERP,
- cotizador técnico universal,
- sistema de producción,
- AutoCAD,
- optimizador de cortes.

---

## 2. Decisión vigente: Recetas de fabricación (2026-07-24)

**Supersede Camino 2** respecto a “solo 3 partidas genéricas Marco/Hoja”.

El modelo de cubicación pasa a **recetas de componentes reales** (riel, jamba, cabezal, zócalo, pierna, traslapo, etc.) con reglas de corte guiadas. Las 3 partidas V1 quedan como **compatibilidad/migración** al leer líneas antiguas.

**V1 vendible multi-tipología (2026-07-24):**
- Pack `fabricationRecipePack` en metadata (variantes por línea); `fabricationRecipe` espeja la activa/default.
- Identidad: material + línea + tipología + hojas + módulos + `aperturaTipo` + `herrajeTipo` (+ `herrajeLabel` si otro) + variante.
- Wizard: Usar plantilla sugerida | Partir de base tipológica | Configurar propia.
- Plantillas L5000/L20/L25 = iniciales sugeridas (corredera caracol), no verificadas.
- Bases tipológicas (paño fijo, abatible, proyectante, puertas) = pendientes, sin mm inventados.
- Cotización: no re-pide tipología; pide herraje/variante solo si hay varias activas compatibles.
- Versionado: bump solo en el **primer** cambio post-`validada`; snapshot protege cotizaciones.
- Resumen fabricación interno: `/print/cotizaciones/[id]/fabricacion` (separado del PDF cliente).
- FFD = “Distribución referencial de barras”.

| Capa | Rol | Obligatorio para cotizar |
|---|---|---|
| **Línea del catálogo** | Precio comercial | Sí (datos básicos) |
| **Receta de fabricación** | Componentes reales + reglas por línea/variante | No (solo si el taller activa cubicación) |
| **Constructor visual** | Tipología / composición geométrica | Solo si el trabajo es visual/complejo |
| **Pauta en la cotización** | Cortes por perfil + snapshot histórico (v2) | No |

### Mejor solución

1. Cotizar con precio **no requiere** cubicación.
2. Tipo de fabricación → plantilla sugerida / base tipológica / propia editable.
3. El taller vincula perfiles y valida con un trabajo real (“Validé esta receta para mi taller”).
4. Tipologías complejas → **constructor**; la **receta** define cortes.
5. No abrir optimizador / nesting / CAD / ERP técnico. La distribución de barras es **referencial**.
6. No promocionar “fabricaciones más comunes” hasta validación real de correderas + fórmulas de otras tipologías.

---

## 2b. Decisión anterior: Camino 2 (2026-07-19) — histórica

Problema que vimos en producto:  
el campo “Sistema que fabrica” parecía un catálogo de tipologías (bow, abatibles, etc.), pero en realidad solo alimenta una **estimación V1**. Eso abruma a los maestros.

### Decisión (histórica; reemplazada por recetas)

| Capa | Rol | Obligatorio para cotizar |
|---|---|---|
| **Línea del catálogo** | Precio comercial (nombre, m², mínimo, redondeo, activa) | Sí (precio/datos básicos) |
| **Partida de estimación V1** | Patrón opcional de cálculo de materiales (solo 3 bases) | No |
| **Constructor visual** | Tipología / composición real de la pieza | Solo si el trabajo es visual/complejo |
| **Pauta en la cotización** | Tabla revisable de materiales por pieza + snapshot histórico | No |

### Mejor solución (la que debes defender)

1. Cotizar con precio **no requiere** cubicación.
2. Mantener **solo 3 partidas** de estimación.
3. Tipologías complejas → **constructor**, no al catálogo.
4. “Personalizado” → pauta en **borrador manual**, nunca plantilla automática de línea.
5. No abrir optimizador / nesting / CAD / ERP técnico.

### Lo que NO es la “Partida de estimación”

- No es el tipo de ventana que vende el taller.
- No es un campo de marketing tipo “Sistema: Corredera”.
- No es el constructor visual.
- No promete cortes listos para máquina ni manual técnico universal.

---

## 3. Flujo completo (explica esto si preguntan “cómo funciona”)

```text
A) Catálogo privado (configuración)
   Ruta: Configuración → Empresa → Catálogo / Líneas y precios
   1. Crear línea: nombre, precio, mínimo, redondeo (esto alcanza para cotizar)
   2. Uso: Solo cotizar | Estimación | Cubicación y pauta
   3. Fabricación — primero ORIGEN (arriba en UI):
      - Plantilla inicial sugerida (L5000 / L20 / L25 corredera caracol) — NO verificada
      - Base tipológica (paño fijo, abatible, proyectante, puertas) — pendiente de taller
      - Configurar propia
   4. Tipología + herraje + hojas → perfiles (códigos reales) → barras referenciales
   5. Validar: “Validé esta receta para mi taller”
   Nota: las plantillas NO son filas del listado de 21 líneas; se eligen al editar Fabricación.
   Pack: varias variantes (herraje) por línea en fabricationRecipePack.

B) Cotizar (Quote Studio desktop)
   1. Tipología de la pieza (ventana corredera, etc.) — ya elegida
   2. Línea del catálogo (precio)
   3. Constructor si la composición es compleja
   4. Medidas → panel Cubicación y pauta
   5. Si varias recetas activas compatibles → pedir solo herraje/variante
   6. Guardar → snapshot [cub:] v2 (congela pauta + receta)

C) Ajuste y documentos
   - Editar pauta solo esta cotización; opcional guardar ajuste a la línea
   - Pauta consolidada de la cotización
   - Barras = “Distribución referencial de barras” (no optimizador)
   - Resumen fabricación interno: /print/cotizaciones/[id]/fabricacion
   - PDF cliente: comercial, sin técnico
```

Giro de producto completo: `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`.

### Preguntas típicas del usuario → respuesta correcta

| Pregunta | Respuesta |
|---|---|
| ¿Cuánto cobro? | Precio de la **línea** (+ mínimo/redondeo) |
| ¿Es bow / abatible / proyectante? | Se arma en el **constructor**, no en la receta de catálogo |
| ¿Cuánto material estimo? | **Receta de fabricación** + pauta (opcional) |
| ¿Por qué dice Por asignar en Perfil? | Falta código real del taller; la función (Riel/Jamba…) sí está |
| ¿Si cambio la línea después, cambia una cotización vieja? | No: la pauta histórica queda congelada en snapshot v2 |

---

## 4. Las 3 partidas V1 (únicas)

Estas son las **únicas** partidas permitidas hoy:

| ID interno | Nombre en UI | Qué asume al estimar |
|---|---|---|
| `pano_fijo` | Paño fijo | Marco exterior + vidrio; sin lógica de 2 hojas |
| `corredera_2_hojas` | Corredera 2 hojas | Riel/jamba, hoja, encuentro; vidrio por hoja; 2 hojas |
| `puerta_abatible_1_hoja` | Puerta abatible 1 hoja | Marco + hoja + junquillo/zócalo; 1 hoja |

### Qué precarga cada partida (concepto)

Al elegir partida, el sistema sugiere:
- nombres/roles de perfil (marco/riel, hoja, encuentro, junquillo, zócalo, accesorio),
- descuentos típicos en mm (vano → vidrio / hoja),
- cantidad de hojas de muestra,
- modo de pauta (`marco` o `marco_hojas`).

El taller puede editar esos valores. No son “verdad absoluta”.

### NO agregar (salvo decisión explícita de producto + piloto real)

- Bow window
- Abatible de ventana
- Proyectante
- Oscilobatiente
- Corredera 3/4 hojas
- Guillotina
- Celosía
- Cualquier tipología “porque falta en el combo”

Esas tipologías se resuelven en el **constructor visual** al cotizar.

---

## 5. Estados de la estimación

| Estado | Significado |
|---|---|
| `sin_configurar` | Hay algo, pero no está listo |
| `lista_para_probar` | Se puede probar en cotización con aviso |
| `en_calibracion` | El taller está ajustando con ejemplos reales |
| `validada` | Se usa sin advertencia fuerte |
| `revisar_cambios` | Cambió algo después de validar → hay que revisar |

Regla UX: solo **Validada** se trata como confiable. El resto muestra pauta **referencial**.

---

## 6. Qué guarda el sistema (contrato de datos, sin código)

### A) Línea del catálogo

Tabla conceptual: `cotizacion_line_templates`  
Campos comerciales típicos:
- nombre, categoría (aluminio/pvc/vidrio/…),
- unidad de cobro (m², ml, unidad, valor manual),
- material (Aluminio/PVC/Cristal),
- precio, costo opcional, mínimo, redondeo,
- proveedor, vigencias,
- activa sí/no.

Dentro de un JSON `catalog_metadata` (sin tablas técnicas nuevas) viven keys planas como:

**Estimación**
- `estimationEnabled` (bool)
- `estimationMode` (`vidrio` | `marco_simple` | `marco_hojas`)
- factores de marco/hojas/accesorios

**Partida**
- `cubicationSystem` = una de las 3 partidas
- `cubicationStatus` = uno de los estados

**Perfiles por rol (texto del taller)**
- `profileFrame`, `profileSash`, `profileMeeting`
- `profileGlazingBead`, `profileSill`, `profileAccessory`

**Descuentos mm**
- marco horizontal/vertical
- hoja horizontal/vertical
- vidrio ancho/alto

**Pauta demo / corte referencial**
- `cuttingEnabled`
- `cuttingMode` (`sin_corte` | `marco` | `marco_hojas`)
- largo de barra mm, kerf/disco mm, cantidad de hojas muestra

**Importante:**  
existe también un texto comercial opcional tipo “Sistema” (`lineSystem`, ej. “Corredera”).  
Eso **no** es `cubicationSystem`. No los mezcles.

### B) Snapshot por pieza de cotización

Cuando se guarda una pieza con pauta:
- se congela un snapshot en las observaciones del ítem,
- formato conceptual: prefijo `[cub:]` + JSON compactado,
- objetivo: si mañana cambian la línea del catálogo, **no se reescribe** la cotización histórica.

### C) Constructor visual

- Guarda la composición/tipología de la pieza (módulos, divisiones, tipos de hoja, personalizado, etc.).
- Puede vivir en config visual del ítem + bridge `[gvc:…]` como respaldo.
- **No** redefine `cubicationSystem`.

---

## 7. Pauta de cortes — qué produce y qué NO promete

La pauta revisable muestra, por pieza:
- filas: **Perfil / Función / Medida mm / Cantidad / Total lineal**
- vidrio estimado (m² / medidas)
- ml de perfiles
- accesorios
- barras y sobrante **solo como referencia**

### SÍ es
- ayuda interna para el maestro,
- estimativa y editable,
- usable para conversar materiales sin costear todavía.

### NO es
- optimizador de pérdida,
- nesting de vidrio,
- lista de corte CNC,
- promesa de desperdicio real de fábrica,
- fabricación automática.

Si el usuario pide “que optimice barras” o “que anide vidrios”:  
responde que está **fuera de alcance** de Fase 4 V1 / Camino 2.

---

## 8. Caso especial: Personalizado

Si la pieza es **Personalizado** (constructor a medida / flag Personalizado):

1. **No** usar la pauta automática de la línea del catálogo.
2. Sembrar un **borrador manual asistido**:
   - marco horizontal / vertical,
   - una fila “por definir”,
   - vidrio del vano.
3. El usuario edita a mano.
4. No ofrecer “Recalcular con plantilla” / “Restaurar” / “Guardar ajuste para esta línea” como si fuera plantilla automática.
5. Al guardar, el snapshot no debe caer al auto de catálogo.

Motivo: Personalizado no se parece a una partida fija; forzar auto miente al taller.

---

## 9. UX que debe sentirse (recetas)

### Modal “Nueva línea”

1. Primero: datos básicos + precio (esto basta para cotizar).
2. Banner claro: “Para cotizar basta con esto”.
3. Uso de línea: Solo cotizar / Estimación / Cubicación y pauta (apagado por defecto).
4. Si activan cubicación: tipo de fabricación → componentes reales + códigos de perfil del taller.
5. Validar con ejemplo real antes de tratar la pauta como confiable.
6. Tipologías complejas van en el constructor, no en el catálogo.

### Quote Studio (cotizar)

- Precio viene de la línea.
- Tipología visual del constructor.
- Cubicación/pauta aparece cuando hay línea con pauta + medidas.
- Perfil sin código real muestra **Por asignar**; la función (Riel, Jamba…) sí se muestra.
- Debe sentirse revisable / referencial, no “automática e infalible”.

### Principios UX para maestros
- Poco scroll / poca densidad al entrar.
- Opcional = realmente opcional.
- Un solo trabajo por bloque.
- Evitar jerga de ERP.
- No mostrar JSON, fórmulas ni variables libres.

---

## 10. Arquitectura mental del producto (para diseñar o codear)

```text
Cliente
  └─ Obra
      └─ Cotización
          └─ Piezas / componentes
              ├─ Línea catálogo → precio comercial
              ├─ Constructor → tipología / dibujo
              └─ Pauta/snapshot → materiales estimados (opcional)
```

Flujo técnico deseable (si hablan de implementación):
`pantalla → hook → service → repository → base de datos`

Multi-tenant:
- siempre filtrar por organización,
- soft delete con marca de eliminado (no borrar duro).

Legacy técnico dormido (no reactivar):
- materials, product_types, system_lines, formula_variables, quote_item_breakdown, etc.

---

## 11. Rutas / pantallas conceptuales

| Pantalla | Para qué |
|---|---|
| Configuración → Líneas y precios | Crear/editar líneas, precio, estimación opcional |
| Cotizaciones → Nueva (desktop) | Quote Studio: pieza, constructor, medidas, pauta |
| Cotización detalle / PDF | Cierre comercial (PDF/WhatsApp); la pauta es interna/revisable |

Mobile de cotización debe seguir funcionando; no “arreglar” desktop rompiendo móvil.

---

## 12. Qué puedes proponer (útil) vs qué no

### Sí puedes proponer
- Mejor copy para que maestros entiendan partida vs tipología.
- UX más simple del modal (menos campos visibles).
- Guías de calibración con ejemplos reales (mismas 3 partidas).
- Mejoras de pauta consolidada / texto copiable.
- Flujos de onboarding: “primero precio, después estimación”.
- Cómo explicar Camino 2 a un piloto.

### No debes proponer por inercia
- Añadir tipologías al selector de partida.
- Convertir catálogo en configurador técnico completo.
- Optimizador de barras / nesting / CAD.
- Inventario, compras, órdenes de fabricación.
- CRM, Kanban, roles, cobros, SII.
- “Motor de compatibilidades” de perfiles.

---

## 13. Respuestas modelo (úsalas si te preguntan esto)

### “¿Por qué hay tan pocos sistemas?”
Porque no son tipologías de venta. Son **3 partidas base** para estimar materiales. Bow, abatibles de ventana u otras composiciones se arman en el constructor al cotizar.

### “¿Cuál es la mejor solución?”
Camino 2: catálogo simple para precio; estimación opcional con 3 partidas; tipología compleja en constructor; pauta revisable sin prometer fabricación automática.

### “¿Cómo debería armarse el flujo ideal?”
1) Crear línea con precio.  
2) Cotizar.  
3) Si el taller quiere materiales, activar estimación y calibrar con un ejemplo real.  
4) Usar constructor cuando la pieza no cabe en una partida simple.  
5) Revisar pauta en la cotización y congelar snapshot.

### “¿Qué hago con abatibles / bow windows?”
No los metas al selector de partida.  
- Si es tipología visual/comercial: constructor.  
- Si algún día un piloto necesita estimar esa partida sin constructor: decisión de producto nueva, no inventarla ahora.

---

## 14. Checklist de comprensión (la IA debe poder marcar esto)

- [ ] Diferencio línea (precio) vs partida (estimación) vs constructor (tipología)
- [ ] Sé que solo hay 3 partidas V1 y por qué
- [ ] Sé que el snapshot evita reescribir cotizaciones viejas
- [ ] Sé que barras/sobrante son referencia, no optimizador
- [ ] Sé que Personalizado usa borrador manual
- [ ] Sé qué está fuera de alcance

---

## 15. Prompt listo para pegar (si quieres arrancar otro chat)

Copia desde la línea siguiente:

```text
Te pego un handoff autocontenido de Ventora sobre cubicación/pauta (Camino 2).
Úsalo como única fuente de verdad. No asumas acceso a mi repo.
Responde en español.
Objetivo de esta conversación: [ESCRIBE AQUÍ QUÉ NECESITAS]
Restricciones: no ampliar tipologías en el selector de partida; no proponer nesting/CAD/optimizador/ERP/CRM.
Primero confirma en 5 viñetas que entendiste Camino 2; después trabaja el objetivo.
```

Luego pega **todo este archivo** debajo.

---

## 16. Mini-glosario

- **Línea:** producto/precio del catálogo privado.
- **Partida de estimación:** patrón de cálculo V1 (fijo / corredera 2 hojas / puerta).
- **Constructor:** editor visual de composición/tipología.
- **Pauta:** tabla revisable de materiales/cortes referenciales.
- **Snapshot `[cub:]`:** pauta congelada histórica de una pieza.
- **Validada:** estimación confiable; otros estados = referencial.
- **Personalizado:** pieza a medida; pauta manual asistida.
- **Camino 2:** decisión de mantener estimación simple y tipología en el constructor.

## 15. QA smoke (2026-07-21)

- Credencial de prueba local: `admin@test.com` / `1234` (no `!1234`).
- Flujo OK: Líneas y precios → uso Cubicación y pauta → guardar → `/cotizaciones/nueva` → línea + medidas → Recalcular → Abrir despiece.
- Esperado: filas con **Función** real (Riel superior, Jamba, Cabezal…) y **Perfil** = código de taller o `Por asignar`.
- Barras y sobrante son referenciales.

