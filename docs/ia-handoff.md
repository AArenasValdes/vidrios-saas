# Handoff IA - Ventora

Actualizado: 2026-05-05.

Resumen corto para retomar trabajo sin releer todo el repo.

---

## Estado actual

El producto ya no debe leerse como presupuestario primero.

Hoy debe entenderse como:

**software para captar, centralizar y cerrar leads comerciales de vidrios y aluminio.**

La cotizacion sigue siendo importante, pero es una capa de cierre.

No es:
- ERP
- logistica
- software de produccion
- cotizador tecnico de perfileria

---

## Que ya esta funcionando

- landing y login
- solicitudes publicas por empresa
- tracking UTM / origen
- generador de links por canal
- QR descargable
- dashboard de solicitudes
- boton de contacto por WhatsApp
- push para leads nuevos
- email async para leads nuevos
- multi-tenant por `organization_id`
- clientes
- cotizaciones
- PDF
- aprobacion publica
- branding basico de empresa
- build de produccion pasando

---

## Que sigue fragil o incompleto

- pipeline comercial aun no consolidado
- observabilidad de produccion incompleta
- validacion real de push y email pendiente
- smoke test manual punta a punta pendiente
- PWA y offline sin validacion real en dispositivo
- landing y CTA aun deben validarse con criterio comercial
- algunos textos siguen con problemas de encoding

---

## Decisiones de producto que no deben romperse

- leads primero, cotizacion despues
- no reabrir el cotizador tecnico
- mantener tracking de origen como parte del core
- mantener push/email/WhatsApp como respuestas operativas clave
- mantener PDF y aprobacion publica para cierre
- no abrir Fase 3+ antes de consolidar Fase 2

Modelo de cotizacion vigente:

```text
precio_final = costo_proveedor * (1 + margen_pct / 100)
```

---

## Arquitectura a respetar

```text
page / component -> hook -> service -> repository -> Supabase
```

Reglas:

- filtrar siempre por `organization_id`
- usar soft delete
- calculos solo en services
- no meter logica de negocio en repositories

---

## Archivos y zonas clave

- `Agents.md`
- `docs/contexto-rapido-web.md`
- `docs/salida-beta-checklist.md`
- `src/features/solicitudes/...`
- `src/features/notificaciones/...`
- `app/(landing-web)/solicitud/[empresa]/...`
- `app/(pwa-app)/solicitudes/...`
- `app/(pwa-app)/configuracion/empresa/page.tsx`
- `src/features/cotizaciones/...`
- `app/print/cotizaciones/[id]/page.tsx`

---

## Prioridad real de las proximas 48 horas

### P0 - Bloqueantes de salida

1. Validar captacion real:
   - link publico por empresa
   - UTM guardadas
   - QR utilizable
   - dashboard de solicitudes
   - push y email

2. Consolidar seguimiento:
   - estados claros
   - criterio de avance
   - contacto rapido por WhatsApp

3. Validar cierre comercial:
   - cliente
   - cotizacion
   - PDF
   - WhatsApp
   - `/presupuesto/[token]`

4. Corregir errores visibles:
   - encoding roto
   - estados vacios
   - links rotos
   - errores de UX en movil

### P1 - Robustez minima antes de abrir

1. Error handling real en solicitudes y cotizaciones.
2. Logging basico para rutas sensibles.
3. Monitoreo minimo de errores frontend y backend.
4. Smoke test manual documentado.
5. Revalidar branding y notificaciones con cuenta real.

---

## Que no deberia entrar ahora

- multi-sucursal
- round-robin
- analytics por vendedor
- Zapier/Make
- WhatsApp Business API
- CRM profundo
- UI separada de proyectos
- nuevas capas tecnicas de materiales o compatibilidades

---

## Norte de trabajo

Si entras al repo ahora:

- no inventes otra identidad de producto
- no vuelvas a vender esto como cotizador tecnico
- cierra captacion, seguimiento y cierre
- piensa en duenio/vendedor que pierde leads
- cualquier cambio debe ayudar a responder mas rapido o cerrar mejor
