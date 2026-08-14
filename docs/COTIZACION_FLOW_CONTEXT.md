# Contexto completo del flujo de cotizacion

Ultima revision por agente: 2026-06-05.

Este archivo existe para que cualquier IA/agente entienda el flujo mas importante de Ventora: transformar un lead o cliente en una cotizacion guardada, compartida, vista y aprobada/rechazada por el cliente final.

## Objetivo de producto

Ventora no es un ERP ni un cotizador tecnico pesado. La cotizacion es herramienta de cierre comercial dentro del producto principal: capturar leads cuando la empresa esta ocupada o dormida, centralizarlos, convertirlos en obras/cotizaciones claras y ayudar a cerrar trabajos sin romper PDF, WhatsApp ni aprobacion publica.

El flujo de cotizacion debe mantenerse enfocado en:

- Crear rapidamente un presupuesto entendible para cliente final.
- Guardar cliente/proyecto/cotizacion sin trabajo duplicado.
- Compartir por WhatsApp y PDF/link publico.
- Saber si cliente vio, aprobo o rechazo.
- Mantener aislamiento multi-tenant por `organization_id`.

No reintroducir motor tecnico de compatibilidades, logistica, ERP, inventario ni modulos de Fase 3+.

## Regla previa para agentes

Antes de tocar codigo del flujo, leer:

- `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`
- `docs/agent-map/README.md`
- `docs/agent-map/FEATURES_MAP.md`, seccion Cotizaciones
- `docs/agent-map/ROUTES_MAP.md`, rutas `/cotizaciones`, `/cotizaciones/nueva`, `/cotizaciones/[id]`, `/presupuesto/[token]`, `/print/cotizaciones/[id]`
- `docs/agent-map/DATA_MODEL_MAP.md`, tablas `cotizaciones`, `cotizacion_items`, `cotizacion_line_templates`, `clients`, `projects`

Flujo tecnico obligatorio: `page -> hook -> service -> repository -> Supabase`.

## Prioridad de roadmap

Este flujo es la base de:

- **Milestone 0**: estabilizacion de cotizacion desktop;
- **Milestone 2**: Quote Studio desktop.

Cualquier constructor visual futuro debe montarse encima de este flujo y de sus contratos actuales. No lo reemplaza, no abre rutas publicas nuevas y no cambia PDF/WhatsApp sin aprobacion explicita.

## Resumen del circuito completo

1. Lead entra por `/solicitud/[empresa]` o cliente ya existe.
2. Vendedor abre `/cotizaciones/nueva`, opcionalmente con prefill desde solicitud.
3. Paso 1 rellena cliente, telefono, obra (`projects`, visible como Obras), direccion y condiciones basicas.
4. Paso 2 agrega componentes comerciales: linea, material, vidrio, medidas, cantidad y precio.
5. Paso 3 revisa totales, flete/descuento o total global, y guarda borrador/cotizacion.
6. Servicio crea o actualiza `clients`, `projects`, `cotizaciones` y `cotizacion_items`.
7. Cotizacion queda con codigo `COT-DDMMYY-NNN` y `approval_token`.
8. Vendedor ve detalle en `/cotizaciones/[id]`, imprime/genera PDF o comparte WhatsApp/link publico.
9. Cliente abre `/presupuesto/[token]`, ve presupuesto publico y puede aprobar/rechazar.
10. Respuesta actualiza `cotizaciones.estado`, timestamps y canal de respuesta; vendedor recibe notificacion.

## Entradas del flujo

### Desde solicitudes/leads

Ruta publica: `/solicitud/[empresa]`.

Tabla: `solicitudes_contacto`.

Cuando el vendedor decide cotizar desde una solicitud, se arma prefill con `src/features/cotizaciones/new-quote/solicitud-prefill.ts`.

Campos de prefill:

- `clienteNombre`: nombre del lead.
- `clienteTelefono`: telefono/contacto.
- `obra`: tipo de trabajo o contexto comercial.
- `observaciones`: mensaje/solicitud original.
- `pricingMode`: preferencia de precio de la organizacion si existe.
- `selectedClientId`: usa prefijo `solicitud-prefill:` para identificar origen temporal.
- `sourceSolicitudId`: se guarda en `sessionStorage` para poder marcar solicitud como contactada/cerrada despues.

