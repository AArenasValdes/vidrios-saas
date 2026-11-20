# Base de datos — costos privados por perfil (L42 y proveedor declarado)

Estado verificado el 20-11-2026 en el proyecto `yrtrwgkaopfumpidjthk` de producción. Las dos migraciones se aplicaron con autorización del usuario. El plan gratuito no dispone de respaldo automático; no se comprobó un respaldo recuperable.

## Migraciones aplicadas

1. `20261120030619_l42_workshop_presentation_identity_unique.sql`: crea el índice único parcial `organizacion_presentaciones_taller_l42_identity_uq` para presentaciones L42 activas, por organización, familia, configuración, código y acabado normalizados.
2. `20261120030626_workshop_presentation_supplier_name.sql`: añade `proveedor_nombre` nullable, con longitud válida entre 1 y 120 caracteres tras quitar espacios. Es información declarada por el taller, no una identidad oficial de proveedor.

Las versiones fueron asignadas por Supabase al registrar las migraciones. Los archivos locales anteriores tenían versiones `20261117212944` y `20261119120000`; sus contenidos SQL se conservaron íntegros. No volver a aplicarlos con las versiones antiguas. La PR #26 contiene la versión anterior del índice y debe conciliarse antes de integrarse.

## Comprobaciones

Antes de aplicar había una fila en `public.organizacion_presentaciones_taller`, cero presentaciones activas L42 y cero grupos duplicados L42. Después se confirmó el índice, la columna y su restricción; sigue existiendo una fila y la huella de los campos anteriores es idéntica. RLS y la política de lectura existente permanecen activas. La migración base `20261004221000_workshop_supplier_presentations` ya figuraba en el historial remoto.

El aislamiento efectivo entre organizaciones no queda demostrado por tener RLS habilitado. No se hicieron escrituras de prueba ni se modificaron precios o cotizaciones.

## Validaciones pendientes

En una organización QA autorizada: crear un costo con y sin nombre, recuperarlo y editarlo; comprobar compatibilidad de registros antiguos, resolución mixta L42 y comportamiento L25. Verificar además permisos con dos organizaciones y un usuario sin autorización. Las pruebas simuladas no sustituyen el smoke real. La organización 3 comparte la base de producción; no asumir que una Preview sea segura para escrituras sin autorización.

### Smoke mínimo preparado (pendiente de autorización de escritura)

1. Confirmar que la Preview usa el commit revisado, identificar dos organizaciones de prueba y sus usuarios, y comprobar los permisos de cada sesión. Registrar si existe ya una presentación para la identidad a probar; no sobrescribirla.
2. En la primera organización crear una referencia privada L42 para una identidad de prueba exacta, acabado y largo conocidos, con precio de prueba y proveedor declarado. Recargar y verificar valores; editar el precio y confirmar que persiste. Repetir sin nombre de proveedor usando otra identidad de prueba disponible.
3. En la segunda organización comprobar que no se puede leer ni editar la referencia de la primera; comprobar también el rechazo de escritura con un usuario sin permisos. No usar cuentas ni precios de clientes.
4. En una cotización nueva de prueba verificar el costo propio L42 junto con las referencias compatibles del proveedor, y comprobar L25 y el precio comercial. No alterar cotizaciones existentes ni snapshots históricos.
5. Registrar resultados y, solo si la autorización de escritura incluye limpieza, retirar los datos creados por el smoke mediante el mecanismo autorizado. No tocar configuraciones previas.

## Reversión y límites

Eliminar el índice no modifica filas, pero exige evaluar las dependencias y autorizar el cambio. Eliminar la columna destruiría los nombres que pudieran haberse guardado; no ejecutar `DROP COLUMN` como reversión automática. No alterar recetas, precios de venta ni snapshots para realizar pruebas. Mantener PR #27 en Draft mientras falte el QA real.
