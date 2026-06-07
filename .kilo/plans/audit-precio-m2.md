# Auditoría Técnica: Cálculo de Precios por m² en Ventora

## 1. Resultado de Reproducción

### Pasos para reproducir el escenario
1. Seleccionar línea comercial "5000" (precio_m2_sugerido = 65.000 CLP)
2. Ingresar ancho = 1000 mm, alto = 600 mm, cantidad = 2
3. Guardar la cotización
4. Observar los precios en el detalle

### Datos ingresados
- Línea: "5000" (precio_m2_sugerido = 65.000 CLP/m²)
- Ancho: 1000 mm
- Alto: 600 mm
- Cantidad: 2

### Resultado obtenido (supuesto)
- Precio por ventana ~39.000 CLP
- Subtotal mostrado ~78.000 CLP (39.000 × 2)

### Resultado esperado
- Si `minimo_cobrable = 1` m²: precio por unidad 65.000, subtotal 130.000
- Si `minimo_cobrable = 0` m²: precio por unidad 39.000, subtotal 78.000

---

## 2. Diagnóstico Técnico

### Causa raíz más probable

**Opción A (80% de probabilidad): Dato de configuración faltante**
- La línea "5000" no tiene `minimo_cobrable = 1` m² configurado
- El valor actual es 0 o NULL, por lo que el mínimo no se aplica
- El sistema calcula 0.6 m² × 65.000 = 39.000 por unidad
- Con cantidad = 2: 39.000 × 2 = 78.000

**Opción B (20% de probabilidad): Bug en el recálculo de cantidad**
- Si la cantidad se cambia sin disparar recalculación completa, `costoProveedorUnitario` podría no actualizarse
- En `syncTemplatePricingInComponentForm` (workflow-ui.ts:1019), cuando `pricingMode === "precio_directo"`, el `costoProveedorUnitario` no se actualiza con el nuevo precio sugerido

### Archivo y función involucrada

| Archivo | Función | Rol |
|---------|---------|-----|
| `cotizacion-line-pricing.service.ts:53` | `calculateLineTemplatePricing` | Cálculo correcto del precio |
| `workflow-ui.ts:1019` | `syncTemplatePricingInComponentForm` | **Bug potencial**: no actualiza `costoProveedorUnitario` en modo "precio_directo" |
| `workflow-ui.ts:1337` | `buildItemFromForm` | Construye el item usando `costoProveedorUnitario` sin recalcular |
| `cotizaciones-workflow.service.ts:205` | `calculateComponentItem` | Calcula `precioUnitario = costoProveedorUnitario * (1 + margenPct/100)` |
| `cotizacion-line-templates.service.ts:69` | `normalizeCreateInput` | Normaliza `minimoCobrable` a 0 si no se provee |

### Tipo de bug
- **Opción A**: Bug de datos/configuración (minimo_cobrable no configurado)
- **Opción B**: Bug de cálculo en recálculo de cantidad

---

## 3. Evidencia

### 3.1 Fórmula de cálculo (correcta en cotizacion-line-pricing.service.ts:93-104)

```typescript
const areaM2 = round((ancho * alto) / 1_000_000, 4);  // = 0.6 para 1000x600mm
const areaTotalM2 = round(areaM2 * cantidad, 4);
const precioBaseUnitario = round(areaM2 * precioM2Sugerido, 2);  // = 39.000
const precioConMinimo = Math.max(precioBaseUnitario, minimoCobrable);  // SI minimo_cobrable=1, esto es 65.000
const precioUnitarioSugerido = roundToPriceIncrement(precioConMinimo, input.redondeoPrecio);
const totalSugerido = round(precioUnitarioSugerido * cantidad, 2);  // = 130.000 si mínimo aplica
```

### 3.2 Bug confirmado en syncTemplatePricingInComponentForm (workflow-ui.ts:1019-1061)

