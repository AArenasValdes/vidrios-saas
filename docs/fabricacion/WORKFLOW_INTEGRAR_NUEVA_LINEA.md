# Workflow seguro para integrar una línea de fabricación

**Vigente:** 2026-09-27  
**Alcance:** receta, cubicación, despiece, pauta referencial y selección en cotización.

Este procedimiento es obligatorio para agregar o ampliar líneas con salida técnica. Su objetivo es mantener rastreable cada regla, probar las variantes y evitar que una receta documental se presente como validada por taller.

Copiar la [plantilla de integración](PLANTILLA_INTEGRACION_LINEA.md) a la carpeta de evidencia de la línea. Ese expediente conserva decisiones, fórmulas, pruebas y pendientes para que otro agente continúe sin reconstruir la investigación.

## 1. Antes de editar

Leer, en este orden:

1. `AGENTS.md`.
2. `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`.
3. `docs/agent-map/README.md` y `docs/agent-map/FEATURES_MAP.md`.
4. `docs/agent-map/CUBICACION_PAUTA_HANDOFF.md`.
5. Esta guía y la auditoría documental de la línea elegida.
6. El contrato del motor en `src/features/fabricacion/types/fabricacion-domain.ts`, `fabricacion-calculo.service.ts`, `fabricacion-receta-resolver.service.ts` y `fabricacion-pauta-barras.service.ts`.

No editar `fabrication_recipes`, seeds, wizard ni catálogo antes de identificar el `catalog_key`, variante, arquetipo, línea de cotización y pruebas existentes. Inspeccionar `git status` y preservar cambios ajenos.

## 2. Crear la matriz de evidencia

Registrar cada combinación como una fila independiente con:

| Campo | Qué registrar |
|---|---|
| Línea | `catalog_key`, proveedor y nombre de catálogo |
| Variante | tipología, apertura, cantidad de hojas/módulos, riel, perfil de hoja y espesores de vidrio compatibles |
| Fuente | URL/archivo, página/hoja/celda y revisión/fecha |
| Composición | perfiles/accesorios, cantidades, orientación y ángulos |
| Regla | base, ajuste, multiplicador, condición y unidad para cada perfil y vidrio |
| Evidencia | fabricante, sistema externo, transcripción, cálculo y resultado que se espera |
| Pendiente | campo exacto sin confirmar y qué flujo debe bloquearse |

Priorizar manual/pauta del fabricante para identidad y cortes. Otra calculadora, catálogo comercial o captura puede ayudar a comparar, pero no se convierte en fórmula del fabricante sin confirmación. No derivar descuentos desde cotas de secciones o una única medida observada. Registrar contradicciones; no resolverlas por intuición.

Separar explícitamente estas capas:

- **Línea cotizable:** nombre/precio comercial; puede no tener receta.
- **Receta candidata:** reglas ejecutables con evidencia identificada; puede seguir `draft` o `requiere_revision`.
- **Prueba de motor:** entradas/salidas reproducibles; no acredita una fabricación real.
- **Validación de taller:** casos reales aprobados y versión persistida como `validated`.
- **Pauta de barras:** distribución referencial según largos y política configurados; no es optimización ni pauta de máquina.

## 3. Implementar receta de forma acotada

