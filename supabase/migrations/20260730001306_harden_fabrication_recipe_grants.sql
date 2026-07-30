-- Hardening de grants para tablas tecnicas nuevas de fabricacion.
-- RLS define las filas visibles; los grants limitan la exposicion por rol.

revoke all on table public.fabrication_recipes
  from anon, authenticated, service_role;
revoke all on table public.fabrication_recipe_tests
  from anon, authenticated, service_role;

grant select, insert, update on table public.fabrication_recipes
  to authenticated, service_role;
grant select, insert, update on table public.fabrication_recipe_tests
  to authenticated, service_role;
