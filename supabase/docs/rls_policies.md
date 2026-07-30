# RLS Policies - Ventora

Fuente de verdad: `current_schema.sql`.
Fecha de generación: 2026-05-30.

---

## Resumen

Todas las tablas de `public` tienen RLS habilitado. El event trigger `rls_auto_enable` fuerza ese comportamiento para tablas nuevas. La función principal de aislamiento es `get_org_id()`, que resuelve la organización activa del usuario autenticado desde `public.users`.

**Total tablas con RLS habilitado:** 26 versionadas por migraciones recientes.
**Total tablas con policies definidas:** 24+ segun migraciones locales; verificacion remota parcial con CLI el 2026-07-29.
**Total tablas con RLS habilitado pero sin acceso cliente efectivo:** `formula_variables` tiene deny-all confirmado en remoto; `material_types` debe re-verificarse si vuelve a exponerse.
**Función de aislamiento principal:** `get_org_id()`

---

## Función `get_org_id()`

```sql
select organization_id
from public.users
where auth_user_id = auth.uid()
  and eliminado_en is null
limit 1;
```

- Retorna `bigint`.
- Si no encuentra usuario válido en `public.users`, retorna `NULL`.
- Es `SECURITY DEFINER` y `STABLE`.

Riesgo residual:
- Si el usuario existe pero su org quedó soft-deleted, la función igual retornará `organization_id`.

---

## Tablas con policies definidas

### 1. `clients`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `clients_select` | SELECT | `organization_id = get_org_id()` | — |
| `clients_insert` | INSERT | — | `organization_id = get_org_id()` |
| `clients_update` | UPDATE | `organization_id = get_org_id()` | — |

### 2. `cotizaciones`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `cotizaciones_select` | SELECT | `organization_id = get_org_id()` | — |
| `cotizaciones_insert` | INSERT | — | `organization_id = get_org_id()` |
| `cotizaciones_update` | UPDATE | `organization_id = get_org_id()` | — |

**Verificacion 2026-07-08 (Quote Studio financial snapshots, aplicado remoto):** la migracion `add_quote_studio_financial_snapshot` se aplico en el proyecto remoto `yrtrwgkaopfumpidjthk`. Agrega solo columnas nullable en `cotizaciones`. No requiere policies nuevas: `cotizaciones_select`, `cotizaciones_insert` y `cotizaciones_update` siguen aislando por `organization_id = get_org_id()` para lectura y escritura de los campos snapshot.

### 3. `cotizacion_items`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `items_select` | SELECT | `organization_id = get_org_id()` | — |
| `items_insert` | INSERT | — | `organization_id = get_org_id()` |
| `items_update` | UPDATE | `organization_id = get_org_id()` | — |

### 4. `projects`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `projects_select` | SELECT | `organization_id = get_org_id()` | — |
| `projects_insert` | INSERT | — | `organization_id = get_org_id()` |
| `projects_update` | UPDATE | `organization_id = get_org_id()` | — |

### 5. `users`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `users_select` | SELECT | `organization_id = get_org_id()` | — |
| `users_insert` | INSERT | — | `organization_id = get_org_id()` |
| `users_update` | UPDATE | `organization_id = get_org_id()` | — |

Riesgo:
- No hay diferenciación por `rol`. Un usuario autenticado de la org puede ver y editar otros usuarios de su misma org.

**Grants vigentes desde 2026-07-28:**
- La advertencia anterior describe la policy aislada; no representa el acceso efectivo despues del hardening de grants.
- Las policies siguen sin diferenciar por `rol`, pero `authenticated` ya no tiene privilegios de INSERT/UPDATE/DELETE sobre la tabla.
- `authenticated` solo puede seleccionar columnas operativas no privadas.
- `nombre`, `whatsapp`, `ciudad_comuna` y `data_sharing_accepted_at` no tienen SELECT cliente; solo se acceden server-side con `service_role`.

### 6. `materials`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `materials_select` | SELECT | `organization_id = get_org_id()` | — |
| `materials_insert` | INSERT | — | `organization_id = get_org_id()` |
| `materials_update` | UPDATE | `organization_id = get_org_id()` | — |

### 7. `historial_precios`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `historial_select` | SELECT | `organization_id = get_org_id()` | — |
| `historial_insert` | INSERT | — | `organization_id = get_org_id()` |

### 8. `organizations`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `org_select` | SELECT | `id = get_org_id()` | — |
| `org_update` | UPDATE | `id = get_org_id()` | — |

