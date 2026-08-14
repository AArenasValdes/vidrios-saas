# Billing LATAM - Fase 2 Mercado Pago Chile

Estado: **operativa en producción (Chile) desde 2026-08-14**. Implementada en código, aplicada al proyecto Supabase vinculado el 2026-08-13 y habilitada con credenciales productivas, tres planes, webhook y `MERCADOPAGO_BILLING_ENABLED=true`. Resumen operativo: `README.md`.

## Alcance cerrado

- Pais: Chile.
- Moneda: CLP.
- Planes: Founder mensual `$8.990`, Founder Full anual `$79.990` y Solo Cotizacion anual `$59.990`.
- Provider server-side en `src/features/subscriptions/providers/mercadopago/`.
- Creacion autenticada: `POST /api/subscriptions/mercadopago/create`.
- Webhook publico firmado: `POST /api/subscriptions/mercadopago/webhook`.
- Retorno informativo: `/cuenta-vencida/mercadopago/retorno`.
- Flow y Webpay Plus quedan como historial de esta fase; sus endpoints ya no son pasarelas activas y responden `410 Gone`.

## Variables de servidor

```text
MERCADOPAGO_BILLING_ENABLED=true
MERCADOPAGO_CL_ACCESS_TOKEN=
MERCADOPAGO_CL_WEBHOOK_SECRET=
MERCADOPAGO_CL_FOUNDER_MONTHLY_PLAN_ID=
MERCADOPAGO_CL_FOUNDER_YEARLY_PLAN_ID=
MERCADOPAGO_CL_QUOTE_ONLY_YEARLY_PLAN_ID=
```

No usar prefijo `NEXT_PUBLIC_`. La pantalla solo recibe un booleano calculado en servidor. En produccion la bandera debe ser `true` con las seis variables completas. Si falta alguna, `/cuenta-vencida` conserva el flujo manual por WhatsApp.

## Contrato de seguridad

1. El cliente envia solo `planCode`; organizacion, correo, monto, moneda e ID del plan salen del servidor.
2. Antes de crear, Ventora consulta el plan real en Mercado Pago y exige estado activo, monto y moneda exactos.
3. Una reserva local y un indice unico parcial impiden dos suscripciones Mercado Pago abiertas para la misma organizacion.
4. El retorno nunca escribe ni activa. Refrescarlo es inocuo.
5. El webhook exige `x-signature` y `x-request-id`, verifica HMAC-SHA256 con comparacion de tiempo constante y solo despues consulta el recurso real en Mercado Pago.
6. Se procesan `subscription_preapproval`, `subscription_authorized_payment` y `payment`.
7. Suscripcion y ledger se escriben con RPC `service_role`; IDs externos son unicos. Un webhook duplicado hace upsert sobre el mismo pago y no extiende dos veces el periodo.
8. Eventos de pago antiguos quedan en el ledger, pero no degradan un periodo mas nuevo.

## Estados

| Mercado Pago | Suscripcion Ventora | Pago Ventora |
|---|---|---|
| `pending` | `pending` | `pendiente` |
| `authorized` / pago `approved` | `active` | `aprobado` |
| pago `rejected` | `past_due` | `fallido` |
| `paused` | `paused` | segun recurso |
| `cancelled` | `cancelled` con acceso hasta fin pagado | `cancelado` si corresponde |

## Despliegue y operación (completado 2026-08-14)

1. ~~Mantener `MERCADOPAGO_BILLING_ENABLED=false`~~ → **activo en producción**.
2. Mantener auditada la deuda historica de migraciones anterior al billing; no ejecutar `migration repair` masivo sin comparar el esquema.
3. Tipos Supabase regenerados desde schema remoto cuando hubo cambios de billing.
4. Tres planes productivos creados en Mercado Pago Chile; IDs cargados en Vercel.
5. Access token y webhook secret productivos cargados; no expuestos al navegador.
6. Webhook configurado en `https://www.ventorap.cl/api/subscriptions/mercadopago/webhook` con topics de suscripciones y pagos.
7. Checkout validado end-to-end hasta pantalla de pago MP (incluye cambio de plan al volver atrás: reutiliza mismo plan o libera reserva pendiente al elegir otro).
8. Activación de cuenta depende del webhook; el retorno del navegador no escribe estado.

### Notas de integración MP Chile

- La suscripción se crea con `POST /preapproval` en estado `pending`, copiando `auto_recurring` del plan validado (con fallback al catálogo Ventora si el plan del panel MP no trae recurrencia completa).
- No se envía `preapproval_plan_id` en el alta para evitar exigencia de `card_token_id` en servidor; el plan se valida con `GET /preapproval_plan/{id}` antes de crear.
- Mensajes de error del proveedor se traducen en `mercadopago-user-message.ts` (por ejemplo, cuenta pagadora igual a la vendedora).

## Estado de base de datos

Las seis migraciones remotas ausentes fueron recuperadas con `supabase migration fetch --linked` antes de aplicar billing. Fase 2 se aplico directamente en la base vinculada y se registro de forma acotada como `20260812233117`; la verificacion confirma sus RPC e indice unico parcial. Sigue existiendo deuda historica de versiones locales sin marca remota, por lo que no se debe ejecutar un `db push` global ni un `migration repair` masivo sin una reconciliacion de esquema por separado.
