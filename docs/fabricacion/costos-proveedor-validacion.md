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

## Reversión y límites

Eliminar el índice no modifica filas, pero exige evaluar las dependencias y autorizar el cambio. Eliminar la columna destruiría los nombres que pudieran haberse guardado; no ejecutar `DROP COLUMN` como reversión automática. No alterar recetas, precios de venta ni snapshots para realizar pruebas. Mantener PR #27 en Draft mientras falte el QA real.
