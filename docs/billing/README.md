# Billing Ventora — Estado operativo

**Última actualización:** 2026-09-29

Estado: Mercado Pago Chile recurrente y cron de reconciliación desplegados en Vercel Production; falta una confirmación independiente de entrega de webhook de un nuevo ciclo
Responsable: billing + ingeniería

## Resumen

La pasarela recurrente usa el catálogo V2 de cuatro variantes. El código deja el
checkout disponible únicamente cuando la bandera, credenciales, secreto de
webhook y los cuatro IDs server-side están presentes; todavía falta completar
la prueba productiva con un comprador distinto y confirmar el webhook.

| Ámbito | Estado |
|---|---|
| Pasarela principal Chile (Mercado Pago) | V2 recurrente configurada en Production; pago aprobado reconciliado; entrega de webhook de un nuevo ciclo pendiente de confirmación independiente |
| Respaldo de sincronización | `/api/cron/mercadopago-billing` registrado diario en Vercel (`0 9 * * *`), protegido con `CRON_SECRET` |
| Cobro automático fuera de Chile | No disponible (WhatsApp / activación manual) |
| Flow / Webpay Plus legacy | Retirados del runtime; solo se conserva evidencia histórica |
| Mi plan (`/cuenta/suscripcion`) | Operativo con cancelación de renovación MP |

## Alcance comercial vigente (Chile)

| Plan | Periodicidad | Monto CLP | Variable de plan ID |
|---|---|---:|---|
| Ventora Cotización | Mensual | $6.990 | `MERCADOPAGO_CL_QUOTE_ONLY_MONTHLY_PLAN_ID` |
| Ventora Cotización | Anual | $59.990 | `MERCADOPAGO_CL_QUOTE_ONLY_YEARLY_PLAN_ID` |
| Ventora Comercial | Mensual | $9.990 | `MERCADOPAGO_CL_FOUNDER_MONTHLY_PLAN_ID` |
| Ventora Comercial | Anual | $89.990 | `MERCADOPAGO_CL_FOUNDER_YEARLY_PLAN_ID` |

El anual queda seleccionado por defecto. Equivalencias: Cotización $4.999/mes
(ahorro $23.890, 28%) y Comercial $7.499/mes (ahorro $29.890, 25%). Los
montos de suscripciones históricas no se revalorizan.

Moneda: **CLP**. País requerido en perfil: **`CL`**.

## Variables de servidor (producción)

```text
MERCADOPAGO_BILLING_ENABLED=true
MERCADOPAGO_CL_ACCESS_TOKEN=
MERCADOPAGO_CL_WEBHOOK_SECRET=
MERCADOPAGO_CL_QUOTE_ONLY_MONTHLY_PLAN_ID=
MERCADOPAGO_CL_FOUNDER_MONTHLY_PLAN_ID=
MERCADOPAGO_CL_FOUNDER_YEARLY_PLAN_ID=
MERCADOPAGO_CL_QUOTE_ONLY_YEARLY_PLAN_ID=
CRON_SECRET=
```

- No usar prefijo `NEXT_PUBLIC_` en secretos ni tokens.
- La UI solo recibe un booleano calculado en servidor (`isMercadoPagoChileBillingReady()`).
- Si falta alguna variable o la bandera es `false`, `/cuenta-vencida` muestra que Mercado Pago no está disponible y no ofrece un CTA alternativo de contratación.

Webhook productivo:

```text
https://www.ventorap.cl/api/subscriptions/mercadopago/webhook
```

Topics mínimos: **Planes y suscripciones** (`subscription_preapproval`, `subscription_authorized_payment`, `payment`).

## Flujo operativo

1. Usuario autenticado en `/cuenta-vencida` elige plan.
2. `POST /api/subscriptions/mercadopago/create` reserva una suscripción local `pending`, valida plan/monto en API MP y crea `preapproval`.
3. Redirect a checkout Mercado Pago (`init_point`).
4. Retorno navegador → `/dashboard?mp=confirming` con toast Sonner: primero "Confirmando...", sincroniza la cuenta con Mercado Pago y confirma el resultado (polling hasta ~30 s si sigue pendiente).
5. Webhook firmado consulta el recurso real en MP y reconcilia suscripción + ledger vía RPC `service_role`.
6. `/cuenta/suscripcion` muestra estado, próximo cobro y permite cancelar renovación.

El retorno del checkout y la carga de `/api/subscriptions/summary` también
consultan la preaprobación y sus facturas en Mercado Pago. Así recuperan estado,
pago e historial si la notificación no llegó, tanto al contratar durante la
prueba como al reactivar una cuenta vencida. La consulta valida que la
preaprobación corresponda a la reserva de la organización autenticada antes de
reconciliarla.

Como respaldo para renovaciones, `/api/cron/mercadopago-billing` consulta cada
día checkouts recientes y suscripciones con cobro próximo o vencido. El cron
usa `CRON_SECRET`; los webhooks siguen siendo el camino inmediato. La
sincronización solo registra lo que Mercado Pago confirma y no inicia cobros.

