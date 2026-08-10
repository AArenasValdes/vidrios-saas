# Changelog Agent Map - Ventora

Historial de cambios en la documentacion del mapa tecnico.

---

## 2026-08-08 - Inicio inteligente de recetas por tipologia

- El administrador desktop ya no obliga a crear una receta vacia: ofrece Base de Ventora, Crear con IA o Empezar desde cero antes de persistir el borrador.
- Se agregaron seis bases estructurales universales (corredera, abatible, proyectante, pano fijo, puerta abatible y shower) ajustables por hojas y modulos.
- Las bases solo sugieren funciones, componentes habituales y dimensiones base. Codigos, descuentos, cantidades tecnicas, largos comerciales y pauta quedan Por confirmar y bloquean validacion.
- El taller puede reutilizar hasta tres recetas propias validadas similares. La copia conserva estructura y reglas, pero vuelve a borrador y debe revisarse, probarse y validarse.
- El asistente de texto sigue usando el endpoint y esquema existentes; ahora resume componentes detectados, reglas completas y datos pendientes antes de crear el borrador editable.
- Sin migracion SQL, cambios de RLS, formulas libres, PDF comercial, precios ni seleccion de recetas en cotizacion.

---

## 2026-08-04 - Corrección de navegación de líneas y recetas

- Se retiraron Biblioteca de líneas y Mis recetas del sidebar. Catálogo privado vuelve a ser la única entrada principal para precio comercial y receta técnica.
- Las tarjetas del catálogo ahora muestran un bloque compacto de Fabricación y filtros por estado técnico. Cada acción abre la receta ligada a su `line_template_id`.
- Biblioteca técnica y Mis recetas permanecen como rutas internas con regreso explícito al catálogo. Desde una línea, una plantilla sugerida se copia como receta privada vinculada y abre su editor.
- La biblioteca abierta sin línea permite explorar, pero deriva a seleccionar una línea comercial antes de copiar. Las rutas internas usan contexto técnico y no heredan encabezado de Dashboard.
- Las tarjetas del Catálogo privado separan precio y estado comercial de un bloque compacto de Receta técnica. Solo muestran Sin receta, Borrador, Lista para probar o Validada, con faltantes persistidos cuando existen y acciones independientes para editar la línea o administrar su receta.
- Sin cambios en motor, fórmulas, plantillas, IA, base de datos ni pauta de corte.

---

## 2026-08-03 - Asistente estructurado y barras en recetas formales

- Se agrego asistente de texto autenticado con DeepSeek JSON Output y validacion Zod. Solo produce borradores; datos no explicitados quedan pendientes y bloquean validacion.
- El editor ahora incluye observaciones, datos pendientes y parametros confirmables de barra: perdida por corte, despunte inicial y sobrante minimo aprovechable.
- El snapshot formal incorpora distribucion FFD referencial por codigo/largo comercial y la adapta al consolidado existente; cotizar no llama IA.
- Biblioteca: ALAR L20/L25/L5000 se copia como borrador sugerido. SODAL Serie 20/4800/S-33/42/3200 queda reconocida sin `definition` ejecutable hasta contar con formulas verificables.
- Sin migracion SQL: los campos nuevos viven de forma aditiva en `definition`/snapshot JSON. Se preservan RLS, soft delete, versionado y compatibilidad.

---

## 2026-08-01 - Catalogo prioritario desde investigacion documental

- Se incorporo `C:\Users\aless\OneDrive\Escritorio\deep-research-report.md` como fuente de apoyo para catalogo reconocido y prioridad de integracion, no para formulas de cubicacion.
- Prioridad cerrada: aluminio lanzamiento Serie 20/25/32/42/4800/5000/Puerta 3200; expansion Sodal 3800, Indalum S24/S33/X27/X43/X69/Plexa; PVC posterior DVP Aspen/Advance, Winhouse Sliding y Deceuninck SL/DL322; Winsa/Veratec/Proline/Tehmco bajo demanda.
- Se reforzo que recetas ejecutables requieren manual/pauta real y pruebas de taller; el reporte no habilita descuentos, cortes, cantidades, mecanizados ni `definition` de `fabrication_recipes`.

---

## 2026-07-30 - Fase 4 fabricacion: administrador guiado y selector de receta

- Se agrego `/configuracion/empresa/lineas-precios/[lineTemplateId]/fabricacion` con listado de versiones, duplicado Ventora, editor guiado, laboratorio esperado/calculado, casos obligatorios/opcionales, versionado, archivo y validacion.
- Las tarjetas de lineas distinguen Sin configurar / En prueba / Validada y derivan al administrador. El wizard comercial deja la receta legacy como solo lectura y ya no escribe nuevos `fabricationRecipePack`/`fabricationRecipe`.
- `/cotizaciones/nueva` usa recetas persistidas `validated`: autoselecciona una compatible, pide eleccion cuando hay varias y no bloquea cuando no existe receta. Persiste tipologia/hojas/modulos/apertura/herraje/variante/recipe id y snapshot formal inmutable.
- Se aplico remotamente `20260730003756_fabrication_recipe_validation_metadata`: `fabrication_recipes.validated_by`, `fabrication_recipe_tests.is_required` y triggers de identidad del validador.
- Compatibilidad preservada: lectura de `fabricationRecipePack`, `fabricationRecipe` y `[cub:]`; sin cambios en PDF comercial, WhatsApp, precios, IA, Storage ni tablas tecnicas legacy.
- QA: TypeScript y lint focalizado pasan; suite completa 170/170 y 1007/1007; build Next de produccion pasa. El lint global mantiene deuda previa fuera de esta fase.

---

## 2026-07-30 - Cierre remoto Fase 3 fabricacion

- Se aplicaron en Supabase remoto `yrtrwgkaopfumpidjthk` las migraciones `20260729230407_fabrication_recipes_persistence` y `20260729234019_cotizacion_items_fabricacion_snapshot`.
- Se agrego y aplico `20260730001306_harden_fabrication_recipe_grants` para revocar grants heredados en `fabrication_recipes`/`fabrication_recipe_tests` y dejar solo `SELECT/INSERT/UPDATE` a `authenticated` y `service_role`.
- Smoke remoto con dos empresas QA confirmo: recetas privadas aisladas por organizacion, recetas Ventora visibles para ambas, bloqueo de update cruzado, cotizacion sin receta sin snapshot, cotizacion con receta unica con snapshot y multiples recetas sin snapshot automatico.
- Se confirmo que una receta `validated` no se edita directamente y que un snapshot historico en `cotizacion_items.fabricacion_snapshot` no cambia al archivar/versionar la receta.
- Performance Advisor remoto queda limpio; Security Advisor conserva solo avisos conocidos previos (`touch_growth_updated_at`, `get_org_id()`, `reserve_next_cotizacion_code(...)`, leaked password protection).

---

## 2026-07-29 - Fase 3 fabricacion: recetas en cotizacion y snapshot formal

- Se agrego `cotizacion_items.fabricacion_snapshot` como JSONB aditivo para congelar resultado tecnico por pieza sin usar precios comerciales.
- Se conecto el guardado de cotizacion a `fabrication_recipes`: solo una receta `validated` compatible por `line_template_id` se calcula automaticamente con `calcularCubicacionYPauta()`.
- Se agregaron servicios puros de resolucion de receta compatible y construccion de snapshot inmutable en `src/features/fabricacion/`.
- El resumen interno de fabricacion ahora lee primero el snapshot formal y mantiene fallback de lectura `[cub:]` para cotizaciones antiguas.
- El flujo nuevo deja de escribir snapshots tecnicos `[cub:]`; `fabricationRecipePack` y `fabricationRecipe` permanecen como compatibilidad legacy.
- Remoto aplicado/verificado el 2026-07-30. Sigue pendiente construir UI final para multiples variantes/herrajes.

---

## 2026-07-29 - Supabase remoto conectado y auditoria DB

- Se agrego y autentico el MCP Supabase para `yrtrwgkaopfumpidjthk`; en esta sesion las tools MCP no se inyectaron, por lo que se uso Supabase CLI remoto `--linked`.
- `supabase projects list` confirma proyecto `ACTIVE_HEALTHY`, Postgres `17.6.1.063`, region `us-west-2`.
- Nota historica: en esa auditoria `fabrication_recipes` y `fabrication_recipe_tests` aun no existian en remoto. Estado supersedido por el cierre remoto del 2026-07-30.
- Se documentaron advisors remotos: security warnings en `touch_growth_updated_at`, `get_org_id()`, `reserve_next_cotizacion_code(...)` y leaked password protection; performance warnings por FKs sin covering index en tablas Growth.
- Se actualizo documentacion Supabase: `database_map.md`, `rls_policies.md`, `agent_database_notes.md`.
- Se corrigio el mapa tecnico para no presentar la persistencia Fase 2 como ya aplicada en remoto.

---

## 2026-07-29 - Persistencia versionada de recetas de fabricacion

- Se agrego la migracion `20260729230407_fabrication_recipes_persistence` con `fabrication_recipes` y `fabrication_recipe_tests`.
- Las recetas quedan multiempresa y versionadas: `scope='ventora'` para base global de lectura authenticated y `scope='organization'` para recetas privadas por `organization_id`.
- Se agregaron RLS, FKs, indices, soft delete, trigger de `updated_at`, sincronizacion de `organization_id` en tests y bloqueo DB para no editar recetas ya `validated` directamente.
- Se implementaron repositorios y servicio en `src/features/fabricacion/` para crear, listar, actualizar borradores, duplicar, versionar, archivar, ejecutar tests y validar recetas solo cuando todos los casos pasan.
- `definition`, `input`, `expected_output` y `actual_output` se validan con los schemas Zod existentes del dominio tecnico.
- Compatibilidad preservada: `fabricationRecipePack`, espejo `fabricationRecipe` y snapshots `[cub:]` siguen como lectura/compatibilidad; esta fase no migra ni escribe esos formatos.
- No se conecto a UI, cotizacion, PDF, WhatsApp, DeepSeek, carga de archivos, Storage, Edge Functions ni tablas tecnicas legacy.

---

## 2026-07-29 - Dominio tecnico puro de fabricacion

- Se agrego `src/features/fabricacion/` como modulo autocontenido para recetas de fabricacion y motor deterministico de cubicacion/pauta.
- Alcance: tipos de dominio, schemas Zod, validacion, motor puro, fixture de corredera 2 hojas marcada como `ejemplo_no_validado`, tests unitarios.
- Reutiliza decisiones actuales: receta separada de linea comercial, estados de validacion, funciones de perfiles, compatibilidad futura con snapshot `[cub:]`.
- Queda como compatibilidad: `fabricationRecipePack`, espejo `fabricationRecipe`, motor legacy en `src/features/cotizaciones/line-templates/`, y partidas historicas `pano_fijo`, `corredera_2_hojas`, `puerta_abatible_1_hoja`.
- Reemplazo futuro aditivo: las formulas acopladas a cotizacion/catalogo deben migrar gradualmente a `src/features/fabricacion/` cuando se conecte UI o persistencia.
- No se tocaron rutas, PDF, WhatsApp, Supabase, DeepSeek, carga de archivos, tablas legacy, optimizacion de barras, nesting ni fabricacion automatica.

---

## 2026-07-28 - Google OAuth unico + Completa tu cuenta

- Google queda como unico provider OAuth visible y valido; email/password continua disponible.
- `/auth/completar-cuenta` solicita nombre, taller, WhatsApp, ciudad/comuna y consentimiento antes de `/activacion`.
- Migracion aditiva agrega perfil privado en `users` y RPC transaccional/idempotente protegida para organizacion, perfil y trial.
- Migracion aplicada y verificada en Supabase remoto como `20260728083604_google_oauth_account_completion`.
- Se agrego correo normalizado unico, locks de 64 bits y validaciones consistentes de largo/formato.
- Grants de `users` endurecidos: las cuatro columnas privadas quedan fuera de SELECT cliente; RPC solo `service_role`.
- Auditoria post-migracion: 23 usuarios, cero duplicados de correo/auth, cero organizaciones sin perfil y cero trials incompletos; sin advisor nuevo para la RPC.
- `/activacion` reutiliza el telefono precargado y deja de volver a solicitarlo.
- Panel founder muestra contacto del registro, ciudad, fecha y primera cotizacion sin mezclar `clients`.
- Facebook permanece solo como dato legacy/social fuera del auth.

## 2026-07-26 - Logout duro en AdminSidebar (sesion founder)

- Causa: el footer de `/admin` usaba `<Link href="/auth/logout">`. Prefetch/soft-nav invocaba `GET /auth/logout`, borraba cookies `sb-*` y el layout founder redirigia a `/login` en cada accion.
- Fix: `AdminSidebar` cierra sesion con boton + `navigateToLogoutRoute()` (mismo contrato que `AppShell`). `ADMIN_FOOTER_ACTIONS` separa logout del nav de links; footer links con `prefetch={false}`.
- Docs: `ROUTES_MAP` (`/admin`, `/auth/logout`), `FEATURES_MAP` (Auth + Centro de Operaciones), `COMPONENTS_MAP` (`AdminSidebar`).
- Archivos: `admin-sidebar.tsx`, `admin-nav.config.ts`, `admin-sidebar.module.css`, test de regresion del sidebar.

## 2026-07-27 - Constructor móvil Paso 2 (cotizar por items)

- **Qué**: Experiencia móvil nativa del Paso 2 en `/cotizaciones/nueva`, sobre el mismo `draft.items`, sin portar `QuoteConstructorWorkspace` desktop.
- **Alcance**: viewport móvil (`max-width: 860`) y flujo `por_item`; desktop `>=1024` intacto. No cambia PDF, WhatsApp, pricing formulas, tablas ni guardado.
- **Modo**: selector inicial móvil queda en **Cotizar por items** / **Cuadernillo digital** (`total_global`). Dentro de `por_item`, el toggle visible es **Guiada | Constructor**; solo aparece en subpaso **Tipo** y en la lista de piezas, no en **Cantidad** ni **Datos**.
- **Constructor mobile**: `mobile-cuaderno/` muestra **Constructor de piezas**, botón principal **Agregar pieza**, lista compacta con miniaturas `guidedVisualConfig`, línea global compacta, estado de pieza y edición rápida.
- **Edición rápida**: material del perfil Aluminio/PVC arriba de línea/precio, colores compactos por material, selector de líneas con Aluminio/PVC/Cristal, preview con `colorHex`, vidrio/color y acción **Forma y apertura** hacia composición.
- **Composición**: full-screen con `Partir lado`, `Partir alto`, selección de módulo, medidas contenidas, tipos de módulo y `Reflejar` contextual; `Reflejar` solo se habilita para aperturas laterales y muestra `Abre izq./der.`.
- **Archivos**: `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/mobile-cuaderno/*`, `paso-dos-wizard-movil-shell.tsx`, `paso-dos-wizard-encabezado-movil.tsx`, `paso-dos-lista-movil.tsx`, `page.tsx`, `page.module.css`, `line-template-picker.tsx`.
- **Tests/validación**: `paso-dos-cuaderno-movil.test.tsx`, `paso-dos-wizard-movil-shell.test.tsx`, lint focal y `npm run build`.
- **Hardening posterior**: selector inicial `por_item` no abre el wizard guiado por accidente; edición rápida confirma cambios al guardar, cambio de material descarta una línea incompatible, la línea global se aplica por lote y se eliminaron miniaturas ocultas/reagrupaciones de catálogo que seguían consumiendo render.

## 2026-07-25 - Selector visual de tipologias en Cotizacion rapida

- `QuoteConstructorWorkspace` mantiene seis accesos principales y mueve tipologias especiales a menus compactos de Puerta y Mas tipologias.
- El schema visual y el renderer compartido incorporan Guillotina, Celosia, Puerta corredera, Shower frontal y Shower corredera; `pano_libre` se presenta como Composicion personalizada sin cambiar el dato persistido.
- Selector y croquis principal comparten SVG, color de perfil, indicadores de apertura y targets hacia el inspector.
- Alcance solo UI desktop: sin cambios de pricing, cubicacion, snapshots, PDF, WhatsApp, tablas ni rutas de guardado.

## 2026-07-24 - Cubicación V1 vendible + giro de producto documentado

- Nuevo rector de giro: `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`.
- Roadmap / AGENTS / README / FEATURES / DATA / ROUTES / COMPONENTS / AGENT_TASK_GUIDE / handoff / manual alineados a **pack multi-tipología**.
- Implementado en código: `fabricationRecipePack`, plantillas L5000/L20/L25 sugeridas, bases tipológicas pendientes, filtro tipología en cotizar, print `/print/cotizaciones/[id]/fabricacion`, UX origen arriba en wizard.
- Naming cerrado: sugeridas ≠ verificadas; bases = pendientes de taller; FFD = distribución referencial; PDF cliente sin técnico.
- Go-to-market: motor listo → piloto 3 correderas → fórmulas otras tipologías → recién entonces cobertura amplia.

## 2026-07-21 - Smoke + pulido post-recetas

