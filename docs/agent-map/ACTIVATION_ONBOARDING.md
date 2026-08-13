# Onboarding de activacion (`/activacion`) - Ventora

Documentacion operativa del flujo de primera activacion separado del dashboard y del cotizador productivo.

Ultima actualizacion: 2026-06-19

---

## Objetivo de producto

Guiar a un **admin nuevo sin cotizaciones** hasta su **primer resultado comercial tangible**:

1. Crear una cotizacion (demo o real)
2. Ver el **PDF como lo vera su cliente**
3. Revisar o complementar datos de empresa ya precargados desde el registro
4. Entrar a Ventora

Frase guia: *"En pocos minutos veras como Ventora te ayuda a generar un presupuesto profesional desde el celular."*

**No es** el wizard completo de `/cotizaciones/nueva`. Es un atajo guiado que guarda cotizaciones reales en Supabase.

---

## Cuando entra el usuario

| Condicion | Comportamiento |
|---|---|
| `rol === "admin"` | Unico rol redirigido |
| `quoteCount === 0` | Sin cotizaciones previas |
| `activation_complete` no completado ni omitido | Step en `onboarding_checklists` |
| Cuenta con cotizaciones existentes | **No** redirige (ej. replay con admin@test.com) |

**Gate:** `dashboard` -> redirect a `/activacion` via `useActivationGate`.

**Modo replay (QA):** `/activacion?replay=1` o `?activacion_preview=1`
- No persiste complete/skip
- No aplica gate de salida
- Permite repetir el recorrido con cuentas que ya tienen cotizaciones

---

## Arquitectura

```text
app/(pwa-app)/activacion/
  page.tsx              <- Wizard UI (client)
  page.module.css       <- Estilos mobile-first

src/features/onboarding/
  services/onboarding-activation-flow.service.ts   <- Borradores, URLs, resumen
  hooks/useActivationGate.ts                       <- Gate + complete/skip
  services/onboarding-checklist.service.ts         <- Step activation_complete
  types/onboarding-checklist.ts

app/api/onboarding/activation/status/route.ts        <- GET status, POST complete/skip

supabase/migrations/20260619120000_onboarding_activation_complete.sql

src/components/layout/app-shell.tsx                  <- Shell minimal en /activacion
proxy.ts                                             <- Protege /activacion
```

**Flujo de datos al guardar:**

```text
/activacion UI
  -> buildActivation*Draft()
  -> finalizeActivationDraftForSave()   # reconcile seguro
  -> useCotizacionesStore.saveWorkflow()
  -> cotizaciones.service (total_global sin items OK)
  -> Supabase cotizaciones + items
  -> getWorkflowById() -> resumen + PDF
```

---

## Pasos del wizard (UI)

| Step | Pantalla | Accion |
|---|---|---|
| `welcome` | Bienvenida | Empezar / Entrar sin guia |
| `choose` | Elegir camino | Demo vs cotizacion real |
| `demo` | Ejemplo fijo | Genera borrador demo (por_item, ventana 1200x1000, $180.000) |
| `real_mode` | Modo real | Rapida por total vs Guiada por items |
| `component_method` | Guia por items | Elegir una pieza del catalogo o describir una pieza libre |
| `real_total` | Form corto | Cliente, trabajo, descripcion, total |
| `real_component` | Form corto | Cliente, trabajo, componente, medidas, cantidad, total |
| `result` | Cotizacion lista | Ver PDF, descargar, datos empresa, entrar |
| `company` | Datos empresa | Nombre, teléfono y correo llegan precargados desde registro; opcionalmente se complementan dirección, forma de pago, color y logo |
| `done` | Cierre | Marca activacion completa -> `/dashboard` |

---

## Modos de cotizacion en activacion

### 1. Ejemplo de prueba (`demo`)

- Borrador: `buildActivationDemoDraft()`
- Modo: `por_item`
- Item fijo: ventana corredera 1200x1000, $180.000 neto + IVA en totales
- Cliente: "Cliente de prueba"

### 2. Real - Rapida por total (`real_total`)

- Borrador: `buildActivationRealDraft()`
- Modo: `total_global`
- **Sin items tecnicos ficticios** (`items: []`)
- Total ingresado = total final (`mostrarIva: false`)
- Descripcion en `draft.observaciones`
- Resumen muestra bloque **Trabajo cotizado**, no componentes tecnicos

### 3. Real - Con componentes (`real_component`)

- Borrador: `buildActivationRealComponentDraft()`
- Modo: `por_item` (mismo PDF que cotizador productivo)
- Infiere tipo (Puerta, Ventana, Shower, etc.) desde texto
- Metadata de catalogo: sistema, configuracion, `displayMode: componente`
- Precio directo (`precio_directo`) para sobrevivir `reconcileWorkflowItemsPricing`
- IVA incluido en totales como flujo productivo (`mostrarIva: true`)

