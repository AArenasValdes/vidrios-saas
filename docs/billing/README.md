# Billing Ventora — Estado operativo

**Última actualización:** 2026-08-14

Estado: operativo
Responsable: billing + ingeniería

## Resumen

La **pasarela de pago recurrente con Mercado Pago Chile está lista y operativa en producción**. Las empresas chilenas con trial vencido o cuenta inactiva pueden contratar desde `/cuenta-vencida` sin depender de WhatsApp cuando la configuración server-side está completa.

| Ámbito | Estado |
|---|---|
| Pasarela principal Chile (Mercado Pago) | **Operativa** |
| Cobro automático fuera de Chile | No disponible (WhatsApp / activación manual) |
| Flow / Webpay Plus legacy | Preservados en código; no son la UI principal de altas nuevas |
| Mi plan (`/cuenta/suscripcion`) | Operativo con cancelación de renovación MP |

## Alcance comercial vigente (Chile)

| Plan | Periodicidad | Monto CLP | Variable de plan ID |
|---|---|---:|---|
| Founder Full | Mensual | $8.990 | `MERCADOPAGO_CL_FOUNDER_MONTHLY_PLAN_ID` |
| Founder Full | Anual | $79.990 | `MERCADOPAGO_CL_FOUNDER_YEARLY_PLAN_ID` |
| Solo Cotización | Anual | $59.990 | `MERCADOPAGO_CL_QUOTE_ONLY_YEARLY_PLAN_ID` |

Moneda: **CLP**. País requerido en perfil: **`CL`**.

## Variables de servidor (producción)

```text
MERCADOPAGO_BILLING_ENABLED=true
MERCADOPAGO_CL_ACCESS_TOKEN=
MERCADOPAGO_CL_WEBHOOK_SECRET=
MERCADOPAGO_CL_FOUNDER_MONTHLY_PLAN_ID=
MERCADOPAGO_CL_FOUNDER_YEARLY_PLAN_ID=
MERCADOPAGO_CL_QUOTE_ONLY_YEARLY_PLAN_ID=
```

- No usar prefijo `NEXT_PUBLIC_` en secretos ni tokens.
- La UI solo recibe un booleano calculado en servidor (`isMercadoPagoChileBillingReady()`).
- Si falta alguna variable o la bandera es `false`, `/cuenta-vencida` conserva el flujo manual por WhatsApp.

Webhook productivo:

```text
https://www.ventorap.cl/api/subscriptions/mercadopago/webhook
```

Topics mínimos: **Planes y suscripciones** (`subscription_preapproval`, `subscription_authorized_payment`, `payment`).

## Flujo operativo

1. Usuario autenticado en `/cuenta-vencida` elige plan.
2. `POST /api/subscriptions/mercadopago/create` reserva una suscripción local `pending`, valida plan/monto en API MP y crea `preapproval`.
3. Redirect a checkout Mercado Pago (`init_point`).
4. Retorno navegador → `/dashboard?mp=confirming` con toast Sonner: primero "Confirmando...", luego éxito cuando el webhook proyecta `active` (polling ~30 s).
5. Webhook firmado consulta el recurso real en MP y reconcilia suscripción + ledger vía RPC `service_role`.
6. `/cuenta/suscripcion` muestra estado, próximo cobro y permite cancelar renovación.

## Comportamientos importantes

- **Solo Chile:** empresas con `organization_profile.country_code !== 'CL'` reciben respuesta de no disponibilidad; no se crea reserva ni cobro CLP.
- **Un checkout abierto por organización:** si el usuario vuelve atrás y elige **el mismo plan**, se reutiliza la URL pendiente; si elige **otro plan**, se libera la reserva anterior en MP y se crea una nueva.
- **Cuenta vendedora MP:** la cuenta de Mercado Pago que recibe pagos de Ventora no puede suscribirse a sus propios planes; el error se traduce al español en UI.
- **Activación:** solo vía webhook; nunca confiar en query/body del retorno del navegador.
- **Gracia por pago fallido:** `NEXT_PUBLIC_SUBSCRIPTION_GRACE_DAYS` (default `3`).

## Archivos críticos

| Capa | Ruta |
|---|---|
| Config Chile | `src/features/subscriptions/config/mercadopago-cl.config.ts` |
| Provider MP | `src/features/subscriptions/providers/mercadopago/` |
| Checkout | `src/features/subscriptions/services/mercadopago-checkout.service.ts` |
| Webhook | `src/features/subscriptions/services/mercadopago-webhook.service.ts` |
| Lifecycle / Mi plan | `src/features/subscriptions/services/mercadopago-lifecycle.service.ts` |
| API create | `app/api/subscriptions/mercadopago/create/route.ts` |
| API webhook | `app/api/subscriptions/mercadopago/webhook/route.ts` |
| UI activación | `app/(subscription-gate)/cuenta-vencida/` |
| UI Mi plan | `app/(pwa-app)/cuenta/suscripcion/` |

## Runbooks por fase

| Fase | Documento | Estado |
|---|---|---|
| 1 — Core recurrente | `BILLING_PHASE_1_IMPLEMENTATION.md` | Aplicada |
| 2 — Mercado Pago Chile | `BILLING_PHASE_2_MERCADOPAGO_CHILE.md` | **Operativa** |
| 3 — Lifecycle / Mi plan | `BILLING_PHASE_3_LIFECYCLE.md` | Operativa |
| 4 — Regionalización comercial | `BILLING_PHASE_4_REGIONALIZATION.md` | Aplicada |
| 5 — Snapshots cotización | Ver `CHANGELOG_AGENT_MAP.md` | Aplicada |
| 6 — Multi-mercado (prep.) | `BILLING_PHASE_6_MULTI_MARKET.md` | Chile live; demás países apagados |

## Fuera de alcance actual

- Cobro Mercado Pago en Perú, Colombia, Argentina, Uruguay o México (requieren precio, credenciales y QA propios).
- Facturación fiscal / emisión de DTE.
- Reintentos propios de cobro (Mercado Pago conserva esa responsabilidad).

## Troubleshooting checkout

### Boton "Confirmar" deshabilitado (gris) en Mercado Pago

**Causa mas frecuente:** el pagador esta logueado en `mercadopago.cl` con la **misma cuenta vendedora** que recibe los cobros de Ventora (por ejemplo, aparece `VENTORA SOFTWARE SPA` arriba a la derecha). Mercado Pago bloquea la auto-compra y deja el boton inactivo sin un error claro en pantalla.

**Que hacer:**

1. Cerrar sesion en [mercadopago.cl](https://www.mercadopago.cl) o abrir el checkout en **ventana privada/incognito**.
2. Iniciar sesion con una **cuenta Mercado Pago distinta** (correo personal, no el de la cuenta vendedora).
3. Completar el pago con tarjeta asociada a esa cuenta pagadora.
4. Para pruebas internas, pedir a otra persona que complete el checkout o usar una segunda cuenta MP real.

**Otras causas posibles:**

- Validacion de tarjeta ($950 CLP de prueba): esperar unos minutos o revisar movimientos del banco.
- Cuenta vendedora con verificacion KYC/bancaria incompleta en el panel de Mercado Pago.
- Tarjeta debito con restricciones del banco para cargos recurrentes (probar otra tarjeta o credito).

Ventora no controla el checkout alojado de Mercado Pago; el error `Payer and collector cannot be the same user` solo aparece en algunos flujos API, no siempre en la UI hosted.
