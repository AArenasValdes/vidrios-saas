# Plan MVP - Presupuestos por Componentes

Documento operativo para convertir el proyecto desde el cotizador tecnico hacia el nuevo MVP.

---

## Decision principal

El MVP se construye sobre:

- clientes
- proyectos
- cotizaciones
- componentes del proyecto
- costo proveedor
- margen
- PDF
- WhatsApp

No se sigue desarrollando el motor tecnico de ventanas como prioridad.

---

## Estrategia de base de datos

### Que se reutiliza

#### Tabla `cotizaciones`

Se mantiene como cabecera comercial del presupuesto.

Campos actuales utiles:

- `proyecto_id`
- `organization_id`
- `numero`
- `estado`
- `descuento_pct`
- `flete`
- `iva`
- `notas`
- `valido_hasta`
- `subtotal_neto`
- `costo_total`
- `margen_pct`
- `utilidad_total`
- `estado_comercial`
- `total`
- `eliminado_en`

#### Tabla `cotizacion_items`

Se reutiliza como tabla de **componentes del presupuesto**.

Campos actuales utiles:

- `cantidad`
- `organization_id`
- `ancho`
- `alto`
- `nombre`
- `descripcion`
- `unidad`
- `observaciones`
- `tipo_item`
- `costo_unitario`
- `costo_total`
- `margen_pct`
- `utilidad`
- `precio_unitario`
- `subtotal`
- `eliminado_en`

### Campos nuevos recomendados

Agregar a `cotizacion_items`:

- `codigo` `text`
- `tipo_componente` `text`
- `orden` `integer`

Motivo:

- `codigo` permite mostrar `V1`, `P1`, etc.
- `tipo_componente` evita reutilizar campos tecnicos como `linea`.
- `orden` permite controlar el orden visual en PDF y detalle.

### Que queda legado o dormido

Tablas tecnicas del enfoque anterior:

- `product_types`
- `system_lines`
- `system_configurations`
- `configuration_materials`
- `line_glass_compatibility`
- `materials`
- `labor_costs`

Tabla que queda dormida para el MVP:

- `quote_item_breakdown`

Regla:

- no borrarlas todavia
- no usarlas en el nuevo flujo principal
- no seguir agregando logica de negocio ahi

---

## Modelo de componente MVP

Modelo recomendado para la app:

```ts
type ComponentePresupuesto = {
  id?: string | number;
  codigo: string;
  tipo: string;
  descripcion: string;
  ancho: number | null;
  alto: number | null;
  cantidad: number;
  costoProveedorUnitario: number;
  costoProveedorTotal: number;
  margenPct: number;
  precioFinalUnitario: number;
  precioFinalTotal: number;
  observaciones?: string | null;
};
```

Formula MVP:

```text
precioFinalUnitario = costoProveedorUnitario * (1 + margenPct / 100)
costoProveedorTotal = costoProveedorUnitario * cantidad
precioFinalTotal = precioFinalUnitario * cantidad
```

---

## Mapeo recomendado contra schema actual

```text
codigo                 -> cotizacion_items.codigo
tipo                   -> cotizacion_items.tipo_componente
descripcion            -> cotizacion_items.descripcion
ancho                  -> cotizacion_items.ancho
alto                   -> cotizacion_items.alto
cantidad               -> cotizacion_items.cantidad
costoProveedorUnitario -> cotizacion_items.costo_unitario
costoProveedorTotal    -> cotizacion_items.costo_total
margenPct              -> cotizacion_items.margen_pct
precioFinalUnitario    -> cotizacion_items.precio_unitario
precioFinalTotal       -> cotizacion_items.subtotal
nombre                 -> cotizacion_items.nombre
observaciones          -> cotizacion_items.observaciones
orden                  -> cotizacion_items.orden
```

Uso sugerido de `nombre`:

- `nombre` puede ser el titulo corto del componente, por ejemplo `Ventana living`.

Uso sugerido de `descripcion`:

- detalle comercial visible para el cliente.

Campos que dejan de ser relevantes para el MVP y pueden quedar nulos:

- `area_m2`
- `linea`
- `color`
- `vidrio`
- `product_type_id`
- `system_line_id`
- `configuration_id`

---

## Estrategia de migracion

### Fase 1: compatibilidad minima

- agregar columnas nuevas a `cotizacion_items`
- no tocar tablas tecnicas
- adaptar tipos TS al nuevo lenguaje de componente
- crear servicio de calculo simple por componentes

### Fase 2: reconversion del flujo de nueva cotizacion

- reemplazar selecciones de catalogo tecnico
- permitir agregar componentes manuales
- calcular subtotal, IVA y total desde costo proveedor + margen

### Fase 3: salida comercial

- ajustar detalle de cotizacion
- ajustar PDF
- ajustar mensaje de WhatsApp

### Fase 4: limpieza controlada

- revisar que ningun flujo principal use el cotizador tecnico
- archivar o eliminar codigo legado
- decidir si las tablas tecnicas se mantienen o se eliminan

---

## Recomendacion tecnica importante

No intentes migrar todo el schema al mismo tiempo.

Primero:

- manten `cotizaciones`
- reconvierte `cotizacion_items`
- deja lo tecnico dormido

Eso baja riesgo y evita una refactorizacion gigante antes de validar el MVP.
