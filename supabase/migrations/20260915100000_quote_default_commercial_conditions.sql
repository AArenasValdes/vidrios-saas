-- Condiciones comerciales predeterminadas por empresa y snapshot por cotización.

alter table public.organization_profile
  add column if not exists validez_predeterminada text not null default '15 dias',
  add column if not exists condiciones_venta_predeterminadas text,
  add column if not exists terminos_condiciones_predeterminados text;

comment on column public.organization_profile.validez_predeterminada is
  'Vigencia predeterminada para nuevas cotizaciones (ej: 15 dias).';
comment on column public.organization_profile.condiciones_venta_predeterminadas is
  'Condiciones de venta predeterminadas heredadas al crear cotizaciones.';
comment on column public.organization_profile.terminos_condiciones_predeterminados is
  'Términos y condiciones adicionales predeterminados heredados al crear cotizaciones.';

alter table public.cotizaciones
  add column if not exists condiciones_de_pago text,
  add column if not exists condiciones_venta text,
  add column if not exists terminos_condiciones text;

comment on column public.cotizaciones.condiciones_de_pago is
  'Forma de pago de esta cotización. Si es null, el PDF puede usar organization_profile.forma_pago.';
comment on column public.cotizaciones.condiciones_venta is
  'Condiciones de venta de esta cotización, separadas de notas u observaciones.';
comment on column public.cotizaciones.terminos_condiciones is
  'Términos y condiciones adicionales de esta cotización.';

revoke insert, update on table public.organization_profile from authenticated;

grant insert (
  organization_id,
  empresa_nombre,
  empresa_logo_url,
  responsable_comercial,
  country_code,
  currency_code,
  locale,
  timezone,
  phone_country_code,
  tax_label,
  tax_rate_default,
  tax_id_label,
  empresa_direccion,
  empresa_telefono,
  empresa_email,
  brand_color,
  forma_pago,
  validez_predeterminada,
  condiciones_venta_predeterminadas,
  terminos_condiciones_predeterminados,
  solicitud_publica_slug,
  solicitud_publica_descripcion_corta,
  solicitud_publica_valor,
  solicitud_publica_mensaje_confianza,
  solicitud_publica_privacidad,
  solicitud_publica_horario_desde,
  solicitud_publica_horario_hasta,
  solicitud_publica_dias_atencion,
  solicitud_publica_horario_por_dia,
  proveedor_preferido,
  modo_precio_preferido,
  margen_defecto,
  unidad_medidas,
  actualizado_en,
  public_name,
  public_subtitle,
  public_zone,
  public_business_type,
  instagram_url,
  facebook_url,
  tiktok_url,
  website_url,
  public_services,
  final_cta_title,
  final_cta_subtitle,
  final_cta_label,
  business_hours_note,
  secondary_color,
  hero_mode,
  hero_image_url,
  hero_title,
  hero_subtitle,
  show_gallery,
  show_schedule,
  show_rating,
  rating_label,
  jobs_count_label,
  form_title,
  form_subtitle,
  is_published
) on table public.organization_profile to authenticated;

grant update (
  empresa_nombre,
  empresa_logo_url,
  responsable_comercial,
  country_code,
  currency_code,
  locale,
  timezone,
  phone_country_code,
  tax_label,
  tax_rate_default,
  tax_id_label,
  empresa_direccion,
  empresa_telefono,
  empresa_email,
  brand_color,
  forma_pago,
  validez_predeterminada,
  condiciones_venta_predeterminadas,
  terminos_condiciones_predeterminados,
  solicitud_publica_slug,
  solicitud_publica_descripcion_corta,
  solicitud_publica_valor,
  solicitud_publica_mensaje_confianza,
  solicitud_publica_privacidad,
  solicitud_publica_horario_desde,
  solicitud_publica_horario_hasta,
  solicitud_publica_dias_atencion,
  solicitud_publica_horario_por_dia,
  proveedor_preferido,
  modo_precio_preferido,
  margen_defecto,
  unidad_medidas,
  actualizado_en,
  public_name,
  public_subtitle,
  public_zone,
  public_business_type,
  instagram_url,
  facebook_url,
  tiktok_url,
  website_url,
  public_services,
  final_cta_title,
  final_cta_subtitle,
  final_cta_label,
  business_hours_note,
  secondary_color,
  hero_mode,
  hero_image_url,
  hero_title,
  hero_subtitle,
  show_gallery,
  show_schedule,
  show_rating,
  rating_label,
  jobs_count_label,
  form_title,
  form_subtitle,
  is_published
) on table public.organization_profile to authenticated;
