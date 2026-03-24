# Handoff IA - Vidrios SaaS

Actualizado: 2026-03-23.

Resumen corto para otra IA o para retomar trabajo sin releer todo el repo.

---

## Estado actual

El producto ya no esta en fase de definicion.

La base funcional del MVP comercial ya existe y el foco correcto ahora es:

**cerrar robustez, validacion real y salida a produccion o beta cerrada.**

El producto hoy debe entenderse como:

**un presupuestario comercial vertical para vidrios y aluminio, con PDF, WhatsApp y seguimiento liviano del cliente.**

No es un ERP.
No es logistica.
No es un cotizador tecnico de perfileria.

---

## Que ya esta realmente funcionando

- login con Supabase email/password
- dashboard interno
- clientes
- cotizaciones
- flujo guiado de nueva cotizacion
- componentes con costo proveedor y margen
- detalle de cotizacion
- PDF imprimible
- compartir por WhatsApp
- branding basico de empresa
- flujo publico `/presupuesto/[token]`
- aprobacion o rechazo publico
- build de produccion pasando

---

## Que sigue siendo fragil o incompleto

- escrituras de cotizaciones no transaccionales
- validacion real de Supabase pendiente en entorno final
- validacion real del flujo publico pendiente
- observabilidad de produccion inexistente
- smoke test manual punta a punta pendiente
- PWA y offline sin validacion real en dispositivo
- algunos textos o datos heredados siguen con problemas de encoding
- OAuth visible como idea, pero no operativo

---

## Decisiones de producto que no deben romperse

- seguir con calculo simple por componente
- no reabrir el cotizador tecnico
- mantener PDF y WhatsApp como salida core
- mantener posicionamiento de presupuestario comercial
- no meter pagos ni analytics antes de estabilizar el core

Modelo vigente:

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

- `AGENTS.md`
- `docs/salida-beta-checklist.md`
- `app/(landing-web)/page.tsx`
- `app/(landing-web)/landing.module.css`
- `app/(auth-public)/login/login-view.tsx`
- `app/(auth-public)/login/login.module.css`
- `app/(pwa-app)/cotizaciones/nueva/page.tsx`
- `src/services/cotizaciones.service.ts`
- `src/services/cotizaciones-workflow.service.ts`
- `src/repositories/cotizaciones-repository.ts`
- `app/print/cotizaciones/[id]/page.tsx`
- `src/utils/pdf.ts`
- `src/utils/whatsapp.ts`

---

## Prioridad real de las proximas 48 horas

### P0 - Bloqueantes de salida

1. Validar Supabase real:
   - migraciones
   - bucket `organization-assets`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - RLS y multi-tenant

2. Validar flujo comercial completo:
   - cliente
   - cotizacion
   - componentes
   - borrador
   - presupuesto
   - PDF
   - WhatsApp
   - `/presupuesto/[token]`

3. Corregir errores visibles:
   - encoding roto
   - estados vacios
   - links rotos
   - errores de UX en movil

4. Asegurar salida publica coherente:
   - landing
   - login
   - `/planes`
   - CTA alineados con beta cerrada o salida real

### P1 - Robustez minima antes de abrir

1. Error handling real en create/update de cotizaciones.
2. Logging basico para rutas sensibles.
3. Monitoreo minimo de errores frontend y backend.
4. Smoke test manual documentado.
5. Revalidar PDF con branding real y fallback sin logo.

---

## Que no deberia entrar antes de salir

- pagos
- billing
- PostHog
- OAuth real
- CRM mas profundo
- UI separada de proyectos
- nuevas capas tecnicas de materiales o compatibilidades

---

## Criterio de "go"

Se puede desplegar si ya esta validado con una cuenta real:

- login
- clientes
- cotizacion completa
- PDF
- WhatsApp o fallback
- branding
- link publico `/presupuesto/[token]`

Y ademas:

- no hay rutas criticas rotas
- no hay errores visibles graves
- `next build` pasa
- Supabase final esta correctamente configurado

---

## Criterio de "no-go"

No salir si ocurre cualquiera de estos:

- no guarda cotizaciones reales de punta a punta
- PDF falla o sale inconsistente
- branding no persiste
- el link publico no abre o no responde
- faltan migraciones o columnas reales en Supabase
- hay errores visibles graves en movil

---

## Norte de trabajo

Si entras al repo ahora:

- no inventes nuevas features
- no expandas el alcance
- cierra robustez, errores y despliegue
- piensa en validacion real, no en mas mockups
- cualquier cambio en cotizaciones debe cuidar PDF, WhatsApp y aprobacion publica juntos
