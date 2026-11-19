-- Nombre opcional informado por el taller; no altera identidades ni precios existentes.
alter table public.organizacion_presentaciones_taller
  add column if not exists proveedor_nombre text
  check (proveedor_nombre is null or length(trim(proveedor_nombre)) between 1 and 120);
