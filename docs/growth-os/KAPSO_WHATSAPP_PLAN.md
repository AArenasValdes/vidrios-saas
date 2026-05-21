# Kapso WhatsApp Plan - Ventora

## Objetivo

Evaluar un MVP de integracion WhatsApp con Kapso para reforzar el nucleo de Ventora sin implementar aun.

## Casos de uso permitidos

- inbound desde solicitudes o respuestas del cliente
- registro de primera respuesta
- seguimiento liviano de solicitudes ya abiertas
- recordatorio puntual de cotizacion
- trazabilidad de estados de mensaje

## Casos de uso NO recomendados

- cold outreach automatizado
- blasting masivo
- bots invasivos
- secuencias promocionales agresivas
- reemplazar la logica actual de share link/WhatsApp si no hay beneficio claro

## Inbound

Objetivo:

- registrar mensajes entrantes relevantes
- atar conversacion a lead o cotizacion cuando aplique
- mejorar medicion de speed-to-lead

## Seguimiento de solicitudes

Uso permitido:

- mensaje humano desde Ventora
- plantilla solo donde exista opt-in y motivo legitimo
- estado de seguimiento visible para el vendedor

## Recordatorio de cotizacion

Uso permitido:

- recordatorio puntual de una cotizacion ya enviada
- siempre dentro del marco de la conversacion habilitada o con template aprobada

## Opt-in

Requisito:

- mantener registro explicito de consentimiento cuando aplique para mensajes fuera de la ventana conversacional

Campos minimos sugeridos:

- `organization_id`
- `lead_id`
- `telefono`
- `opt_in_source`
- `opt_in_text`
- `opt_in_at`

## Templates

Uso recomendado:

- confirmacion de recepcion
- seguimiento de cotizacion
- aviso de documento listo

No usar para:

- promociones agresivas
- mensajes sin contexto del cliente

## Riesgos de bloqueo

- mensajes no solicitados
- volumen identico desde un mismo numero
- mal manejo de opt-in
- plantillas promocionales mal categorizadas

## MVP recomendado

Fase 1:

- mantener el share link actual por `wa.me`
- agregar solo registro de mensajes/estados via proveedor cuando sea viable
- habilitar webhook inbound y panel interno minimo

Fase 2:

- recordatorio de cotizacion con template aprobada
- medicion de primera respuesta y delivery

## Variables de entorno sugeridas

- `KAPSO_API_KEY`
- `KAPSO_WEBHOOK_SECRET`
- `KAPSO_PHONE_NUMBER_ID`
- `KAPSO_PROJECT_ID`
- `WHATSAPP_PROVIDER=kapso`

## Tablas sugeridas

No implementar aun. Solo referencia para futuro.

### `whatsapp_conversations`

- `id`
- `organization_id`
- `lead_id`
- `cotizacion_id`
- `telefono`
- `provider`
- `provider_conversation_id`
- `estado`
- `ultimo_mensaje_en`
- `creado_en`
- `actualizado_en`
- `eliminado_en`

### `whatsapp_message_events`

- `id`
- `organization_id`
- `conversation_id`
- `provider_message_id`
- `direction`
- `event_type`
- `payload_json`
- `ocurrio_en`
- `creado_en`

### `whatsapp_opt_ins`

- `id`
- `organization_id`
- `lead_id`
- `telefono`
- `source`
- `text`
- `granted_at`
- `revoked_at`
- `creado_en`
- `eliminado_en`

## Endpoints sugeridos

No implementar aun. Solo referencia para futuro.

- `POST /api/whatsapp/webhooks/kapso`
- `POST /api/whatsapp/messages/send-template`
- `POST /api/whatsapp/opt-in`
- `GET /api/whatsapp/conversations`

## Decision Go/No-Go

### Go si

- hay volumen real de solicitudes
- el equipo necesita trazabilidad de respuesta
- se puede mantener opt-in limpio
- el beneficio supera seguir solo con `wa.me`

### No-Go si

- el equipo aun no responde bien manualmente
- no existe owner operativo
- la necesidad real aun es solo compartir link de WhatsApp
- la complejidad supera el valor en etapa actual