1. Crear o extender un fixture puro en `src/features/fabricacion/fixtures/`. Una variante debe tener identidad estable y única; no usar nombres de pantalla como sustituto de identidad.
2. Incorporar solo perfiles/vidrios cuyo rol, fórmula, cantidad y orientación tengan soporte. Conservar `sourceReference`, `sourceName`, `sourceRevision`, observaciones y notas.
3. Si un código físico, medida, cantidad o compatibilidad no está confirmado, dejarlo sin equivalencia o con `datosPendientes`; no inventar un código para desbloquear el gate.
4. No activar códigos tentativos como obligatorios “para que calcule”. El cálculo documental y la elegibilidad **Lista para probar** son decisiones distintas.
5. Para largos de barra desconocidos, dejar explícita la procedencia. El preset Ventora de 6000 mm es solo referencial; no presentarlo como dato confirmado del proveedor/taller. No trasladar kerf, merma ni optimización de otra hoja/software.
6. Registrar slots en `line-base-variant-catalog.ts` cuando corresponda. El seed es idempotente y comparte solo ejecuciones concurrentes: debe volver a consultar líneas y slots en nuevas cargas, para que un catálogo/variante agregado después no quede invisible por una respuesta cacheada en la sesión. Si una línea heredada carece de `catalog_key`, solo inferirlo con una identidad fuerte (por ejemplo, proveedor WinHouse + nombre de línea y riel explícitos); agregar una regresión y consultar también esas filas. Nunca ejecutar escrituras remotas durante una tarea local sin autorización.
7. Crear/actualizar el resolutor de cotización: debe unir `catalog_key + tipología + hojas + vidrio + variante` y devolver **sin receta** para combinaciones que no estén cubiertas. No elegir la receta por una coincidencia parcial o por el vidrio recomendado si contradice la selección final del maestro. Para New S75, una combinación documentada puede usar un borrador preliminar determinista de Ventora si no hay receta persistida estructuralmente lista para calcular; una receta local incompleta no debe ocultar esa base. Nunca marcar el fallback como validado ni ocultar el seed que habilita editar la línea en Fabricación.
8. Si una fórmula requiere una entrada adicional (por ejemplo ancho de hoja A), llevarla desde el formulario hasta `FabricacionEntradaCalculo`, snapshot inmutable, metadata privada del ítem y resolución del despiece. Invalidar snapshots al cambiar esa medida y bloquear entradas imposibles.
9. Las recetas WinHouse sugeridas por Ventora pueden mostrar cubicación, despiece y pauta preliminar cuando el motor confirma que calculan con las medidas ingresadas, aunque queden datos de taller pendientes (por ejemplo códigos o largos comerciales). Mantener visible el aviso: **Configuración sugerida por Ventora. Revísala y ajústala según cómo trabaja tu taller. Esta pauta aún no ha sido validada por tu taller.** No cambiar estado a probada/validada; bloquear salida si el motor no puede calcular o falta una entrada geométrica requerida.

## 4. Pruebas obligatorias por línea

Crear una suite por línea en `src/features/fabricacion/__tests__/<linea>-numerical-contract.test.ts` y ampliar las regresiones del servicio/hook/componente modificado. Usar `winhouse-s75-numerical-contract.test.ts` como ejemplo de resultados independientes de la implementación; `fabrication-line-recipes.smoke.test.ts` conserva la cobertura compartida WinHouse:

- Enumerar **todas** las variantes registradas y calcularlas; cada pieza debe tener largo positivo, cantidad correcta y vidrio con dimensiones/cantidad esperadas.
- Para cada variante, comprobar reglas importantes por perfil: código/rol, base, ajuste, multiplicador, cantidades y ángulos.
- Probar entradas válidas en medidas pequeñas, nominales y altas según la evidencia; probar cero/negativos, límites de condición y valores que excedan límites documentados.
- Probar datos adicionales y split de hojas: falta de entrada, valores fuera de rango, derivación de anchos, resultado de perfil y vidrio, persistencia en snapshot y cambio que invalida el snapshot.
- Probar resolución desde la cotización con vidrio y configuración final. Ensayar al menos una combinación no soportada y confirmar que retorna incompleta/sin receta sin generar un snapshot fabricado.
- Para WinHouse, comprobar por separado las variantes calculables como pauta preliminar y las que se bloquean por falta de geometría/datos; cálculo preliminar no equivale a `Lista para probar` ni a validación de taller.
- Probar el gate: una fórmula ausente o geometría inválida no produce una salida completa. Los pendientes de códigos/ajustes del taller se distinguen de los bloqueos de cálculo; las bases preliminares autorizadas pueden mostrar despiece y snapshot sin activar ni validar la receta.
- Probar precedencia: una receta propia calculable conserva sus ajustes; recetas de otra organización/línea, archivadas o eliminadas no desplazan ni ocultan la base compatible. El seed no sobrescribe ajustes del taller y el cálculo no muta la receta de entrada.
- Probar pauta con largo configurado: perfiles no se mezclan por código/nombre, ningún corte supera la barra, y errores/faltantes salen como advertencias concretas.
- Si una línea tiene cobertura parcial, declarar en pruebas cuáles calculan y cuáles se bloquean. No afirmar cobertura completa a partir de una receta.

Comando obligatorio antes de cerrar una integración:

```powershell
pnpm fabrication:verify
```

El verificador descubre automáticamente las suites de fabricación, catálogo/seeds, nueva cotización, Constructor, Paso 2 e impresión. Ejecuta pruebas del propio verificador, regresiones Jest, TypeScript y `docs:check` (inventario de rutas y enlaces). Falla si falta una suite crítica, Jest omite suites seleccionadas, hay pruebas pendientes/omitidas, o alguna etapa falla. No actualiza snapshots automáticamente ni altera el manifiesto de rutas.