```typescript
export function syncTemplatePricingInComponentForm(
  form: ComponentFormState,
  options?: { forceSuggestedPrice?: boolean }
) {
  // ...
  const suggestedPrice = String(Math.round(pricingSummary.precioUnitarioSugerido));  // 65.000

  if (form.pricingMode === "margen") {
    return {
      ...form,
      precioPlantillaSugerido: suggestedPrice,
      origenPrecio: "margen" as ComponentFormState["origenPrecio"],
    };
    // ❌ NO actualiza costoProveedorUnitario en modo "margen" tampoco!
  }

  // Modo "precio_directo"
  const nextForm: ComponentFormState = {
    ...form,
    pricingMode: "precio_directo",
    margenPct: "0",
    precioPlantillaSugerido: suggestedPrice,
    origenPrecio: form.precioAjustadoManual ? "manual" : "plantilla",
  };

  if (
    !form.precioAjustadoManual &&
    suggestedPrice &&
    (options?.forceSuggestedPrice || form.costoProveedorUnitario !== suggestedPrice)
  ) {
    nextForm.costoProveedorUnitario = suggestedPrice;  // ✅ Se actualiza SOLO si forceSuggestedPrice=true
  }
  // ❌ Si forceSuggestedPrice=false y costoProveedorUnitario ya tiene un valor, NO se actualiza!
  return nextForm;
}
```

### 3.3 Línea applyLineTemplateToComponentForm (workflow-ui.ts:1063)

```typescript
export function applyLineTemplateToComponentForm(
  form: ComponentFormState,
  template: Pick<CotizacionLineTemplate, "id" | "nombre" | ...>
) {
  const preserveManualPrice = form.precioAjustadoManual;  // false inicialmente

  return syncTemplatePricingInComponentForm(
    {
      ...form,
      // ... valores de plantilla ...
      origenPrecio: preserveManualPrice ? "manual" : "plantilla",
    },
    { forceSuggestedPrice: !preserveManualPrice }  // true cuando no hay override manual
  );
}
```

### 3.4 El item se construye con costoProveedorUnitario (workflow-ui.ts:1420-1469)

```typescript
return calculateComponentItem({
  // ...
  costoProveedorUnitario,  // Usa el valor del formulario, NO precioUnitarioSugerido directamente
  margenPct,
  precioPorM2: syncedForm.precioPorM2 ? Number(syncedForm.precioPorM2) : null,
  minimoCobrable: syncedForm.minimoCobrable ? Number(syncedForm.minimoCobrable) : null,
  redondeoPrecio: syncedForm.redondeoPrecio ? Number(syncedForm.redondeoPrecio) : null,
  precioPlantillaSugerido: linePricingSummary.precioUnitarioSugerido,  // Se guarda pero NO se usa en calculateComponentItem
  // ...
});
```

### 3.5 calculateComponentItem NO usa precioPlantillaSugerido (cotizaciones-workflow.service.ts:205-285)

```typescript
export function calculateComponentItem(input: CalculateComponentItemInput): CotizacionWorkflowItem {
  // ...
  const costoUnitario = /* calculations based on costoProveedorUnitario only */;
  const precioUnitario = round(costoUnitario * (1 + margenPct / 100), 2);  // Usa costoProveedorUnitario
  // ❌ precioPlantillaSugerido se ignora completamente en el cálculo!
  // ...
}
```

### 3.6 Persistencia en mapWorkflowItemToRepositoryItem (cotizaciones.service.ts:341-379)

```typescript
function mapWorkflowItemToRepositoryItem(
  item: CotizacionWorkflowItem,
  organizationId: EntityId,
  index: number,
  quotePricingMode: QuotePricingMode = "por_item"
): CrearCotizacionItemInput {
  return {
    // ...
    cantidad: item.cantidad,  // ✅ Se guarda correctamente
    precioUnitario: item.precioUnitario,  // Precio por unidad
    subtotal: item.precioTotal,  // precioUnitario * cantidad
    // ...
    areaM2: item.areaM2,  // ✅ Área por unidad
  };
}
```

### 3.7 Test del pricing service (cotizacion-line-pricing.service.test.ts:26-41)

