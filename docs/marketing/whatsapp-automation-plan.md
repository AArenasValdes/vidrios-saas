# WhatsApp Automation Plan - Ventora

## Objetivo

Usar WhatsApp como canal de respuesta y cierre sin caer en spam ni automatizacion agresiva.

## Principio base

Al inicio, Ventora debe ordenar y acelerar la respuesta humana. No debe partir intentando reemplazarla.

## Lo que si se busca

- registrar que lead entro
- abrir rapido la conversacion correcta
- dejar trazabilidad
- enviar cotizacion o link publico
- medir tiempos y resultado

## Lo que no se busca

- blasting masivo
- cold outreach automatizado por WhatsApp
- bots invasivos
- secuencias que arriesguen bloqueos o mala experiencia

## Opcion 1: Kapso

Uso recomendado cuando se quiera:

- avanzar rapido
- mantener uso de WhatsApp Business App
- aprovechar coexistencia con una capa de integracion

Ventajas:

- integracion mas simple para equipos pequenos
- posibilidad de seguir operando con la app
- buen fit para etapa piloto

## Opcion 2: Meta Cloud API directa

Uso recomendado cuando se quiera:

- menor dependencia de terceros
- mas control tecnico
- construir integracion propia a mediano plazo

Ventajas:

- plataforma oficial de Meta
- flexibilidad tecnica
- mejor control del flujo y datos

## Opcion 3: BSP como 360dialog

Uso recomendado cuando se priorice:

- soporte
- onboarding con partner
- menos friccion operativa

## Plan por fases

### Fase 1: orden comercial

- lead captado en Ventora
- boton o accion clara para responder por WhatsApp
- registro de primer contacto
- cotizacion compartida por PDF o link
- seguimiento manual

### Fase 2: automatizacion ligera

- mensaje de confirmacion permitido
- recordatorio puntual de cotizacion
- plantilla aprobada cuando aplique
- registro de estados

### Fase 3: optimizacion

- medir tiempo a primera respuesta
- medir conversaciones iniciadas
- medir conversion a cotizacion
- medir conversion a aprobacion

## Datos minimos a guardar

- `organization_id`
- `lead_id`
- `telefono`
- `canal`
- `primer_contacto_en`
- `ultimo_estado`
- `cotizacion_id` si aplica

## Reglas

- no usar WhatsApp para outreach agresivo
- no duplicar mensajes en volumen sin personalizacion
- respetar aprobaciones y reglas del proveedor oficial
- priorizar experiencia del cliente final
- medir primero, escalar despues

## Cuando un agente proponga esta integracion

Debe explicar:

- que parte es manual
- que parte es automatizada
- como se registra
- que KPI se medira
- como ayuda a captacion, centralizacion, cotizacion o cierre