El resultado queda en `test-results/fabrication/verification.json` y el detalle de Jest en `test-results/fabrication/jest.json`, con commit, presencia de cambios locales, comandos, duración y resultado por etapa. Cada ejecución invalida el informe previo; un proceso interrumpido no debe tomarse como aprobación. `browserSmoke`, base remota y validación de taller quedan expresamente sin comprobar.

Para iterar rápido usar la suite específica con `pnpm exec jest --runInBand --runTestsByPath <archivo>` o `pnpm fabrication:smoke`. Para cierre con cambios de aplicación:

```powershell
pnpm fabrication:verify --build
```

Detener primero cualquier servidor del mismo checkout que use `.next` y volver a iniciarlo después del build. No saltar errores preexistentes ni convertir una prueba unitaria en afirmación de QA visual, base remota o validación física. Si falla un snapshot, revisar su diferencia y la evidencia antes de actualizarlo con un comando dirigido a esa suite.

`.github/workflows/fabrication-verify.yml` ejecuta el mismo gate en cada pull request y por ejecución manual, sin credenciales de negocio ni escrituras remotas. Conserva el informe como artefacto incluso ante fallos. Versionar el archivo configura el workflow; solo una ejecución en GitHub confirma CI. El bloqueo de merge requiere que el repositorio configure `fabrication-verify` como check obligatorio en su protección de rama.

## 5. Smoke visual seguro

Hacerlo en desarrollo o en una organización local/QA:

1. Abrir Configuración → Empresa → Línea → Fabricación y comprobar identidad y variantes que aparecen.
2. Entrar a **Probar con medidas** y revisar Producto → Perfiles → Vidrio y accesorios → Validar.
3. Confirmar cortes/componentes, vidrio, advertencias y pauta con dos tamaños controlados; corregir una dimensión y comprobar que los resultados cambian en el eje que corresponde.
4. En una cotización QA, elegir línea, tipología/hojas, vidrio final y medidas; abrir la revisión interna y contrastar el resultado con el test determinista.
5. Guardar snapshot solo en QA, reabrirlo y verificar que mantiene receta, versión, vidrio y entradas. El PDF cliente no debe recibir datos técnicos.

El wizard puede guardar borradores al avanzar. Usar la cuenta QA autorizada por el usuario; esa autorización persiste y no se debe volver a pedir en cada paso. No activar una receta en nombre del taller. Registrar la ruta, variante, medidas, estado observado y si los datos fueron persistidos. Si la UI no permite completar el paso, investigar el bloqueo y adjuntar la evidencia; los tests unitarios no lo reemplazan. Recorrer todas las configuraciones nuevas antes de afirmar cobertura completa de UI; si se muestrea, explicitar las no recorridas.

## 6. Cierre y documentación

Actualizar la fuente de línea, `FEATURES_MAP.md` y `CHANGELOG_AGENT_MAP.md`. Actualizar `ROUTES_MAP.md`/`DATA_MODEL_MAP.md` si se añade una ruta o cambia persistencia. Registrar:

- las variantes que calculan;
- las que se bloquean y por qué;
- pruebas que pasaron y comando exacto;
- resultado del smoke visual y sus límites;
- si se escribió en base local/remota;
- estado final: documental, `draft`, `testing`, `validated` o validación física pendiente.

## Línea de referencia

La suite común incluye WinHouse S60 y New S75. S60 valida los tres fijos como cálculo/pauta preliminar y mantiene cinco variantes restantes bloqueadas. S75 valida 36 combinaciones (12 geometrías de la pauta oficial × 3 bandas de vidrio) tanto en cálculo de fórmula como en resolución del flujo de cotización, más el ancho A asimétrico y su persistencia en snapshot; las recetas siguen `requiere_revision` hasta mapear códigos del taller y probar refuerzos/medidas reales. En cotización, comprobar además que las variantes quedaron sembradas para la línea de esa organización; líneas antiguas sin `catalog_key` deben resolverse por identidad inequívoca, no por solo texto parcial. Esto cubre las 12 hojas con fórmulas, no todos los dibujos comerciales del póster: hoja fija, laterales fijos y triple riel 6H requieren reglas explícitas. No traducirlos a recetas de hojas móviles por aproximación.
