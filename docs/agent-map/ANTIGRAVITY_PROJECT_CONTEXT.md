# Handoff de contexto — Antigravity / Gemini 4 Argon — Ventora

Estado: vigente para handoff
Actualizado: 2026-10-19
Repositorio: `C:\Users\aless\vidrios-saas`

## Cómo usar este documento

Este archivo resume el contexto operativo para un agente externo como Antigravity. No reemplaza la jerarquía documental del repositorio. Antes de editar, el agente debe leer:

1. `AGENTS.md`
2. `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`
3. `docs/agent-map/README.md`
4. El mapa o handoff específico de la tarea

Si hay contradicción, manda `AGENTS.md`, luego el giro de producto, luego el índice maestro y después los mapas técnicos. Los conteos y estados de documentos antiguos pueden estar desfasados: verificar en código, tests y evidencia antes de afirmarlos como actuales.

## Producto

Ventora es software comercial para maestros, talleres y empresas de vidrio, aluminio y PVC. El núcleo es:

- captar solicitudes mediante página pública, link y QR;
- cotizar desde celular, tablet o computador;
- administrar clientes, obras y cotizaciones;
- enviar PDF comercial profesional y compartir por WhatsApp;
- configurar catálogo privado y precios de venta;
- opcionalmente configurar recetas para cubicación, despiece, tiras y pauta de corte revisable.

Ventora no es ERP, CRM genérico, CAD ni optimizador industrial. La pauta es ayuda revisable para el taller. No prometer fabricación automática, máquina lista, nesting, optimización real ni exactitud física sin evidencia y validación del taller.

Mensaje comercial vigente: “Cotiza desde el celular, envía un PDF profesional y deja de llegar a casa a hacer presupuestos.”

## Capas que no se deben mezclar

1. Cierre comercial: cotización, PDF, WhatsApp y aprobación pública.
2. Captación: `/solicitud/[empresa]` y canales/QR.
3. Catálogo privado: líneas, referencias y precios de venta.
4. Constructor: composición visual de piezas no estándar.
5. Cubicación/pauta opcional: receta, snapshot, despiece y materiales revisables.
6. Precio de compra de proveedor: costo técnico privado separado del precio de venta.

Una línea puede ser cotizable sin tener receta. Un selector visible no prueba compatibilidad, fórmula, precio de compra ni pauta resoluble.

## Estado técnico y de producto

- Fase actual: Fase 4 — módulo técnico esencial / cubicación V1 vendible multi-tipología.
- Fuente vigente de recetas: `fabrication_recipes` + `fabrication_recipe_tests`.
- La cotización guarda snapshot formal en `cotizacion_items.fabricacion_snapshot`; cotizaciones históricas no se recalculan silenciosamente.
- `fabricationRecipePack`, `fabricationRecipe` y `[cub:]` son compatibilidad histórica/lectura donde corresponda.
- Recetas confirmadas por taller: L5000 corredera 2H, L20 corredera 2H, L12 Shower 2H, L32 proyectante Normal 1H y L42 proyectante Normal 1H.
- L25 SODAL/Zeta conserva sus 18 variantes validadas. No modificar ni extender esa validación por parecido de nombre.
- L20 no tiene paño fijo.
- Línea 45, Serie 4800, Línea 15, Línea 4000 y otras bases documentadas pueden estar `lista_para_validar`, preliminares o pendientes; ese estado no equivale a validación de taller.
- El catálogo comercial documentado más reciente habla de 102 configuraciones comerciales; verificar el conteo real antes de comunicarlo. Muchas filas comerciales no tienen receta.
- Proveedores de compra: elección explícita por pieza tiene prioridad sobre preferencia habitual de organización/familia y resolución automática previa. Mantener separados proveedor, familia, código, acabado, largo, costo de compra, precio de venta, receta y snapshot.
- Actualizaciones locales recientes incluyen Alumco, precios de perfiles, resolución exacta por familia/acabado/presentación, Constructor, pauta y documentos de orden de materiales. Revisar `git diff` antes de asumir que están consolidadas o validadas en producción.

## Arquitectura

Stack principal:

- Next.js App Router 16.1.6
- React 19.2.3
- TypeScript estricto
- CSS Modules, Tailwind 4 y shadcn/ui
- Supabase/PostgreSQL/Auth/Storage
- Jest 30 + React Testing Library
- jsPDF + html2canvas para PDF
- Vercel para despliegue

Flujo obligatorio:

```text
page/component -> hook -> service -> repository -> Supabase
```