- Smoke autenticado (`admin@test.com` / `1234`): cubicación y despiece visibles en cotizar con cortes por función.
- Fix hydration: `sourceSolicitudId` ya no lee `sessionStorage` en el primer paint (SSR-safe).
- Perfiles genéricos `Marco`/`Hoja` dejan de mostrarse como código; UI usa `Por asignar` hasta código real de taller.
- Cortes se estiman sin perfil asignado; el estado de receta exige perfiles reales para `lista_para_validar`.
- Docs sincronizadas: `AGENTS.md`, roadmap, handoff, overview.

## 2026-07-21 - Recetas de fabricación (cubicación real)

- Se reemplaza el modelo genérico Marco/Hoja como UI principal por **recetas de componentes reales** (`fabricationRecipe` en `catalog_metadata`).
- Wizard Nueva línea pasos 3–4: tipo de fabricación, componentes, reglas guiadas, validación por corte real.
- Motor: `fabrication-recipe.service.ts`; plantillas estructurales; bridge legacy; snapshot cotización **v2**.
- Camino 2 (3 partidas) queda como migración/compatibilidad. Docs: `CUBICACION_PAUTA_HANDOFF.md`, `FEATURES_MAP.md`, `README.md`.

## 2026-07-20 - Cotización rápida / Cotización guiada (misma pieza)

- Tabs desktop `Presupuesto` / `Constructor` reemplazados por **Cotización rápida** / **Cotización guiada** con igual peso visual.
- Contrato de dominio compartido: `src/features/cotizaciones/new-quote/quote-piece-domain.ts` (comercial vs técnico, resumen técnico).
- Rápida: resumen técnico en tarjetas, inspector con cubicación/despiece (`PautaCubicacionPanel`), CTA «Abrir configuración guiada».
- Guiada desktop `por_item`: 5 pasos Tipo → Sistema → Medidas → Despiece → Precio; editor desktop con tab Despiece.
- Preferencia de modo en `localStorage`; default rápida. Cabecera de flujo compacta en Paso 2.
- Misma fuente de verdad `draft.items`; sin migración DB; mobile intacto.

## 2026-07-20 - Handoff consolidado del Constructor desktop

- Se publica `docs/agent-map/CONSTRUCTOR_DESKTOP_HANDOFF.md` como fuente operativa para continuar con otro agente sin redescubrir el flujo.
- Se consolidan estado funcional, arquitectura, modelo V2, persistencia, pricing, renderer compartido, PDF, evidencia de QA, bloqueos globales y límites de alcance.
- Se sincronizan `Agents.md`, roadmap, índice, mapas de features, componentes, rutas, datos, overview y guía de tareas.
- Punto exacto de reanudación: validación local de ancho/alto/cantidad inválidos que bloquee revisión sin corromper el draft; luego inspección raster de un PDF descargado real.
- Esta pasada es exclusivamente documental: no modifica producto, esquema DB, mobile, pricing ni persistencia.

## 2026-07-20 - Croquis protagonista y cotas despejadas en documentos

- El renderer compartido amplía el aprovechamiento del canvas PDF y reserva una banda técnica mayor para las cotas.
- PDF, preview y documento público renderizan croquis con `maxH: 260`; el marco visual admite hasta 248 px sin modificar datos ni precios.
- Textos de ancho/alto incorporan halo claro y mayor separación respecto del perfil; el renderer legacy recibe el mismo tratamiento de cotas.

## 2026-07-20 - Constructor desktop: cuaderno profesional y paleta compartida

- `QuoteConstructorWorkspace` pasa a un unico scroll vertical con inspector sticky de 390 px y footer de progreso.
- Tarjetas mas compactas, estados especificos y acciones agrupadas sin modificar callbacks, draft ni persistencia.
- La barra de color del inspector reutiliza `COLOR_OPTIONS`, igual que Presupuesto, y conserva color personalizado hexadecimal.
- Alcance solo desktop >=1024; mobile, PDF, WhatsApp y calculos quedan intactos.

## 2026-07-19 - Constructor-cuaderno desktop para cotizaciones completas

### Resumen

Paso 2 incorpora un modo explicito **Constructor** solo desktop. El maestro puede agregar presets, ver varias ventanas/puertas en un tablero cuadriculado, editar medidas/cantidad/nombre, seleccionar linea/vidrio/material/color/apertura/precio, duplicar, eliminar y reordenar sin perder el draft. `total_global` conserva items descriptivos a `$0`; `por_item` mantiene recalculo por plantilla y override manual. El schema visual V2 suma `oscilobatiente` y `openingSide` de forma aditiva; el renderer compartido gana perfiles en capas, vidrio tintado, cotas y simbolos de apertura. Sin migracion DB y sin cambios mobile.

### Archivos

| Area | Archivos |
|---|---|
| Workspace | `quote-constructor-workspace.tsx` + `.module.css` + service |
| Integracion | `paso-dos-seccion.tsx`, `page.tsx`, CSS desktop |
| Modelo/SVG | `guided-visual-config.ts`, `guided-visual-renderer.service.ts`, `guided-visual-composer.tsx` |
| Pruebas | tests V1/V2, renderer, service y componente del workspace |

## 2026-07-19 - Camino 2: partidas V1 simples + handoff cubicación

### Resumen

Decisión de producto: **no ensanchar** el selector de cubicación con tipologías (bow, abatible ventana, etc.). Catálogo = precio comercial; partida V1 = 3 patrones de estimación; tipologías complejas = constructor. UI del modal de línea deja estimación secundaria (partida/estado primero; perfiles/descuentos/calibración en segundo paso). Se publica handoff completo para otras IAs: `CUBICACION_PAUTA_HANDOFF.md`.

### Archivos

| Area | Archivos |
|---|---|
| Handoff | `docs/agent-map/CUBICACION_PAUTA_HANDOFF.md` |
| Mapas | `README.md`, `AGENT_TASK_GUIDE.md`, `FEATURES_MAP.md`, `DATA_MODEL_MAP.md`, `AGENTS.md`, roadmap |
| UI | `lineas-precios-page-client.tsx` (+ CSS) |

## 2026-07-19 - Canales: UI unificada con shell Ventora

### Resumen

`/solicitudes/canales` deja el hero/cards apilados del diseño antiguo. Header desktop alineado a Solicitudes/Empresa, workspace de 2 columnas (canales + QR sticky), sin bloque duplicado de acciones rápidas, y "Editar página" apunta a `/configuracion/pagina-venta`. El shell reconoce la ruta como pantalla especial "Canales".

### Archivos

| Area | Archivos |
|---|---|
| Página | `app/(pwa-app)/solicitudes/canales/page.tsx`, `page.module.css` |
| UI | `src/features/solicitudes/components/lead-channels.tsx`, `lead-channels.module.css` |
| Shell | `src/components/layout/app-shell.tsx` |

## 2026-07-19 - Trabajo personalizado: entra al constructor

### Resumen

`Trabajo personalizado` deja de ser item libre (`esItemLibre`). Pasa por el flujo normal de pieza y muestra el constructor visual en composición (`shouldShowGuidedComposerEntry`). La pauta sigue en modo borrador manual. `Trabajo libre / Mantencion` permanece como item libre sin constructor.

## 2026-07-19 - Personalizado: pauta manual asistida (Fase 4)

### Resumen

Si la pieza es composición **Personalizado** (constructor o flag Personalizado), la cubicación deja de usar la pauta automática de la línea. Se siembra un **borrador editable** (marco H/V + fila por definir + vidrio del vano), con aviso claro, sin Recalcular/Restaurar de plantilla ni “Guardar ajuste para esta línea”. Al guardar, `resolveCubicationSnapshotForSave(..., personalizadoAssistMode)` no cae al auto de catálogo.

## 2026-07-19 - Constructor Personalizado: marco redondeado

### Resumen

Se completa la forma del marco: además de `rect` y `arch_top`, ahora hay `rounded` con radio mm y esquinas `all|top` (igual lógica que el vidrio). Así marco y vidrio pueden coincidir visualmente.

## 2026-07-18 - Constructor Personalizado: formas de vidrio V1

### Resumen

Extension Fase 3 (no Fase 4): en el constructor visual guiado se pueden marcar formas simples sin CAD.

1. **Forma del marco** (root): `rect` | `arch_top` | `rounded` (+ flecha o radio mm).
2. **Forma del vidrio** por modulo: `rect` | `rounded` + radio mm + esquinas `all|top`.
3. SVG/PDF usan el mismo renderer (`clipPath` + paths). No cambia precio ni pauta de corte.

### Archivos

| Area | Archivos |
|---|---|
| Schema | `guided-visual-config.ts` (`frameShape`, `glassShape`) |
| Paths | `guided-visual-shape-paths.ts` |
| Renderer | `guided-visual-renderer.service.ts` |
| UI | `guided-visual-composer.tsx` |
| Tests | `guided-visual-shapes.test.ts` |

---

## 2026-07-18 - Fase 4: UX cubicacion en Medidas (Quote Studio)

### Resumen

La seccion **Cubicacion y pauta** en `/cotizaciones/nueva` desktop deja de ir al final de Medidas dentro de un `<details>`. Ahora:

1. Va justo despues de dimensiones/cantidad.
2. Muestra tarjeta con resumen siempre visible (vidrio, perfiles, barras, accesorios).
3. La tabla de cortes es expandible ("Ver pauta" / "Ocultar pauta").
4. Si falta linea, pauta activa o medidas, muestra estado pendiente explicito (ya no desaparece).

Precio permanece solo comercial. Archivo: `paso-dos-editor-desktop.tsx` + CSS.

---

## 2026-07-18 - Fase 4: calibracion por ejemplos de taller

### Resumen

Quinto corte Fase 4 en `/configuracion/empresa/lineas-precios`:

1. **Descuentos editables** (`deductionFrame*`, `deductionSash*`, `deductionGlass*`) persistidos en `catalog_metadata`; el preview ya no fuerza 0.
2. **Perfiles** Zocalo / Accesorio visibles en ficha.
3. **Calibrar con ejemplo real**: vano + vidrio fabricado (+ marco opcional) → delta vs calculado → **Ajustar descuentos al ejemplo**.
4. **Preset del sistema** (partida generica, no marca) para corredera / fijo / puerta; estado pasa a `en_calibracion` (salvo `validada`/`revisar_cambios`).
5. Medidas de ejemplo editables alimentan pauta y estimacion.

### Archivos clave

| Area | Archivos |
|---|---|
| Helpers | `cotizacion-line-template-cubication-calibration.ts` |
| UI ficha | `lineas-precios-page-client.tsx` + CSS |
| Tests | `…/__tests__/cotizacion-line-template-cubication-calibration.test.ts` |

### Fuera de este corte

Presets por proveedor/marca; multi-ejemplo persistido; optimizacion/barras avanzadas.

---

## 2026-07-18 - Fase 4: ajuste en linea + pauta consolidada

### Resumen

Cuarto corte Fase 4:

1. **Guardar ajuste para esta linea**: desde pauta manual en Quote Studio, confirma y actualiza perfiles en `catalog_metadata` de la linea. Si estaba `validada`, pasa a `revisar_cambios`. No toca precios ni descuentos.
2. **Pauta consolidada**: panel desktop en el workspace de presupuesto; agrupa cortes persistidos (`[cub:]`) por linea + perfil + medida; copia texto plano.

### Archivos clave

| Area | Archivos |
|---|---|
| Ajuste → catalogo | `cotizacion-line-template-cubication-adjustment.ts` |
| Consolidado | `cotizacion-cubication-consolidated.ts` |
| UI panel | `paso-dos-editor-desktop.tsx` (boton), `pauta-consolidada-panel.tsx` |
| Cableado | `page.tsx` → `use-flujo-nueva-cotizacion` → `use-paso-dos-presentacion` |
| Tests | `…/__tests__/cotizacion-line-template-cubication-adjustment.test.ts` |

### Fuera de este corte

Calibracion por ejemplos reales de taller; barras/sobrante en consolidado; impresion dedicada.

---

## 2026-07-18 - Fase 4: edicion manual de pauta por cotizacion

### Resumen

Tercer corte Fase 4: en Quote Studio desktop la pauta es editable solo para la pieza/cotizacion actual.

1. Snapshot `source: "auto" | "manual"` en `[cub:]`.
2. Panel: editar Perfil / Funcion / Medida / Cantidad, agregar/quitar cortes.
3. Acciones `Recalcular` (desde linea actual) y `Restaurar calculo` (vuelve a auto).
4. `resolveCubicationSnapshotForSave` prioriza draft/previous manual; no pisa ajustes con metadata de linea.
5. Siguiente (cerrado en corte posterior): `Guardar ajuste para esta linea` y pauta consolidada.

### Archivos clave

| Area | Archivos |
|---|---|
| Snapshot + rebuild | `cotizacion-line-template-cubication-snapshot.ts` |
| Form draft | `ComponentFormState.cubicationSnapshot` en `workflow-ui.ts` |
| Panel editable | `paso-dos-editor-desktop.tsx` + CSS |

---

## 2026-07-18 - Fase 4: snapshot tecnico por cotizacion

### Resumen

Segundo corte de Fase 4: al guardar una pieza con linea + pauta activa + medidas, se congela la cubicacion en `cotizacion_items.observaciones` via bridge `[cub:]` (base64url JSON). Cambios futuros en `catalog_metadata` de la linea no alteran cotizaciones historicas.

1. Helpers: `buildCubicationSnapshotFromCatalogMetadata()`, `serializeCubicationSnapshot()` / `parseCubicationSnapshot()`, `resolveCubicationSnapshotForSave()`.
2. Persistencia sin tabla nueva: `encodeCotizacionItemPresentationMeta` / `decode…` incluyen `cubicationSnapshot`.
3. `buildItemFromForm` captura snapshot al finalizar pieza (con `lineTemplates` / metadata).
4. Panel desktop **Cubicacion y pauta**: si medidas/linea coinciden con el snapshot, muestra pauta congelada ("Snapshot guardado"); si el usuario cambia medidas, vuelve a preview en vivo.

### Siguiente corte

1. Edicion manual de pauta para la cotizacion actual.
2. Acciones `Recalcular`, `Restaurar calculo`, `Guardar ajuste para esta linea` con confirmacion.
3. Pauta consolidada imprimible/exportable.
4. Calibracion con ejemplos reales de taller.

### Archivos clave

| Area | Archivos |
|---|---|
| Snapshot | `src/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot.ts` |
| Bridge observaciones | `src/utils/cotizacion-item-presentation.ts` |
| Guardado pieza | `src/features/cotizaciones/new-quote/workflow-ui.ts` (`buildItemFromForm`) |
| Panel desktop | `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-editor-desktop.tsx` |
| Tests | `…/__tests__/cotizacion-line-template-cubication-snapshot.test.ts` |

### Validacion conocida

`npx tsc --noEmit --pretty false --incremental false` pasa. `npm test` sigue bloqueado por Jest global `clearMocksOnScope`.

---

## 2026-07-18 - Fase 4: cubicacion asistida y pauta revisable V1 iniciada

### Resumen

Se documenta el primer corte implementado de Fase 4 para que los agentes continuen desde el punto correcto:

1. Sistemas V1: `pano_fijo`, `corredera_2_hojas`, `puerta_abatible_1_hoja`.
2. Estados V1: `sin_configurar`, `lista_para_probar`, `en_calibracion`, `validada`, `revisar_cambios`.
3. `cotizacion_line_templates.catalog_metadata` guarda perfiles por rol y ajustes simples; no hay tabla tecnica nueva.
4. `/configuracion/empresa/lineas-precios` permite configurar sistema, estado y perfiles por rol.
5. `/cotizaciones/nueva` desktop muestra **Cubicacion y pauta** con `Perfil / Funcion / Medida mm / Cantidad / Total lineal`, vidrio, ml perfiles, accesorios y barras referenciales.

### Siguiente corte

1. Snapshot tecnico por cotizacion. *(hecho 2026-07-18)*
2. Edicion manual de pauta para la cotizacion actual.
3. Acciones `Recalcular`, `Restaurar calculo`, `Guardar ajuste para esta linea` con confirmacion.
4. Pauta consolidada imprimible/exportable agrupada por linea + perfil + medida.
5. Calibracion con ejemplos reales de taller.

### Archivos clave

| Area | Archivos |
|---|---|
| Helpers Fase 4 | `src/features/cotizaciones/line-templates/types/cotizacion-line-template.ts` |
| Catalogo | `src/features/cotizaciones/line-templates/components/lineas-precios-page-client.tsx` + CSS |
| Quote Studio desktop | `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-editor-desktop.tsx` + CSS |
| Tests V1 | `src/features/cotizaciones/line-templates/types/__tests__/cotizacion-line-template-estimation.test.ts` |

### Validacion conocida

`npm run build` y `npx tsc --noEmit --pretty false --incremental false` pasan. Lint puntual de archivos Fase 4 pasa. `npm run lint` global esta bloqueado por deuda React Compiler en rutas ajenas; `npm test` esta bloqueado por Jest global `this._moduleMocker.clearMocksOnScope is not a function`.

---

