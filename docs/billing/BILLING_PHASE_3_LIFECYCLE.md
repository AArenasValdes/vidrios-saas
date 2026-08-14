# Billing LATAM - Fase 3 Lifecycle y Mi plan

Estado: implementada en codigo el 2026-08-13 y operativa en produccion desde 2026-08-14 junto con Mercado Pago Chile. Fase 1, Fase 2 y el cambio de trial a 15 dias ya estan aplicados al proyecto Supabase vinculado.

## Reglas implementadas

- `/cuenta/suscripcion` informa plan, periodicidad, estado, ultimo pago aprobado y proximo cobro. Si la renovacion fue cancelada, informa el ultimo dia de acceso ya pagado.
- La cancelacion Mercado Pago es un `POST` autenticado. La organizacion sale de la sesion del servidor; nunca del body del navegador.
- La accion solo aparece cuando `MERCADOPAGO_BILLING_ENABLED=true` y todos los secretos/IDs de planes estan listos. Hasta entonces no hay llamadas al proveedor.
- Mercado Pago confirma la cancelacion antes de que Ventora proyecte el estado local. La suscripcion se marca `cancel_at_period_end=true` y el acceso no se revoca antes de `current_period_ends_at`.
- Un pago fallido deja la suscripcion en `past_due`. La gracia se calcula desde el fin del periodo y permite seguir escribiendo durante `NEXT_PUBLIC_SUBSCRIPTION_GRACE_DAYS`; el valor por defecto es `3` y se admite entre `1` y `14` dias.
- Un pago aprobado vuelve a proyectar `active`, por lo que sale naturalmente de la gracia. No se implementan cron jobs ni reintentos propios: Mercado Pago conserva esa responsabilidad.
- Una suscripcion abierta por organizacion y la validacion de cuenta activa impiden compras duplicadas.

## Variable adicional

```text
NEXT_PUBLIC_SUBSCRIPTION_GRACE_DAYS=3
```

Es una regla visible para que el cliente pueda explicar la fecha de gracia; no contiene secretos. Si falta o es invalida, Ventora usa 3 dias.

## QA en produccion

1. ~~Mantener `MERCADOPAGO_BILLING_ENABLED=false`~~ → bandera activa con secretos e IDs completos.
2. Fase 1, Fase 2 y trial de 15 dias aplicados en la base vinculada.
3. Crear suscripcion, completar pago y comprobar plan, fecha y proximo pago en `/cuenta/suscripcion`.
4. Simular pago rechazado: confirmar aviso `past_due`, acceso durante la gracia y bloqueo de escritura al terminarla.
5. Simular pago posterior aprobado: confirmar regreso a `active` sin crear otra suscripcion.
6. Cancelar renovacion desde `Mi plan`: Mercado Pago debe confirmarla, no debe haber proximo cobro y el acceso debe persistir hasta el fin ya pagado.
7. Repetir click/refresco y webhook duplicado; no deben aparecer cargos, periodos o pagos adicionales.
