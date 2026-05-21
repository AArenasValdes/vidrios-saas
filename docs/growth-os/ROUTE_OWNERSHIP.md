# Route Ownership - Ventora

Este documento asigna ownership comercial a las rutas criticas de Ventora.

Regla:

- si una ruta toca captacion, conversion, onboarding o cierre, debe tener agente responsable
- si se modifica una ruta critica, se debe revisar el mapa tecnico antes de proponer cambios
- toda ruta publica critica requiere QA manual real

---

## `/dashboard`

- proposito comercial: mostrar salud comercial rapida y empujar accion inmediata
- agente responsable primario: Agente de Operativa y Escalamiento
- agente responsable secundario: Agente de Entrega y Exito
- riesgo si se rompe: el equipo pierde visibilidad de actividad y CTA a nueva cotizacion
- KPI asociado hoy: cotizaciones del periodo, aprobadas hoy/mes, cotizaciones recientes
- KPI deseado futuro: activacion semanal
- archivos probables segun docs/agent-map:
  - `app/(pwa-app)/dashboard/page.tsx`
  - `app/(pwa-app)/dashboard/_components/*`
  - `app/(pwa-app)/dashboard/_hooks/*`
  - `src/features/dashboard/services/dashboard-summary-server.service.ts`
  - `app/api/dashboard/summary/route.ts`
- que revisar antes de modificar:
  - `docs/agent-map/ROUTES_MAP.md` seccion Dashboard
  - `docs/agent-map/FEATURES_MAP.md` seccion Dashboard
  - contrato del endpoint `/api/dashboard/summary`
- QA manual obligatorio:
  - entrar autenticado
  - validar cards KPI desktop y mobile
  - validar CTA a `/cotizaciones/nueva`
  - validar lista de cotizaciones recientes

## `/solicitudes`

- proposito comercial: centralizar leads y acelerar speed-to-lead
- agente responsable primario: Agente de Conversion
- agente responsable secundario: Agente de Operativa y Escalamiento
- riesgo si se rompe: los leads entran pero no se gestionan ni convierten
- KPI asociado hoy: solicitudes nuevas, solicitudes contactadas, solicitudes por estado, solicitudes por origen y UTM
- KPI deseado futuro: tiempo a primera respuesta confiable, conversaciones reales
- archivos probables segun docs/agent-map:
  - `app/(pwa-app)/solicitudes/page.tsx`
  - `app/(pwa-app)/solicitudes/_components/solicitud-card.tsx`
  - `src/features/solicitudes/hooks/useSolicitudesContacto.ts`
  - `src/features/solicitudes/services/solicitudes-contacto.service.ts`
  - `app/api/solicitudes/resumen/route.ts`
- que revisar antes de modificar:
  - seccion `Solicitudes / Leads` en `FEATURES_MAP.md`
  - seccion de RLS en `DATA_MODEL_MAP.md` para `solicitudes_contacto`
  - flujo de badge de origen y prefill a cotizacion
- QA manual obligatorio:
  - listar solicitudes
  - filtrar por estado
  - abrir WhatsApp desde una solicitud
  - crear cotizacion con prefill desde la solicitud

## `/solicitudes/canales`

- proposito comercial: generar links y QR para captar mejor por canal
- agente responsable primario: Agente de Atraccion
- agente responsable secundario: Agente de Operativa y Escalamiento
- riesgo si se rompe: se pierde distribucion medible por canal y captacion compartible
- KPI asociado hoy: solicitudes por `utm_source`, `utm_medium`, `utm_campaign`
- KPI deseado futuro: links copiados, QR descargados
- archivos probables segun docs/agent-map:
  - `app/(pwa-app)/solicitudes/canales/page.tsx`
  - `src/features/solicitudes/components/lead-channels.tsx`
  - `src/features/solicitudes/components/lead-channels.module.css`
  - `src/features/solicitudes/hooks/useLeadChannels.ts`
- que revisar antes de modificar:
  - seccion `Links por Canal` en `FEATURES_MAP.md`
  - formato UTM y slug publico
  - dependencia con `organization_profile`
- QA manual obligatorio:
  - copiar link por canal
  - validar UTMs en URL
  - descargar QR PNG
  - abrir link generado y confirmar que aterriza en la landing correcta

