-- Asegura que la vista administrativa respete permisos y RLS del usuario que la consulta.

alter view if exists public.admin_clientes_eliminados
set (security_invoker = true);