### 9. `organization_profile`

Usa subquery directa a `public.users` en vez de `get_org_id()`.

| Policy | Operación | USING | WITH CHECK | Rol |
|---|---|---|---|---|
| `organization_profile_select_own` | SELECT | subquery users | — | `authenticated` |
| `organization_profile_insert_own` | INSERT | — | subquery users | `authenticated` |
| `organization_profile_update_own` | UPDATE | subquery users | subquery users | `authenticated` |

### 10. `labor_costs`

| Policy | Operación | USING | WITH CHECK |
|---|---|---|---|
| `labor_costs_select` | SELECT | `organization_id = get_org_id()` | — |

### 11. `configuration_materials`

Usa subquery cruzada hacia `system_configurations`.

### 12. `system_configurations`

| Policy | Operación | USING |
|---|---|---|
| `system_configurations_select` | SELECT | `organization_id IS NULL OR organization_id = get_org_id()` |

### 13. `system_lines`

| Policy | Operación | USING |
|---|---|---|
| `system_lines_select` | SELECT | `organization_id IS NULL OR organization_id = get_org_id()` |

### 14. `line_glass_compatibility`

Usa subquery cruzada hacia `system_lines`.

### 15. `product_types`

| Policy | Operación | USING |
|---|---|---|
| `product_types_select` | SELECT | `true` |

### 16. `solicitudes_contacto`

| Policy | Operación | USING | WITH CHECK | Rol |
|---|---|---|---|---|
| `solicitudes_contacto_insert_public` | INSERT | — | `estado = 'nueva'` y (`landing`/`registro-saas` sin org o `empresa-publica` con org) | `anon`, `authenticated` |
| `solicitudes_contacto_select_own` | SELECT | `organization_id = get_org_id()` | `authenticated` |
| `solicitudes_contacto_update_own` | UPDATE | `organization_id = get_org_id()` | `organization_id = get_org_id()` | `authenticated` |

### 17. `public_landing_gallery`

Usa subquery directa a `public.users` (mismo patrón que `organization_profile`).

| Policy | Operación | USING | WITH CHECK | Rol |
|---|---|---|---|---|
| `landing_gallery_select_own` | SELECT | subquery users | — | `authenticated` |
| `landing_gallery_insert_own` | INSERT | — | subquery users | `authenticated` |
| `landing_gallery_update_own` | UPDATE | subquery users | subquery users | `authenticated` |
| `landing_gallery_delete_own` | DELETE | subquery users | — | `authenticated` |

Lectura pública: Se usa admin client (`createAdminClient`) en el server repository `landing-gallery-server.repository.ts` para bypassear RLS en la landing pública.
- Ya no bloquea captación.
- `anon` puede insertar leads públicos.
- `authenticated` puede ver y actualizar leads de su org.

### 18. `pagos_suscripcion`

| Policy | Operación | USING | WITH CHECK | Rol |
|---|---|---|---|---|
| `pagos_suscripcion_select_own` | SELECT | `organization_id = get_org_id()` | — | `authenticated` |

**Nota operativa:** los inserts y updates de pagos se hacen solo desde rutas server con `service_role` durante el flujo Webpay. `authenticated` conserva únicamente lectura por organización.

### 19. `web_push_subscriptions`

| Policy | Operación | USING | WITH CHECK | Rol |
|---|---|---|---|---|
| `web_push_subscriptions_select_own` | SELECT | `organization_id = get_org_id()` y `auth_user_id = auth.uid()` | — | `authenticated` |
| `web_push_subscriptions_insert_own` | INSERT | — | `organization_id = get_org_id()` y `auth_user_id = auth.uid()` | `authenticated` |
| `web_push_subscriptions_update_own` | UPDATE | `organization_id = get_org_id()` y `auth_user_id = auth.uid()` | `organization_id = get_org_id()` y `auth_user_id = auth.uid()` | `authenticated` |

Nota:
- El flujo server-side actual sigue usando `service_role` para notificar y desactivar endpoints inválidos.
- Las policies nuevas dejan consistente el acceso directo autenticado por organización y usuario.

---

## Tablas con acceso cliente restringido o especial

Estas tablas requieren tratamiento explícito porque no siguen el patrón CRUD normal de la app.

