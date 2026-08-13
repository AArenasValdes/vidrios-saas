# Billing LATAM - Fase 2 Mercado Pago Chile

Estado: implementada en código y aplicada al proyecto Supabase vinculado el 2026-08-13. El único bloqueo para habilitar el cobro recurrente real en Chile es operativo: credenciales productivas, IDs de los tres planes, webhook y la prueba de ciclo completo en Mercado Pago. Permanece desactivada por defecto hasta completar ese gate.

## Alcance cerrado

- Pais: Chile.
- Moneda: CLP.
- Planes: Founder mensual `$8.990`, Founder Full anual `$79.990` y Solo Cotizacion anual `$59.990`.
- Provider server-side en `src/features/subscriptions/providers/mercadopago/`.
- Creacion autenticada: `POST /api/subscriptions/mercadopago/create`.
- Webhook publico firmado: `POST /api/subscriptions/mercadopago/webhook`.
- Retorno informativo: `/cuenta-vencida/mercadopago/retorno`.
- Flow y Webpay Plus legacy siguen intactos.

## Variables de servidor

```text
MERCADOPAGO_BILLING_ENABLED=false
MERCADOPAGO_CL_ACCESS_TOKEN=
MERCADOPAGO_CL_WEBHOOK_SECRET=
MERCADOPAGO_CL_FOUNDER_MONTHLY_PLAN_ID=
MERCADOPAGO_CL_FOUNDER_YEARLY_PLAN_ID=
MERCADOPAGO_CL_QUOTE_ONLY_YEARLY_PLAN_ID=
```

No usar prefijo `NEXT_PUBLIC_`. La pantalla solo recibe un booleano calculado en servidor. Mientras falte una variable o la bandera sea `false`, `/cuenta-vencida` conserva el flujo manual por WhatsApp.

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

## Despliegue seguro

1. Mantener `MERCADOPAGO_BILLING_ENABLED=false`.
2. Mantener auditada la deuda historica de migraciones anterior al billing; no ejecutar `migration repair` masivo sin comparar el esquema.
3. Regenerar tipos Supabase si se requiere tipado generado para tablas nuevas.
4. Crear/configurar los tres planes en el ambiente productivo de Mercado Pago Chile y cargar sus IDs.
5. Cargar access token y webhook secret productivos, sin exponerlos al navegador.
6. Configurar el webhook con URL canónica `https://www.ventorap.cl/api/subscriptions/mercadopago/webhook` y los tres topics soportados.
7. Probar con credenciales de prueba: mensual, anual, webhook duplicado, pago rechazado, cancelación, doble clic y refresh del retorno.
8. Repetir el mismo smoke controlado con una cuenta interna en producción y solo entonces cambiar la bandera a `true`.

## Estado de base de datos

Las seis migraciones remotas ausentes fueron recuperadas con `supabase migration fetch --linked` antes de aplicar billing. Fase 2 se aplico directamente en la base vinculada y se registro de forma acotada como `20260812233117`; la verificacion confirma sus RPC e indice unico parcial. Sigue existiendo deuda historica de versiones locales sin marca remota, por lo que no se debe ejecutar un `db push` global ni un `migration repair` masivo sin una reconciliacion de esquema por separado.
