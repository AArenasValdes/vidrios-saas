# Supplier Catalogs V1 · Preparación de QA

Estado: QA no ejecutado. Actualizado: 2026-09-30.

## Límite de entorno actual

- Docker no responde (`docker_engine` pipe ausente). `supabase start` local no está disponible hasta iniciar Docker Desktop.
- El servidor abierto en `http://127.0.0.1:3002` no es QA: `.env.local` apunta a `https://yrtrwgkaopfumpidjthk.supabase.co`, proyecto de producción.
- No guardar cotizaciones ni solicitar el costo técnico desde ese servidor. El POST de costo técnico inserta un snapshot en `cotizacion_costos_tecnicos`.
- La reparación del ledger de producción `20260930165551` es una operación separada y ya quedó registrada. No ejecutar más escrituras allí.

## Alternativa: proyecto Supabase QA independiente

1. Crear o elegir un proyecto Supabase exclusivo para QA, separado de producción. Usar una organización y un usuario de prueba propios; no copiar clientes, cotizaciones ni credenciales de producción.
2. Antes de cargar el fixture, establecer en QA un baseline de esquema verificado. No ejecutar `db push` a ciegas: el historial local y remoto existente tiene diferencias y el stack Docker local no pudo validar una reconstrucción limpia. Comparar y resolver la cadena de migraciones en QA primero.
3. Aplicar en ese proyecto la migración Supplier Catalogs V1 y correr `supabase/tests/supplier_catalogs_v1_security.test.sql` allí. Confirmar el project ref QA antes de cualquier comando de escritura.
4. Cargar solo el fixture Veratec/Xelena `2026-06` y la receta `ventora:veratec-7400-corredera` en su estado actual. No cambiar estado, fórmula, código canónico ni cobertura.
5. Configurar el servidor QA con valores exclusivos de ese proyecto:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<QA_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clave-publicable-o-anon-de-QA>
SUPABASE_SERVICE_ROLE_KEY=<service-role-de-QA; solo servidor>
SUPPLIER_CATALOG_V1_ENABLED=true
SUPPLIER_CATALOG_V1_QA_ORGANIZATION_IDS=<ID_NUMERICO_DE_ORG_QA>
SUPPLIER_CATALOG_V1_NEW_QUOTES_AFTER=<fecha-ISO-UTC-para-cotizaciones-de-prueba>
SUPPLIER_CATALOG_V1_SUPPLIER_KEY=xelena
SUPPLIER_CATALOG_V1_PRICE_LIST_REVISION=2026-06
```

La clave `SUPABASE_SERVICE_ROLE_KEY` no debe llevar prefijo `NEXT_PUBLIC_`, exponerse al navegador, añadirse a Git ni compartirse en mensajes. Las variables deben pertenecer solo al proceso del servidor QA. Mantener intacto `.env.local` hasta tener las credenciales QA y un plan de arranque aislado.

El gate existente requiere `SUPPLIER_CATALOG_V1_ENABLED=true`, rol `admin`, organización incluida en el allowlist y cotización nueva creada después del corte. El snapshot técnico parcial se escribe en QA únicamente al solicitar el cálculo.

## Recorrido de prueba sin promover la receta

El Paso 2 de cotización ya llama al resolver con `previewListaParaProbar: true`, que permite el cálculo preliminar de recetas no validadas para pauta interna. El resolver no debe alterar el estado almacenado de la receta. Verificar antes y después que conserve `lista_para_validar`; detenerse si la interfaz intenta validarla o actualizarla.

En QA, usar una cotización nueva por prueba y guardar la pauta conjunta real antes de pedir el costo técnico:

1. Una Sliding 7400, 2H monolítico 4 mm, Blanco, 1200 × 1500 mm, cantidad 1. Registrar cortes, insumos, presentaciones, acabado, largos, barras, costo parcial y faltantes.
2. Repetir con cantidad 2 o dos ítems equivalentes para comprobar la pauta conjunta y barras compartidas.
3. Repetir con Negro solo si el catálogo contiene una presentación explícitamente confirmada para ese acabado.
4. No incluir asociaciones pendientes ni presentaciones sin precio como costo cero. Comprobar que `precio_m2`, receta y estado de validación no cambian.
5. Inspeccionar el estado de la receta antes y después. Histórico fuera del piloto: lectura únicamente; nunca recalcular.

El smoke funcional requiere la app iniciada con las variables QA y usuario QA. Una sesión abierta en `:3002` contra producción no sirve como sustituto.