| Tabla | Estado esperado por migraciones | Riesgo principal |
|---|---|---|
| `cotizacion_code_counters` | SELECT/INSERT/UPDATE por org para authenticated desde `20260525154000` | Debe usarse principalmente vía `reserve_next_cotizacion_code()` |
| `formula_variables` | Policy deny-all para `anon`/`authenticated`; acceso server/service_role | Catálogo técnico legacy no usado por UI actual |
| `material_types` | Policy deny-all para `anon`/`authenticated`; acceso server/service_role | Catálogo técnico legacy no usado por UI actual |
| `quote_item_breakdown` | SELECT/INSERT/UPDATE por org desde `20260517123000` | Verificar que toda query filtre `organization_id` |

---

## Resumen de mecanismos de aislamiento

| Mecanismo | Tablas |
|---|---|
| `get_org_id()` directo | `clients`, `cotizaciones`, `cotizacion_items`, `projects`, `users`, `materials`, `historial_precios`, `organizations`, `labor_costs`, `solicitudes_contacto`, `web_push_subscriptions`, `pagos_suscripcion` |
| `get_org_id()` + nullable | `system_configurations`, `system_lines` |
| Subquery directa a `users` | `organization_profile`, `public_landing_gallery` |
| Subquery cruzada | `configuration_materials`, `line_glass_compatibility` |
| Público total | `product_types` |
| Deny-all cliente | `formula_variables`, `material_types` |
| Acceso especial por org | `cotizacion_code_counters`, `quote_item_breakdown`, `cotizacion_line_templates`, `onboarding_checklists`, `public_landing_testimonials`, `pagos_suscripcion` |

---

## Riesgos de seguridad vigentes

### Críticos

1. **No se pudo ejecutar `supabase db advisors --linked`:** falta `SUPABASE_DB_PASSWORD`, por lo que esta auditoría no reemplaza el Security Advisor real antes de producción.

### Altos

2. **`material_types` y `formula_variables` cerradas para cliente:** correcto si siguen siendo catálogo técnico legacy; si la UI las necesita, debe exponerse lectura controlada.
3. **`public_landing_testimonials.organization_id`:** la migración local original usaba `uuid`; debe ser `bigint`. Corregido por `20260531050353_harden_public_landing_testimonials_org_id.sql`.
4. **Sin diferenciación por rol en tablas operativas:** `admin`, `tecnico` y `viewer` comparten mismo nivel de acceso por org.

### Moderados

6. **`organization_profile` usa subquery en vez de `get_org_id()`:** patrón inconsistente.
7. **Grants `ALL` a `anon`:** RLS protege, pero el grant sigue siendo amplio.
8. **`solicitudes_contacto` requiere smoke test real post-fix:** Falta validar `anon -> insert`, `authenticated -> select/update` con usuarios reales.

### Bajos

9. **Sin policies DELETE en tablas con soft delete:** Intencional, pero debe seguir documentado.
10. **Catálogos técnicos con solo SELECT:** correcto si la administración queda interna o por `service_role`.
---

## Addendum 2026-05-22 - `onboarding_checklists`

| Policy | OperaciÃ³n | USING | WITH CHECK | Rol |
|---|---|---|---|---|
| `onboarding_checklists_select_own` | SELECT | `organization_id = get_org_id()` | â€” | `authenticated` |
| `onboarding_checklists_insert_own` | INSERT | â€” | `organization_id = get_org_id()` | `authenticated` |
| `onboarding_checklists_update_own` | UPDATE | `organization_id = get_org_id()` | `organization_id = get_org_id()` | `authenticated` |

Notas:
- No se expone a `anon`.
- Los pasos manuales (`channel_ready`, `first_share`) se marcan desde acciones reales del usuario dentro de la app.

---

## Addendum 2026-05-31 - policies recientes pendientes de dump completo

### `cotizacion_line_templates`

| Policy | Operación | USING | WITH CHECK | Rol |
|---|---|---|---|---|
| `cotizacion_line_templates_select_own_org` | SELECT | `organization_id = get_org_id()` | — | `authenticated` |
| `cotizacion_line_templates_insert_own_org` | INSERT | — | `organization_id = get_org_id()` | `authenticated` |
| `cotizacion_line_templates_update_own_org` | UPDATE | `organization_id = get_org_id()` | `organization_id = get_org_id()` | `authenticated` |

### `public_landing_testimonials`