## 2026-07-18 - Corrección de estado: 2B cerrada; pasada = Fase 5 desktop

### Resumen

1. **Fase 2B ya estaba cerrada** (2026-07-17: import PDF + cruce Excel↔técnicas). No es el siguiente trabajo.
2. La pasada reciente fue **Fase 5 + diseño desktop** (dashboard, shell, listados, detalles, ficha catálogo).
3. Quote Studio (1) también cerrada; no inventar pulido.
4. **Siguiente fase formal no abierta:** Fase 4 cubicación (solo con decisión explícita).

### Archivos de documentación

`AGENTS.md`, roadmap, `README.md`, `PROJECT_OVERVIEW.md`, `FEATURES_MAP.md`, `AGENT_TASK_GUIDE.md`

---

## 2026-07-18 - Catálogo: ficha de línea lista para fabricación

### Resumen

Se reordena el sheet **Editar/Nueva línea** del catálogo privado:

1. Secciones claras + color con propósito; progressive disclosure (**Agregar más detalles**).
2. Desktop ≥1024: modal ancho (~1080) con vista previa + tarjeta **Fabricación (Próximamente)** sin abrir Fase 4.
3. Scroll único en body del modal (no deformar al expandir detalles).

### Archivos

`lineas-precios-page-client.tsx`, `lineas-precios-page-client.module.css`

---

## 2026-07-18 - Estado de fase + shell/detalles desktop

### Resumen

Se actualiza la documentacion al estado real del producto:

1. **Fase 5 dashboard** marcada como implementada (brief + roadmap + mapas).
2. **Foco actual**: retoque final UX premium del desktop comercial + Quote Studio para demo.
3. Shell/listados/detalles desktop documentados: vistas propias ≥1024 para `/cotizaciones/[id]` y `/clientes/[id]`; AppShell con rutas anchas y topbar oculto en detalles.
4. Fuera de foco: cubicacion (Fase 4), CRM/seguimiento/Kanban.

### Archivos de documentacion

`AGENTS.md`, `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md`, `docs/design/FASE_5_DASHBOARD_BRIEF.md`, `docs/agent-map/README.md`, `PROJECT_OVERVIEW.md`, `FEATURES_MAP.md`, `ROUTES_MAP.md`, `COMPONENTS_MAP.md`, `AGENT_TASK_GUIDE.md`

---

## 2026-07-18 - Fase 5: refinamiento editorial desktop

Se corrige el ancho efectivo del dashboard (1600 px en 1920), adaptación 1280,
proporción inferior 70/30 y densidad de filas. El gráfico queda como SVG propio:
línea azul 2 px, relleno 4%, dos guías, un único punto permanente y tooltip CLP.
KPI y recientes mantienen tratamiento abierto/compacto. Mobile no cambia.

---

## 2026-07-18 - Fase 5: rediseño Dashboard desktop + sidebar

### Resumen

Implementación del dashboard desktop (≥1024) según brief visual: hero valor del mes + tendencia 6 meses real, 3 KPIs, cola **Por enviar** con PDF/WhatsApp, columna respuestas/recientes, empty states. Sidebar desktop oscura con logo Ventora y nav Operativo/Configuración. Mobile intacto.

### Archivos clave

`dashboard-desktop.tsx`, `page.desktop.module.css`, `dashboard-summary-server.service.ts`, `use-dashboard-view-model.ts`, `app-shell.tsx` / CSS, helpers pending-send + monthly-totals

---

## 2026-07-18 - Fase 5: brief dashboard (Por enviar, sin seguimiento hero)

### Resumen

Se cierra la dirección de producto del dashboard Fase 5 antes del rediseño visual (exploración externa):

1. Flujo a empujar: cotizar → PDF → WhatsApp.
2. Cola principal: **Por enviar**; seguimiento no es bloque hero (pocos maestros lo usan).
3. KPI hero: valor cotizado. Sin CRM/Kanban. UI solo tras brief aprobado.
4. Brief + prompt de diseño en `docs/design/FASE_5_DASHBOARD_BRIEF.md`.

### Archivos

`docs/VENTORA_DESKTOP_TALLER_ROADMAP.md`, `docs/design/FASE_5_DASHBOARD_BRIEF.md`, `FEATURES_MAP.md`, `ROUTES_MAP.md`, `AGENT_TASK_GUIDE.md`, `AGENTS.md`

---

## 2026-07-18 - Quote Studio: cierre desktop Paso 1 / Paso 3

### Resumen

Pulido del cierre comercial desktop (sin tocar PDF/WhatsApp contracts ni mobile):

1. Paso 1 aside: **Continuar** y **Guardar borrador** sin exigir cliente ni obra (cotización rápida).
2. Si faltan, `resolveStep1Draft` completa con “Cliente” / “Cotización”.
3. Paso 3 aside: badge **Borrador guardado** + hint si falta teléfono para WhatsApp.

### Archivos

`resumen-desktop-lateral.tsx`, `paso-tres-resumen.tsx`, `page.module.css`, test del aside Paso 1

---

## 2026-07-18 - Quote Studio: panel financiero compacto + scroll

### Resumen

Corrige overflow visual del panel derecho (footer tapaba Merma %):

1. Empty compacto: chip **Sin costos** + CTA **Agregar costos** (sin bloque largo).
2. Detalle colapsado por defecto; hint corto solo al abrir.
3. Panel summary con `panelBody` scrolleable y footer fijo.

También: margen con objetivo, delta recomendado y CTA anclado.

### Archivos

`quote-studio-financial-panel.tsx`, `paso-dos-panel-desktop.module.css`, test del panel

---

## 2026-07-18 - Quote Studio: pulido lista + preview presupuesto

### Resumen

Desktop lista/workspace (sin mobile ni financiero):

1. CTA/empty unificados: **Agregar pieza** + “Usa Agregar pieza o Trabajo libre…”.
2. Thumb sin croquis: **Trabajo libre** / **Sin croquis** (nunca “Libre”).
3. Badge solo si incompleto (“Incompleto”); preview lateral muestra medidas bajo el nombre.

### Archivos

`quote-studio-budget-workspace.tsx`, `paso-dos-panel-lista.tsx`, `quote-studio-panel-budget-summary.tsx`, `paso-dos-panel-desktop.module.css`

---

## 2026-07-18 - Quote Studio: pulido flujo pieza (paso Sistema/Personalizado)

### Resumen

Pulido desktop del wizard Agregar pieza (sin tocar mobile ni cubicación):

1. Paso 2 renombrado a **Sistema y composición**; CTA tipo → “Continuar a composición”.
2. **Personalizado** ya no deja avanzar sin `guidedVisualConfig` ni descripción.
3. Footer de cierre alineado: “Listo para finalizar la pieza” (modo `por_item`).
4. Hint explícito cuando falta armar la composición personalizada.

### Archivos

| Área | Archivos |
|---|---|
| Gate | `workflow-ui.ts` (`isDesktopPieceSystemStepComplete`) |
| UI | `paso-dos-agregar-grupo-sheet.tsx` |
| Tests | `workflow-ui-step-two.test.ts`, `paso-dos-agregar-grupo-sheet.test.tsx` |

---

## 2026-07-18 - Hydrate formal prioritario de cotizacion_item_visual_configs

### Resumen

Al leer cotizaciones, `config_json` de `cotizacion_item_visual_configs` tiene prioridad sobre el bridge `[gvc:]` en `observaciones` (solo en memoria; no reescribe DB).

1. `getWorkflowById` hidrata items antes de mapear al workflow (PDF, edicion, detalle).
2. Presupuesto publico hidrata con admin client y renderiza guided SVG (preview + documento).
3. Sync al guardar se mantiene; bridge sigue como fallback si falla la tabla o no hay fila formal.

### Como probar

1. Guardar pieza personalizada → confirmar fila en `cotizacion_item_visual_configs`.
2. Reabrir `/cotizaciones/nueva?id=...` o `/print/...`: croquis igual.
3. Opcional: corromper/quitar `[gvc:]` en observaciones y verificar que el croquis sigue saliendo de la tabla.

### Archivos

| Área | Archivos |
|---|---|
| Merge / service | `cotizacion-item-presentation.ts`, `cotizacion-item-visual-configs.service.ts` |
| Lectura auth | `cotizaciones.service.ts` (`getWorkflowById`) |
| Lectura publica | `public-cotizacion-approval.service.ts`, `public-quote-preview.tsx`, `public-quote-document.tsx` |
| Draw helper | `resolve-item-drawing-svg.ts` |

---

## 2026-07-18 - Constructor visual: UX maestro + entrada Personalizado + fix finalizar

### Resumen

Cierre operativo de la entrada del constructor en Quote Studio desktop (QA manual OK):

1. **Finalizar pieza** con composición guiada ya no falla: serialización `[gvc:]` usa `base64` + conversión a base64url (el polyfill browser no soporta encoding `"base64url"`).
2. **Entrada UX**: el CTA del constructor ya no aparece suelto entre sistema y configuración. Se muestra solo tras elegir **Personalizado** (sistema en Ventana; config/esquema en Puerta y demás con perfilería), o si ya hay `guidedVisualConfig`.
3. **Ventana** agrega sistema **Personalizado** en el grid de sistemas (salida clara cuando el preset no alcanza).
4. **UI del modal** rediseñada para maestros: pasos 1-2-3, croquis protagonista, “Partir al lado / arriba-abajo”, panel “¿Qué es este módulo?”, CTA “Usar esta composición”.
5. Sync de estado: cambiar sistema/config/esquema mantiene o limpia guided de forma coherente; gate `isDesktopPieceSystemStepComplete` acepta guided; errores de `confirmAddGroup` visibles en el wizard.

### Como probar (desktop ≥1024)

1. Preferir `pnpm build` + `pnpm start` y hard refresh.
2. `/cotizaciones/nueva` → Paso 2 → Agregar componente → **Ventana** → sistema **Personalizado** → **Abrir constructor** → aplicar → medidas → precio → **Finalizar pieza**.
3. Alternativa Puerta: sistema → config **Personalizado** → constructor.
4. Alternativa Ventana Corredera: hojas/esquema **Personalizado** → constructor.
5. Esperado: pieza en presupuesto con croquis; sin error `Unknown encoding: base64url`.

### Archivos principales

| Área | Archivos |
|---|---|
| Serialize | `visual-composer/types/guided-visual-config.ts` |
| Entrada / gates | `workflow-ui.ts`, `component-catalog.service.ts`, `use-paso-dos-agregar-grupo.ts` |
| Wizard | `paso-dos-agregar-grupo-sheet.tsx`, `page.tsx` (`globalError`) |
| Editor | `paso-dos-editor-desktop.tsx` |
| UI modal | `guided-visual-composer.tsx` + `.module.css` |

### QA cierre (2026-07-18)

- Smoke PDF editor↔print con pieza personalizada: **OK** (validación manual del usuario).
- Fase 3 V2 queda operable para uso comercial; no abrir Fase 4 (cubicación) ni CAD libre como siguiente paso inmediato.

### Siguiente slice sugerido

- Pulir Quote Studio / dashboard comercial (Fase 5) o estabilización desktop, según prioridad de venta.
- No abrir Fase 4 (cubicación) ni CAD libre sin necesidad de negocio.

---

## 2026-07-17 - Palillos V2: árbol de celdas subdivisibles

### Resumen

Los palillos dejan de ser solo una lista plana. Cada módulo puede guardar `palilloLayout` (árbol `cell|split`) para formas en T, parciales y retículas mixtas. Hay modo **Editar palillos** en el modal desktop, presets visuales, drag/mm, y el renderer dibuja el mismo árbol en editor/thumbnail/PDF. Compat: `palillos[]` plano se migra al abrir. Sin impacto en pricing ni módulos reales.

### Archivos

| Área | Archivos |
|---|---|
| Modelo | `visual-composer/types/guided-palillo-layout.ts` + integración en `guided-visual-config.ts` |
| Renderer | `guided-visual-renderer.service.ts` (`palilloSegments` / celdas ámbar) |
| UI | `guided-visual-composer.tsx` + CSS (modo palillos) |

---

## 2026-07-17 - Constructor visual V2: árbol de regiones

### Resumen

El constructor deja el modelo plano (eje global + lista) y pasa a `schemaVersion: 2` con árbol `module|split`, subdivisiones por región, palillos, medidas exactas, drag de separadores, pictogramas, undo/redo, renderer único (`editor|thumbnail|summary|pdf`), PDF con el mismo SVG, y sync a `cotizacion_item_visual_configs` al guardar (bridge `[gvc:]` se mantiene). V1 se migra en memoria al abrir.

### Archivos principales

| Área | Archivos |
|---|---|
| Modelo | `visual-composer/types/guided-visual-config.ts` |
| Renderer | `visual-composer/services/guided-visual-renderer.service.ts` |
| UI | `guided-visual-composer.tsx` + CSS + history hook |
| Persistencia | `cotizacion-item-visual-configs.repository/service` + sync en `cotizaciones.service` |
| PDF | `app/print/cotizaciones/[id]/page.tsx` |

QA: desktop ≥1024 → Agregar componente → ¿No encuentras la composición? → Armar una personalizada.

---

## 2026-07-17 - Constructor visual: modal no montaba en wizard desktop

### Resumen

Al pulsar **Abrir constructor** en Quote Studio desktop no pasaba nada: el flujo embebido hace return temprano y no montaba `GuidedVisualComposer`. Se monta en ese return y el modal se renderiza por portal a `document.body` (z-index alto).

---

## 2026-07-17 - Constructor visual: entrada visible en wizard desktop

### Resumen

El constructor no estaba reachable en el flujo real de "Agregar componente" (wizard embebido). Se cablea en Paso 2 desktop del sheet (`Composición guiada` / `Abrir constructor`) y se pasa `updateGuidedVisualConfig` desde `page.tsx`. Al editar una pieza existente, el tab por defecto del editor desktop es **Configuración** (donde vive el mismo bloque).

### Como probar en localhost (desktop ≥1024)

1. Usar `npm run build` + `npm run start` (o `pnpm`). Si ya tenías `start` corriendo, **hay que rebuild + reiniciar**: `next start` no toma cambios de código hasta un build nuevo.
2. Hard refresh del navegador (`Ctrl+Shift+R`).
3. Ir a `/cotizaciones/nueva` → Paso 2 → **Agregar componente**.
4. Elegir tipo con perfilería (ej. Ventana o Puerta; no Espejo / Cubierta / Vidrio / trabajo libre).
5. En el subpaso **Sistema** (paso 2 de 4): justo debajo de **Elige el sistema**, bloque **Composición guiada** → botón **Abrir constructor**.
6. Alternativa: editar una pieza ya agregada → tab **Configuración** → mismo bloque.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `paso-dos-agregar-grupo-sheet.tsx` | UI + overlay `GuidedVisualComposer` |
| `page.tsx` | `onGuidedVisualConfigChange` |
| `paso-dos-editor-desktop.tsx` | Tab inicial `configuracion` |

Pendiente siguiente slice: persistir en `cotizacion_item_visual_configs` al guardar y unificar SVG en PDF.

---

## 2026-07-17 - Fase 3 inicio: constructor visual guiado V1

### Resumen

Arranca el constructor visual guiado en Quote Studio desktop: tipos `GuidedVisualConfig`, renderer SVG unico, editor de modulos (divisiones verticales/horizontales + tipos fijo/corredera/abatible/etc.) y persistencia intermedia en metadata de item (`[gvc:...]`). Tabla remota `cotizacion_item_visual_configs` creada con RLS (persistencia por item en guardado queda para el siguiente slice). Mobile intacto.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `visual-composer/` | Tipos, renderer, editor desktop |
| `paso-dos-agregar-grupo-sheet.tsx` | Entrada principal en wizard "Agregar componente" |
| `paso-dos-editor-desktop.tsx` | Entrada al editar pieza (tab Configuración) |
| `cotizacion-item-presentation.ts` | Encode/decode `guidedVisualConfig` |
| `20260717120000_cotizacion_item_visual_configs.sql` | Tabla + RLS |

---

## 2026-07-17 - Cierre Fase 2B: cruce Excel ↔ lineas tecnicas

### Resumen

El import comercial (Excel/CSV/PDF de precios) detecta filas que completan precio de lineas tecnicas ya importadas (match por nombre exacto, codigo `Linea N` / `N`, o fuzzy). Esas filas aparecen como **Precio tecnico**, preservan metadata del PDF y se actualizan aunque el modo de duplicados sea “ignorar”. Las lineas sin precio siguen fuera de cotizacion hasta completar precio.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `line-template-import-match.service.ts` | Matching y merge de metadata |
| `line-template-import.service.ts` | Status `price_match` en preview |
| `cotizacion-line-templates.service.ts` | Update forzado + merge en import |
| `lineas-precios-import-client.tsx` | Badge y aviso de cruce |

Criterio de salida 2B: candidatos con fuente/confianza, revision humana, y nada usable en cotizacion sin precio comercial aprobado.

---

## 2026-07-17 - Catalogo: lineas tecnicas listas para cotizar

### Resumen