Reglas de arquitectura:

- La fuente real está en `src/features/<feature>/`.
- `src/hooks/`, `src/services/`, `src/repositories/` y la mayor parte de `src/types/` son re-exports legacy; no editar allí.
- Toda query debe aislar `organization_id`.
- Respetar RLS y soft delete (`eliminado_en` nulo para activos).
- Usar `proxy.ts`, no inventar `middleware.ts`.
- Lógica de negocio en services; acceso a datos en repositories.
- No tocar tablas legacy dormidas sin instrucción explícita.

## Rutas críticas

- `/login` y `/auth/*`: autenticación.
- `/dashboard`: valor cotizado y métricas reales.
- `/cotizaciones`: listado.
- `/cotizaciones/nueva`: cotización mobile y desktop; Paso 2 tiene Guiada y Constructor.
- `/cotizaciones/[id]`: detalle y acciones de cierre.
- `/configuracion/empresa/lineas-precios`: catálogo privado y precios.
- `/configuracion/empresa/lineas-precios/[lineTemplateId]/fabricacion`: receta/laboratorio.
- `/solicitud/[empresa]`: captación pública crítica.
- `/presupuesto/[token]`: cierre/aprobación pública crítica.
- `/print/cotizaciones/[id]`: PDF cliente.
- `/print/cotizaciones/[id]/fabricacion`: resumen interno de fabricación, separado del PDF cliente.

## Cotización y Constructor

- Mobile sigue siendo prioritario: 390/430 px no debe romperse por cambios desktop.
- `por_item` usa el mismo `draft.items` en Guiada y Constructor; no crear segundo draft ni persistencia paralela.
- Constructor desktop: `QuoteConstructorWorkspace`, solo desde `>=1024px`.
- Constructor mobile: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/`.
- Persistencia visual formal: `cotizacion_item_visual_configs`; `[gvc:]` es bridge/fallback.
- Preservar medidas, cantidad, línea, sistema, composición, hojas, vidrio, apertura, color, precio manual y overrides.
- `Espejo` y `Cubierta de mesa` no requieren material/color de perfil.
- No convertir croquis comercial en CAD.
- Revisar `CONSTRUCTOR_DESKTOP_HANDOFF.md` y `MOBILE_COTIZACION_FLOW_HANDOFF.md` antes de tocar estos flujos.

## Fabricación y evidencia

Distinguir siempre:

- línea reconocida en catálogo;
- referencia o ficha documental;
- pauta interna;
- receta persistida;
- receta calculable;
- receta validada por taller;
- snapshot histórico de una cotización.

Para integrar una línea, trazar fuente → fixture/evidencia → catálogo/seed → selección de cotización → snapshot → despiece/pauta → PDF/Excel interno. No formar producto cartesiano entre listas de perfiles, aperturas, hojas y vidrios. Resolver por identidad exacta. Sin geometría o fórmula completa, conservar `sin_receta`/pendiente.

Documentos clave:

- `docs/agent-map/CUBICACION_PAUTA_HANDOFF.md`
- `docs/fabricacion/WORKFLOW_INTEGRAR_NUEVA_LINEA.md`
- `docs/fabricacion/PLANTILLA_INTEGRACION_LINEA.md`
- `docs/fabricacion/MAPA_CONEXIONES_LINEA.md`
- `.cursor/agents/ventora-line-integration-guardian.md`
- `docs/manuales/MANUAL_LINEAS_CUBICACION_PAUTA.md`

## Base de datos y seguridad

Fuentes de verdad:

- `supabase/docs/current_schema.sql`
- `supabase/docs/database_map.md`
- `supabase/docs/rls_policies.md`
- `supabase/docs/agent_database_notes.md`
- `supabase/docs/database.types.ts`

Tablas core: `organizations`, `users`, `clients`, `projects`, `cotizaciones`, `cotizacion_items`, `cotizacion_line_templates`, `fabrication_recipes`, `fabrication_recipe_tests`, `cotizacion_item_visual_configs`, `organization_profile`, `solicitudes_contacto`, `web_push_subscriptions`, tablas de billing y catálogos de proveedor documentados.

No crear migraciones, políticas, tablas, roles ni permisos por iniciativa. Antes de cambiar una query, comprobar organización, autenticación, RLS, soft delete y aislamiento entre tenants. No leer ni copiar secretos desde `.env`.

## Estado del worktree

El checkout compartido tiene cambios locales no consolidados en UI de cotización, Constructor, fabricación, catálogo/precios de proveedor, tests, documentación y workflows. El agente debe:

1. ejecutar `git status --short` y revisar solo el diff relevante;
2. conservar cambios de otros agentes/usuarios;
3. nunca usar `git reset --hard`, `git checkout --`, `git clean`, borrado masivo ni restaurar archivos completos;
4. no asumir que un cambio local está desplegado o validado en producción;
5. separar resultados de tests automáticos, smoke navegador y validación de taller.

## Método de trabajo obligatorio

1. Reformular objetivo y alcance.
2. Leer `AGENTS.md`, giro de producto y mapa específico.
3. Buscar archivos con `rg`; no explorar todo el repositorio ni `node_modules`, `.next` o tablas legacy.
4. Identificar fuente de verdad y riesgos de multi-tenant/snapshot.
5. Proponer plan corto antes de cambios grandes.
6. Editar mínimo, preservando contratos existentes.
7. Ejecutar pruebas proporcionales con `pnpm`.
8. Reportar archivos, evidencia, fallos y límites.

Comandos base:

```powershell
pnpm run lint
pnpm run build
pnpm test
pnpm fabrication:verify
pnpm fabrication:verify --build
```

Si se prueba navegador local, preferir `pnpm run build` + `pnpm run start`. Verificar HTTP desde el mismo entorno del navegador; el banner `Ready` de Next no prueba conectividad. Mantener una sola instancia usando `.next`, bind loopback y no cambiar puerto a ciegas.

## Acciones prohibidas sin autorización explícita

- push, merge, PR, deploy o migración remota;
- cambios de producción o afirmaciones de producción;
- borrar/restaurar cambios locales;
- crear tablas técnicas, fórmulas libres, nesting, CAD, inventario, compras o fabricación automática;
- abrir CRM/Kanban/oportunidades/cobros/roles/equipos;
- alterar cotizaciones históricas o snapshots silenciosamente;
- inventar equivalencias de proveedores, códigos, precios, geometrías o validaciones;
- poner datos técnicos en el PDF cliente;
- usar secretos, credenciales QA o datos personales en el handoff.

## Criterio de respuesta

Responder en español, con lenguaje directo. Liderar con resultado. Indicar qué está confirmado, qué es inferencia y qué está pendiente. No decir “integrado”, “validado”, “producción” o “compatible” solo porque compila, aparece en un selector o pasa una suite aislada.

## Prompt listo para Antigravity

Copiar este bloque y adjuntar/pegar este archivo junto con el objetivo específico:

```text
Trabaja como agente senior dentro del repositorio Ventora.