| Policy | Operación | USING | WITH CHECK | Rol |
|---|---|---|---|---|
| `public_landing_testimonials_select_authenticated` | SELECT | `organization_id = get_org_id()` | — | `authenticated` |
| `public_landing_testimonials_insert_authenticated` | INSERT | — | `organization_id = get_org_id()` | `authenticated` |
| `public_landing_testimonials_update_authenticated` | UPDATE | `organization_id = get_org_id()` | `organization_id = get_org_id()` | `authenticated` |
| `public_landing_testimonials_delete_authenticated` | DELETE | `organization_id = get_org_id()` | — | `authenticated` |

### `quote_item_breakdown`

| Policy | Operación | USING | WITH CHECK | Rol |
|---|---|---|---|---|
| `quote_item_breakdown_select` | SELECT | `organization_id = get_org_id()` | — | `authenticated` |
| `quote_item_breakdown_insert` | INSERT | — | `organization_id = get_org_id()` | `authenticated` |
| `quote_item_breakdown_update` | UPDATE | `organization_id = get_org_id()` | `organization_id = get_org_id()` | `authenticated` |

### Estado de verificación

- API con `service_role` confirmó existencia remota de `cotizacion_line_templates`, `public_landing_testimonials`, `onboarding_checklists`, `pagos_suscripcion` y `web_push_subscriptions` el 2026-05-31.
- No se pudo confirmar catálogo exacto de policies/grants remoto porque `supabase db query/advisors/lint --linked` requiere `SUPABASE_DB_PASSWORD`.

---

## Addendum 2026-05-31 - verificacion MCP Supabase

- MCP Supabase quedo autenticado contra `yrtrwgkaopfumpidjthk`.
- `get_advisors(security)` y `get_advisors(performance)` se ejecutaron en remoto.
- Todas las 26 tablas de `public` tienen RLS habilitado.
- `pagos_suscripcion` quedo cerrado para cliente: `authenticated` solo tiene `SELECT`, `anon` no tiene grants y solo queda policy `pagos_suscripcion_select_own`.
- Se aplico `20260531212114_harden_subscription_security_advisors` en remoto para eliminar insert cliente en pagos y revocar RPC publico de `ensure_organization_profile_trial_defaults()`.
- Se aplico `20260531212250_optimize_web_push_rls_initplan` en remoto para usar `(select auth.uid())` y `(select get_org_id())` en RLS de `web_push_subscriptions`.
- Security Advisor pendiente: `get_org_id()` y `reserve_next_cotizacion_code()` siguen como `SECURITY DEFINER` ejecutables por `authenticated`; estado esperado porque RLS/app dependen de ellos.
- Security Advisor pendiente fuera de SQL: activar leaked password protection en Supabase Auth.
- Performance Advisor pendiente: FKs sin indice, un indice duplicado en `solicitudes_contacto` y varios indices sin uso reciente. No se eliminaron indices por prudencia pre-produccion.

---

## Addendum 2026-05-31 - Performance Advisor FK

- Se aplico `20260531232020_add_missing_fk_indexes_and_drop_duplicate`.
- Advisor ya no reporta `unindexed_foreign_keys` ni `duplicate_index` para `solicitudes_contacto`.
- Pendiente no bloqueante: `unused_index`. No borrar antes de tener trafico real suficiente y revisar `pg_stat_user_indexes` despues de pilotos.

---

## Addendum 2026-06-02 - Flow billing

- `20260602062145_billing_flow_provider.sql` no abre nuevas escrituras cliente.
- `pagos_suscripcion` conserva solo policy `pagos_suscripcion_select_own` para `authenticated`; inserts/updates/deletes siguen reservados a rutas server con `service_role`.
- `payment_provider` ahora acepta `flow`, `manual_transfer`, `webpay_plus`.
- `organization_profile.payment_method` ahora acepta `flow`.
- `provider_response` contiene respuesta raw del provider y no debe devolverse en endpoints cliente.

## Addendum 2026-07-28 - grants de `users` y RPC de alta

- Migracion remota: `20260728083604_google_oauth_account_completion`.
- Se revocaron privilegios de tabla de `public`, `anon` y `authenticated` sobre `public.users`.
- Se restituyo a `authenticated` SELECT por columna solo para `id`, `correo`, `organization_id`, `rol`, timestamps operativos, `eliminado_en`, `auth_user_id` y campos legacy de setup.
- Campos privados sin SELECT cliente: `nombre`, `whatsapp`, `ciudad_comuna`, `data_sharing_accepted_at`.
- `service_role` conserva privilegios completos porque el callback, completar cuenta y panel founder son operaciones server-side.
- `complete_google_oauth_account(...)`: `SECURITY INVOKER`, `search_path=''`, EXECUTE solo `service_role`.
- Verificacion MCP: `authenticated` puede leer `users.id` y no puede leer ninguna de las cuatro columnas privadas; `anon` y `authenticated` no pueden ejecutar la RPC.

