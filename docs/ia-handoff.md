# Handoff IA - Vidrios SaaS

Resumen corto para otra IA que tenga que continuar el trabajo.

---

## Cambio principal

El proyecto ya no se orienta a un motor tecnico de calculo de ventanas.

El nuevo MVP es:

**un generador profesional de presupuestos para maestros de vidrios y aluminio.**

La app debe permitir:

- clientes
- proyectos
- cotizaciones
- componentes del proyecto
- costo proveedor
- margen
- PDF
- WhatsApp

Modelo base:

```text
precio_final = costo_proveedor * (1 + margen)
```

---

## Problema real que se busca resolver

El maestro no calcula materiales desde cero.

Normalmente:

1. pide precio al proveedor
2. recibe costo del componente
3. aplica margen
4. arma presupuesto en Excel o Word
5. lo manda por WhatsApp

El software debe profesionalizar ese flujo.

---

## Que del repo sigue sirviendo

- auth real
- clientes reales
- proyectos ligados a clientes
- cotizaciones reales
- PDF imprimible
- WhatsApp
- arquitectura por capas
- multi-tenant

---

## Que sigue pendiente

- ejecutar la migracion SQL real para `codigo`, `tipo_componente` y `orden`
- seguir puliendo el flujo de nueva cotizacion
- seguir mejorando PDF y detalle comercial
- limpiar tablas legacy en base de datos solo cuando el MVP ya este estable

---

## Norte del MVP actual

La cotizacion debe estar compuesta por **componentes** del proyecto, por ejemplo:

- V1 ventana living
- V2 ventana cocina
- P1 puerta terraza

Cada componente deberia tener, como minimo:

- codigo
- tipo
- ancho
- alto
- descripcion
- costoProveedor
- margenPct
- precioFinal

---

## Archivos clave para seguir

- `Agents.md`: fuente de verdad del nuevo enfoque.
- `docs/mvp-componentes-plan.md`: plan de reconversion del MVP.
- `docs/mvp-componentes-schema.sql`: migracion minima sugerida.
- `docs/salida-beta-checklist.md`: checklist operativo para salir a beta cerrada.
- `src/services/cotizaciones.service.ts`: servicio de aplicacion ya conectado a clientes/proyectos/cotizaciones.
- `src/hooks/useCotizacionesStore.ts`: estado principal del flujo de cotizaciones.
- `app/(pwa-app)/cotizaciones/nueva/page.tsx`: principal pantalla a reconvertir.
- `app/print/cotizaciones/[id]/page.tsx`: salida PDF a adaptar al nuevo presupuesto por componentes.
- `src/utils/pdf.ts`
- `src/utils/whatsapp.ts`

---

## Proceso recomendado

1. No seguir construyendo el cotizador tecnico.
2. Definir el modelo de datos del componente MVP.
3. Simplificar nueva cotizacion para capturar componentes y precios simples.
4. Mantener el flujo cliente -> proyecto -> cotizacion.
5. Adaptar PDF y WhatsApp para presentar presupuesto profesional.
6. Actualizar tests conforme se migre la logica.
7. Ejecutar en Supabase `docs/mvp-componentes-schema.sql`.

---

## Guardrails no negociables

- `page -> hook -> service -> repository -> Supabase`
- filtrar siempre por `organization_id`
- respetar soft delete
- calculos solo en services
- no meter nueva logica de catalogo tecnico al MVP