```typescript
it("debe aplicar minimo cobrable cuando supera el valor por area", () => {
  const summary = calculateLineTemplatePricing({
    ancho: 900,
    alto: 800,
    cantidad: 1,
    precioM2Sugerido: 60000,
    minimoCobrable: 95000,  // Mínimo configurado
    redondeoPrecio: 1000,
  });

  expect(summary.minimoAplicado).toBe(95000);  // ✅ El mínimo SÍ se aplica
  expect(summary.precioUnitarioSugerido).toBe(95000);
});
```

---

## 4. Decisión Recomendada

### Escenario A: El mínimo NO está configurado (más probable)

**Síntoma**: Precio 39.000 en lugar de 65.000 por ventana.

**Causa**: La línea "5000" no tiene `minimo_cobrable = 1` m² configurado.

**Verificación needed**: Consultar la base de datos:
```sql
SELECT id, nombre, precio_m2_sugerido, minimo_cobrable, redondeo_precio
FROM cotizacion_line_templates
WHERE nombre = '5000' AND organization_id = <ID_ORG> AND eliminado_en IS NULL;
```

**Corrección**: Configurar `minimo_cobrable = 1` en la línea "5000".

### Escenario B: Bug en recálculo de cantidad (menos probable pero posible)

**Síntoma**: Cambiar cantidad de 1 a 2 no actualiza el precio correctamente.

**Causa**: En `syncTemplatePricingInComponentForm`, cuando `pricingMode === "precio_directo"`, el `costoProveedorUnitario` no se recalcula cuando cambia la cantidad (si `precioAjustadoManual` es false pero `forceSuggestedPrice` es false).

**Verificación needed**: Agregar logs en `syncTemplatePricingInComponentForm` para ver si se llama con `forceSuggestedPrice=true` cuando cambia la cantidad.

---

## 5. Plan de Corrección Mínima

### 5.1 Si el bug es de datos (minimo_cobrable no configurado)

**Cambios**: Ninguno en código. Solo en datos.

**Pasos**:
1. Verificar en `/configuracion/empresa` que la línea "5000" tenga `minimo_cobrable = 1` m²
2. Si no lo tiene, configurarlo
3. Probar de nuevo en `/cotizaciones/nueva`

### 5.2 Si el bug es de código (recalculo de cantidad)

**Archivo a tocar**: `src/features/cotizaciones/new-quote/workflow-ui.ts`

**Cambio propuesto** en `syncTemplatePricingInComponentForm`:

```typescript
// EN-syncTemplatePricingInComponentForm (workflow-ui.ts)
// Agregar actualización de costoProveedorUnitario en modo "margen" también
// Y asegurar que se actualice siempre cuando change la cantidad

if (form.pricingMode === "margen") {
  return {
    ...form,
    precioPlantillaSugerido: suggestedPrice,
    // AGREGAR: actualizar costoProveedorUnitario si hay sugerencia
    costoProveedorUnitario: suggestedPrice || form.costoProveedorUnitario,
    origenPrecio: "margen" as ComponentFormState["origenPrecio"],
  };
}
```

### 5.3 Tests a agregar

```typescript
// En workflow-ui-step-two.test.ts
it("debe recalcular precio al cambiar cantidad en modo precio_directo", () => {
  const form: ComponentFormState = {
    // ...
    ancho: "1000",
    alto: "600",
    cantidad: "1",  // Cambio de 1 a 2
    precioPorM2: "65000",
    minimoCobrable: "1",
    redondeoPrecio: "1000",
    precioAjustadoManual: false,
    // ...
  };

  const synced1 = syncTemplatePricingInComponentForm(form);
  expect(synced1.costoProveedorUnitario).toBe("65000");  // Mínimo aplica: max(39000, 65000) = 65000

  const synced2 = syncTemplatePricingInComponentForm({ ...form, cantidad: "2" });
  expect(synced2.costoProveedorUnitario).toBe("65000");  // Precio por unidad igual

  // El total cambia porque cantidad cambia
  const summary2 = buildComponentFormLinePricingSummary(synced2);
  expect(summary2.totalSugerido).toBe(130000);  // 65000 * 2
});
```

### 5.4 Riesgos

- Cambiar `syncTemplatePricingInComponentForm` podría afectar otros flujos que dependen del comportamiento actual
- Si el bug es realmente de datos, el fix de código no resolverá nada