El **Constructor de piezas** no forma parte de la primera cotizacion del onboarding: permanece disponible dentro de la aplicacion para trabajos con composiciones o formas especiales, despues de completar la activacion.

---

## Navegacion PDF

| Origen | URL PDF | Volver |
|---|---|---|
| Activacion | `/print/cotizaciones/[id]?from=activacion` | **Volver a la guia** -> `/activacion?step=result&cotizacion=[id]` |
| Replay | `...&replay=1` | Conserva `replay=1` al volver |
| Cotizador | `?from=wizard` | Sin cambios (listado o detalle) |

Helpers: `buildActivationPrintHref`, `buildActivationReturnHref`, `resolvePrintViewerBackNavigation`.

---

## Resumen post-generacion

`buildActivationQuoteSummary(record)` alimenta la card de resultado:

- **Componentes** (por_item): nombre, medidas, linea, precio unitario/total
- **Trabajo cotizado** (total_global): titulo + descripcion + total ingresado
- **Resumen**: subtotal, IVA 19% si aplica, total presupuesto
- Nota IVA: *"El precio que ingresaste es el neto del trabajo..."*

---

## Persistencia onboarding

- Step key: `activation_complete` en `onboarding_checklists`
- Estados: `completado` | `omitido`
- API: `GET/POST /api/onboarding/activation/status`
- Migracion: `20260619120000_onboarding_activation_complete.sql`

---

## Reglas para agentes

### Si tocas activacion

- Codigo nuevo en `src/features/onboarding/` y `app/(pwa-app)/activacion/`
- Tests: `onboarding-activation-flow.service.test.ts`
- Usar `finalizeActivationDraftForSave()` antes de `saveWorkflow`

### No tocar sin necesidad

- `/cotizaciones/nueva` (wizard productivo)
- Logica general de `reconcileWorkflowItemsPricing` salvo bug real compartido
- Dashboard KPIs (card de onboarding **removida** del dashboard)

### Hardening ya aplicado (2026-06-19)

- Precio $0 en PDF: costo + `precio_directo` en borradores por_item
- Total global sin componente ventana ficticio
- Validacion save: total_global permite `items: []` con `totalClienteManual`
- PDF vuelve a guia, no a detalle productivo
- Form con componentes limpia estado al entrar
- Datos empresa ampliados y precargados desde `organization_profile` + copy de "puedes editar despues en configuracion"

---

## QA manual

```text
1. Login admin sin cotizaciones -> redirect /activacion
2. Ejemplo demo -> generar -> resumen $180k + IVA -> Ver PDF -> Volver a la guia
3. Real por total: Puerta + $250.000 -> resumen coherente -> PDF sin ventana ficticia
4. Real por componentes: medidas custom -> resumen y PDF reflejan datos
5. Datos empresa opcionales -> PDF muestra logo/contacto
6. Entrar a Ventora -> dashboard, no re-redirige a activacion
7. Replay: /activacion?replay=1 con cuenta con cotizaciones existentes
```

---

## Pendiente / siguiente agente (visual)

Ver seccion **Handoff visual** al final de este doc y resumen en respuesta al usuario.

### Archivos visuales principales

- `app/(pwa-app)/activacion/page.module.css`
- `app/(pwa-app)/activacion/page.tsx` (solo markup/classes, no logica de negocio)

### Referencias de marca

- `docs/marketing/brand-guidelines.md`
- App interna: claridad mobile-first; no forzar dark premium del marketing en todo el shell autenticado

### Ideas de mejora visual (no implementadas)

- Progreso visual por paso (1/6)
- Preview mini del PDF en pantalla resultado
- Ilustracion ligera en welcome (vidrio/aluminio, no tech generica)
- Mejor jerarquia en card de resumen (neto vs IVA mas escaneable)
- Animacion sutil entre pasos
- Estados vacios/error mas amigables

---

## Handoff visual (copiar a otro agente)

**Contexto:** Flujo `/activacion` funcional y testeado. Falta pulir UI/UX visual mobile-first.

**Scope permitido:** CSS + pequenos ajustes de markup en `activacion/page.tsx`. No cambiar servicios, save, gate ni rutas.

**Estado actual:** Card blanca centrada, botones azul Ventora `#1E88FF`, tipografia sobria, formularios simples, resumen con desglose neto/IVA.

**Criterios de exito:**

- Maestro no tecnico entiende que hacer en cada paso en < 5 segundos
- CTA principal siempre visible en mobile (Ver PDF, Generar)
- Resumen de cotizacion legible bajo sol / en obra
- Coherencia con app interna (no parecer landing marketing)

**Probar con:** `http://localhost:3000/activacion?replay=1` (admin@test.com)