Las lineas importadas sin precio comercial (`needsCommercialPrice` / precio 0) ya no aparecen en selectores de cotizacion. En catálogo se marcan como **Sin precio**. Al completar el precio se preserva la metadata tecnica del PDF y se limpia el flag.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `workflow-ui.ts` | `filterLineTemplatesForComponent` exige precio > 0 |
| `lineas-precios-page-client.tsx` | Badge + preserve metadata al guardar |
| `cotizacion-line-templates.service.ts` | Limpia `needsCommercialPrice` al fijar precio |
| `cotizacion-line-template.ts` | Helpers de readiness comercial |

---

## 2026-07-17 - Fix import catalogo tecnico (precio 0)

### Resumen

Al confirmar importacion PDF tecnico, las lineas con `needsCommercialPrice` y precio 0 ya no fallan (incluye categoria `vidrio`). En modo actualizar, un duplicado tecnico no pisa un precio comercial ya cargado. El resultado de importacion muestra el detalle de filas fallidas.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `cotizacion-line-templates.service.ts` | Permite precio 0 con `needsCommercialPrice`; preserva precio en update tecnico |
| `lineas-precios-import-client.tsx` | Lista errores de filas fallidas al terminar |
| `cotizacion-line-templates-import.service.test.ts` | Cobertura de import tecnico y rechazo de cristal comercial sin precio |

---

## 2026-07-14 - Vidrio / Cristal en Paso 2 de cotizacion

### Resumen

El Paso 2 de cotizacion ahora expone la categoria **Vidrios y cristales** con el tipo general **Vidrio / Cristal** para cotizar vidrios, cristales, termopaneles o reposiciones sin perfileria. El tipo no muestra selector de sistema, no pide Aluminio/PVC ni color de perfil, reutiliza las reglas existentes de componentes solo vidrio y tiene croquis propio de paño de vidrio.

Actualizacion: los componentes solo vidrio (`Espejo`, `Cubierta de mesa`, `Vidrio / Cristal`) ahora nacen por defecto con `material='Cristal'` y `catalogCategoria='vidrio'`. Los selectores de precios filtran solo productos de cristal para esos casos y mantienen Aluminio/PVC separados para componentes con perfileria. La configuracion de `Vidrio / Cristal` agrega opciones practicas para maestros: vidrio suelto, reposicion, termopanel, espejo y personalizado.

Actualizacion UX: al seleccionar o crear un producto de cristal guardado, el nombre comercial del producto queda tambien como `vidrio` visible del item. Mobile deja de mostrar sugeridos genericos de vidrio cuando ya hay producto de cristal seleccionado y muestra el bloque **Producto / tipo de vidrio** con espesor/terminacion. Ese snapshot alimenta resumen, PDF y presupuesto publico.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `src/features/cotizaciones/services/component-catalog.service.ts` | Nueva categoria `Vidrios y cristales`, tipo `Vidrio / Cristal` y alias de busqueda para vidrio/cristal |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-movil-shell.tsx` | Selector mobile muestra la categoria nueva |
| `src/features/cotizaciones/new-quote/workflow-ui.ts` | `Vidrio / Cristal` queda como componente solo vidrio sin sistema ni perfileria |
| `src/utils/window-drawings.ts` | Croquis simple para cristales/vidrios |
| `src/features/cotizaciones/new-quote/__tests__/profile-material-regression.test.ts` | Regresion ampliada para `Vidrio / Cristal` |

---

## 2026-07-13 - Cristales en catalogo de precios

### Resumen

El catalogo reutilizable `cotizacion_line_templates` ahora soporta productos de Cristal como tercera categoria operativa junto con Aluminio y PVC. La UI muestra **Cristales**, el valor interno canonico es `categoria='vidrio'`, `material='Cristal'` y los datos `espesor`/`terminacion` se guardan en `catalog_metadata`. En cotizaciones, los cristales usan el mismo calculo por m2 con minimo/redondeo/cantidad, pueden crearse rapido desde el flujo y se presentan en detalle, PDF y presupuesto publico sin etiquetas de perfileria.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260713161814_allow_cristal_line_template_material.sql` | Expande CHECK de `material` a `Cristal` |
| `src/features/cotizaciones/line-templates/` | Tipos, servicio, importacion y UI de catalogo con Cristales |
| `src/features/cotizaciones/new-quote/workflow-ui.ts` | Snapshot y aplicacion de template de cristal |
| `app/(pwa-app)/cotizaciones/nueva/` | Selector/reutilizacion/quick-create de Cristales en mobile y desktop |
| `app/print/cotizaciones/[id]/_utils/item-print-specs.ts` | Specs de PDF sin Material/Color/Linea para Cristales |
| `app/presupuesto/[token]/` | Presupuesto publico usa specs contextuales para Cristales |

---

## 2026-07-09 - Fase 2B: importacion PDF catalogo tecnico (piloto Arquetipo)

### Resumen

El wizard de importacion detecta PDFs tecnicos de fabricante (piloto Arquetipo) y extrae lineas comerciales con perfiles asociados sin inventar precios. Las lineas quedan en `cotizacion_line_templates` con `catalog_metadata` tecnico (`technicalLineCode`, `technicalProfileCodes`, `needsCommercialPrice`) para completar costos despues o cruzar con Excel.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `line-template-pdf-technical.service.ts` | Indice de lineas + perfiles por pagina |
| `line-template-technical-import.service.ts` | Preview/import sin precio obligatorio |
| `line-template-pdf-text.service.ts` | Carga compartida de texto PDF |
| `lineas-precios-import-client.tsx` | Modo tecnico con auto-deteccion |

---

## 2026-07-09 - Fase 2B inicio: importacion PDF asistida en catalogo privado

### Resumen

El wizard `/configuracion/empresa/lineas-precios/importar` ahora acepta PDF con tabla de texto seleccionable. Se extraen candidatos por pagina con `pdfjs-dist`, se muestra confianza, avisos y selector de paginas antes del mapeo y la vista previa revisable. PDF escaneado o solo dibujos no se convierten automaticamente.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `src/features/cotizaciones/line-templates/services/line-template-pdf-table.service.ts` | Clustering texto PDF → filas/columnas |
| `src/features/cotizaciones/line-templates/services/line-template-pdf-import.service.ts` | Extraccion por pagina + merge |
| `src/features/cotizaciones/line-templates/components/lineas-precios-import-client.tsx` | UI PDF: paginas, confianza, avisos |
| `package.json` | Dependencia `pdfjs-dist` |

---

## 2026-07-09 - Fase 2A remoto + limpieza sidebar

### Resumen

Migración `extend_cotizacion_line_templates_catalog` aplicada en Supabase remoto (`yrtrwgkaopfumpidjthk`). Se documentan rutas de catálogo/importación y se elimina el bloque **Materiales · Pronto** del sidebar desktop.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260709153000_extend_cotizacion_line_templates_catalog.sql` | Aplicada en remoto |
| `docs/agent-map/ROUTES_MAP.md` | Rutas `lineas-precios` e `importar` |
| `docs/agent-map/DATA_MODEL_MAP.md` | Campos de catálogo privado |
| `src/components/layout/app-shell.tsx` | Sin sección Siguiente/Pronto |

---

## 2026-07-09 - Fase 2A inicio: catalogo privado + importacion XLSX/CSV

### Resumen

Se extiende `cotizacion_line_templates` de forma aditiva con categoria, unidad de cobro, costo base, merma, margen objetivo, proveedor y vigencia. La UI de `/configuracion/empresa/lineas-precios` pasa a **Catalogo privado** con campos comerciales ampliados y nueva ruta `/configuracion/empresa/lineas-precios/importar` con wizard revisable (archivo → columnas → preview → confirmar).

### Archivos principales

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260709153000_extend_cotizacion_line_templates_catalog.sql` | Columnas de catalogo privado |
| `src/features/cotizaciones/line-templates/` | Types, repository, service, import service, UI |
| `app/(pwa-app)/configuracion/empresa/lineas-precios/importar/page.tsx` | Ruta de importacion |

---

## 2026-07-09 - Fase 1 cerrada: Quote Studio desktop + snapshots financieros

### Resumen

Se cierra Fase 1 con QA manual aprobado en desktop. Quote Studio por total queda con cuaderno comercial, componentes anidados dentro del trabajo, panel financiero con ajustes editables, persistencia de snapshot en `cotizaciones`, PDF por total con dibujos tecnicos reales y limpieza de instrumentacion de debug.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `app/(pwa-app)/cotizaciones/nueva/page.tsx` | Jerarquia cuaderno/panel por total, sin logs de debug |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-agregar-grupo-sheet.tsx` | Lista anidada de componentes en cuaderno |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/quote-studio-financial-panel.tsx` | Panel financiero sin probes de debug |
| `app/print/cotizaciones/[id]/page.tsx` | PDF por total con dibujos tecnicos |
| `supabase/migrations/20260708033856_add_quote_studio_financial_snapshot.sql` | Columnas snapshot financiero |

### Criterio de salida cumplido

- Desktop >=1024: cotizar por items y por total con panel financiero.
- Mobile, PDF, WhatsApp y aprobacion publica sin regresiones intencionales.
- `npm run lint`, `npm test` y `npm run build` pasando en workspace principal.

---

## 2026-07-08 - Fase 1 Submilestone 1.3: panel editable de costos y margen

### Resumen

Se habilita en Quote Studio desktop (>=1024px) el bloque expandible **Ajustar costos y margen** con inputs de mano de obra, traslado, otros costos, merma % y margen objetivo real %. Los valores fluyen por draft → `saveWorkflow` → columnas snapshot en `cotizaciones` con `cost_basis_status: manual` cuando hay ajustes. Mobile, PDF y WhatsApp sin cambios.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `quote-studio-financial-panel.tsx` | Toggle expandible + inputs editables |
| `cotizacion-workflow.ts` | Tipo `QuoteStudioFinancialDraft` en draft/record |
| `cotizaciones.service.ts` | Hidratacion desde DB + `costBasisStatus` manual/estimado |
| `workflow-ui.ts` | Merge de `quoteStudioFinancial` al cargar borrador |
| `use-paso-dos-presentacion.ts` | Wiring de props al panel desktop |
| `cotizaciones.service.test.ts` | Test de persistencia con ajustes manuales |

---

## 2026-07-07 - Fase 1 primer corte: panel financiero desktop

### Resumen

Se inicia Fase 1 con un corte vertical desktop-only: calculo financiero puro para Quote Studio, panel compacto dentro de Paso 2 desktop y snapshot financiero persistido en campos existentes de `cotizaciones`. No se crean migraciones, tablas ni rutas.

### Archivos principales

| Archivo | Cambio |
|---|---|
| `src/features/cotizaciones/services/quote-studio-financial.service.ts` | Calculo de costo total, margen real, markup equivalente y precio recomendado neto |
| `src/features/cotizaciones/services/cotizaciones.service.ts` | Guardado del snapshot financiero en `costo_total`, `margen_pct` y `utilidad_total` usando la misma formula del panel |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/quote-studio-financial-panel.tsx` | Panel financiero visible solo en Quote Studio desktop |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos-panel-componentes.tsx` | Render del panel financiero solo con `isDesktopQuoteStudio` |
| `src/features/cotizaciones/services/__tests__/quote-studio-financial.service.test.ts` | Cobertura de formula de margen real y modo total global |
| `src/services/__tests__/cotizaciones.service.test.ts` | Cobertura de persistencia del snapshot financiero sin migraciones |

### Alcance

- Desktop >=1024 muestra el primer panel financiero de Quote Studio.
- Mobile 390/430 no recibe panel financiero ni campos nuevos.
- Los datos son derivados del estado actual y se persisten como snapshot quote-level en columnas existentes.
- Sin base de costo validada, el snapshot no infiere utilidad ni margen.

---

## 2026-07-07 - Restriccion Fase 1 desktop-only

### Resumen

Se registra que Fase 1 Quote Studio Desktop + snapshots financieros es una ampliacion exclusiva para escritorio desde `min-width: 1024px`, no un rediseño responsive general.

### Reglas incorporadas

- Mobile 390 px y 430 px debe conservar layout, orden de pasos, controles, resumen, CTA, PDF, WhatsApp, copy, tipografia, espaciados, cards y navegacion existentes.
- Bajo 1024 px no se muestra panel financiero ni campos visibles de costo, margen, traslado, merma o precio recomendado.
- Los snapshots financieros pueden agregarse como datos internos/aditivos, pero no se exponen en UI mobile durante Fase 1.
- Cualquier diferencia visual mobile intencional es regresion bloqueante salvo correccion estrictamente necesaria para un bug reproducible.

### Documentacion actualizada

| Archivo | Cambio |
|---|---|
| `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md` | Restriccion critica desktop-only dentro de Fase 1 |
| `docs/agent-map/AGENT_TASK_GUIDE.md` | Reglas operativas para tareas Quote Studio desktop |
| `docs/agent-map/FEATURES_MAP.md` | Riesgo y criterio mobile dentro de Cotizaciones |
| `docs/EXECUTION_NOW.md` | Regla corta para ejecucion actual |

---

## 2026-07-05 - Decision producto: catalogo privado antes de cubicacion

### Resumen

Se registra la decision: “05-07-2026: se incorpora Catálogo privado + importación XLSX/CSV antes de cubicación asistida, debido a demanda comercial de empresas pequeñas y medianas que necesitan definir líneas de trabajo, costos y precios.”

El roadmap Desktop Taller queda reordenado: Fase 0 Gate de estabilidad, Fase 1 Quote Studio Desktop + snapshots financieros, Fase 2A Catálogo privado + importación XLSX/CSV, Fase 2B Importación PDF asistida y revisable, Fase 3 Constructor visual guiado V1, Fase 4 Cubicación asistida, Fase 5 Dashboard Desktop comercial real.

### Alcance de esta ejecucion

- Solo documentacion trazable y regresion tecnica minima.
- No se crean migraciones, tablas ni funcionalidades nuevas.
- `cotizacion_line_templates` queda documentada como base futura del catalogo privado, extensible solo aditivamente en Fase 2A.

---

## 2026-06-30 - Sincronizacion documental Desktop Taller

### Resumen

Se alineo la documentacion principal del repo al roadmap `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md`. El foco oficial de desktop pasa a ser: estabilizar cotizacion desktop, dejar dashboard comercial con datos reales, pulir Quote Studio desktop y despues validar constructor visual guiado. `oportunidades + cobros` queda congelado como fase futura. Tambien se fijo que `projects` se presenta como **Obras** y que no se deben abrir tablas, rutas publicas, PDF/WhatsApp, dependencias ni cubicacion sin aprobacion.

### Documentacion actualizada

| Archivo | Cambio |
|---|---|
| `AGENTS.md` | Jerarquia documental, foco desktop taller y prohibiciones explicitas |
| `docs/agent-map/README.md` | Roadmap nuevo como primera lectura y foco actual |
| `docs/agent-map/PROJECT_OVERVIEW.md` | Norte de producto y orden de milestones |
| `docs/agent-map/AGENT_TASK_GUIDE.md` | Prelectura obligatoria y bloques para dashboard, Quote Studio y visual guiado |
| `docs/agent-map/DATA_MODEL_MAP.md` | `projects` como Obras y tabla candidata `cotizacion_item_visual_configs` solo documental |
| `docs/agent-map/ROUTES_MAP.md` | `/dashboard`, `/cotizaciones/nueva` y `/clientes/[id]` alineadas al roadmap |
| `docs/agent-map/FEATURES_MAP.md` | Dashboard real, cotizaciones como base de Quote Studio y `projects` como Obras |
| `docs/agent-map/COMPONENTS_MAP.md` | Componentes desktop descritos como base del tablero y Quote Studio |
| `docs/ventora-master-brief.md` | Limpieza de lenguaje tipo CRM/oportunidades como promesa actual |
| `docs/COTIZACION_FLOW_CONTEXT.md` | Flujo de cotizacion como base de Milestone 0 y 2 |
| `docs/salida-beta-checklist.md` | Checklist alineado a desktop taller |
| `README.md` | Resumen del repo sin foco CRM generico |
| `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md` | Jerarquia documental y nota de normalizacion `861px -> 1024px` |

---

## 2026-06-29 - Estandarizacion SVG de ventanas

### Resumen

Se documento el refactor visual de ventanas en `window-drawings.ts`: correderas, fijas, proyectantes, abatibles, oscilobatientes, bow windows, guillotinas y celosias comparten primitives SVG de marco, vidrio, hojas, rieles, manillas, flechas e indicadores tecnicos. El cambio es solo de representacion visual.

### Documentacion actualizada

| Archivo | Cambio |
|---|---|
| `docs/agent-map/COMPONENTS_MAP.md` | `QuoteComponentSketch` registra la dependencia en primitives SVG compartidas para ventanas |

---

## 2026-06-29 - Rediseño desktop de `/cotizaciones/nueva`

### Resumen

Se documento el nuevo flujo desktop de cotizacion: Paso 1 integra cliente, datos del trabajo y metodo de presupuesto; Paso 2 usa estacion de trabajo en dos columnas con pieza local "En edicion" y subpasos Tipo/Sistema/Medidas/Precio; Paso 3 mantiene revision y guardado antes de PDF/WhatsApp. Mobile conserva su wizard actual.

