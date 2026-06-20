# Onboarding Feature Brief - Ventora

## Problema

Un cliente nuevo puede entrar a Ventora, ver valor conceptual, pero no llegar rapido a su primer resultado comercial real.

## Usuario

- dueno o administrador de una empresa de vidrios/aluminio en Chile
- poco tiempo
- alta dependencia de WhatsApp
- baja tolerancia a configuracion larga

## Objetivo

Guiar al usuario hasta completar su primer circuito de valor comercial minimo:

`primera cotizacion -> ver PDF -> (opcional) datos empresa -> entrar a Ventora`

**Entrada principal (2026-06-19):** wizard `/activacion` para admins sin cotizaciones. Ver `docs/agent-map/ACTIVATION_ONBOARDING.md`.

Circuito extendido (checklist legacy): perfil listo -> landing publica -> primer lead -> compartir PDF/link.

## Pasos guiados (activacion /activacion)

1. bienvenida
2. elegir demo o cotizacion real
3. generar cotizacion (rapida por total o con componentes)
4. ver PDF como lo vera el cliente
5. opcional: datos de empresa
6. entrar a Ventora

## Pasos guiados (checklist legacy)

1. completar empresa
2. activar pagina publica
3. copiar link o QR
4. generar solicitud de prueba
5. crear primera cotizacion (ahora preferir `/activacion`)
6. compartir PDF o link

## Rutas donde aparece checklist legacy

- `/cotizaciones/[id]`

## Rutas donde se valida el flujo, pero no se muestra onboarding

- `/solicitud/[empresa]`
- `/presupuesto/[token]`

## Tabla sugerida

No implementar aun. Solo referencia.

### `onboarding_checklists`

- `id`
- `organization_id`
- `step_key`
- `estado`
- `completed_at`
- `completed_by_user_id`
- `metadata_json`
- `creado_en`
- `actualizado_en`
- `eliminado_en`

Requisitos:

- multi-tenant con `organization_id`
- soft delete
- RLS por organizacion

## Componentes sugeridos

- `OnboardingChecklistCard`
- `OnboardingProgressBar`
- `FirstValueBanner`
- `StepCompletionToast`
- `OnboardingStepChip`

## Estados

- `pendiente`
- `en_progreso`
- `completado`
- `omitido`

## Textos cortos sugeridos

- `Completa tu empresa`
- `Activa tu pagina publica`
- `Prueba tu primera solicitud`
- `Crea tu primera cotizacion`
- `Comparte tu primer link`

## QA

- admin nuevo sin cotizaciones redirige a `/activacion`
- demo, real por total y real por componentes generan cotizacion y PDF coherentes
- PDF desde activacion vuelve a la guia (`from=activacion`)
- datos empresa opcionales persisten en perfil
- `?replay=1` permite repetir sin persistir complete/skip
- mobile first sin bottom nav en `/activacion`
- checklist legacy no duplica UX en dashboard

## Riesgos

- falsas completitudes si el paso no valida accion real
- onboarding demasiado largo
- ruido excesivo en usuarios ya activados
- dependencia de rutas criticas sin QA

## Criterios de terminado

- admin nuevo completa primera cotizacion + ve PDF en `/activacion`
- puede omitir guia o completar datos empresa opcionales
- gate no re-redirige tras `activation_complete`
- existe plan de QA por modo (demo, total, componentes)
- la experiencia no abre wizard completo de `/cotizaciones/nueva`