## `/cotizaciones`

- proposito comercial: administrar cotizaciones y ejecutar acciones de cierre
- agente responsable primario: Agente de Conversion
- agente responsable secundario: Agente de Operativa y Escalamiento
- riesgo si se rompe: se cae el flujo de PDF, WhatsApp o seguimiento comercial
- KPI asociado hoy: cotizaciones por estado, aprobadas, rechazadas, actualizadas por periodo
- KPI deseado futuro: tiempo a cotizacion, shares por WhatsApp, PDF descargados
- archivos probables segun docs/agent-map:
  - `app/(pwa-app)/cotizaciones/page.tsx`
  - `app/(pwa-app)/cotizaciones/_components/*`
  - `src/features/cotizaciones/hooks/useCotizacionesStore.ts`
  - `app/api/cotizaciones/resumen/route.ts`
- que revisar antes de modificar:
  - seccion `Cotizaciones` en `FEATURES_MAP.md`
  - acciones PDF y WhatsApp activas
  - filtros y soft delete
- QA manual obligatorio:
  - listar y filtrar cotizaciones
  - copiar link publico
  - abrir accion WhatsApp
  - generar o descargar PDF

## `/cotizaciones/nueva`

- proposito comercial: convertir una oportunidad en cotizacion util lo mas rapido posible
- agente responsable primario: Agente de Conversion
- agente responsable secundario: Agente de Entrega y Exito
- riesgo si se rompe: pilotos y usuarios nuevos no llegan a primera cotizacion
- KPI asociado hoy: cotizaciones creadas, borradores guardados
- KPI deseado futuro: tiempo a primera cotizacion, cotizaciones creadas por usuario nuevo
- archivos probables segun docs/agent-map:
  - `app/(pwa-app)/cotizaciones/nueva/page.tsx`
  - `src/features/cotizaciones/new-quote/workflow-ui.ts`
  - `src/features/cotizaciones/new-quote/solicitud-prefill.ts`
  - `src/features/cotizaciones/services/cotizaciones-workflow.service.ts`
  - `src/features/cotizaciones/services/component-catalog.service.ts`
  - `src/features/cotizaciones/services/component-suggestions.service.ts`
- que revisar antes de modificar:
  - seccion `Cotizaciones` en `FEATURES_MAP.md`
  - sessionStorage del workflow
  - pricing por linea y medidas
- QA manual obligatorio:
  - crear cotizacion desde cero
  - crear cotizacion desde prefill
  - validar guardado borrador
  - validar total, PDF y navegacion posterior

## `/cotizaciones/[id]`

- proposito comercial: ejecutar cierre desde el detalle de una cotizacion
- agente responsable primario: Agente de Conversion
- agente responsable secundario: Agente de Entrega y Exito
- riesgo si se rompe: se rompe el ultimo paso antes de compartir o cerrar
- KPI asociado hoy: aprobaciones y rechazos derivados de la cotizacion publica
- KPI deseado futuro: PDF abiertos, links compartidos, shares por WhatsApp
- archivos probables segun docs/agent-map:
  - `app/(pwa-app)/cotizaciones/[id]/page.tsx`
  - `app/(pwa-app)/cotizaciones/[id]/_components/*`
  - `src/features/cotizaciones/hooks/useCotizacionesStore.ts`
  - `src/utils/cotizacion-pdf.ts`
  - `src/utils/whatsapp.ts`
- que revisar antes de modificar:
  - detalle mobile
  - acciones PDF y WhatsApp
  - consistencia de items y totales
- QA manual obligatorio:
  - abrir una cotizacion real
  - generar PDF
  - abrir mensaje WhatsApp
  - validar acciones editar y eliminar

## `/configuracion/empresa`

- proposito comercial: dejar lista la identidad comercial y datos base para captar y cerrar
- agente responsable primario: Agente de Entrega y Exito
- agente responsable secundario: Agente de Atraccion
- riesgo si se rompe: se daña branding, logo, slug o configuracion base del cliente
- KPI asociado hoy: campos clave completos en `organization_profile`, slug disponible, `is_published` indirecto via flujo
- KPI deseado futuro: porcentaje de clientes con perfil completo, tiempo a activacion
- archivos probables segun docs/agent-map:
  - `app/(pwa-app)/configuracion/empresa/page.tsx`
  - `src/features/organization-profile/hooks/useOrganizationProfile.ts`
  - `src/features/organization-profile/services/organization-profile.service.ts`
  - `src/features/organization-profile/repositories/organization-profile.repository.ts`