### Documentacion actualizada

| Archivo | Cambio |
|---|---|
| `docs/agent-map/FEATURES_MAP.md` | Cotizaciones documenta el estado local de pieza desktop y el modo total como cuaderno comercial |
| `docs/agent-map/ROUTES_MAP.md` | `/cotizaciones/nueva` describe el flujo desktop y archivos principales nuevos |
| `docs/agent-map/COMPONENTS_MAP.md` | Componentes PasoDos actualizados para selector fallback, editor desktop y panel vivo |

---

## 2026-06-27 - Growth panel migrado a Supabase

### Resumen

`/admin/growth` deja de usar `localStorage` como fuente de verdad. Nuevas tablas `growth_*`, APIs `/api/admin/growth/*`, RLS por membership, import idempotente desde navegador y KPIs hibridos acotados.

### Documentacion actualizada

| Archivo | Cambio |
|---|---|
| `docs/agent-map/ROUTES_MAP.md` | `/admin/growth` + APIs growth |
| `docs/agent-map/FEATURES_MAP.md` | Founder Growth Panel -> Supabase |
| `docs/agent-map/DATA_MODEL_MAP.md` | Tablas `growth_*` |

---

## 2026-06-19 - Onboarding de activacion `/activacion`

### Resumen

Se documento el nuevo flujo de **primera activacion** separado del dashboard: wizard en `/activacion` para admins sin cotizaciones, con demo, cotizacion real por total o por componentes, resumen neto/IVA, PDF con vuelta a la guia, y datos de empresa opcionales.

### Documentacion nueva/actualizada

| Archivo | Cambio |
|---|---|
| `docs/agent-map/ACTIVATION_ONBOARDING.md` | **Nuevo** - doc maestra del flujo, QA, handoff visual |
| `docs/agent-map/README.md` | Indice con link a ACTIVATION_ONBOARDING |
| `docs/agent-map/ROUTES_MAP.md` | Ruta `/activacion`; dashboard sin card embebida |
| `docs/agent-map/FEATURES_MAP.md` | Feature activacion + checklist legacy actualizado |

### Implementacion de referencia

| Area | Archivos |
|---|---|
| UI wizard | `app/(pwa-app)/activacion/page.tsx`, `page.module.css` |
| Borradores + resumen | `src/features/onboarding/services/onboarding-activation-flow.service.ts` |
| Gate | `useActivationGate.ts`, `app/api/onboarding/activation/status/route.ts` |
| PDF back nav | `app/print/cotizaciones/[id]/page.tsx` (`from=activacion`) |
| Save total global | `cotizaciones.service.ts` (items vacios + total manual) |
| Migracion | `20260619120000_onboarding_activation_complete.sql` |

---

## 2026-06-11 - Componentes solo vidrio (Espejo y Cubierta de mesa)

### Resumen

Se cerro la UX de **Espejo** y **Cubierta de mesa** como componentes sin perfileria (no Aluminio/PVC). En cotizacion ya no se pide material ni color de perfil para esos dos tipos. En **Espejo** se agrego seccion dedicada de espesores recomendados (`Espejo 3mm`, `4mm`, `5mm`, `6mm`). En PDF, la grilla de **CARACTERISTICAS** omite **Material** y **Color** solo para esos tipos; ventanas, puertas y el resto del catalogo siguen igual.

### Archivos nuevos o fuertemente modificados

| Archivo | Cambio |
|---|---|
| `src/features/cotizaciones/new-quote/workflow-ui.ts` | `shouldRequireProfileMaterialForComponent()`, `MIRROR_GLASS_THICKNESS_OPTIONS`, grupo `Espejos` en `GLASS_OPTIONS` |
| `src/features/cotizaciones/services/glass-recommendations.service.ts` | Regla `espejo` recomienda espesores 3–6 mm |
| `src/features/cotizaciones/services/component-suggestions.service.ts` | Default `Espejo 4mm` para Espejo |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-configuracion-movil.tsx` | Oculta Material/Color perfil si no aplica |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-vidrio-movil.tsx` | Seccion **Espejos** con chips recomendados |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-formulario-bloque-configuracion.tsx` | Material condicional en desktop |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-formulario-bloque-vidrio.tsx` | Titulo **Espejos recomendados** en desktop |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-formulario-bloque-ajustes.tsx` | Color avanzado oculto sin perfileria |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-lista-movil.tsx` | Chips material/color ocultos en listado |
| `app/print/cotizaciones/[id]/_utils/item-print-specs.ts` | `buildCotizacionItemPrintSpecs()` omite Material/Color en PDF |
| `app/print/cotizaciones/[id]/page.tsx` | Usa helper de specs para caracteristicas del item |
| `src/features/cotizaciones/new-quote/__tests__/profile-material-regression.test.ts` | Regresion sobre todo el catalogo |
| `app/print/cotizaciones/[id]/_utils/__tests__/item-print-specs.test.ts` | Contrato PDF por tipo |

### Reglas de producto

- **Fuente de verdad**: `shouldRequireProfileMaterialForComponent(tipo)` en `workflow-ui.ts`.
- **Solo vidrio sin perfil hoy**: `Espejo`, `Cubierta de mesa`. Cualquier otro tipo nuevo solo-vidrio debe agregarse explicitamente al set interno.
- **Cotizacion**: no mostrar selector Aluminio/PVC, no exigir material en validacion, no mostrar color de perfil ni en resumen/listado.
- **Espejo**: recomendar `Espejo 3mm`–`6mm`; catalogo general sigue disponible via **Cambiar**.
- **PDF**: no mostrar filas Material/Color en caracteristicas; conservar Dimensiones, Configuracion, Sistema, Linea, Vidrio, Superficie. La grilla CSS de 2 columnas se reacomoda sola.
- **Persistencia**: el metadata interno puede seguir guardando material heredado por compatibilidad; no debe mostrarse al usuario en estos dos tipos.

### Mapas actualizados

- `docs/agent-map/FEATURES_MAP.md` (Cotizaciones, PDF)
- `docs/agent-map/ROUTES_MAP.md` (`/cotizaciones/nueva`, `/print/cotizaciones/[id]`)
- `docs/agent-map/AGENT_TASK_GUIDE.md`
- `AGENTS.md`

---

## 2026-06-11 - UX silenciosa de PDF y metricas comerciales neutrales

### Resumen

Se alineo la UX de estados y metricas de cotizaciones al flujo real del maestro: descargar PDF, enviar manualmente por WhatsApp y seguir trabajando sin interrupciones. La descarga de PDF ahora registra actividad en silencio (`pdf_descargado_en`), muestra solo un toast y no abre modales ni pregunta si marcar como enviada. El dashboard dejo de usar "presupuestos pendientes" como alerta principal y paso a mostrar **Valor cotizado**, cotizaciones creadas, PDF generados y aprobadas registradas. Los estados visibles de cotizacion ahora son neutrales: **Creada**, **PDF generado**, **Enviada**, **Aprobada**, **Rechazada**, **Terminada** y **Sin cierre registrado** (reemplaza "Pendiente" como etiqueta dominante).

### Archivos nuevos o fuertemente modificados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260611120000_cotizaciones_pdf_descargado_en.sql` | Nueva columna `pdf_descargado_en` en `cotizaciones` |
| `src/features/cotizaciones/services/cotizacion-display-state.service.ts` | Fuente de verdad de estados visibles (`resolveCotizacionWorkflowState`, `resolveCotizacionClosureState`) |
| `app/api/cotizaciones/[id]/pdf-descargado/route.ts` | POST auth para registrar descarga silenciosa de PDF |
| `src/features/cotizaciones/repositories/cotizaciones-repository.ts` | `recordPdfDownload()`, filtro `pdfDownloadedOnly`, conteo en resumen global |
| `src/features/cotizaciones/services/cotizaciones.service.ts` | `markWorkflowPdfDownloaded()` |
| `src/features/cotizaciones/hooks/useCotizacionesStore.ts` | `recordPdfDownload()` en background |
| `app/print/cotizaciones/[id]/page.tsx` | Toast "PDF descargado" + registro silencioso al descargar/abrir PDF |
| `src/features/dashboard/types/dashboard-summary.ts` | KPIs: `quotedTotal`, `pdfGeneratedCount`, `approvedCount` |
| `src/features/dashboard/services/dashboard-summary-server.service.ts` | Resumen comercial por valor cotizado, no por pendientes |
| `app/(pwa-app)/dashboard/_hooks/use-dashboard-view-model.ts` | Tarjeta "Resumen comercial" + estados neutrales en cards |
| `app/(pwa-app)/dashboard/_components/mobile/dashboard-mobile.tsx` | Hero valor cotizado + grid 4 metricas |
| `app/(pwa-app)/dashboard/_components/desktop/dashboard-desktop.tsx` | Stats: valor cotizado, creadas, PDF, aprobadas |
| `app/(pwa-app)/cotizaciones/page.tsx` | KPIs/atajos sin "pendientes"; badges con display state |
| `app/(pwa-app)/cotizaciones/[id]/_components/cotizacion-detalle-mobile-view-model.ts` | Estados visibles neutrales en detalle |

### Reglas de producto

- **Descargar PDF**: registra `pdf_descargado_en`, toast maximo, sin modal, sin cambiar `estado` comercial.
- **WhatsApp / link publico**: siguen marcando `enviada` o respuesta publica como antes; no interrumpir al maestro post-PDF.
- **Dashboard**: no usar "pendientes" como alerta principal; KPI principal = valor monetario cotizado (`sum(total)`).
- **Estados UI**: si hay PDF descargado sin cierre -> **PDF generado**; sin cierre comercial -> **Sin cierre registrado**; no mostrar **Pendiente** como estado dominante.
- **Acciones manuales**: aprobar/rechazar/terminar siguen en detalle o menu secundario.

### Mapas actualizados

- `docs/agent-map/FEATURES_MAP.md` (Dashboard, Cotizaciones, PDF)
- `docs/agent-map/ROUTES_MAP.md` (`/dashboard`, `/cotizaciones`, `/print`, API)
- `docs/agent-map/DATA_MODEL_MAP.md` (`cotizaciones.pdf_descargado_en`)
- `supabase/docs/database_map.md`
- `AGENTS.md`

---

## 2026-06-09 - Centro de Operaciones founder en /admin

### Resumen

Se implemento Fase 1 de un backoffice interno separado del panel cliente. `/admin` ahora usa `AdminShell` propio y no reutiliza `AppShell`. Founder entra por allowlist (`VENTORA_FOUNDER_ADMIN_EMAILS`) y el login/proxy lo empuja por defecto a `/admin`. Se agregaron dashboard interno, tabla global de organizaciones SaaS y ficha por organizacion con trial, suscripcion y ledger `pagos_suscripcion`. `/admin/growth` se mantiene, pero ahora navega dentro del shell founder y sigue marcado como panel local basado en `localStorage`.

### Archivos nuevos o fuertemente modificados

| Archivo | Cambio |
|---|---|
| `app/admin/layout.tsx` | Nuevo layout founder con guard server-side y `AdminShell`. |
| `app/admin/page.tsx` | Nuevo dashboard interno con KPIs, trials urgentes, pagos recientes y altas recientes. |
| `app/admin/clientes/page.tsx` | Tabla global de organizaciones SaaS y acceso a ficha. |
| `app/admin/clientes/[organizationId]/page.tsx` | Ficha interna por organizacion con datos de empresa, estado y pagos. |
| `app/admin/admin.module.css` | Superficies, tablas y bloques visuales compartidos del centro de operaciones. |
| `src/features/admin/components/*` | Nuevo set de `AdminShell`, `AdminSidebar`, `AdminKpiCard`, `ClientStatusBadge`, `SourceBadge`. |
| `src/features/admin/repositories/admin-clients.repository.ts` | Query global founder sobre `organizations`, `organization_profile`, `users`, `pagos_suscripcion`. |
| `src/features/admin/services/admin-clients.service.ts` | Orquestacion de listado/ficha, usuario principal, ultimo pago y estado efectivo. |
| `src/features/admin/services/admin-summary.service.ts` | Calculo server-side de KPIs founder y actividad reciente. |
| `src/features/admin/services/admin-access.service.ts` | Allowlist founder nueva via `VENTORA_FOUNDER_ADMIN_EMAILS` con compat legacy. |
| `proxy.ts` | Redirect founder por defecto a `/admin`, guard de acceso a `/admin`, rebote desde `/dashboard`. |
| `app/admin/growth/page.tsx` | Simplificado para heredar guard/shell founder desde layout. |

---

## 2026-06-05 - Flujo de item libre con valor y separacion de modos de cotizacion

### Resumen

Se implemento la separacion clara de tres flujos en Paso 2: componente calculado, item libre con valor y cotizacion rapida por total. Se agrego la categoria "Proyecto libre y Mantencion" al catalogo de componentes. El formulario de item libre se internalizo dentro del wizard/sheet. El selector de modo inicial (`PasoDosModoCotizacion`) quedo con 2 tarjetas. El boton del footer mobile ahora es dinamico ("Agregar item" / "Agregar componente"). Se elimino el selector de modo de precio (margen/valor directo) para items libres en mobile.

### Archivos nuevos o fuertemente modificados

| Archivo | Cambio |
|---|---|
| `component-catalog.service.ts` | Nueva categoria `"Proyecto libre y Mantencion"` con 8 items. Flag `esItemLibre` en `ComponentCatalogItem`. Helper `isFreeValueComponentType()`. Helper `getComponentDescripcion()`. |
| `paso-dos-modo-cotizacion.tsx` | Pantalla inicial con 2 tarjetas: "Cotizar por items" y "Presupuesto por total". Iconos por tarjeta. Ambos abren el wizard. |
| `paso-dos-item-libre-form.tsx` | Formulario standalone redisenado: copia mejorada, preview PDF, boton dinamico con precio, selector IVA compacto `[Incluido] [Agregar IVA]`. |
| `paso-dos-agregar-grupo-sheet.tsx` | Paso 4 reemplazado por formulario de item libre (nombre, descripcion, valor, IVA) cuando `isFreeValueComponentType`. Props `onPrecioChange`, `onIvaModeChange`. |
| `paso-dos-wizard-configuracion-movil.tsx` | Early return para items libres: formulario simplificado sin `PasoDosWizardPrecioMovil`, solo input de precio. Labels estandarizados. |
| `paso-dos-wizard-footer-movil.tsx` | Props `isFreeValueItem` y `precioFormateado`. Boton dinamico: "Agregar item" / "Agregar item por $X". |
| `paso-dos-wizard-precio-movil.tsx` | Prop `hideMargenOption` para ocultar opcion "Con margen". |
| `paso-dos-wizard-movil.state.ts` | `isFreeValueComponentType` integrado en validacion `canSubmitGroup`. `activePricingMode` forzado a `"precio_directo"` para items libres. Labels adaptados. |
| `paso-dos-wizard-movil-shell.tsx` | Stages visuales dinamicos (`VISUAL_STAGES_FREE_VALUE`). Subtitulos adaptados para items libres. `isFreeValueItem` + `precioFormateado` pasados al footer. Categoria "Proyecto libre y Mantencion" en tabs. Ambos modos (`por_item` y `total_global`) abren el mismo wizard. |
| `paso-dos-seccion.tsx` | Modo `total_global` tambien abre `onOpenCreator()`. Condicion `showModeChoice` simplificada. |
| `paso-dos-panel-header.tsx` | Boton "Agregar trabajo" en modo `total_global`. |
| `use-paso-dos-agregar-grupo.ts` | `PasoDosGrupoDraft` incluye `ivaMode`. `isFreeValueComponentType` integrado en `selectSubtipo` (salta a paso 4), `goBack`/`goNext` (omiten paso 3), `canContinueFromConfig` (valida nombre + precio). |
| `use-paso-dos-agregar-grupo-movil.ts` | `isFreeValueComponentType` integrado en `selectSubtipo` (salta a stage 3), `goBack` (stage 3 → stage 1). `updateIvaMode` exportado. |
| `page.tsx` | `confirmAddGroup` maneja items libres via `buildFreeValueItemFromForm`. Wiring de `onIvaModeChange`, `onPrecioChange`. |
| `cotizacion-item-presentation.ts` | Metadata incluye `ivaMode`, `displayMode`, `netoCalculado`, `ivaCalculado`, `totalClienteVisible`. |
| `cotizaciones-workflow.service.ts` | `calculateFreeValueItem` con soporte de `total_incluye_iva` / `neto_mas_iva`. `calculateCotizacionWorkflowTotals` extrae neto de items `total_incluye_iva` antes de aplicar IVA global (sin doble IVA). |
| `page.module.css` | Grid 2 columnas para modo choice. Iconos de tarjeta. IVA compacto. Preview card de item libre. Free value card mobile. |

### Reglas de IVA

