# Workflow: cambio de producto impulsado por marketing

Estado: vigente
Actualizado: 2026-08-14
Responsable: Growth OS + agente técnico

## Objetivo

Convertir una fricción comercial observada en una mejora acotada, medible y segura.

## Disparador

Tres señales equivalentes: objeción repetida, caída medible del embudo o bloqueo reproducible en una ruta.

## Entradas

- evidencia de prospectos, demos, pruebas o primeras cotizaciones;
- ruta y feature afectadas;
- KPI antes del cambio;
- ejemplo reproducible, si existe.

## Lectura obligatoria

1. `AGENTS.md`
2. `docs/agent-map/README.md`
3. `docs/agent-map/ROUTES_MAP.md`
4. `docs/agent-map/FEATURES_MAP.md`
5. `docs/growth-os/ROUTE_OWNERSHIP.md`
6. brief o SOP de marketing relacionado

## Pasos

1. Registrar problema, evidencia y KPI base.
2. Identificar owner, ruta, feature, datos y límites.
3. Definir cambio mínimo y superficies excluidas.
4. Implementar solo después de aprobación del alcance.
5. Ejecutar tests, `pnpm docs:check` y QA de la ruta.
6. Registrar resultado, métrica y siguiente decisión.

## Salida

Brief de cambio, lista de archivos, QA reproducible, KPI posterior y decisión `mantener`, `ajustar` o `revertir`.

## KPI

KPI primario del embudo afectado. Siempre registrar también mensajes, demos, pruebas, primera cotización y pagos cuando aplique.

## Siguiente acción

Owner definido en `ROUTE_OWNERSHIP.md`; seguimiento en la revisión semanal.

## Criterios de detención

- No hay evidencia reproducible.
- El cambio exige CRM, ERP, inventario, producción o nueva tabla no aprobada.
- Puede romper PDF, WhatsApp, aprobación pública o rutas públicas críticas.
- La promesa comercial excede capacidad implementada.

## Rutas afectadas y QA

Registrar rutas exactas. Para rutas públicas, ejecutar smoke manual. Para cotizaciones, revisar PDF, WhatsApp y aprobación pública. Para cambios desktop, verificar móvil 390/430 px sin regresión.
