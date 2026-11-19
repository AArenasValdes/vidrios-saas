# Validación de costos privados por perfil

Las migraciones `20261117212944_l42_workshop_presentation_identity_unique.sql` y `20261119120000_workshop_presentation_supplier_name.sql` están pendientes de validación en una base aislada. La primera rechaza duplicados L42 existentes antes de crear el índice; no modifica filas. La segunda agrega un nombre opcional, sin alterar precios ni asignar una identidad oficial.

Antes de aplicar, comparar versiones con el historial de migraciones del entorno y revisar duplicados L42 por organización, configuración, código y acabado. En una base QA autorizada, aplicar en orden, crear un costo con y sin nombre, editarlo, recargarlo y verificar accesos con dos organizaciones y un usuario sin permisos. Comprobar que los nombres vacíos históricos siguen siendo legibles y que L42 conserva el proveedor de los demás perfiles.

Reversión solo en QA: `DROP INDEX IF EXISTS public.organizacion_presentaciones_taller_l42_identity_uq;`. Retirar `proveedor_nombre` con `ALTER TABLE public.organizacion_presentaciones_taller DROP COLUMN proveedor_nombre;` elimina los nombres guardados: requiere respaldo y autorización antes de ejecutarse. No ejecutar estas operaciones en producción durante esta tarea.

Las pruebas simuladas no acreditan RLS ni persistencia en Supabase. Las líneas sin familia canónica de compra no reciben asociaciones inferidas.
