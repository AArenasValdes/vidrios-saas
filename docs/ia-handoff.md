# Handoff IA - Ventora

Actualizado: 2026-05-31.

Contexto corto para otra IA o para retomar sin releer todo el repo.

---

## Que es Ventora hoy

Ventora es **software comercial para empresas de vidrios y aluminio que captura, centraliza y ayuda a cerrar leads**.

La cotizacion existe como herramienta de cierre, no como identidad principal del producto.

No es:
- ERP
- software de produccion
- cotizador tecnico de perfileria
- sistema de logistica

Frase clave:

**"Capturo leads mientras estoy ocupado o dormido, y los centralizo en un solo lugar para que nadie se pierda."**

---

## Estado real del producto

Ya funciona:
- login con Supabase Auth
- solicitudes publicas por empresa en `/solicitud/[empresa]`
- tracking UTM y `source_url`
- generador de links por canal + QR
- dashboard privado
- clientes
- cotizaciones
- PDF y WhatsApp
- aprobacion publica en `/presupuesto/[token]`
- branding de empresa y mini landing publica
- trial gratis de 7 dias
- cuenta en modo lectura cuando vence
- activacion anual con Webpay Plus

Fragil o pendiente:
- QA punta a punta con pago real de produccion
- observabilidad operativa de pagos
- validacion real de push/email en cuentas piloto
- algunos textos y archivos aun tienen riesgo de encoding heredado
- drift historico entre migraciones locales y registro remoto de Supabase

---

## Estrategia comercial y tecnica de pagos

Modelo vigente:
- `Founder Full Anual` `$79.990`: principal, Webpay Plus
- `Solo Cotizacion Anual` `$59.990`: opcion simple, Webpay Plus
- `Mensual` `$8.990`: manual por WhatsApp, secundario
- `Plan Empresa Acompañado` desde `$250.000`: consultivo, fuera del flujo SaaS estandar

Decisiones importantes:
- no implementar recurrencia automatica todavia
- no implementar Oneclick todavia
- no implementar PatPass todavia
- no guardar datos de tarjeta
- no crear tablas nuevas de tokenizacion o cobro recurrente por ahora

Regla de negocio actual:
- si la cuenta ya esta activa y `subscription_ends_at > now()`, no debe poder generar otro pago Webpay accidental
- upgrade/downgrade quedan fuera de alcance por ahora

---

## Estado de Supabase

Base actual:
- RLS activo en 26/26 tablas `public`
- `pagos_suscripcion` ya quedo endurecida: cliente autenticado solo lee; escritura queda server-side con `service_role`
- `web_push_subscriptions` quedo con policies mas eficientes
- advisors criticos de FK sin indice y duplicate index ya fueron resueltos

Riesgos aceptados:
- `Leaked Password Protection` no activo porque el proyecto esta en plan Free
- quedan warnings de `unused_index`, pero no son bloqueantes antes de trafico real
- existe drift historico: remoto registra menos migraciones que las que existen localmente, aunque el schema ya contiene muchos de esos objetos

Migraciones recientes importantes:
- `20260531212114_harden_subscription_security_advisors`
- `20260531212250_optimize_web_push_rls_initplan`
- `20260531232020_add_missing_fk_indexes_and_drop_duplicate`

---

## Arquitectura que no se debe romper

```text
page / component -> hook -> service -> repository -> Supabase
```

Reglas:
- filtrar siempre por `organization_id`
- usar soft delete
- calculos en services
- no meter negocio en repositories
- no tocar rutas publicas criticas sin QA: `/solicitud/[empresa]` y `/presupuesto/[token]`

---

## Rutas y zonas clave

- `docs/agent-map/README.md`
- `docs/contexto-rapido-web.md`
- `docs/agent-map/FEATURES_MAP.md`
- `src/features/subscriptions/`
- `app/(pwa-app)/cuenta-vencida/`
- `app/api/subscriptions/webpay/`
- `src/features/organization-profile/`
- `src/features/solicitudes/`
- `src/features/cotizaciones/`

---

## Siguiente paso recomendado

Cerrar el flujo **Webpay anual en produccion punta a punta** sin abrir mas superficie tecnica.

Checklist sugerido:
1. Validar env vars finales de Transbank y URL canonica en produccion.
2. Ejecutar 1 pago real controlado por cada plan anual.
3. Confirmar update correcto en `pagos_suscripcion` y `organization_profile`.
4. Confirmar que una cuenta activa no pueda iniciar un segundo Webpay accidental.
5. Documentar runbook operativo de incidentes:
   - pago aprobado sin activacion
   - usuario vuelve desde Transbank sin confirmacion visible
   - doble click / doble intento
   - conciliacion manual por `buy_order`

No seguir ahora con:
- Oneclick
- PatPass
- mensual automatico
- upgrades/downgrades
- nuevas tablas de billing

---

## Prompt corto para pedir segunda opinion

Quiero una segunda opinion sobre la estrategia actual de activacion y pagos de Ventora.

Contexto:
- SaaS B2B para empresas de vidrios y aluminio
- trial gratis de 7 dias
- planes anuales con Webpay Plus ya implementados y probados
- Founder Full Anual $79.990
- Solo Cotizacion Anual $59.990
- mensual $8.990 solo manual por WhatsApp
- no queremos recurrencia automatica todavia
- no queremos Oneclick ni PatPass por ahora
- la app debe empujar anual y reducir friccion operativa
- la cuenta vencida queda en modo lectura y usa `/cuenta-vencida` como pantalla de activacion
- Supabase ya tiene RLS endurecido y `pagos_suscripcion` solo se escribe desde server

Dame observaciones sobre:
- riesgos de UX/comerciales
- riesgos operativos de pagos
- si el modelo hibrido anual + mensual manual tiene sentido
- que validaria antes de salir a produccion