La suscripción de Mercado Pago (`preapproval` autorizada con `auto_recurring`)
es quien programa y ejecuta el débito automático en la tarjeta del pagador.
Ventora no vuelve a pedir pago manual mientras la autorización siga activa; si
Mercado Pago rechaza el cargo o la autorización se cancela, la reconciliación
refleja el estado confirmado por el proveedor, pero no fuerza otro cobro. La
frecuencia del cron es diaria, por lo que funciona como recuperación eventual;
no reemplaza la entrega inmediata del webhook.

El endpoint del cron requiere exactamente `Authorization: Bearer <CRON_SECRET>`;
sin secreto responde `401`. Revisa hasta 20 reservas recientes pendientes (48 h)
y hasta 20 suscripciones activas/vencidas con cobro antes de las próximas 24 h,
en lotes de 10. No recibe una organización desde el cliente: obtiene candidatos
del repositorio y reconcilia cada referencia `ventora:cl` con la API de MP.
Si el volumen llega al límite, devuelve `truncated: true` para alertar que quedó
trabajo fuera de ese ciclo.

Los eventos asociados a referencias `ventora:cl:` que llegan antes de que la
reserva local quede vinculada fallan de forma recuperable: el endpoint responde
error para que Mercado Pago reintente. Los pagos ajenos a Ventora siguen siendo
ignorados. Un pago que ya figure como `processed` no se recupera por replay
con el mismo `request_id`; su recuperación requiere reemitir el evento o
reconciliar el recurso desde Mercado Pago con su ID original.

## Comportamientos importantes

- **Solo Chile:** empresas con `organization_profile.country_code !== 'CL'` reciben respuesta de no disponibilidad; no se crea reserva ni cobro CLP.
- **Un checkout abierto por organización:** si el usuario vuelve atrás y elige **el mismo plan**, se reutiliza la URL pendiente; si elige **otro plan**, se libera la reserva anterior en MP y se crea una nueva.
- **Cuenta vendedora MP:** la cuenta de Mercado Pago que recibe pagos de Ventora no puede suscribirse a sus propios planes; el error se traduce al español en UI.
- **Activación:** solo vía webhook; nunca confiar en query/body del retorno del navegador.
- **Replay:** cada webhook firmado se reclama primero en `payment_webhook_events`; duplicados procesados no vuelven a mutar billing.
- **Ledger privado:** `pagos_suscripcion` se consulta solo desde servidor y la API visible omite tokens, checkout URL y payloads crudos.
- **Gracia por pago fallido:** `NEXT_PUBLIC_SUBSCRIPTION_GRACE_DAYS` (default `3`).
- **Catálogo único:** `src/features/billing/types/plans.ts`; la API recibe solo
  `planCode` lógico (`quote_only`/`founder_full`) y `billingPeriod`.
- **Grandfathering:** el lock existente se conserva y los KPI administrativos
  calculan MRR/ARR con `suscripciones_organizacion.amount` o pago aprobado.

> Despliegue coordinado: `20260814201536_security_hardening_payments_auth.sql` consta aplicada y verificada en el addendum remoto del 2026-08-20. No modificarla ni asumir que una futura base nueva la contiene sin verificar historial.

## Archivos críticos

| Capa | Ruta |
|---|---|
| Config Chile | `src/features/subscriptions/config/mercadopago-cl.config.ts` |
| Provider MP | `src/features/subscriptions/providers/mercadopago/` |
| Checkout | `src/features/subscriptions/services/mercadopago-checkout.service.ts` |
| Webhook | `src/features/subscriptions/services/mercadopago-webhook.service.ts` |
| Sincronización cron | `app/api/cron/mercadopago-billing/route.ts` |
| Búsqueda MP y reconciliación | `src/features/subscriptions/services/mercadopago-webhook.service.ts` |
| Selección de suscripciones recientes/vencidas | `src/features/subscriptions/repositories/organization-subscription.repository.ts` |
| Lifecycle / Mi plan | `src/features/subscriptions/services/mercadopago-lifecycle.service.ts` |
| API create | `app/api/subscriptions/mercadopago/create/route.ts` |
| API webhook | `app/api/subscriptions/mercadopago/webhook/route.ts` |
| API cron diario | `app/api/cron/mercadopago-billing/route.ts` |
| Agenda cron Vercel | `vercel.json` |
| UI activación | `app/(subscription-gate)/cuenta-vencida/` |
| UI Mi plan | `app/(pwa-app)/cuenta/suscripcion/` |

### Pasarelas retiradas

Mercado Pago Chile es la única pasarela activa. El checkout provider-agnostic
legacy, Flow y Webpay responden `410 Gone`; no deben volver a conectarse a la UI
ni a nuevos servicios. Las columnas y registros históricos con esos providers
se conservan únicamente para auditoría y compatibilidad de datos.

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
