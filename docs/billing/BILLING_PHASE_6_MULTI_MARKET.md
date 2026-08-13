# Billing LATAM - Fase 6 preparacion multi-mercado

Estado: preparada en código el 2026-08-13. La regionalización comercial de Ventora ya está operativa; ningún mercado adicional de cobro está activado.

## Contrato

- `src/features/subscriptions/config/mercadopago-market.config.ts` es el catalogo server-side de mercados Mercado Pago.
- Chile mantiene los precios comerciales vigentes y el wrapper `mercadopago-cl.config.ts` para no alterar el checkout ya implementado.
- Peru, Colombia, Argentina, Uruguay y Mexico tienen moneda y nombres de variables aislados, pero no tienen precios comerciales configurados. Por eso no pueden quedar listos aunque se carguen secretos por error.
- No hay conversion FX automatica. Para habilitar un pais se debe agregar deliberadamente su precio por plan al catalogo versionado, con decision comercial aprobada.
- El checkout actual sigue siendo Chile. Antes de reservar una suscripcion confirma en servidor que `organization_profile.country_code` sea `CL`; una empresa de otro pais recibe una respuesta de no disponibilidad, sin crear reserva ni cobro CLP.
- La configuración regional de cotizaciones (moneda, impuesto y redondeo comercial) no habilita por sí sola el cobro de la suscripción en ese país.

## Variables por mercado

Chile mantiene compatibilidad:

```text
MERCADOPAGO_BILLING_ENABLED=false
MERCADOPAGO_CL_ACCESS_TOKEN=
MERCADOPAGO_CL_WEBHOOK_SECRET=
MERCADOPAGO_CL_FOUNDER_MONTHLY_PLAN_ID=
MERCADOPAGO_CL_FOUNDER_YEARLY_PLAN_ID=
MERCADOPAGO_CL_QUOTE_ONLY_YEARLY_PLAN_ID=
```

Los demas mercados usan el mismo patron, por ejemplo Peru:

```text
MERCADOPAGO_PE_BILLING_ENABLED=false
MERCADOPAGO_PE_ACCESS_TOKEN=
MERCADOPAGO_PE_WEBHOOK_SECRET=
MERCADOPAGO_PE_FOUNDER_MONTHLY_PLAN_ID=
MERCADOPAGO_PE_FOUNDER_YEARLY_PLAN_ID=
MERCADOPAGO_PE_QUOTE_ONLY_YEARLY_PLAN_ID=
```

Repetir con `CO`, `AR`, `UY` o `MX`. Nunca exponer estas variables con `NEXT_PUBLIC_`.

## Gate para activar un pais

1. Definir precio deliberado por cada plan que se venda, sin convertir el precio CLP.
2. Crear y verificar los IDs de `preapproval_plan` en el ambiente correcto.
3. Cargar access token y webhook secret del mismo mercado.
4. Probar alta, pago aprobado/rechazado, webhook duplicado, cancelacion y retorno informativo con una empresa del pais.
5. Habilitar solo su flag de mercado y observar ledger/webhooks antes de pasar al siguiente pais.

No activar estos mercados hasta terminar esas cinco validaciones. El siguiente hito operativo es habilitar primero Chile con credenciales reales; la expansión posterior conserva este gate por país.
