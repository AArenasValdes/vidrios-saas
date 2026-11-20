# Validación de costos privados por perfil

El 2026-11-20 se aplicaron a producción, con autorización del usuario y sin respaldo automático disponible, las migraciones `20261120030619_l42_workshop_presentation_identity_unique.sql` y `20261120030626_workshop_presentation_supplier_name.sql`. El servidor asignó estas versiones; los nombres locales anteriores eran `20261117212944` y `20261119120000`. No aplicar nuevamente los archivos con versiones antiguas. PR #26 aún contiene la versión antigua del índice y debe reconciliarse antes de integrarse.

Antes de aplicar: cero duplicados L42 activos y una fila total. Después: índice único L42 y columna nullable con límite de 120 caracteres confirmados; una fila total y huella de sus campos anteriores idéntica. RLS y policy de lectura por organización permanecen activas. El nombre es informativo: no crea una identidad oficial de proveedor, SKU ni lista de precios.

Validación funcional pendiente: crear un costo con y sin nombre, editarlo, recargarlo y verificar accesos con dos organizaciones y un usuario sin permisos. Usar únicamente datos de QA autorizados; no se han hecho escrituras de prueba. Comprobar que los nombres vacíos históricos siguen siendo legibles y que L42 conserva el proveedor de los demás perfiles.

Reversión solo en QA: `DROP INDEX IF EXISTS public.organizacion_presentaciones_taller_l42_identity_uq;`. Retirar `proveedor_nombre` con `ALTER TABLE public.organizacion_presentaciones_taller DROP COLUMN proveedor_nombre;` elimina los nombres guardados: requiere respaldo y autorización antes de ejecutarse. No ejecutar estas operaciones en producción durante esta tarea.

Las pruebas simuladas no acreditan RLS ni persistencia en Supabase. Las líneas sin familia canónica de compra no reciben asociaciones inferidas.
