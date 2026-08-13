# Billing LATAM — Fase 1

Estado: implementada en codigo y aplicada al proyecto Supabase vinculado el 2026-08-12. Mercado Pago aun no conectado.

## Contrato

- `suscripciones_organizacion` guarda el contrato recurrente neutral por tenant.
- `pagos_suscripcion` sigue siendo el unico ledger de pagos. Conserva columnas legacy y agrega monto/moneda neutrales, `subscription_id` y `provider_payment_id`.
- Un trigger completa monto/moneda neutrales cuando una version anterior del codigo inserta solo `amount_clp/currency`; esto permite desplegar schema antes que aplicacion.
- `organization_profile` sigue siendo la proyeccion rapida que usa el control de acceso actual.
- `activate_subscription_from_payment(payment_id)` es el unico escritor del alta: valida pago aprobado, hace upsert idempotente de suscripcion, enlaza el pago y actualiza la proyeccion en una transaccion.
- Flow, Webpay Plus y activacion manual se conservan. `mercadopago` queda permitido en el dominio, sin checkout ni webhook hasta las fases correspondientes.

## Seguridad

- RLS activa y forzada en `suscripciones_organizacion`.
- `authenticated`: solo `select` de su `organization_id` y filas no eliminadas.
- `anon`: sin privilegios.
- Escrituras y ejecucion del RPC: solo `service_role`.
- Identificadores externos tienen indices unicos parciales para reintentos idempotentes.

## Despliegue aplicado

1. Migracion `20260812230428_billing_phase_1_recurring_core.sql` aplicada y registrada.
2. Tipos de Supabase regenerados desde el schema remoto.
3. Smoke anonimo confirmado: tabla y RPC responden `42501 permission denied`.
4. RPC validado de punta a punta con pago temporal y `ROLLBACK`: suscripcion, enlace de ledger y proyeccion quedaron consistentes antes de revertir.
5. Insert legacy sin columnas nuevas validado con `ROLLBACK`; el codigo productivo anterior sigue compatible durante el despliegue escalonado.
6. El deploy del codigo queda como operacion separada del repositorio.

La historia remota de migraciones ya estaba desalineada antes de esta fase. No usar `supabase db push` hasta reconciliarla; aplicar esta migracion de forma dirigida y registrarla con su version.

## Marcha atras

El codigo antiguo puede seguir leyendo las columnas legacy. Para una marcha atras de aplicacion, revertir primero el deploy; no borrar `suscripciones_organizacion` ni las nuevas columnas porque contienen trazabilidad financiera. Cualquier rollback de schema debe ser una migracion posterior y preservadora de datos.
