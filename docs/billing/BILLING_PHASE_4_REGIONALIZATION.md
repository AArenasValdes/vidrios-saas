# Billing LATAM - Fase 4 Regionalizacion

Estado: implementada y aplicada en el proyecto Supabase vinculado el 2026-08-13 mediante `20260813015101_billing_phase_4_organization_region`. La configuración regional ya alimenta los cálculos comerciales nuevos, el catálogo de líneas y la activación; no queda limitada a formato visual.

## Alcance

- `organization_profile` conserva `country_code`, `currency_code`, `locale`, `timezone`, `phone_country_code`, `tax_label`, `tax_rate_default` y `tax_id_label`.
- Los perfiles existentes quedaron en Chile como compatibilidad (`CL`, `CLP`, `es-CL`, `America/Santiago`, `+56`, `IVA 19%`, `RUT`). No se cambiaron cotizaciones ni documentos existentes.
- El alta con Google exige pais y guarda el preset dentro de la misma RPC atomica. `complete_google_oauth_account` mantiene locks por identidad/correo y solo se ejecuta con `service_role`.
- La configuracion de empresa permite cambiar el pais y editar los valores regionales del preset. Los paises iniciales son Argentina, Chile, Colombia, Mexico, Peru y Uruguay.
- Los telefonos nuevos se normalizan a E.164 y la solicitud publica usa el codigo de pais de la empresa. Las pantallas propias de Ventora que son exclusivamente chilenas no se reinterpretan como configuracion de cliente.
- `formatCurrency` deja que `Intl.NumberFormat` determine los decimales de cada moneda; no fuerza una regla chilena.
- Las cotizaciones nuevas resuelven tasa y redondeo comercial desde su snapshot regional: Chile conserva IVA 19% y redondeo a $1.000; los demás presets no heredan ese redondeo chileno.

## Limites intencionales

- Esta fase no crea cobros Mercado Pago fuera de Chile, no activa `MERCADOPAGO_BILLING_ENABLED` y no resuelve impuestos legales ni emite factura fiscal.
- No se cambia la representación de PDFs, enlaces públicos de presupuestos ni WhatsApp de cotizaciones ya guardadas. La Fase 5 ya guarda snapshots regionales por cotización antes de usar configuración actual en documentos históricos.
- Los nombres y tasas tributarias son defaults editables de presentacion comercial; deben revisarse con asesoria local antes de usarse como regla fiscal.

## Verificacion remota

- La primera aplicacion fue rechazada dentro de la transaccion por un patron regex mal escapado; no alcanzo a crear columnas. El marcador de historial se revirtio antes del reintento.
- El reintento aplicado confirma las ocho columnas con defaults de Chile y la firma de la RPC con `p_country_code text`.
- Consulta remota del 2026-08-13: las 31 organizaciones existentes tienen perfil regional Chile (`CL`, `CLP`, `es-CL`, `IVA`, `19%`) y no hay organizaciones activas sin `organization_profile`.
- Sigue prohibido `supabase db push` global: existe deuda historica de migraciones no relacionada. Para cambios nuevos se aplica y verifica solo la migracion especifica, luego se registra esa version.