---

## Addendum 2026-06-02 - cuentas internas gratis

- `20260602065826_founder_free_internal_accounts.sql` solo actualiza `organization_profile` para organizaciones `3` y `4` si existen los usuarios esperados.
- No agrega policies ni grants nuevos.
- Mantiene RLS existente; el cambio es data/estado de suscripcion para evitar bloqueo por no pago.

---

## Addendum 2026-07-29 - Verificacion remota RLS y advisors

- Proyecto remoto: `yrtrwgkaopfumpidjthk`.
- MCP Supabase agregado y autenticado; las herramientas MCP no quedaron disponibles dentro de este turno, por lo que se verifico con Supabase CLI remoto (`--linked`).
- `supabase projects list` reporta estado `ACTIVE_HEALTHY`, Postgres `17.6.1.063`.
- Nota historica: al 2026-07-29 `fabrication_recipes` y `fabrication_recipe_tests` no existian aun en remoto. Fueron aplicadas/verificadas el 2026-07-30; ver addendum siguiente.
- RLS remoto confirmado para: `cotizacion_line_templates`, `formula_variables`, `materials`, `quote_item_breakdown`, `system_lines`.
- Policies remotas confirmadas:
  - `cotizacion_line_templates`: SELECT/INSERT/UPDATE para `authenticated` por `organization_id = get_org_id()`.
  - `quote_item_breakdown`: SELECT/INSERT/UPDATE para `authenticated` por `organization_id = get_org_id()`.
  - `formula_variables`: deny-all para `anon`/`authenticated`.
  - `materials`: SELECT/INSERT/UPDATE por `organization_id = get_org_id()`, pero con rol `public`; UPDATE no tiene `WITH CHECK`.
  - `system_lines`: SELECT con `organization_id IS NULL OR organization_id = get_org_id()`, tambien con rol `public`.
- Security Advisor remoto devuelve warnings activos:
  - `touch_growth_updated_at` sin `search_path` fijo.
  - `get_org_id()` como `SECURITY DEFINER` ejecutable por `authenticated`.
  - `reserve_next_cotizacion_code(...)` como `SECURITY DEFINER` ejecutable por `authenticated`.
  - Leaked password protection desactivado en Supabase Auth.
- Criterio de hardening recomendado:
  - Mantener `get_org_id()` y `reserve_next_cotizacion_code(...)` si son RPC intencionales, pero documentar que estan expuestas a authenticated y probar que no permiten escalada de organizacion.
  - Agregar `set search_path = public` a `touch_growth_updated_at`.
  - Cambiar policies legacy de `materials`/`system_lines` desde rol `public` a `authenticated` si no existe caso de lectura anon.
  - Agregar `WITH CHECK (organization_id = (select public.get_org_id()))` a `materials_update`.
  - Usar `(select public.get_org_id())` en nuevas policies por performance RLS.

---

## Addendum 2026-07-30 - RLS Fabricacion Fase 3 remoto

- Migraciones remotas registradas: `20260729230407_fabrication_recipes_persistence`, `20260729234019_cotizacion_items_fabricacion_snapshot`, `20260730001306_harden_fabrication_recipe_grants`.
- `fabrication_recipes`:
  - RLS habilitado.
  - Policies: SELECT visible para `authenticated` si `scope='ventora'` o `organization_id = get_org_id()`; INSERT/UPDATE solo `scope='organization'` y `organization_id = get_org_id()`.
  - Grants finales: `authenticated` y `service_role` solo `INSERT,SELECT,UPDATE`; `anon` sin privilegios.
- `fabrication_recipe_tests`:
  - RLS habilitado.
  - Policies: SELECT si la receta asociada es Ventora o privada visible; INSERT/UPDATE solo para tests de recetas privadas de la organizacion.
  - Grants finales: `authenticated` y `service_role` solo `INSERT,SELECT,UPDATE`; `anon` sin privilegios.
- `cotizacion_items.fabricacion_snapshot` hereda RLS de `cotizacion_items` por `organization_id = get_org_id()` y mantiene indice parcial `cotizacion_items_fabricacion_snapshot_active_idx`.
- Smoke remoto con dos empresas QA confirmo aislamiento privado, lectura de receta Ventora, bloqueo de update cruzado y persistencia real de snapshot por item.