Clave `sessionStorage`: `cotizacion-workflow:new:solicitud-source`.

### Desde listado o detalle

Rutas privadas:

- `/cotizaciones`: listado, filtros, busqueda, duplicar, WhatsApp.
- `/cotizaciones/[id]`: detalle, editar, editar componentes, PDF, WhatsApp, estado manual.
- `/cotizaciones/nueva?edit=<id>`: editar cotizacion existente.
- `/cotizaciones/nueva?duplicate=<id>`: duplicar como borrador.
- `/cotizaciones/nueva?edit=<id>&step=2`: editar componentes directo.

## Paso 1: Cliente y obra

Archivo principal UI: `app/(pwa-app)/cotizaciones/nueva/page.tsx`.

Componentes:

- `app/(pwa-app)/cotizaciones/nueva/_components/paso-uno-datos-cliente.tsx`
- Hook: `app/(pwa-app)/cotizaciones/nueva/_hooks/use-paso-uno-cliente.ts`
- Utilidades: `src/features/cotizaciones/new-quote/workflow-ui.ts`

Campos del draft:

- `clienteNombre`: obligatorio para guardado normal.
- `clienteTelefono`: inicia como `+56 9 `.
- `obra`: opcional; si falta, se resuelve como `Trabajo de <cliente>` o `Solicitud comercial`.
- `direccion`: opcional, se persiste en cliente.
- `validez`: default `15 dias`; se convierte a `valido_hasta`.
- `descuentoPct`: usado solo en modo `por_item`.
- `flete`: usado solo en modo `por_item`.
- `observaciones`: notas internas/comerciales que salen en documentos.

Validacion:

- `validateStep1()` esta en `workflow-ui.ts`.
- Si faltan campos obligatorios, guardado muestra error y vuelve al paso 1.
- Caso especial: nombre exacto `Cliente` sin `existingClientId` se trata como cliente anonimo y no crea ficha/proyecto.

Dependencias de datos:

- `clients`: se busca por id o nombre; si existe, se actualiza telefono/direccion.
- `projects`: se busca por id o por titulo + cliente; si existe, se actualiza.

## Paso 2: Componentes y precios

Proposito: cargar el detalle comercial que el cliente entiende: ventanas, puertas, mamparas, termopaneles, trabajos personalizados, etc. No debe transformarse en motor tecnico complejo.

Archivos principales:

- `src/features/cotizaciones/new-quote/workflow-ui.ts`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-seccion.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-formulario-componente.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-panel-componentes.tsx`
- Mobile wizard en `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/`
- Hooks en `app/(pwa-app)/cotizaciones/nueva/_hooks/use-paso-dos-*.ts`

Campos de `ComponentFormState`:

- `codigo`: autogenerado por `buildNextComponentCode()`; ejemplos `V1`, `P1`, `I1`.
- `tipo`: tipo comercial del componente.
- `categoria`: grupo visual/comercial.
- `subtipo`: subtipo elegido por usuario.
- `lineaComercial`: texto visible/snapshot de linea.
- `lineTemplateId`: plantilla seleccionada, si aplica.
- `material`: `Aluminio` o `PVC`.
- `colorHex`: color visual para sketch.
- `vidrio`: vidrio seleccionado o recomendado.
- `ancho`, `alto`: medidas en milimetros.
- `cantidad`: unidades.
- `unidad`: normalmente `unidad`.
- `costoProveedorUnitario`: costo base para modo margen.
- `margenPct`: margen por componente.
- `precio`: precio directo/manual.
- `pricingMode`: `margen` o `precio_directo`.
- `precioPorM2`, `minimoCobrable`, `redondeoPrecio`: datos de plantilla.
- `precioAjustadoManual`: true si usuario sobrescribio precio sugerido.
- `origenPrecio`: `margen`, `plantilla` o `manual`.
- `observaciones`: incluye metadata codificada para presentacion.

Validacion:

- `validateComponentForm()` exige tipo/nombre basico.
- En `por_item`, costo/precio debe ser valido segun modo.
- En `total_global`, el costo por item no es obligatorio porque el precio comercial final se define en paso 3.
- `isWorkflowItemComplete()` exige ancho, alto y costo positivo en `por_item`; en `total_global` exige medidas pero no costo.

### Modos de cotizacion

`quotePricingMode` vive en `src/features/cotizaciones/types/quote-pricing-mode.ts`.

Valores:

- `por_item`: cada componente tiene precio unitario/subtotal visible. Usa descuento, flete, IVA y totales por suma.
- `total_global`: los componentes son detalle comercial sin precio por componente. El cliente ve un total final del trabajo. Items se guardan con `precio_unitario = 0` y `subtotal = 0` por restriccion NOT NULL, pero esos ceros nunca deben mostrarse al cliente.

Reglas criticas de `total_global`:

- Paso 3 exige `totalClienteManual > 0`.
- `descuentoPct`, `flete`, `costo_total`, `margen_pct`, `utilidad_total` se guardan en cero/null segun compatibilidad.
- PDF, vista publica, documento publico y detalle interno no deben mostrar `$0` por item ni costos/margen/utilidad.
- `mostrarIva` decide si se desglosa IVA incluido; el total final no cambia.

### Plantillas de linea/precio rapido

Feature: `cotizacion_line_templates`.

Archivos:

- `src/features/cotizaciones/line-templates/`
- `src/features/cotizaciones/services/cotizacion-line-pricing.service.ts`
- UI de configuracion: `src/features/cotizaciones/line-templates/components/lineas-precios-page-client.tsx`
- Bloque compacto en `/configuracion/empresa`

Campos:

- `nombre`
- `material`: `Aluminio` o `PVC`
- `vidrioPrincipalRecomendado`
- `precioM2Sugerido`
- `minimoCobrable`
- `redondeoPrecio`
- `isActive`
- `sortOrder`
- `organizationId`
- `eliminadoEn`

Calculo:

- Area m2 = `(ancho * alto) / 1_000_000`.
- Precio base unitario = `areaM2 * precioM2Sugerido`.
- Se aplica `minimoCobrable` si es mayor que precio base.
- Se redondea hacia arriba con `redondeoPrecio`.
- Total sugerido = precio unitario sugerido * cantidad.

Acciones disponibles:

- Aplicar plantilla.
- Guardar como precio rapido.
- Recalcular con plantilla.
- Mantener override manual protegido.

Regla de persistencia: no crear FK viva desde `cotizacion_items` hacia `cotizacion_line_templates`. La cotizacion guarda snapshot textual en `cotizacion_items.linea` y metadata en `observaciones`.

## Paso 3: Revision y guardado

Archivos:

- `app/(pwa-app)/cotizaciones/nueva/_components/paso-tres-resumen.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-tres-detalle-final.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/paso-tres-panel-acciones.tsx`
- Hook: `app/(pwa-app)/cotizaciones/nueva/_hooks/use-paso-tres-guardado.ts`

Acciones:

- Guardar borrador: estado `borrador`.
- Guardar cotizacion final: estado `creada`.
- Guardar y salir: vuelve a `/cotizaciones`.
- Guardar final abre `/print/cotizaciones/[id]?created=1`.

Validacion final:

- Siempre corre `validateStep1()`.
- Si estado es `creada`, exige al menos un componente.
- Si `quotePricingMode === "total_global"`, exige total final del cliente mayor a cero.
- Antes de guardar aplica ediciones rapidas pendientes con `applyQuickEditDraftsToItems()`.

Persistencia local del wizard:

- `buildWorkflowStorageKey()` en `workflow-ui.ts`.
- `use-persistencia-nueva-cotizacion.ts` guarda avance en `sessionStorage`.
- Se limpia al guardar correctamente.
- Cache de listado/detalle usa `useCotizacionesStore` y `sessionStorage` con TTL 5 minutos.

## Guardado en servicio

Hook: `src/features/cotizaciones/hooks/useCotizacionesStore.ts`.

Servicio: `src/features/cotizaciones/services/cotizaciones.service.ts`.

Repositorio: `src/features/cotizaciones/repositories/cotizaciones-repository.ts`.

Antes de escribir, `useCotizacionesStore` debe validar suscripcion con `assertSubscriptionAllowsWrite()`. Con cuenta vencida, lectura sigue disponible; crear/editar/eliminar deben bloquearse.

`saveWorkflow()` recibe:

- `organizationId`
- `draft`
- `estado`
- `existingId`
- `existingCode`
- `existingClientId`
- `existingProjectId`
- `requestKey` para evitar doble guardado concurrente

Operacion:

1. Normaliza items con `calculateComponentItem()`.
2. Valida items si no es borrador.
3. Resuelve cliente (`ensureClient`): get por id, find por nombre, update o create.
4. Resuelve proyecto (`ensureProject`): get por id, find por titulo+cliente, update o create.
5. Calcula totales con `calculateWorkflowTotalsForPricingMode()`.
6. Reserva codigo con RPC `reserve_next_cotizacion_code(org_id, date)`.
7. Crea `approval_token` si no existe.
8. Inserta o actualiza `cotizaciones`.
9. Soft-deletea items activos anteriores en update y recrea items activos.
10. Recupera cotizacion hidratada y la devuelve como `CotizacionWorkflowRecord`.
11. Si falla creacion nueva, intenta rollback de cliente/proyecto creados.

Timeouts de guardado: 30 segundos por operaciones principales.

## Calculo de totales

Archivo: `src/features/cotizaciones/services/cotizaciones-workflow.service.ts`.

### `por_item`

Por item:

- `costoProveedorTotal = costoProveedorUnitario * cantidad`
- `precioUnitario = costoProveedorUnitario * (1 + margenPct / 100)`
- `precioTotal = precioUnitario * cantidad`
- `areaM2 = ancho/1000 * alto/1000`

Totales:

- `subtotal = sum(items.precioTotal)`
- `descuentoValor = subtotal * descuentoPct / 100`
- `neto = subtotal - descuentoValor`
- `iva = neto * impuestos.iva`, redondeado comercialmente hacia arriba a incremento 1000
- `total = neto + iva + flete`
- `costoTotalFabricacion = sum(items.costoProveedorTotal)`

### `total_global`

Totales:

- `total = totalClienteManual`
- `iva = mostrarIva ? total * iva/(1+iva) : 0`
- `subtotalNeto = total - iva`
- `flete = 0`
- `descuento = 0`
- `costoTotalFabricacion` puede calcularse para UI, pero al persistir se guarda cero por compatibilidad actual.

## Modelo de datos

### `cotizaciones`

Campos criticos:

- `id`
- `organization_id`
- `proyecto_id`
- `numero`
- `estado`
- `pricing_mode`: `por_item` o `total_global`
- `descuento_pct`
- `flete`
- `iva`
- `notas`
- `valido_hasta`
- `subtotal_neto`
- `costo_total`
- `margen_pct`
- `utilidad_total`
- `total`
- `approval_token`
- `approval_token_expires_at`
- `cliente_vio_en`
- `cliente_respondio_en`
- `cliente_respuesta_canal`
- `creado_en`
- `actualizado_en`
- `eliminado_en`

Riesgos:

- `estado` no tiene CHECK estricto; normalizar desde servicios.
- `numero` depende de RPC atomica.
- `approval_token` habilita link publico; no cambiar sin actualizar aprobacion.
- Toda query privada debe filtrar `organization_id` y `eliminado_en IS NULL`.

### `cotizacion_items`

Campos criticos:

- `cotizacion_id`
- `organization_id`
- `codigo`
- `tipo_componente`
- `orden`
- `cantidad`
- `precio_unitario`
- `subtotal`
- `ancho`
- `alto`
- `area_m2`
- `linea`
- `color`
- `vidrio`
- `nombre`
- `descripcion`
- `unidad`
- `observaciones`
- `tipo_item`
- `costo_unitario`
- `costo_total`
- `margen_pct`
- `utilidad`
- `eliminado_en`

`linea` es snapshot comercial. `observaciones` contiene metadata codificada por `src/utils/cotizacion-item-presentation.ts`.

### `clients` y `projects`

La cotizacion normalmente cuelga de un proyecto y el proyecto cuelga de un cliente.

- `clients`: nombre, telefono, direccion, organization_id.
- `projects`: titulo, cliente_id, organization_id.

No romper auto-creacion/actualizacion desde cotizacion.

### Seguridad/RLS

Tablas activas con RLS por organizacion:

- `cotizaciones`
- `cotizacion_items`
- `cotizacion_line_templates`
- `clients`
- `projects`

Tablas sensibles relacionadas:

- `quote_item_breakdown`: revisar antes de reactivar uso tecnico.
- `material_types`, `formula_variables`: legado/dormidas, no ampliar superficie.
- `cotizacion_code_counters`: usada por RPC de codigo.

## Listado y detalle privado

### `/cotizaciones`

Archivos:

- `app/(pwa-app)/cotizaciones/page.tsx`
- Componentes en `app/(pwa-app)/cotizaciones/_components/`
- Hook resumen: `src/features/cotizaciones/hooks/useCotizacionesResumenPage.ts`
- API: `app/api/cotizaciones/resumen/route.ts`

Funciones:

- Listar cotizaciones paginadas.
- Filtros por estado, cliente, periodo, orden y busqueda.
- Duplicar.
- Export CSV.
- Compartir WhatsApp.
- Ir a detalle o editar.

WhatsApp desde listado:

- Carga record completo si falta detalle.
- Asegura link publico con `approvalToken`.
- Marca estado como enviada cuando corresponde.
- Completa onboarding `first_share`.

### `/cotizaciones/[id]`

Archivos:

- `app/(pwa-app)/cotizaciones/[id]/page.tsx`
- `app/(pwa-app)/cotizaciones/[id]/_components/cotizacion-detalle-mobile-view.tsx`

Funciones:

- Ver cliente, obra, items, totales, estado.
- Editar cotizacion completa.
- Editar componentes directo.
- Abrir PDF/print.
- Compartir por WhatsApp.
- Actualizar respuesta manual: pendiente/aprobada/rechazada/terminada.

## PDF, print y documento publico

PDF/print interno:

- Ruta: `/print/cotizaciones/[id]`
- Archivo: `app/print/cotizaciones/[id]/page.tsx`
- Estilos: `app/print/cotizaciones/[id]/page.module.css`
- Utilidad historica: `src/utils/cotizacion-pdf.ts`
- Cache PDF: `src/features/cotizaciones/pdf-cache/`

Documento publico:

- Ruta: `/presupuesto/[token]/documento`
- Archivo: `app/presupuesto/[token]/documento/page.tsx`
- Componente: `app/presupuesto/[token]/documento/public-quote-document.tsx`

Dependencias visuales:

- `organization_profile`: logo, nombre, direccion, telefono, email, color marca, forma de pago.
- `QuoteComponentSketch`: sketch visual de componente.
- `src/utils/cotizacion-item-presentation.ts`: parsea metadata visual/comercial.

Reglas:

- No romper WhatsApp ni PDF; son herramientas activas de cierre.
- En `total_global`, mostrar total global y detalle comercial, no precios cero por item.
- Branding de documento debe salir de `organization_profile`, no hardcode.
- Storage bucket requerido: `organization-assets` para logos/PDFs.

## Link publico y aprobacion

Ruta: `/presupuesto/[token]`.

Archivos:

- `app/presupuesto/[token]/page.tsx`
- `app/presupuesto/[token]/actions.ts`
- `app/presupuesto/[token]/public-quote-mobile.tsx`
- `app/presupuesto/[token]/public-quote-preview.tsx`
- `src/features/cotizaciones/public-approval/services/public-cotizacion-approval.service.ts`
- `src/features/cotizaciones/public-approval/repositories/public-cotizacion-approval.repository.ts`
- `src/utils/cotizacion-approval.ts`

Token:

- `createApprovalToken()` genera hex de 32 caracteres.
- `buildCotizacionApprovalPath(token)` => `/presupuesto/<token>`.
- `buildCotizacionApprovalUrl(token)` resuelve origin desde env/runtime.
- Token valido: regex hex de 24 a 64 chars.

Vista publica:

- Resuelve cotizacion por `approval_token`.
- Marca vista con `cliente_vio_en`.
- Cachea por tag `public-approval-quotes` con revalidate 60s.
- Muestra expirado/no encontrado/error controlado.
- `canRespond` es false si expiro o ya respondio/aprobada/rechazada/terminada.

Acciones:

- `acceptPublicQuoteAction(token)` -> `publicCotizacionApprovalService.accept()`
- `rejectPublicQuoteAction(token)` -> `publicCotizacionApprovalService.reject()`

Efecto:

- Actualiza `estado` a `aprobada` o `rechazada`.
- Setea `cliente_respondio_en`.
- Setea `cliente_respuesta_canal` segun repositorio/servicio.
- Revalida cache.
- Redirige a `/presupuesto/<token>?decision=aceptada|rechazada`.
- Envia notificacion/push si corresponde.

## WhatsApp

WhatsApp se usa para cierre. Debe incluir datos utiles: cliente, codigo, total y link publico.

Dependencias:

- `approval_token` ya creado.
- Origin correcto en `src/utils/cotizacion-approval.ts`.
- Estado puede pasar a `enviada`.
- Tracking comercial usa Google tag en superficies publicas/listado si esta disponible.

Riesgos:

- No compartir link sin token.
- No exponer datos de otra organizacion.
- No romper formato mobile.

## Estados

Estados de workflow:

- `borrador`: avance guardado, no necesariamente completo.
- `creada`: cotizacion final lista.
- `enviada`: compartida al cliente.
- `aprobada`: cliente o vendedor marco aprobada.
- `rechazada`: cliente o vendedor marco rechazada.
- `terminada`: cierre operativo manual.

Canales de respuesta:

- `manual_app`: vendedor marco estado en app.
- Canal publico desde aprobacion/rechazo por token.

Campos de trazabilidad:

- `cliente_vio_en`
- `cliente_respondio_en`
- `cliente_respuesta_canal`

## Archivos fuente principales

UI privada:

- `app/(pwa-app)/cotizaciones/page.tsx`
- `app/(pwa-app)/cotizaciones/nueva/page.tsx`
- `app/(pwa-app)/cotizaciones/[id]/page.tsx`
- `app/(pwa-app)/cotizaciones/nueva/_components/`
- `app/(pwa-app)/cotizaciones/nueva/_hooks/`

Logica:

- `src/features/cotizaciones/hooks/useCotizacionesStore.ts`
- `src/features/cotizaciones/services/cotizaciones.service.ts`
- `src/features/cotizaciones/services/cotizaciones-workflow.service.ts`
- `src/features/cotizaciones/services/cotizacion-line-pricing.service.ts`
- `src/features/cotizaciones/new-quote/workflow-ui.ts`
- `src/features/cotizaciones/new-quote/solicitud-prefill.ts`

Persistencia:

- `src/features/cotizaciones/repositories/cotizaciones-repository.ts`
- `src/features/clientes/repositories/clientes-repository.ts`
- `src/features/projects/repositories/projects.repository.ts`
- `src/features/cotizaciones/line-templates/repositories/cotizacion-line-templates.repository.ts`

Publico/documentos:

- `app/presupuesto/[token]/`
- `app/print/cotizaciones/[id]/`
- `src/features/cotizaciones/public-approval/`
- `src/features/cotizaciones/pdf-cache/`
- `src/utils/cotizacion-approval.ts`
- `src/utils/cotizacion-item-presentation.ts`
- `src/utils/cotizacion-document.ts`

Tipos:

- `src/features/cotizaciones/types/cotizacion.ts`
- `src/features/cotizaciones/types/cotizacion-item.ts`
- `src/features/cotizaciones/types/cotizacion-workflow.ts`
- `src/features/cotizaciones/types/quote-pricing-mode.ts`
- `src/features/cotizaciones/types/pricing-mode.ts`
- `src/features/cotizaciones/line-templates/types/cotizacion-line-template.ts`

## Requisitos minimos para crear cotizacion final

- Usuario autenticado.
- `organizationId` resuelto.
- Suscripcion permite escritura.
- Cliente valido o caso anonimo controlado.
- Proyecto/titulo resuelto.
- Al menos un componente.
- Cada componente completo segun modo.
- En `por_item`: precios por item calculables.
- En `total_global`: total final cliente mayor a cero.
- `organization_id` en cotizacion e items.
- Codigo reservado o generado.
- `approval_token` creado.

## Que puede mejorar sin romper el producto

Mejoras seguras si respetan contratos:

- Mejorar UX de pasos y microcopy comercial.
- Mejorar validaciones visibles.
- Mejorar plantillas de linea/precio rapido.
- Mejorar PDF/documento publico manteniendo datos y reglas de `total_global`.
- Mejorar WhatsApp message builder.
- Agregar tests a hooks/servicios existentes.
- Auditar queries para multi-tenant.

Mejoras riesgosas:

- Cambiar schema de `cotizaciones` o `cotizacion_items`.
- Cambiar significado de `pricing_mode`.
- Cambiar formato de metadata en `observaciones` sin compatibilidad.
- Cambiar token/public link.
- Reemplazar `project/client` auto-create.
- Reactivar tablas legacy tecnicas.
- Mostrar costos/margen/utilidad al cliente.

## QA recomendado despues de cambios

Automatizado:

- `pnpm run lint`
- `pnpm test`
- `pnpm run build`

Tests relevantes existentes:

- `src/features/cotizaciones/services/__tests__/cotizaciones-workflow.service.test.ts`
- `src/features/cotizaciones/services/__tests__/cotizacion-line-pricing.service.test.ts`
- `src/features/cotizaciones/new-quote/__tests__/workflow-ui-step-two.test.ts`
- `app/(pwa-app)/cotizaciones/nueva/_hooks/__tests__/use-paso-tres-guardado.test.ts`
- `app/presupuesto/[token]/__tests__/public-quote-global-pricing.test.tsx`
- `src/utils/__tests__/cotizacion-pdf.test.ts`
- `src/utils/__tests__/cotizacion-item-presentation.test.ts`
- `src/utils/__tests__/cotizacion-approval.test.ts`

Smoke manual recomendado:

1. Crear cotizacion `por_item` desde cero.
2. Crear cotizacion `total_global` con componentes sin precio por item.
3. Guardar borrador y retomar.
4. Editar cotizacion existente y guardar.
5. Duplicar cotizacion.
6. Crear desde solicitud y confirmar prefill.
7. Abrir detalle `/cotizaciones/[id]`.
8. Abrir `/print/cotizaciones/[id]`.
9. Compartir WhatsApp y revisar link.
10. Abrir `/presupuesto/[token]` como cliente.
11. Aprobar y rechazar en cotizaciones distintas.
12. Confirmar `cliente_vio_en`, `cliente_respondio_en`, `cliente_respuesta_canal`.
13. Confirmar que otra organizacion no puede leer/editar datos.

## Checklist para agentes antes de editar

- Confirmar ruta exacta que se cambia.
- Confirmar si cambio toca UI, logica, persistencia o documento publico.
- Confirmar modo afectado: `por_item`, `total_global` o ambos.
- Confirmar tablas tocadas y filtro `organization_id`.
- Confirmar soft delete en queries activas.
- Confirmar que no se muestran `$0` por item en `total_global`.
- Confirmar que PDF y WhatsApp siguen funcionando.
- Agregar o ajustar tests proporcionales al riesgo.
- Actualizar `docs/agent-map/` si cambian rutas, features, tablas o componentes.