- que revisar antes de modificar:
  - seccion `Empresa / Configuracion` en `FEATURES_MAP.md`
  - impacto de slug y logo en landing, PDF y cierre
  - bucket `organization-assets`
- QA manual obligatorio:
  - editar telefono, email y color
  - subir logo
  - validar slug publico
  - confirmar que la marca se ve en landing o PDF donde corresponda

## `/configuracion/pagina-venta`

- proposito comercial: mejorar la mini landing publica que captura solicitudes
- agente responsable primario: Agente de Atraccion
- agente responsable secundario: Agente de Entrega y Exito
- riesgo si se rompe: cae la pagina publica o su capacidad de conversion
- KPI asociado hoy: solicitudes por `organization_id`, `contexto`, `utm_source`, estado de `is_published`
- KPI deseado futuro: tasa de envio del formulario, conversion landing -> solicitud
- archivos probables segun docs/agent-map:
  - `app/(pwa-app)/configuracion/pagina-venta/page.tsx`
  - `src/features/organization-profile/hooks/useOrganizationProfile.ts`
  - `src/features/landing-gallery/hooks/useLandingGallery.ts`
  - `src/features/landing-gallery/services/landing-gallery.service.ts`
  - `src/features/landing-gallery/repositories/landing-gallery.repository.ts`
- que revisar antes de modificar:
  - seccion `Pagina Publica / Mini Landing` en `FEATURES_MAP.md`
  - maximo 8 items de galeria
  - `is_published`
- QA manual obligatorio:
  - editar hero y subtitulo
  - subir o reordenar galeria
  - validar preview
  - abrir `/solicitud/[empresa]` y comprobar cambios reales

## `/solicitud/[empresa]`

- proposito comercial: ser la puerta principal de captacion de leads
- agente responsable primario: Agente de Atraccion
- agente responsable secundario: Agente de Conversion
- riesgo si se rompe: se corta la captacion publica
- KPI asociado hoy: solicitudes enviadas por empresa, origen, contexto y UTM
- KPI deseado futuro: conversion visita -> solicitud
- archivos probables segun docs/agent-map:
  - `app/(landing-web)/solicitud/[empresa]/page.tsx`
  - `app/api/solicitud/[empresa]/route.ts`
  - `src/features/solicitudes/services/solicitudes-contacto.service.ts`
  - `src/features/solicitudes/repositories/solicitudes-contacto.repository.ts`
  - `src/features/landing-gallery/repositories/landing-gallery-server.repository.ts`
- que revisar antes de modificar:
  - validacion de slug
  - rate limiting por IP
  - `organization_profile.is_published`
  - `sourceUrl` y UTMs
- QA manual obligatorio:
  - abrir landing publica
  - enviar solicitud valida
  - confirmar registro en `/solicitudes`
  - validar comportamiento ante slug invalido

## `/presupuesto/[token]`

- proposito comercial: cerrar una cotizacion con aprobacion o rechazo publico
- agente responsable primario: Agente de Conversion
- agente responsable secundario: Agente de Operativa y Escalamiento
- riesgo si se rompe: se cae una ruta critica de cierre y feedback del cliente
- KPI asociado hoy: aprobadas, rechazadas, `cliente_respondio_en`, `cliente_respuesta_canal`
- KPI deseado futuro: tiempo de lectura a decision, aperturas del link publico
- archivos probables segun docs/agent-map:
  - `app/presupuesto/[token]/page.tsx`
  - `app/presupuesto/[token]/actions.ts`
  - `src/features/cotizaciones/public-approval/services/public-cotizacion-approval.service.ts`
  - `src/features/cotizaciones/public-approval/repositories/public-cotizacion-approval.repository.ts`
- que revisar antes de modificar:
  - token y expiracion
  - push tras decision
  - estado final en `cotizaciones`
- QA manual obligatorio:
  - abrir presupuesto publico
  - aprobar una cotizacion
  - rechazar una cotizacion
  - confirmar cambio de estado interno y notificacion
