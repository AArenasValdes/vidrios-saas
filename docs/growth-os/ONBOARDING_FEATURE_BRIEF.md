# Onboarding Feature Brief - Ventora

## Problema

Un cliente nuevo puede entrar a Ventora, ver valor conceptual, pero no llegar rapido a su primer resultado comercial real.

## Usuario

- dueno o administrador de una empresa de vidrios/aluminio en Chile
- poco tiempo
- alta dependencia de WhatsApp
- baja tolerancia a configuracion larga

## Objetivo

Guiar al usuario hasta completar su primer circuito de valor:

`perfil listo -> landing publica -> primer lead -> primera cotizacion -> primer link/PDF compartido`

## Pasos guiados

1. completar empresa
2. activar pagina publica
3. copiar link o QR
4. generar solicitud de prueba
5. crear primera cotizacion
6. compartir PDF o link

## Rutas donde aparece

- `/dashboard`
- `/configuracion/empresa`
- `/configuracion/pagina-venta`
- `/solicitudes/canales`
- `/cotizaciones/nueva`

## Ruta con ayuda contextual opcional

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

- el checklist aparece en dashboard para clientes nuevos
- cada paso lleva a la ruta correcta
- el progreso cambia al completar accion real
- mobile first sin saturar la pantalla
- no bloquea rutas existentes

## Riesgos

- falsas completitudes si el paso no valida accion real
- onboarding demasiado largo
- ruido excesivo en usuarios ya activados
- dependencia de rutas criticas sin QA

## Criterios de terminado

- el usuario nuevo ve el checklist
- al menos 6 pasos estan definidos
- el sistema puede detectar completitud minima de pasos clave
- existe plan de QA por ruta
- la experiencia no reintroduce complejidad innecesaria