Repositorio: C:\Users\aless\vidrios-saas
Idioma: español.
Modelo: Gemini 4 Argon.
Contexto obligatorio: lee primero AGENTS.md, docs/VENTORA_GIRO_PRODUCTO_2026-07.md, docs/agent-map/README.md y luego este archivo: docs/agent-map/ANTIGRAVITY_PROJECT_CONTEXT.md.

Objetivo de esta sesión:
[DESCRIBIR AQUÍ UNA SOLA TAREA CONCRETA]

Reglas:
- Inspecciona git status y el diff relevante antes de editar; el worktree tiene cambios locales ajenos a esta tarea.
- Conserva cambios existentes. Nunca uses reset --hard, checkout --, clean ni restauración masiva.
- No inventes datos técnicos, precios, equivalencias, fórmulas, compatibilidades ni validaciones de taller.
- Mantén separado precio comercial, costo de compra, receta, pauta y snapshot histórico.
- Toda query debe mantener organization_id, RLS y soft delete.
- Usa pnpm, no npm, npx ni yarn.
- No hagas push, merge, PR, deploy, migración remota ni cambio de producción sin autorización explícita.
- Si la tarea toca una línea, proveedor, receta, precio, snapshot o PDF/Excel de fabricación, sigue WORKFLOW_INTEGRAR_NUEVA_LINEA.md y MAPA_CONEXIONES_LINEA.md.
- Si falta evidencia, detén la inferencia y marca el dato como pendiente.
- Reporta por separado pruebas automáticas, navegador y taller.

Antes de cambiar código, responde con:
1. objetivo entendido;
2. archivos fuente de verdad;
3. riesgos y límites;
4. plan corto;
5. validación propuesta.

Después de trabajar, entrega:
- archivos cambiados;
- comportamiento implementado o diagnóstico;
- comandos ejecutados y resultado;
- pendientes/bloqueos;
- si aplica, smoke navegador y validación de taller por separado.
```