- **`total_incluye_iva`**: El valor ingresado es el total visible al cliente. El sistema extrae el neto (`valor / 1.19`) y calcula el IVA (`valor - neto`). En el total global, este neto se suma al subtotal y se aplica IVA una sola vez.
- **`neto_mas_iva`**: El valor ingresado es el neto. El sistema agrega IVA (`valor * 0.19`). El total visible para el cliente es `valor + IVA`.
- **Sin doble IVA**: `calculateCotizacionWorkflowTotals` detecta `tipoItem === "item_libre_con_valor"` + `displayMode === "item_libre"` + `ivaMode === "total_incluye_iva"` y usa `meta.netoCalculado` en vez de `precioTotal`.

### Reglas de persistencia

- `cotizacion_items.tipo_item = "item_libre_con_valor"` se guarda y rehidrata correctamente.
- `costo_unitario`, `costo_total`, `margen_pct`, `utilidad` = 0 para items libres.
- Metadata en `observaciones` via `encodeCotizacionItemPresentationMeta`.
- Clone/duplicar preserva `tipoItem` via spread.
- Soft delete funciona normalmente.

---

## 2026-06-04 - Modo total global en cotizaciones

### Resumen

Se documento el nuevo modo `total_global` para `/cotizaciones/nueva`: los componentes quedan como detalle comercial y el total cliente se calcula desde costo de fabricacion + margen global o total manual. Se agrego `cotizaciones.pricing_mode` con default `por_item`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `docs/agent-map/FEATURES_MAP.md` | Cotizaciones ahora distingue `por_item` y `total_global` |
| `docs/agent-map/ROUTES_MAP.md` | `/cotizaciones/nueva` documenta selector de modo y riesgos publicos/PDF |
| `docs/agent-map/DATA_MODEL_MAP.md` | `cotizaciones.pricing_mode` y regla interna de costo/margen |
| `supabase/docs/database_map.md` | Columna `pricing_mode` en `cotizaciones` |

---

## 2026-05-31 - Estrategia hibrida de pagos y handoff IA actualizado

### Resumen

Se alineo la documentacion con la estrategia comercial/tecnica vigente de suscripciones: trial de 7 dias, planes anuales como foco principal con Webpay Plus, mensual manual por WhatsApp como opcion secundaria y sin recurrencia automatica en esta etapa. Tambien se actualizo el handoff IA para compartir contexto actual a otra instancia de ChatGPT sin releer todo el repo.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `docs/agent-map/FEATURES_MAP.md` | Feature de suscripciones cambia de manual a hibrida y documenta guard contra doble pago |
| `docs/agent-map/ROUTES_MAP.md` | `/cuenta-vencida` refleja Webpay anual, mensual secundario y UI actual |
| `docs/agent-map/DATA_MODEL_MAP.md` | Nota comercial de activacion hibrida en `organization_profile` |
| `docs/ia-handoff.md` | Handoff actualizado con estado real de producto, Supabase, pagos y siguiente paso |
| `docs/contexto-rapido-web.md` | Resumen corto actualizado para otra IA o nuevo contexto |

---

## 2026-05-31 - Auditoria Supabase pre-produccion

### Resumen