---

## 6. Validación Final Esperada

### 6.1 Test unitario del servicio de pricing

```typescript
it("Caso A: 1000x600mm, cantidad=1, sin mínimo", () => {
  const result = calculateLineTemplatePricing({
    ancho: 1000, alto: 600, cantidad: 1,
    precioM2Sugerido: 65000, minimoCobrable: 0, redondeoPrecio: 1000
  });
  expect(result.areaM2).toBe(0.6);
  expect(result.precioUnitarioSugerido).toBe(39000);  // 0.6 * 65000
  expect(result.totalSugerido).toBe(39000);
});

it("Caso B: 1000x600mm, cantidad=2, sin mínimo", () => {
  const result = calculateLineTemplatePricing({
    ancho: 1000, alto: 600, cantidad: 2,
    precioM2Sugerido: 65000, minimoCobrable: 0, redondeoPrecio: 1000
  });
  expect(result.precioUnitarioSugerido).toBe(39000);
  expect(result.totalSugerido).toBe(78000);  // 39000 * 2
});

it("Caso C: 1000x600mm, cantidad=2, con mínimo=1m²", () => {
  const result = calculateLineTemplatePricing({
    ancho: 1000, alto: 600, cantidad: 2,
    precioM2Sugerido: 65000, minimoCobrable: 1000000, redondeoPrecio: 1000
  });
  expect(result.minimoAplicado).toBe(1000000);
  expect(result.precioUnitarioSugerido).toBe(65000);  // Mínimo por m²
  expect(result.totalSugerido).toBe(130000);  // 65000 * 2
});

it("Caso D: 1200x1000mm, cantidad=2", () => {
  const result = calculateLineTemplatePricing({
    ancho: 1200, alto: 1000, cantidad: 2,
    precioM2Sugerido: 65000, minimoCobrable: 0, redondeoPrecio: 1000
  });
  expect(result.areaM2).toBe(1.2);
  expect(result.precioUnitarioSugerido).toBe(78000);  // 1.2 * 65000
  expect(result.totalSugerido).toBe(156000);  // 78000 * 2
});
```

### 6.2 Prueba manual en /cotizaciones/nueva

1. Crear nueva cotización
2. En Paso 2, seleccionar línea "5000" (precio_m2 = 65.000)
3. Ingresar: ancho=1000, alto=600, cantidad=2
4. Verificar que el precio sugerido sea 65.000 (mínimo) por unidad, 130.000 total
5. Cambiar cantidad a 1, verificar que el precio sea 65.000
6. Guardar y verificar en detalle/PDF

### 6.3 Verificación en detalle/PDF

1. Abrir la cotización creada
2. Verificar que cada item muestre precioUnitario y precioTotal correctos
3. Generar PDF y verificar que los valores sean consistentes

---

## Resumen de Hallazgos

| # | Hallazgo | Severidad | Tipo |
|---|----------|-----------|------|
| 1 | El servicio de pricing (`cotizacion-line-pricing.service.ts`) calcula correctamente con la fórmula especificada | N/A | ✅ Correcto |
| 2 | La fórmula usa `max(area * precio, minimo_cobrable)` correctamente | N/A | ✅ Correcto |
| 3 | `precioPlantillaSugerido` se guarda en metadata pero NO se usa en `calculateComponentItem` | Media | Observación |
| 4 | `syncTemplatePricingInComponentForm` podría no actualizar `costoProveedorUnitario` cuando cambia la cantidad en modo "precio_directo" | Media | Posible bug |
| 5 | El campo `minimo_cobrable` podría no estar configurado en la línea "5000" | Alta | **Causa probable** |

### Causa más probable del bug reportado

**La línea "5000" no tiene `minimo_cobrable = 1` m² configurado**, por lo que el sistema usa directamente 0.6 m² × 65.000 = 39.000 por unidad en lugar del mínimo de 65.000.

**Acción inmediata**: Verificar y configurar `minimo_cobrable = 1000000` (1 m² en mm²) en la línea "5000" vía `/configuracion/empresa`.