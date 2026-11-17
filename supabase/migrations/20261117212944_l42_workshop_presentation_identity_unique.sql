-- Prevent concurrent requests from creating a second active private L42
-- presentation for the same organization, configuration, technical code and finish.
-- Existing rows are never updated or removed; migration fails closed if duplicates exist.
do $$
begin
  if exists (
    select 1
    from public.organizacion_presentaciones_taller
    where eliminado_en is null
      and family_key = 'universal:aluminio:l42'
    group by organization_id,
      family_key,
      coalesce(configuration_key, ''),
      upper(trim(codigo_tecnico)),
      coalesce(translate(lower(trim(acabado_nombre)), 'áéíóúüñ', 'aeiouun'), '')
    having count(*) > 1
  ) then
    raise exception 'No se puede crear el índice único L42: existen presentaciones activas duplicadas; revisar manualmente sin alterar históricos.';
  end if;
end;
$$;

create unique index organizacion_presentaciones_taller_l42_identity_uq
  on public.organizacion_presentaciones_taller (
    organization_id,
    family_key,
    coalesce(configuration_key, ''),
    upper(trim(codigo_tecnico)),
    coalesce(translate(lower(trim(acabado_nombre)), 'áéíóúüñ', 'aeiouun'), '')
  )
  where eliminado_en is null
    and family_key = 'universal:aluminio:l42';