Se reviso el estado versionado de Supabase contra migraciones y documentacion. Se detecto drift en `current_schema.sql` y `database.types.ts`, se documentaron tablas recientes faltantes y se agrego una migracion defensiva para asegurar que `public_landing_testimonials.organization_id` use `bigint`, consistente con `organizations.id`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260515121000_public_landing_personalization_and_testimonials.sql` | Corrige `organization_id` a `bigint` para reproducibilidad |
| `supabase/migrations/20260531050353_harden_public_landing_testimonials_org_id.sql` | Endurece/corrige el tipo y FK de `public_landing_testimonials.organization_id` |
| `supabase/docs/*` | Addendums de drift, RLS y tablas recientes |
| `docs/agent-map/DATA_MODEL_MAP.md` | Documenta `public_landing_testimonials` |
| `docs/agent-map/FEATURES_MAP.md` | Actualiza Pagina Venta y Mini Landing con valoraciones |

---

## 2026-05-31 - Hardening productivo Webpay suscripciones

### Resumen

Se endurecio el flujo Webpay Plus de suscripciones para produccion: retorno GET/POST, manejo de abortos/timeouts, validacion de credenciales, HTTPS, `buy_order` compatible con Transbank, validacion de monto/orden antes de activar y RLS mas restrictivo para `pagos_suscripcion`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/api/subscriptions/webpay/crear/route.ts` | Validacion tipada de plan/periodo y errores genericos al cliente |
| `app/api/subscriptions/webpay/confirmar/route.ts` | Retorno GET/POST, abortos/timeouts y redirects seguros |
| `src/features/subscriptions/services/webpay-suscripcion.service.ts` | Hardening de Webpay, idempotencia y activacion segura |
| `src/features/subscriptions/repositories/pago-suscripcion.repository.ts` | Busqueda por `buy_order` y filtros de soft delete |
| `supabase/migrations/20260531044351_harden_webpay_subscription_payments.sql` | Revoca inserts cliente y deja pagos solo server-side |
| `docs/agent-map/DATA_MODEL_MAP.md` | Riesgo RLS de pagos actualizado |
| `docs/agent-map/FEATURES_MAP.md` | Rutas Webpay y env vars actualizadas |

---

## 2026-05-30 - Webpay Plus integration and pagos_suscripcion table

### Resumen

Se integro Webpay Plus (Transbank) como metodo de pago automatico para suscripciones anuales. Se creo la tabla `pagos_suscripcion` para tracking de transacciones, el hook `useWebpayPago` para el flujo cliente, y se actualizo la pagina `/cuenta-vencida` para mostrar botones de pago Webpay junto a los planes existentes.

### Archivos creados

| Archivo | Proposito |
|---|---|
| `src/features/subscriptions/hooks/useWebpayPago.ts` | Hook cliente para iniciar pago Webpay |
| `supabase/migrations/20260530100000_pagos_suscripcion.sql` | Migracion de tabla `pagos_suscripcion` con RLS |

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/(pwa-app)/cuenta-vencida/page.tsx` | Ahora usa `page-content.tsx` con botones de Webpay |
| `app/(pwa-app)/cuenta-vencida/page-content.tsx` | Componente con 3 planes (2 Webpay + 1 WhatsApp) |
| `supabase/docs/database_map.md` | Nueva tabla documentada |
| `supabase/docs/rls_policies.md` | Nuevas policies de `pagos_suscripcion` |
| `docs/agent-map/DATA_MODEL_MAP.md` | Nueva tabla activa documentada |
| `docs/agent-map/FEATURES_MAP.md` | Feature de suscripcion actualizada con Webpay |

---

## 2026-05-27 - Esquema comercial de hojas en cotizaciones

### Resumen

Se agrego descriptor comercial de hojas para `Ventana + Corredera` en Paso 2 / Agregar de `/cotizaciones/nueva`. El esquema modifica nombre visible y metadata de presentacion del item, pero no cambia calculo de precio por linea, m2, minimo, redondeo ni override manual.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `src/features/cotizaciones/new-quote/workflow-ui.ts` | Helpers de esquema y nombre comercial |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/` | Chips mobile-first para esquema de hojas |
| `src/utils/cotizacion-item-presentation.ts` | Metadata comercial extendida en `observaciones` |
| `docs/agent-map/FEATURES_MAP.md` | Consideracion UX actualizada |

---

## 2026-05-25 - Estabilizacion piloto: rate limit externo, push resiliente y baseline limpio

### Resumen

Se cerro la pasada de estabilizacion previa al piloto. La captacion publica queda preparada para Upstash Redis con fallback local explicito si faltan variables de entorno, el envio de push por organizacion deja de abortar el lote completo ante una sola suscripcion defectuosa, y las API routes criticas ahora registran errores reales en servidor sin exponer detalle al cliente.

Tambien se agregaron dos migraciones chicas de base de datos: una elimina la unicidad global de `clients.correo` para dejarla scoped por `organization_id`, y otra habilita RLS minima para `cotizacion_code_counters` en `authenticated`. El baseline del workspace quedo con `npm run lint`, `npm test` y `npm run build` pasando.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `src/features/solicitudes/services/solicitudes-public-http.service.ts` | Nuevo adaptador Upstash Redis + fallback local explicito |
| `src/features/notificaciones/services/web-push-notifications.service.ts` | Envio paralelo resiliente con `sent/failed/deactivated/skipped` |
| `app/api/solicitud/[empresa]/route.ts` | Rate limit async + logging estructurado |
| `app/api/solicitud/[empresa]/valoraciones/route.ts` | Rate limit async + logging estructurado |
| `app/api/solicitudes/route.ts` | Rate limit async + logging en GET/PATCH/POST |
| `app/api/dashboard/summary/route.ts` | Telemetria de errores en auth/data |
| `app/api/cotizaciones/resumen/route.ts` | Telemetria de errores en auth/data |
| `app/api/clientes/resumen/route.ts` | Telemetria de errores en auth/data |
| `app/api/solicitudes/resumen/route.ts` | Telemetria de errores en auth/data |
| `supabase/migrations/20260525153000_clients_email_unique_by_organization.sql` | Quita unicidad global de correo en clientes |
| `supabase/migrations/20260525154000_cotizacion_code_counters_authenticated_rls.sql` | Policies RLS minimas para `cotizacion_code_counters` |
| `supabase/docs/current_schema.sql` | Snapshot documental corregido para `get_org_id()` y unicidad de `clients.correo` |
| `supabase/docs/rls_policies.md` | `get_org_id()` documentado por `auth.uid()` |

---

## 2026-05-25 - Trial gratis de 7 dias y activacion manual

### Resumen

Se agrego el control simple de prueba gratuita y suscripcion manual por organizacion. Cada nueva organizacion ahora arranca con 7 dias de trial en `organization_profile`, el estado efectivo se calcula desde un helper central de suscripciones, y las rutas privadas pasan a operar en modo lectura cuando la cuenta vence. El usuario puede seguir iniciando sesion, pero crear/editar/eliminar en cotizaciones, clientes, solicitudes internas y configuracion queda bloqueado y se redirige a `/cuenta-vencida`, donde Ventora muestra CTA de WhatsApp con activacion manual mensual o anual.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260525121500_trial_subscriptions_manual_activation.sql` | Nuevas columnas de trial/suscripcion en `organization_profile` + trigger de defaults al crear organizacion |
| `src/features/subscriptions/` | Nueva feature de estado efectivo, guards de rutas y CTA de activacion |
| `src/features/organization-profile/` | El perfil ahora expone snapshot calculado de suscripcion |
| `src/components/layout/app-shell.tsx` | Banners de trial, redirect a cuenta vencida y links privados guardados |
| `app/(pwa-app)/cuenta-vencida/` | Nueva pantalla de activacion manual |
| `app/api/solicitudes/route.ts` | Bloquea escrituras privadas cuando la cuenta esta vencida |
| `app/api/organization-assets/upload/route.ts` | Bloquea uploads privados cuando la cuenta esta vencida |
| `app/api/public-landing/revalidate/route.ts` | Bloquea revalidacion privada cuando la cuenta esta vencida |
| `proxy.ts` | Protege tambien `/cuenta-vencida` |
| `docs/agent-map/DATA_MODEL_MAP.md` | Se documentan campos de trial y activacion manual |
| `docs/agent-map/FEATURES_MAP.md` | Nueva feature `Trial y Suscripcion Manual` |
| `docs/agent-map/ROUTES_MAP.md` | Nueva ruta `/cuenta-vencida` y riesgos de bloqueo en rutas privadas |

---

## 2026-05-22 - Diagnostico fino de login movil y PWA

### Resumen

Se endurecio el login email/password para aislar mejor los fallos que antes podian verse todos como "correo o contrasena incorrecta". Ahora el cliente distingue errores de credencial real, timeout, cookie de sesion no lista, perfil sin empresa, permiso roto de `get_org_id()` y problemas de red/PWA. Tambien se agrega una bitacora local en `localStorage` con intentos, exitos y fallos de login para soporte/debug, junto con eventos `login_success` y `login_failure` enviados a la capa GTM/GA4 ya existente.

Ademas, el prompt de instalacion PWA ahora tiene fallback manual para Android cuando navegadores como Opera no disparan `beforeinstallprompt`. Si el navegador no muestra el CTA nativo, Ventora enseña pasos cortos para instalar desde el `menu O` o desde `Agregar a pantalla principal`, evitando que el usuario quede sin pista de instalacion solo por usar Opera. Ese fallback ahora viene con una guia visual tipo mockup del navegador y un highlight orientativo sobre la zona del menu para usuarios poco familiarizados con tecnologia. La pantalla `/login` suma tambien dos ayudas de soporte directo: ver/ocultar contrasena y un boton `Reiniciar esta app` que limpia service workers, caches y storage local del sitio en ese dispositivo antes de recargar.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/(auth-public)/login/login-view.tsx` | Clasifica errores, espera cookie, registra diagnosticos locales y envia eventos de login |
| `src/features/auth/services/auth-login-error.service.ts` | Nueva clasificacion central de errores de login |
| `src/features/auth/services/auth-login-diagnostics.service.ts` | Nuevo ring buffer local de diagnosticos de login |
| `src/features/auth/services/auth-device-recovery.service.ts` | Reset local de PWA/storage/auth para el dispositivo actual |
| `src/features/auth/services/auth.service.ts` | Reusa el mensaje comun de permiso roto de `get_org_id()` |
| `src/features/auth/types/auth.ts` | Nuevos tipos para errores y diagnosticos de login |
| `app/(auth-public)/login/page.tsx` | Lee `app_reset=1` para confirmar que se reinicio el dispositivo |
| `app/(auth-public)/login/login-view.tsx` | Toggle de contrasena + CTA `Reiniciar esta app` |
| `src/components/pwa/install-app-prompt.tsx` | Fallback manual de instalacion para Opera/Android |
| `docs/agent-map/FEATURES_MAP.md` | Se documenta el diagnostico fino de auth |
| `docs/agent-map/ROUTES_MAP.md` | Se documentan los riesgos y diagnosticos de `/login` |

---

## 2026-05-22 - Onboarding comercial guiado dentro de rutas privadas

### Resumen

Se agrego el MVP de onboarding comercial guiado para administradores dentro de Ventora. El nuevo checklist persiste por organizacion en `onboarding_checklists`, deriva pasos reales desde `organization_profile`, `solicitudes_contacto` y `cotizaciones`, y solo marca los pasos manuales (`channel_ready`, `first_share`) cuando el usuario ejecuta acciones reales de copiar, compartir, descargar QR, abrir PDF o abrir WhatsApp. El onboarding aparece en `dashboard`, configuracion, canales y cotizaciones privadas, sin tocar `/solicitud/[empresa]` ni `/presupuesto/[token]`.

### Ajuste posterior del mismo dia

Se retiro `react-joyride` y se reemplazo por una guia propia mobile-first. En movil ahora usa una tarjeta compacta tipo bottom sheet con CTA corto, progreso y acciones `Cerrar` / `Despues`, sin flechas ni overlay invasivo. En desktop usa una version inline liviana. Ademas se coordina con el banner PWA para no mostrar ambos a la vez, se agrego soporte en `/solicitudes`, y el onboarding sigue apareciendo solo mientras `first_quote` siga incompleto o cuando se fuerce `?onboarding_preview=1`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260522113000_onboarding_checklists.sql` | Nueva tabla y policies RLS para onboarding comercial |
| `src/features/onboarding/` | Nueva feature completa `types -> repository -> service -> hook -> components` |
| `app/(pwa-app)/dashboard/_components/*` | Checklist principal en dashboard desktop/mobile |
| `app/(pwa-app)/configuracion/empresa/page.tsx` | Banner compacto y marca manual al copiar link |
| `app/(pwa-app)/configuracion/pagina-venta/page.tsx` | Banner compacto y marca manual al copiar link |
| `app/(pwa-app)/solicitudes/canales/page.tsx` | Banner compacto + cableado al checklist |
| `src/features/solicitudes/components/lead-channels.tsx` | Marca `channel_ready` en copy/share/QR/WhatsApp |
| `app/(pwa-app)/cotizaciones/page.tsx` | Banner compacto + marca `first_share` desde listado |
| `app/(pwa-app)/cotizaciones/[id]/page.tsx` | Recordatorio contextual + marcas por PDF/link/WhatsApp |
| `app/(pwa-app)/cotizaciones/nueva/page.tsx` | Banner compacto del onboarding |
| `docs/agent-map/FEATURES_MAP.md` | Nueva feature documentada |
| `docs/agent-map/ROUTES_MAP.md` | Rutas privadas actualizadas con onboarding |
| `docs/agent-map/DATA_MODEL_MAP.md` | Nueva tabla documentada |

---

## 2026-05-21 - Logout sin loop visual en AppShell

### Resumen

Se corrigio el loop de cierre de sesion desde rutas privadas endureciendo la salida del panel. `AppShell` ahora dispara un `window.location.replace("/auth/logout")` para salir del App Router y evitar la carrera con `proxy.ts`, mientras `/auth/logout` expira cookies Supabase SSR y recien despues redirige a `/login`. Con esto el navegador ya no rebota de vuelta a `/dashboard` cuando el estado local se cerro pero las cookies compartidas todavia no terminaban de sincronizarse.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `src/components/layout/app-shell.tsx` | La salida usa navegacion dura hacia `/auth/logout` y evita el rebote del App Router |
| `app/(auth-public)/auth/logout/route.ts` | Nueva ruta interna que expira cookies de sesion y redirige a `/login` |
| `src/components/layout/__tests__/app-shell.test.tsx` | Cobertura para logout pendiente que igual debe salir por la ruta server-side |
| `app/(auth-public)/auth/logout/__tests__/route.test.ts` | Cobertura para expiracion de cookies y redirect final al login |
| `src/components/pwa/__tests__/service-worker-navigation.test.ts` | Regresion para asegurar que el service worker no trate rutas privadas como app shell navegable |
| `playwright.config.ts` | Config base de Playwright para smoke E2E movil |
| `tests/e2e/auth-logout.mobile.spec.ts` | E2E real movil para logout, bloqueo de ruta privada y refresh post-logout |
| `src/features/auth/hooks/useAuth.ts` | Revalida sesion al volver a foco/pageshow/visible para evitar estado viejo al reingresar |
| `src/hooks/__tests__/useAuth.test.tsx` | Cobertura para rehidratacion de sesion al volver a foco |
| `package.json` | Scripts `test:e2e:auth-mobile` y `test:e2e:list` |
| `docs/agent-map/ROUTES_MAP.md` | Se documenta la nueva ruta interna `/auth/logout` |
| `docs/agent-map/FEATURES_MAP.md` | Se actualiza la feature de autenticacion con el logout server-side |

---

## 2026-05-21 - Panel privado de growth para fundador

### Resumen

Se agrego la nueva ruta privada `/admin/growth` como panel operativo de growth para fundador/admin autorizado. Esta primera version funciona como pagina standalone fuera de `AppShell`, persiste estado local en `localStorage`, pone `Trabajo de hoy` y `Prospectos prioritarios` como foco principal, y deja `Datos manuales` + `Experimentos` como capas secundarias. Ademas, la ruta sigue aislada para usuarios normales y `proxy.ts` ahora soporta tambien el modo `growth-only` por correo para cuentas que deban quedar atrapadas solo en `/admin/growth`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/admin/growth/` | Nueva ruta privada standalone del panel de growth |
| `src/features/growth/` | Nuevo modulo mockeado con cadena `hook -> service -> repository` |
| `proxy.ts` | Protege `/admin/:path*` |
| `docs/agent-map/ROUTES_MAP.md` | Nueva ruta documentada |
| `docs/agent-map/FEATURES_MAP.md` | Nueva feature documentada |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Se actualiza esta entrada con el rediseno operativo y el modo `growth-only` |

---

## 2026-05-21 - Google Analytics, Google Ads y GTM base

### Resumen

Se agrego una capa base de medicion con Google Tag Manager como contenedor global para GA4 + Google Ads usando variables de entorno publicas. La app ahora carga GTM una sola vez en `app/layout.tsx`, expone `dataLayer` para navegacion App Router y dispara eventos comerciales en los puntos mas sensibles del flujo: clics a WhatsApp desde landing, inicio e intento de envio de formularios publicos, envio exitoso de solicitud publica, clics de demo en `/planes`, envio de cotizacion por WhatsApp, vista/descarga de PDF publico, valoraciones publicas y decision publica de cotizacion. En este proyecto ademas se dejaron configurados como fallback local el contenedor `GTM-N4X44QW6` y el `Measurement ID` `G-Y0LCR4NRDN`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/layout.tsx` | Carga condicional del contenedor GTM, `noscript` y provider de pageviews |
| `src/features/analytics/` | Nueva feature de analitica (`service`, `component`, `types`) |
| `app/(landing-web)/page.tsx` | Eventos de CTA y WhatsApp en landing |
| `app/(landing-web)/planes/page.tsx` | Eventos de clic de demo |
| `app/(landing-web)/solicitud/[empresa]/page.tsx` | CTA publica de WhatsApp con tracking |
| `app/(landing-web)/solicitud/[empresa]/solicitud-empresa-form.tsx` | Evento de lead enviado |
| `app/(landing-web)/solicitud/[empresa]/solicitud-empresa-testimonial-form.tsx` | Eventos de valoracion publica |
| `app/(pwa-app)/cotizaciones/page.tsx` | Evento de envio de cotizacion por WhatsApp |
| `app/presupuesto/[token]/public-quote-mobile.tsx` | Evento de decision/aprobacion publica |
| `docs/agent-map/FEATURES_MAP.md` | Nueva feature documentada |

---

## 2026-05-18 - Configuracion empresa con nombre publico unificado

### Resumen

En `/configuracion/empresa` se simplifico la UX de identidad comercial: el campo visible `Nombre que veran tus clientes` se retiro por redundante y `publicName` ahora queda sincronizado con `empresaNombre` desde esta pantalla. Tambien se reemplazo el lenguaje de `landing` por `pagina publica` o `pagina publica de venta`, y el slug del enlace se autocompleta desde el nombre de la empresa mientras no haya una personalizacion manual.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/(pwa-app)/configuracion/empresa/page.tsx` | Sincroniza `publicName` con `empresaNombre`, autocompleta slug y ajusta copy visible de `landing` a `pagina publica` |

## 2026-05-18 - Paso 1 flexible y linea comercial rapida en cotizaciones moviles

### Resumen

Se elimino la friccion falsa de `Obra o trabajo` en el paso 1 de `/cotizaciones/nueva`: la UI ya no la trata como obligatoria y explica que, si queda vacia, se completa sola al avanzar o guardar. Ademas, el selector movil de lineas comerciales ahora incluye un modo rapido dentro del mismo bottom sheet para crear una linea, heredar el material actual, guardarla en `cotizacion_line_templates`, aplicarla al draft activo y seguir cotizando sin salir del flujo.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-uno-datos-cliente.tsx` | `obra` deja de bloquear el avance visual y muestra ayuda de autocompletado |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-configuracion-movil.tsx` | Nuevo modo rapido de alta de linea comercial dentro del selector movil |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/paso-dos-wizard-movil-shell.tsx` | El wizard movil ahora recibe acciones para crear y aplicar lineas rapidas |
| `app/(pwa-app)/cotizaciones/nueva/_hooks/use-paso-dos-agregar-grupo-movil.ts` | Soporte para aplicar al draft una linea recien creada sin depender del lookup por id |
| `app/(pwa-app)/cotizaciones/nueva/page.tsx` | Orquesta `createLineTemplate` para el flujo movil rapido |
| `app/(pwa-app)/cotizaciones/nueva/page.module.css` | Estilos mobile-first para el formulario rapido en bottom sheet |
| `app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/__tests__/` | Cobertura para crear y aplicar linea rapida en movil |
| `app/(pwa-app)/cotizaciones/nueva/_hooks/__tests__/use-paso-dos-agregar-grupo-movil.test.tsx` | Cobertura para aplicar una plantilla creada al draft movil |

## 2026-05-18 - Cierre de carrera de sesion al cambiar de cuenta

### Resumen

Se corrigio la carrera de sesion que aparecia al salir e ingresar rapido con otra cuenta en la misma pestana. El logout ahora espera el cierre real de Supabase en scope local antes de redirigir, el login usa el token fresco devuelto por `signInWithPassword` para resolver `/api/auth/profile`, y los eventos de auth ya propagan `SIGNED_IN`, `SIGNED_OUT` y `TOKEN_REFRESHED` con su sesion asociada para rehidratar sin depender de un token viejo.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `src/features/auth/types/auth.ts` | Nuevos contratos para token fresco, eventos de auth y `signOut` con scope |
| `src/features/auth/repositories/auth.repository.ts` | Login devuelve sesion fresca, lookup server-side prioriza bearer nuevo y logout usa scope local |
| `src/features/auth/services/auth.service.ts` | Bootstrap/auth coordina server lookup preferente para login nuevo y cierre local de sesion |
| `src/features/auth/hooks/useAuth.ts` | Hook espera el signOut real, restaura estado si falla y reacciona a eventos de sesion |
| `src/components/layout/app-shell.tsx` | La redireccion a `/login` ocurre solo despues del cierre real de sesion |
| `src/hooks/__tests__/useAuth.test.tsx` | Cobertura para promesa de logout pendiente mientras el cierre real sigue en curso |
| `src/services/__tests__/auth.service.test.ts` | Cobertura para token fresco en login y logout local |
| `src/features/auth/repositories/__tests__/auth.repository.test.ts` | Cobertura para retry server-side con `401`, sesion fresca y `signOut` local |

## 2026-05-18 - Script seguro para cuentas piloto

### Resumen

Se agrego un script operativo para crear y auditar usuarios piloto sin dejar cuentas rotas entre `auth.users` y `public.users`. Esto evita repetir el bug de login infinito causado por usuarios creados solo en Auth.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `scripts/pilot-users.mjs` | Alta y auditoria de usuarios piloto con `organization_id`, `rol` y `auth_user_id` |
| `package.json` | Scripts `pilot:user:audit` y `pilot:user:create` |

## 2026-05-18 - Hardening de login para sesiones sin empresa

### Resumen

Se cerro un loop critico de autenticacion: si existe sesion en `auth.users` pero no hay perfil valido en `public.users` con `organization_id`, la app ya no queda en "Cargando tu espacio de trabajo". Ahora se cierra esa sesion invalida y el login muestra un error entendible para usuarios creados solo en Auth.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `src/features/auth/services/auth.service.ts` | Sesiones sin empresa se invalidan en bootstrap y en login |
| `app/(auth-public)/login/login-view.tsx` | Mensaje mas claro para usuarios no vinculados a empresa |
| `src/services/__tests__/auth.service.test.ts` | Cobertura para usuario sin empresa |

## 2026-05-17 - Vidrio recomendado por linea comercial

### Resumen

Se agrego soporte para sugerir un vidrio habitual por linea comercial sin bloquear otros vidrios ni abrir reglas tecnicas duras. La linea ahora puede guardar `vidrio_principal_recomendado` y, al cotizar, ese vidrio aparece primero como recomendado mientras el usuario mantiene libertad total para cambiarlo.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260517164000_cotizacion_line_templates_recommended_glass.sql` | Nueva columna opcional `vidrio_principal_recomendado` en `cotizacion_line_templates` |
| `src/features/cotizaciones/line-templates/` | Tipos, servicio y repository alineados con vidrio recomendado por linea |
| `src/features/cotizaciones/new-quote/workflow-ui.ts` | Aplicar linea ahora puede precargar vidrio sugerido |
| `app/(pwa-app)/cotizaciones/nueva/` | Selector de vidrio prioriza el recomendado de la linea antes de las sugerencias generales |
| `src/features/cotizaciones/line-templates/components/lineas-precios-page-client.tsx` | Configuracion de linea ahora permite elegir vidrio usado normalmente |

## 2026-05-17 - Hardening multi-tenant en Supabase y PDFs privados

### Resumen

Se cerro una pasada de seguridad multi-tenant sobre Supabase. `get_org_id()` y objetos dependientes ahora resuelven organizacion por `auth_user_id/auth.uid()` en vez de correo, `quote_item_breakdown` ya tiene policies RLS reales para cliente autenticado, se restringieron grants/ejecucion innecesarios en funciones y tablas sensibles, y los PDFs cacheados de cotizaciones salieron del bucket publico `organization-assets` hacia el bucket privado `quote-pdfs` con acceso por URL firmada.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260517123000_multi_tenant_hardening_auth_uid_and_private_pdfs.sql` | Migracion de hardening multi-tenant, funciones, grants, policies y bucket privado de PDFs |
| `src/features/cotizaciones/pdf-cache/repositories/cotizacion-pdf-cache.repository.ts` | Cache PDF ahora usa bucket privado `quote-pdfs` y URLs firmadas |
| `src/features/cotizaciones/pdf-cache/services/cotizacion-pdf-cache.service.ts` | Servicio PDF alineado con acceso firmado asincrono |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-16 - Estabilizacion de rutas criticas para piloto

### Resumen

Se cerro una pasada de hardening sobre captacion publica, aprobacion publica y cotizaciones activas. La landing publica ahora respeta `is_published` como restriccion real, se elimino el write-on-read del slug publico, la aprobacion publica tolera revalidacion fuera del runtime completo de Next, y se blindaron crashes reales del Paso 2 movil/comercial en `/cotizaciones/nueva`. Tambien se alinearon contratos de resumen paginado y tests de rutas criticas.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `app/(landing-web)/solicitud/[empresa]/page.tsx` | Ruta publica ahora corta si la pagina no esta publicada |
| `app/presupuesto/[token]/actions.ts` | Revalidacion publica tolerante a mocks/runtime parcial |
| `app/(pwa-app)/cotizaciones/nueva/` | Guards para templates, referencias y arrays opcionales en flujo movil/comercial |
| `app/(pwa-app)/cotizaciones/[id]/page.tsx` | Estados de error mas explicitos para detalle, PDF y WhatsApp |
| `app/print/cotizaciones/[id]/page.tsx` | Menor fragilidad del visor al retener ultimo registro renderizable sin leer refs en render |
| `src/features/solicitudes/repositories/solicitudes-contacto.repository.ts` | Se elimino sincronizacion implicita de slug durante lectura publica |
| `src/features/solicitudes/services/solicitudes-contacto.service.ts` | Solo expone configuracion publica cuando `is_published` es verdadero |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-16 - Documento maestro para IAs, BI y marketing

### Resumen

Se agrego un documento maestro de contexto de negocio y producto para compartir con otras IAs, orientar inteligencia de negocios y alinear marketing. Resume posicionamiento, fase actual, fortalezas reales, funcionalidades activas, restricciones de producto, oportunidades de BI y mensajes comerciales.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `docs/ventora-master-brief.md` | Nuevo resumen maestro de producto, negocio, fase y funcionalidades |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-13 - Cotizacion asistida por linea y precios rapidos

### Resumen

Se actualizo el mapa tecnico para reflejar la nueva V1 de cotizacion asistida: lineas comerciales por empresa con precio por m², minimo cobrable, redondeo y uso directo en Paso 2 de `/cotizaciones/nueva`, mas calculo automatico por medidas y guardado rapido desde la cotizacion.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `Agents.md` | Estado operativo actualizado con la nueva pasada de cotizaciones |
| `docs/agent-map/FEATURES_MAP.md` | Feature Cotizaciones ahora incluye `cotizacion_line_templates`, pricing automatico por medidas y bloque compacto en Configuracion Empresa |
| `docs/agent-map/DATA_MODEL_MAP.md` | Nueva tabla `cotizacion_line_templates` y nota de snapshot comercial en `cotizacion_items.linea` |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-10 - Video explicativo en Remotion

### Resumen

Se agrego un modulo nuevo de marketing video con Remotion para generar el video explicativo de Ventora en formato 16:9 y 9:16, usando assets estaticos en `public/video-assets/` y componentes reutilizables en `src/features/video/`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `docs/agent-map/FEATURES_MAP.md` | Se agrego la feature `Marketing Video / Remotion` |
| `docs/agent-map/COMPONENTS_MAP.md` | Se documentaron `VentoraExplainer`, `SceneWrapper`, `PhoneMockup`, `FloatingMessage`, `StepCard`, `CTAButton`, `GlassGridBackground` y `VentoraLogo` |
| `package.json` | Scripts `video:preview`, `video:render` y `video:render:vertical` |
| `src/features/video/` | Nuevo modulo Remotion del video explicativo |
| `public/video-assets/` | Capturas y logo del video |

## 2026-05-09 - Hardening de auth comun y push activo

### Resumen

Se actualizo el mapa tecnico para reflejar una pasada adicional de hardening sobre superficies activas: el helper comun de rutas privadas ahora resuelve primero el perfil por `auth_user_id` y usa correo solo como compatibilidad, `push-subscriptions` ya restringe la baja al usuario autenticado duenio de la suscripcion, y `proxy.ts` ahora cubre tambien `solicitudes` y `configuracion`.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `Agents.md` | Estado operativo actualizado, nuevos tests y warning de tablas sin RLS corregido |
| `docs/agent-map/DATA_MODEL_MAP.md` | Nota de `web_push_subscriptions` actualizada con alcance `auth_user_id` en el API |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-08 - Hardening RLS de web push

### Resumen

Se actualizo la documentacion del mapa tecnico para reflejar que `web_push_subscriptions` ya no esta en el grupo de tablas sin policies RLS. El acceso autenticado queda acotado por `organization_id` y `auth_user_id`, mientras el envio de notificaciones sigue usando `service_role` del lado servidor.

### Archivos actualizados

| Archivo | Cambio |
|---|---|
| `docs/agent-map/DATA_MODEL_MAP.md` | `web_push_subscriptions` ya no figura sin policies |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Registro de este cambio |

## 2026-05-08 - Creacion inicial

### Resumen

Creacion completa del mapa tecnico del proyecto en `docs/agent-map/`. Documentacion generada por inspeccion exhaustiva del codigo fuente, migraciones Supabase y documentacion existente.

### Archivos creados

| Archivo | Contenido |
|---|---|
| `docs/agent-map/README.md` | Indice maestro, regla principal, orden de lectura |
| `docs/agent-map/PROJECT_OVERVIEW.md` | Stack, arquitectura, convenciones, estructura carpetas |
| `docs/agent-map/ROUTES_MAP.md` | 17 rutas mapeadas con archivos, propositos y riesgos |
| `docs/agent-map/FEATURES_MAP.md` | 14 features documentadas con archivos criticos |
| `docs/agent-map/DATA_MODEL_MAP.md` | 12 tablas activas + 11 legacy, funciones DB, RLS, indexes, issues |
| `docs/agent-map/COMPONENTS_MAP.md` | 20+ componentes documentados por categoria |
| `docs/agent-map/AGENT_TASK_GUIDE.md` | Guia practica por tipo de tarea, checklists, comandos |
| `docs/agent-map/TOKEN_SAVING_RULES.md` | 10 reglas para ahorrar tokens |
| `docs/agent-map/CHANGELOG_AGENT_MAP.md` | Este archivo |

### Modulos detectados y documentados

- Auth (login, session, perfil)
- Dashboard (KPIs, cotizaciones recientes)
- Cotizaciones (CRUD, workflow, pricing, catalogo, sugerencias)
- PDF de Cotizacion (html2canvas + jsPDF, cache Storage)
- WhatsApp / Share Link
- Aprobacion/Rechazo Publica (token, server actions, push)
- Clientes (CRUD, estados, ficha)
- Solicitudes / Leads (captura, UTM, estados, badge origen)
- Links por Canal (UTM tagged URLs)
- QR (generacion, descarga PNG)
- Empresa / Configuracion (perfil, branding, logo, slug)
- Pagina Publica / Mini Landing (hero, galeria, horario)
- Marca / Logo / Color (branding en PDF y landing)
- Notificaciones (Web Push + Email)
- Multi-tenant / organization_id
- Proyectos (CRUD sin ruta directa)

### Rutas mapeadas

| Ruta | Tipo |
|---|---|
| `/` | Publica - Landing |
| `/planes` | Publica - Planes |
| `/solicitud/[empresa]` | Publica dinamica - Captacion leads |
| `/login` | Publica - Autenticacion |
| `/presupuesto/[token]` | Publica dinamica - Aprobacion/rechazo |
| `/dashboard` | Privada - KPIs |
| `/cotizaciones` | Privada - Listado |
| `/cotizaciones/nueva` | Privada - Nueva cotizacion |
| `/cotizaciones/[id]` | Privada dinamica - Detalle |
| `/clientes` | Privada - Listado |
| `/clientes/nuevo` | Privada - Nuevo |
| `/clientes/[id]` | Privada dinamica - Detalle |
| `/clientes/[id]/editar` | Privada dinamica - Editar |
| `/solicitudes` | Privada - Listado leads |
| `/solicitudes/canales` | Privada - Canales QR |
| `/configuracion/empresa` | Privada - Perfil empresa |
| `/configuracion/pagina-venta` | Privada - Landing config |
| 6 API routes | Interna |

### Zonas poco claras o pendientes de verificar

| Zona | Estado | Nota |
|---|---|---|
| `app/(auth-public)/auth/` | No inspeccionado en detalle | Callback OAuth, probablemente simple |
| `app/(landing-web)/privacy/` | Solo listado | Contenido legal estatico |
| `app/(landing-web)/terms/` | Solo listado | Contenido legal estatico |
| `app/(landing-web)/offline/` | No inspeccionado | Pagina offline PWA |
| `app/print/cotizaciones/[id]/` | No inspeccionado en detalle | Vista de impresion |
| `app/(pwa-app)/clientes/nuevo/page.tsx` | No inspeccionado en detalle | Formulario nuevo cliente |
| `public/sw.js` | No inspeccionado | Service Worker |
| `supabase/docs/database.types.ts` | No leido completo | Tipos generados (1352 lineas) |
| `src/features/cotizaciones/services/glass-recommendations.service.ts` | Listado pero no analizado en profundidad | Recomendaciones de vidrio |
| Flujo completo de email | Depende de env vars | No verificable sin configuracion |
| Flujo completo de push | Depende de navegador/OS | No verificable sin dispositivo real |
| Landing gallery upload | Depende de bucket Storage | No verificable sin bucket configurado |
| Cotizaciones `[id]/editar` | No existe como ruta separada | Edicion se hace desde nueva con prefill? |
| Encoding roto | Mencionado en AGENTS.md | Puede reaparecer en vistas o tests |

### Recomendaciones para mantener actualizado

1. **Al agregar una ruta**: Actualizar `ROUTES_MAP.md` con formato establecido + `FEATURES_MAP.md` si es feature nueva
2. **Al mover un archivo**: Buscar en todos los mapas donde aparezca y actualizar paths
3. **Al cambiar una tabla**: Actualizar `DATA_MODEL_MAP.md` + verificar RLS
4. **Al crear componente reutilizable**: Agregar a `COMPONENTS_MAP.md`
5. **Al cambiar logica de feature**: Actualizar `FEATURES_MAP.md` si cambian archivos principales
6. **Mensualmente**: Revisar que los mapas coincidan con el codigo real (auditoria rapida)

### 2026-05-18 - Auth de produccion y mensaje de login

- Se confirmo con reproduccion real sobre `https://ventorap.cl/login` y `https://www.ventorap.cl/login` que `admin@test.com / 1234` autentica y abre `/dashboard` en produccion.
- Se confirmo que el fallo previo no era la contrasena sino una brecha temporal de permisos DB sobre `public.get_org_id()`.
- Se endurecio el mensaje de login para no mostrar `Correo o contrasena incorrectos` cuando el problema real sea `permission denied for function get_org_id`.
- Se corrigio un bug de autofill/Face ID en `/login`: el submit ahora toma los valores reales del formulario y no solo el estado React, evitando rechazos falsos cuando iOS/Android rellenan email/password sin disparar `onChange`.
- Se agrego fallback interno `/api/auth/profile` para bootstrap de auth:
  - si la lectura cliente de `public.users` falla o sale vacia durante login/autofill
  - el cliente consulta una ruta server-side con token bearer
  - la ruta valida el usuario por `auth.getUser(token)` con `service_role`
  - y resuelve `organization_id` + `rol` desde `public.users` sin depender del RLS cliente en ese momento
- Esto reduce falsos errores en iPhone/PWA/Face ID cuando el token se persiste bien pero la lectura inicial del perfil se comporta inestable.
- Archivos tocados:
  - `src/features/auth/services/auth.service.ts`
  - `app/(auth-public)/login/login-view.tsx`
  - `src/services/__tests__/auth.service.test.ts`

### 2026-05-18 - Estabilizacion final de hosts, PWA y provision de cuentas piloto

- Se elimino la dependencia de doble bootstrap al iniciar sesion:
  - `authService.signIn()` ahora devuelve el estado autenticado ya resuelto
  - `useAuth.signIn()` deja de relanzar una segunda rehidratacion completa
- Se endurecio `logout` para no quedar pegado en `Cerrando sesion...`:
  - la UI limpia estado y storage primero
  - la invalidacion real de Supabase se dispara en background
- El bootstrap del perfil autenticado ahora prioriza `/api/auth/profile` server-side antes de consultar `public.users` directo desde cliente.
- Se fijo la politica real de hosts:
  - web valida en `ventorap.cl` y `www.ventorap.cl`
  - PWA e install prompt solo se activan en host canonico `www.ventorap.cl`
  - las rutas privadas y `auth/callback` siguen canonicalizandose a `www`
  - `/api/auth/profile` deja de canonicalizarse por `proxy.ts` para no perder el bearer token en redirects cross-host
- Se agrego configuracion de cookies compartidas de Supabase para `ventorap.cl` y `www.ventorap.cl`:
  - dominio `.ventorap.cl`
  - `sameSite=lax`
  - `secure=true`
  - esto permite que el login iniciado en un host sobreviva al paso controlado al host canonico sin partir la sesion
- Se endurecio el script oficial `scripts/pilot-users.mjs`:
  - nuevos comandos `repair` y `reset-password`
  - `audit` ahora detecta tambien filas activas en `public.users` sin `auth.users`
  - `create` y `repair` verifican login real contra Supabase Auth
  - `create` y `repair` verifican resolucion real de perfil via `/api/auth/profile`
  - el verificador ya soporta redirects `ventorap.cl -> www.ventorap.cl` preservando el bearer en el segundo request
- Se agrego cobertura para:
  - host canonico PWA
  - cookies compartidas de Supabase
  - proxy con rutas privadas canonicalizadas y login permitido en apex
- Verificacion real cerrada en esta pasada:
  - `admin@test.com / 1234` validado via `repair` contra `https://www.ventorap.cl`
  - `admin@test.com / 1234` validado via `repair` contra `https://ventorap.cl` con fallback correcto a `www`
  - `vidriorivera@empresa.cl / clave123` validado via `repair` contra `https://www.ventorap.cl`
- Archivos tocados:
  - `proxy.ts`
  - `src/features/auth/hooks/useAuth.ts`
  - `src/features/auth/services/auth.service.ts`
  - `src/features/auth/repositories/auth.repository.ts`
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/cookie-options.ts`
  - `src/components/pwa/register-service-worker.tsx`
  - `src/components/pwa/install-app-prompt.tsx`
  - `scripts/pilot-users.mjs`
  - `package.json`

### 2026-05-18 - Optimizacion de entrada para pilotos

- Se optimizo la percepcion de carga en entrada/login y primer acceso al workspace:
  - `useAuth` ahora difiere la revalidacion de red cuando ya existe una sesion util persistida en `sessionStorage`
  - el primer paint puede entrar con estado util y refrescar en background
- `useOrganizationProfile` ahora tambien difiere la revalidacion cuando ya existe perfil cacheado o persistido
  - reduce trabajo de red justo despues del login
  - mantiene refresco en segundo plano sin romper datos visibles
- `/login` ahora precalienta `/dashboard` en tiempo ocioso con `router.prefetch("/dashboard")`
  - acelera el salto despues de `signIn`
- No se cambiaron flujos, roles, RLS, PDF, WhatsApp ni rutas publicas.
- Archivos tocados:
  - `src/features/auth/hooks/useAuth.ts`
  - `src/features/organization-profile/hooks/useOrganizationProfile.ts`
  - `app/(auth-public)/login/login-view.tsx`

### 2026-05-18 - Hardening de uploads en Pagina de venta y limpieza de service worker

- Se reprodujo en Supabase el error real de `new row violates row-level security policy` y se confirmo que:
  - `organization_profile` y `public_landing_gallery` estaban operativos
  - el rechazo venia de `storage.objects` al subir assets a `organization-assets`
- Se saco la subida de assets del cliente para configuracion comercial:
  - logo
  - portada hero
  - galeria de trabajos
- Nuevo flujo:
  - cliente autenticado pide upload a `/api/organization-assets/upload`
  - el servidor valida bearer, resuelve `organization_id` activo y sube con `service_role`
  - la URL publica vuelve al cliente sin depender de RLS de Storage en browser
- Beneficios:
  - desaparece el error RLS en `Pagina de venta` y `Empresa`
  - el flujo queda mas estable para pilotos nuevos y usuarios con `auth_user_id` reciente
  - el aislamiento multi-tenant se conserva server-side por organizacion autenticada
- Se desactivo `navigationPreload` en `sw.js` para eliminar el warning:
  - `The service worker navigation preload request was cancelled before preloadResponse settled`
- Archivos tocados:
  - `app/api/organization-assets/upload/route.ts`
  - `src/features/organization-assets/repositories/organization-assets-upload.repository.ts`
  - `src/features/organization-profile/repositories/organization-profile.repository.ts`
  - `src/features/landing-gallery/repositories/landing-gallery.repository.ts`
  - `public/sw.js`
  - `src/components/pwa/register-service-worker.tsx`
  - `supabase/migrations/20260518153000_fix_organization_assets_storage_policies.sql`

### 2026-05-18 - Invalidacion inmediata de cache en landing publica

- Se detecto que la landing publica podia mostrar datos viejos aunque `organization_profile` ya estuviera actualizado en base.
- Causa real:
  - la ruta publica `/solicitud/[empresa]` lee configuracion, galeria y valoraciones desde `unstable_cache`
  - el guardado en `Empresa`, `Pagina de venta`, galeria y valoraciones no invalidaba ese cache
  - resultado: la base quedaba correcta, pero la landing podia seguir mostrando nombre, slug o contenido anterior por hasta 5 minutos
- Se agrego invalidacion server-side segura mediante `/api/public-landing/revalidate`:
  - valida bearer del usuario autenticado
  - resuelve su `organization_id`
  - obtiene el `solicitud_publica_slug` vigente
  - ejecuta `revalidateTag` y `revalidatePath` para refrescar la landing al instante
- Se conecto esta invalidacion a:
  - `useOrganizationProfile.saveProfile`
  - `useLandingGallery` en crear/editar/eliminar/reordenar
  - `usePublicLandingTestimonials.updateStatus`
- Se agregaron tags explicitos al cache publico de:
  - configuracion de solicitud publica
  - galeria publica
  - valoraciones publicas
- Archivos tocados:
  - `src/features/solicitudes/services/solicitudes-public-cache.server.ts`
  - `src/features/solicitudes/services/solicitudes-public-cache-revalidation.server.ts`
  - `app/api/public-landing/revalidate/route.ts`
  - `src/features/solicitudes/repositories/public-landing-cache.repository.ts`
  - `src/features/organization-profile/hooks/useOrganizationProfile.ts`
  - `src/features/landing-gallery/hooks/useLandingGallery.ts`
  - `src/features/public-landing-testimonials/hooks/usePublicLandingTestimonials.ts`

### 2026-05-31 - Supabase MCP conectado y hardening pre-produccion

- Se conecto MCP Supabase al proyecto `yrtrwgkaopfumpidjthk`.
- Se ejecutaron advisors remotos de seguridad y performance.
- Se confirmo RLS habilitado en las 26 tablas `public`.
- Se cerro escritura cliente sobre `pagos_suscripcion`: usuarios autenticados solo leen historial propio por RLS; Webpay escribe desde server con `service_role`.
- Se revoco acceso publico/authenticated al trigger function interno `ensure_organization_profile_trial_defaults()`.
- Se optimizaron policies RLS de `web_push_subscriptions` con `(select auth.uid())` y `(select get_org_id())`.
- Migraciones remotas nuevas:
  - `20260531212114_harden_subscription_security_advisors`
  - `20260531212250_optimize_web_push_rls_initplan`
- Pendientes pre-produccion: leaked password protection en Auth, drift historico de migraciones remotas y performance advisor de FKs/indices.

### 2026-05-31 - Indices FK Supabase

- Se resolvieron los avisos `unindexed_foreign_keys` del Performance Advisor.
- Se agrego migracion `20260531232020_add_missing_fk_indexes_and_drop_duplicate`.
- Se elimino el indice duplicado exacto de `solicitudes_contacto` conservando `solicitudes_contacto_org_created_idx`.
- Se deja `unused_index` como observacion de bajo riesgo hasta tener trafico real.

### 2026-06-02 - Billing Flow temporal

- Se agrego capa `src/features/billing/` con `PaymentProvider`, catalogo tipado de planes y providers `flow`, `manual_transfer`, `webpay_plus`.
- Flow queda provider principal temporal para `/api/billing/checkout` y `/api/billing/flow/confirmar`.
- `pagos_suscripcion` se extendio como ledger provider-agnostic con `provider_order_id`, `checkout_url`, `flow/manual_transfer/webpay_plus` y estado `cancelado`.
- `/cuenta-vencida` usa `useBillingCheckout()` y mantiene mensual por WhatsApp.
- Webpay Plus directo queda como endpoints legacy/compatibilidad en `/api/subscriptions/webpay/*`.

### 2026-06-02 - Cuentas internas gratis permanentes

- Se agrego migracion `20260602065826_founder_free_internal_accounts`.
- Organizaciones `3` y `4` quedan como `active/founder/founder_full` sin fecha de vencimiento.
- Se documenta que hard delete de organizations con datos asociados no es el flujo correcto; usar soft delete por `eliminado_en`.
## 2026-08-03 - Biblioteca y flujo técnico de cubicación

- Se agregaron `/biblioteca-lineas` y `/mis-recetas` como entradas técnicas independientes del catálogo de precios. Ambas reutilizan líneas comerciales y recetas persistidas; las plantillas sugeridas o líneas solo reconocidas no inventan códigos, cantidades ni fórmulas.
- El administrador de receta ahora presenta las etapas Identidad, Componentes, Prueba y Validación, con resumen lateral de datos/política de corte en milímetros.
- El laboratorio conserva el cálculo puro y expone una pauta de barras FFD referencial a partir de largos comerciales y pérdidas documentadas. No agrega optimizador industrial ni bloquea la cotización comercial cuando no existe receta validada.

---
