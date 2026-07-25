# Manual corto: líneas, cubicación y pauta de corte

Para maestros / dueños de taller que configuran Ventora.  
 ide a: **5–10 minutos** la primera vez.  
Actualizado: **2026-07-24** (recetas + plantillas iniciales).

---

## 1. Tres ideas simples

| Qué | Para qué sirve | ¿Obligatorio? |
|---|---|---|
| **Línea** | El producto que vendes y su **precio** (ej. “Serie 25”) | Sí, para cotizar |
| **Receta de fabricación** | Cómo se **arman los cortes** (riel, jamba, cabezal…) | No |
| **Pauta de corte** | La tabla que ves al cotizar (revisable, congelada al guardar) | No |

- Cotizar el precio **no requiere** cubicación.
- Las **plantillas iniciales** (L5000 / L20 / L25) **no** son líneas del listado: se eligen al configurar la fabricación de una línea.
- Trabajos raros o complejos se arman en el **constructor**, no inventando tipologías en el catálogo.

---

## 2. Dónde se configura

1. Ventora (computador).
2. **Configuración → Empresa**.
3. **Catálogo privado** / **Líneas y precios**.

---

## 3. Cómo agregar una línea (precio)

1. **+ Nueva línea**.
2. Nombre, categoría/material, precio por m², mínimo y redondeo si aplica.
3. Déjala **activa** y **guarda**.

Con esto ya puedes cotizar. La cubicación es opcional.

---

## 4. Cómo activar cubicación (receta)

En la ficha de la línea:

1. Paso **Uso de la línea** → elige **Cubicación y pauta**.
2. Paso **Fabricación** → primero elige el **origen**:
   - **Plantilla inicial sugerida** → L5000 / L20 / L25 (corredera caracol).  
     Copy: *“Plantilla inicial sugerida por Ventora. Revísala y valídala según tu proveedor…”*  
     **Aún no están verificadas** con fabricaciones reales.
   - **Base tipológica** → paño fijo, abatible, proyectante, puertas.  
     Copy: *“Base pendiente de validación del taller”* (sin mm inventados).
   - **Configurar propia** → estructura editable.
3. Revisa **qué fabricas** (apertura, herraje, hojas).
4. Completa **perfiles** (códigos reales del taller) y descuentos.
5. En validación: **Validé esta receta para mi taller** cuando confíes.
6. Guarda la línea.

**Estados (en simple):**

- Borrador / Lista para probar → se puede usar con cuidado.
- Validada por la empresa → el taller confía en esa receta.
- Requiere revisión → cambió algo después de validar.

Si ya tienes receta y quieres otra plantilla: **Cambiar plantilla u origen** (arriba del editor).

---

## 5. Cómo se usa al cotizar

1. **Cotizaciones → Nueva** (mejor en computador).
2. Elige tipo de pieza (tipología) y la **línea**.
3. Pon **medidas**.
4. Si la línea tiene pauta: aparece **Cubicación y pauta**.
5. Si hay **varias** recetas activas compatibles, elige solo **herraje / variante** (no vuelve a pedir tipología).
6. Revisa la tabla; ajusta solo esa cotización si hace falta.
7. Al guardar, Ventora **congela** la pauta (las cotizaciones viejas no se reescriben).

**Resumen de fabricación (taller):** en el detalle de la cotización → **Resumen fabricación**  
(ruta interna, sin precios; no es el PDF del cliente).

---

## 6. Consejos prácticos

1. Empieza con 2–3 líneas del día a día.
2. Primero el **precio**; después calibra materiales.
3. Usa un vano **real** ya fabricado para validar.
4. Bow / módulos raros → **constructor**.
5. La pauta es ayuda revisable, no plano de máquina ni cero desperdicio.
6. No digas “verificada” a L5000/L20/L25 hasta probarlas en tu taller.

---

## 7. Checklist rápido

- [ ] Creé la línea con nombre y precio  
- [ ] Activa y guardada  
- [ ] (Opcional) Uso = Cubicación y pauta  
- [ ] Elegí plantilla sugerida / base / propia  
- [ ] Cargué códigos de perfil del taller  
- [ ] Validé con un trabajo real  
- [ ] Cotizé una pieza de prueba y revisé la pauta  
- [ ] (Opcional) Abrí Resumen fabricación  

---

## 8. Si algo no cuadra

| Problema | Qué hacer |
|---|---|
| No veo L5000/L20/L25 en el listado | Normal: están en **Editar línea → Fabricación → origen** |
| Dice “Por asignar” en perfil | Falta código real del taller |
| Pide herraje al cotizar | Hay varias recetas activas; elige una |
| Cambié la línea y una cotización vieja no cambió | Correcto: el snapshot protege lo ya cotizado |
| Base abatible/puerta “no cierra” | Es pendiente de taller: completa descuentos tú |

Más contexto de producto: `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`.
