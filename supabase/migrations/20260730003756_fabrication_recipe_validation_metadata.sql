-- Metadatos requeridos por la validacion guiada de recetas.
-- Es aditiva y mantiene las filas existentes como casos obligatorios.

alter table public.fabrication_recipes
  add column if not exists validated_by uuid null
    references auth.users(id) on delete set null;

alter table public.fabrication_recipe_tests
  add column if not exists is_required boolean not null default true;

comment on column public.fabrication_recipes.validated_by is
  'Usuario autenticado que valido esta version de receta.';

comment on column public.fabrication_recipe_tests.is_required is
  'Indica si el caso debe pasar para permitir validar la receta.';

create or replace function public.prevent_validated_fabrication_recipe_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'validated'
     and old.eliminado_en is null
     and not (new.status = 'archived' or new.eliminado_en is not null) then
    raise exception 'Una receta validada no se modifica directamente; crea una nueva version.';
  end if;

  if new.status = 'validated'
     and old.status <> 'validated' then
    if new.validated_at is null then
      raise exception 'Una receta validada debe registrar fecha de validacion.';
    end if;

    if auth.uid() is not null
       and new.validated_by is distinct from auth.uid() then
      raise exception 'El usuario validador debe coincidir con la sesion autenticada.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_fabrication_recipe_test_validator()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.passed
     and auth.uid() is not null
     and new.validated_by is distinct from auth.uid() then
    raise exception 'El usuario que aprueba la prueba debe coincidir con la sesion autenticada.';
  end if;

  return new;
end;
$$;

drop trigger if exists fabrication_recipe_tests_enforce_validator
  on public.fabrication_recipe_tests;
create trigger fabrication_recipe_tests_enforce_validator
  before insert or update on public.fabrication_recipe_tests
  for each row
  execute function public.enforce_fabrication_recipe_test_validator();
