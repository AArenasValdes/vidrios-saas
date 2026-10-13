# Base común de líneas, sistemas y composiciones

Fecha: 2026-10-12.
Estado: contrato común en implementación parcial (2026-10-12). Los avances describen código local; no acreditan cobertura completa del catálogo ni validación de taller.
Alcance: todo el catálogo actual y próximas integraciones; configuración móvil, cotización Guiada/Constructor, recetas propias y snapshot interno. Mantiene el alcance comercial del producto.

## 1. Decisión de producto

Cada línea necesita una ficha de configuraciones admitidas independiente de que ya existan fórmulas de corte. El maestro elige una configuración documentada, recibe su base y completa únicamente los datos que faltan. Una composición puede estar documentada y ser cotizable aunque su receta esté pendiente.

La misma identidad debe recorrer:

`familia/línea → componente y sistema de apertura → composición → variante técnica → receta del taller → cotización → snapshot → despiece`

Si ningún perfil ni la receta especifican el largo comercial de una tira, Ventora usa **6.000 mm (6,00 m)** como valor predeterminado para calcular la pauta. El maestro puede sobrescribirlo por perfil cuando la presentación que compra sea distinta. El valor predeterminado no se atribuye como dato confirmado del fabricante.

El catálogo de perfiles describe piezas disponibles. La base de una composición identifica cuáles utiliza, dónde, cuántas y cómo se miden. Son datos relacionados que deben conservar su procedencia por separado.

## 2. Diagnóstico del código actual

Inventario local de fixtures: **73 entradas comerciales**, que incluyen familias, líneas y configuraciones separadas. No son 73 familias distintas. Ver [matriz completa](MATRIZ_BASE_CONFIGURACIONES_2026-10-12.md).

| Hallazgo | Evidencia actual | Consecuencia |
|---|---|---|
| Declaración común insuficiente | 4 entradas con `compatibility.configurations`, 39 con declaraciones anteriores y 30 sin ese objeto | Los consumidores necesitan caminos diferentes para descubrir lo que admite cada línea. |
| Variantes repartidas | 28 entradas tienen slots en `getLineVariantSlots`; otras recetas viven en arquetipos y fixtures específicos | La ausencia de un slot no demuestra ausencia de despiece. Unificar debe incorporar esos caminos existentes. |
| Referencias sin composición | 54 entradas tienen referencias de perfiles | Tener códigos no indica automáticamente qué perfiles usa cada composición. |
| Configuración genérica en líneas incompletas | `FabricacionMobileProductStep` recurre a `TYPOLOGY_OPTIONS` y `[1,2,3,4]` | Ofrece posibilidades que no provienen de la ficha de esa línea. |
| Cambio de identidad sobre el mismo borrador | `selectCatalogConfiguration` cambia tipología/apertura/variante conservando perfiles y reglas | Puede trasladar datos de una ventana a una puerta. Debe elegir o crear otra configuración, preservando el borrador anterior. |
| Hojas sin disposición | `leavesCounts` permite contar, pero no describe posición de fijos/móviles ni rieles | Dos paños pueden requerir recetas diferentes. |
| Coincidencia técnica todavía opcional | El resolutor compara `topology`/`hardwareMode` cuando ambos lados los contienen | La nueva identidad debe exigir todos los discriminadores requeridos por la configuración. No basta añadir una etiqueta visual. |

Fuentes principales inspeccionadas:

- `src/features/cotizaciones/line-templates/services/default-line-catalog.ts`.
- `src/features/cotizaciones/line-templates/services/line-template-compatibility.service.ts`.
- `src/features/fabricacion/fixtures/line-base-variant-catalog.ts`.
- `src/features/fabricacion/components/mobile/fabricacion-mobile-product-step.tsx`.
- `src/features/fabricacion/hooks/use-fabricacion-line-workflow.ts`.
- `src/features/fabricacion/services/fabricacion-line-variant.service.ts`.
- `src/features/fabricacion/services/fabricacion-receta-resolver.service.ts`.
- `src/features/fabricacion/services/fabricacion-linea-cotizacion-context.service.ts`.
- `src/features/fabricacion/services/veratec-quote-composition.service.ts`.

### Caso EKO 130

Se revisó visualmente `docs/fabricacion/veratec/Diptico lineas de pvc.pdf`, página 7. Identifica ocho referencias: marco americana, traslapo móvil, hoja móvil lateral, marco hoja móvil inferior/superior, traslapo fijo, riel y dos junquillos. Es información útil para una biblioteca de perfiles.

Esa página no enumera composiciones completas de ventana/puerta, cantidades por composición ni descuentos. Por ello no respalda ofrecer automáticamente 2/3/4 hojas, todas las aperturas o reutilizar una receta de otra familia. `ventora:veratec-eko-130` tampoco declara esas configuraciones en código.

La ficha debe conservar los ocho códigos disponibles y señalar exactamente el dato pendiente: **sistemas y composiciones por confirmar**. Un Plan de armado o una configuración explícitamente aportada por el taller permite completar el registro. La configuración del taller queda privada y con su procedencia, sin convertirse en una afirmación del fabricante.

### Casos que la solución debe cubrir desde el inicio

- **Kompen, cuatro líneas:** hay pares componente/apertura y referencias; faltan las composiciones y pautas que el usuario aportará. Se puede mostrar lo conocido y completar luego la misma identidad.
- **Elevadora:** el díptico enumera seis composiciones comerciales, mientras el catálogo técnico de slots cubre dos entradas. Las seis necesitan presencia coherente aunque algunas carezcan de fórmula. La migración debe comprobar su evidencia y disponibilidad por separado.
- **EKO 130/82 y familias con datos parciales:** exponer referencias confirmadas y admitir configuración privada asistida; no sembrar todas las tipologías de Ventora.
- **Líneas que ya calculan:** adaptar sus identidades actuales y conservar fórmulas, versiones y validación. La auditoría de slots no puede degradar líneas cuya receta proviene de otro fixture.

## 3. Contrato único propuesto

### Vocabulario

| Nivel | Significado | Ejemplo descriptivo |
|---|---|---|
| Familia/línea | Identidad comercial y técnica que ya posee `catalogKey`/`familyKey` | Form Line KOM 800 |
| Componente | Qué se vende/fabrica | Ventana o puerta |
| Sistema de apertura | Cómo funciona ese componente | Corredera, abatible, proyectante, fijo, guillotina |
| Composición | Disposición concreta de paños/hojas | 2 paños: fijo izquierdo + móvil derecho |
| Variante técnica | Diferencia que altera perfiles, reglas o límites | Riel, hoja grande/chica, refuerzo, herraje o banda de vidrio |
| Receta | Reglas versionadas aplicadas a esa configuración | Base documentada o ajuste propio del taller |

Los ejemplos son vocabulario, no nuevas compatibilidades atribuidas a una línea. En la interfaz usar “Sistema de apertura” para evitar confundirlo con el nombre comercial guardado hoy en `lineSystem`.

### Registro de configuración

Crear una fuente canónica de configuraciones con tipos y funciones puras. Debe contener:

- ID estable de configuración y revisión de su fuente; no derivarlo del texto visible ni de la posición de una opción.
- `catalogKey` y familia; conservar las claves existentes de líneas que hoy ya representan una variante.
- Componente + apertura como par explícito; nunca obtener compatibilidades multiplicando listas independientes.
- Composición identificada: paños, hojas móviles/fijas, posición, dirección y riel cuando estén documentados. Reutilizar el modelo visual existente para su croquis; no inventar otro constructor paralelo.
- Entradas geométricas obligatorias: ancho, alto y, cuando corresponda, ancho A, distribución asimétrica o fijos laterales.
- Variantes técnicas y condiciones que realmente afecten esta composición. Vidrio final y herraje participan cuando sean discriminadores de la receta.
- Roles de perfil requeridos y referencias permitidas por rol. Cada relación necesita evidencia, incluyendo relaciones compartidas entre sistemas.
- Referencia a la base de receta existente, si existe; disponibilidad independiente de la presencia comercial.
- Procedencia por campo o grupo de datos: documento/página/revisión, receta existente o configuración del taller.
- Datos pendientes explícitos. Un valor desconocido no se completa con cero, una hoja o una fórmula genérica.

La nueva capa centraliza las selecciones. Los fixtures actuales siguen siendo dueños de sus fórmulas; se incorporan mediante adaptadores explícitos hasta que cada línea tenga el contrato común. Evitar que el nuevo registro y `compatibility` vuelvan a ser dos listas editadas manualmente: la proyección comercial debe salir del mismo registro.

### Estados independientes

| Dimensión | Estados y efecto |
|---|---|
| Configuración | Documentada / aportada por el taller / por confirmar. Determina qué opciones pueden mostrarse como admitidas. |
| Composición | Completa / faltan datos concretos. Determina si se puede preparar la base correcta. |
| Reglas | Calculables / faltan fórmulas o cantidades. Determina disponibilidad del despiece solicitado. |
| Validación | Documental / pendiente de taller / validada por taller. No se infiere por tener fórmulas o superar pruebas de software. |
| Precios | Configurados / parciales / pendientes. Compra y venta se mantienen separadas de los descuentos de corte. |

“Faltan descuentos” solo es correcto cuando composición, roles, cantidades y bases ya están definidos. Si falta algo más, nombrarlo en su fila.

## 4. Flujo móvil propuesto

Mantener cuatro pasos. La línea llega elegida desde el catálogo.

### Paso 1: Qué fabricarás

1. Mostrar línea/proveedor como contexto.
2. Elegir componente y sistema entre los admitidos. Si hay una sola opción, mostrarla resuelta.
3. Elegir composición mediante croquis y un nombre inequívoco, por ejemplo “1 fijo + 1 móvil”. Las variantes adicionales aparecen solo cuando esa composición las necesita.
4. Abrir la receta existente de esa identidad o preparar su base independiente. CTA: **Completar perfiles y descuentos**; si ya está completa, **Revisar perfiles y descuentos**.

No ofrecer composiciones por la mera existencia de una plantilla genérica. Para una línea sin esas definiciones, mostrar sus datos conocidos y la acción explícita **Crear configuración de mi taller**. Ese flujo pide componente, apertura y composición asistida; las partes no documentadas quedan atribuidas al taller.

Cambiar configuración abre otro borrador/receta. Si hay cambios sin guardar, resolverlos antes del cambio. Nunca renombrar el mismo borrador de ventana a puerta conservando silenciosamente sus reglas.

### Paso 2: Perfiles y descuentos

La composición precarga los roles que se conocen: por ejemplo, marco horizontal/vertical o piezas específicas de hoja. El nombre debe corresponder al sistema documentado.

Cada fila muestra código, función, cantidad, medida base y descuento en **mm**. El maestro completa únicamente los campos pendientes y puede editar, sustituir, agregar o eliminar piezas de su receta. La eliminación de una pieza obligatoria deja esa composición incompleta hasta resolverla.

- Filtrar el selector por configuración y rol cuando existe asociación documentada.
- Mostrar por separado referencias de la línea cuya aplicación está sin confirmar; elegir una requiere asignarle un uso en la receta privada.
- `applicationGroup` ayuda a presentar referencias, pero no sustituye una relación de compatibilidad por ID.
- Un perfil puede servir a varios sistemas mediante relaciones explícitas.
- Un mismo código puede necesitar filas de corte distintas para horizontal y vertical.
- Si solo se conocen códigos, conservarlos como biblioteca; no crear reglas “ancho, ajuste 0, cantidad 1”.

### Pasos 3 y 4

**Vidrio y accesorios:** mostrar los requisitos correspondientes a la configuración, con unidades y pendientes propios.

**Revisar con medidas:** mostrar composición elegida, datos faltantes y resultado calculable. Guardar la receta propia versionada; la confirmación de taller conserva su proceso actual. La presencia en catálogo no activa validación.

## 5. Conexión con la cotización

Guiada, Constructor y editor de línea deben consultar el mismo contrato de configuraciones. Conservar el orden comercial actual: cuando primero se elige componente/apertura, se filtran las líneas compatibles; cuando se parte de una línea, se filtran sus configuraciones.

Identidad técnica en curso para nuevas selecciones:

`organization_id + line_template_id + catalogKey + configurationId + variante técnica + geometría + vidrio final`

La receta conserva también composición y discriminadores explícitos. `configurationId` por sí solo no reemplaza las medidas ni las condiciones de la fórmula.

- Coincidencia exacta de todos los discriminadores requeridos. Si falta uno, pedirlo. Si no existe receta calculable, mostrar el pendiente de esa composición.
- Nunca seleccionar la primera receta o la más parecida para completar un hueco.
- La composición visible del Constructor debe concordar con la identidad técnica. Agregar un fijo, cambiar móviles por fijos, rieles o herraje invalida el cálculo vivo que ya no corresponde.
- Llevar la identidad por formulario, borrador local, persistencia de ítem, reapertura, cálculo y snapshot. No limitar el cambio a las props del selector.
- El snapshot guardado conserva su receta, versión, entradas, perfiles y resultado. Editar la base o los descuentos del taller afecta nuevos cálculos; una actualización histórica debe ser explícita.
- El PDF cliente mantiene contenido comercial; el despiece sigue en la salida interna.
- El precio comercial por m² conserva su contrato. Descuentos de corte en mm, descuentos comerciales porcentuales y precio de compra tienen campos y etiquetas distintos.

## 6. Migración y preservación

Usar las estructuras existentes: catálogo canónico, `cotizacion_line_templates`, `fabrication_recipes` y snapshot de ítem. La primera implementación no necesita crear tablas técnicas nuevas.

1. Inventariar todas las fuentes actuales de receta, además de slots: arquetipos, SODAL, WinHouse, Veratec y recetas propias. Conservar sus identidades y estados.
2. Asociar cada configuración inequívoca al nuevo ID mediante mapeo explícito y revisionado. Una coincidencia de nombre no autoriza migración.
3. Mantener lectura compatible de históricos. Si una receta antigua no tiene composición suficientemente identificable, conservarla y pedir asociación explícita para reutilizarla bajo el nuevo contrato.
4. Una receta del taller completa y compatible prevalece para ese taller. Las bases nuevas no sobrescriben fórmulas, precios, perfiles eliminados, ni versiones privadas.
5. Crear una configuración privada solo mediante acción explícita; abrir la ficha o consultar el catálogo no debe sembrar borradores genéricos automáticamente.
6. Preservar aislamiento por organización, soft delete y versionado. Las composiciones privadas no amplían el catálogo universal.
7. Mantener L25 y las variantes confirmadas por el titular sin cambios numéricos. No ampliar la validación a composiciones vecinas.

Revisar serializers y schemas antes de agregar identidad opcional al JSON. Compatibilidad de lectura no equivale a permitir que una receta antigua incompleta coincida con cualquier composición nueva.

## 7. Orden de implementación

La entrega funcional debe recorrer una configuración completa de extremo a extremo antes de presentarla como resuelta.

| Trabajo | Archivos/capas principales | Criterio de cierre |
|---|---|---|
| Contrato común y adaptadores | Nuevo registro tipado en `line-templates`; `default-line-catalog`, compatibilidad, slots y fixtures existentes | Todas las entradas tienen cobertura declarada o pendientes explícitos. Ninguna configuración se deduce por nombre. |
| Identidad y resolución | Dominio de fabricación, contexto de pieza/cotización, resolutor y adaptadores de snapshot | Misma composición llega al cálculo y se rechazan cruces distintos aunque tengan igual cantidad de hojas. |
| Selección móvil y base | `fabricacion-mobile-product-step`, wizard, shell y `use-fabricacion-line-workflow` | Elegir una configuración crea/abre su propia receta, sin trasladar perfiles ni perder ajustes de otra. |
| Perfiles por rol | Referencias, lista y sheet de perfiles, editor de receta | Roles y códigos documentados precargados; pendientes editables; eliminación persistente. |
| Cotización y persistencia | `new-quote/workflow-ui.ts`, Guiada, Constructor, guardado/reapertura de ítems | Croquis, configuración y receta coinciden después de guardar y reabrir. |
| Integraciones futuras | Workflow, plantilla y verificador de fabricación | Una integración declara datos y fuentes; la UI común los consume sin añadir excepciones por marca. |

No migrar todas las familias suponiendo que los huecos documentales son iguales. Usar al menos cuatro clases de caso durante el desarrollo: línea ya calculable, composición conocida sin fórmula, sistema conocido sin composición (Kompen) y familia con referencias pero configuración sin confirmar (EKO).

## 8. Workflow de integración repetible

1. Registrar proveedor/familia/claves y versión de documento.
2. Transcribir los pares de componente/apertura y las composiciones identificadas. Registrar desconocidos expresamente.
3. Asociar perfiles por rol y composición cuando la fuente lo permita.
4. Añadir cantidades, bases y descuentos únicamente desde pauta/fabricante/taller identificado. La falta de regla no elimina una composición comercial ya documentada.
5. Proyectar catálogo, opciones del editor y opciones de cotización desde ese registro único.
6. Ejecutar comprobaciones estructurales: IDs únicos, referencias existentes, pertenencia de línea, composiciones coherentes y discriminadores obligatorios. Las discrepancias deben impedir publicar cobertura técnica falsa.
7. Incorporar pruebas numéricas de fórmulas disponibles y casos negativos de selección; mantener regresiones de variantes validadas.
8. Usar el gate existente `pnpm fabrication:verify --build` para cambios de aplicación, con el servidor del mismo checkout detenido antes de construir.
9. Recorrer en QA autorizado elección → edición → despiece → guardado → reapertura → pauta interna/PDF cliente. Registrar pendientes documentales por configuración.

La automatización comprueba coherencia y regresiones. Las fuentes y la confirmación del taller aportan los datos técnicos; el workflow no los inventa.

## 9. Criterios de aceptación

- [ ] Las 73 entradas actuales están mapeadas al contrato o señalan datos concretos por confirmar; inventario regenerable al agregar líneas.
- [ ] Ventana y puerta de una misma línea tienen bases independientes y perfiles asociados con evidencia.
- [ ] Dos hojas móviles y fijo+móvil nunca se resuelven entre sí por compartir el número 2.
- [ ] Todas las composiciones documentadas se pueden descubrir aunque no exista pauta todavía.
- [ ] EKO 130 conserva sus ocho referencias sin ofrecer aperturas/composiciones atribuidas al fabricante que la fuente revisada no documenta.
- [ ] Una configuración privada puede completarse con datos explícitos del taller y reaparecer en su cotización.
- [ ] Cambiar de configuración no modifica otra receta ni pierde el borrador anterior.
- [ ] Perfil agregado/editado/eliminado mantiene el cambio al reabrir; una eliminación incompatible actualiza pendientes.
- [ ] Una receta con identidad incompatible nunca produce snapshot para la selección actual.
- [ ] Cambiar una receta no reescribe snapshots históricos ni precios comerciales.
- [ ] Catálogo de compra cruza familia/código/acabado/presentación; referencias sin precio conservan estado pendiente.
- [ ] No cambian los resultados de variantes validadas ni el contenido comercial del PDF.
- [ ] Una próxima línea utiliza el contrato y componentes comunes sin un bloque especial por proveedor en el Paso 1.

## 10. Estado de esta revisión

Se inspeccionaron código, documentos y la página PDF de EKO; se inventariaron fixtures locales. No se consultaron recetas privadas de organizaciones ni se auditaron todos los manuales de las 73 entradas. La matriz no determina por sí sola cobertura total de despiece.

### Implementado localmente

- El editor móvil consume configuraciones catalogadas; dejó de ofrecer el selector universal de tipologías y cantidades de hojas sin fuente.
- El wizard orienta con una frase breve por paso. Las referencias de perfiles se consultan y agregan en “Perfiles y descuentos”, donde son accionables; el Paso 1 conserva solo un aviso contextual de una línea.
- Una configuración catalogada crea su propia receta borrador. Cambiar configuración guarda el borrador previo y no arrastra sus perfiles ni descuentos.
- Si el catálogo no documenta la composición, el maestro la declara para su taller después de elegir el componente/sistema; queda marcada como pendiente de confirmar y no se atribuye al fabricante.
- Las líneas sin configuración catalogada pueden declarar en su taller componente, apertura y composición; quedan como configuración privada con receta pendiente.
- Los perfiles agregados desde referencias conservan pendientes explícitos para base, descuento y cantidad. El maestro debe completarlos antes de obtener cortes fiables.
- La identidad de configuración/composición se conserva en metadatos del ítem y llega al resolver de despiece; una composición explícita incompatible se descarta.
- El contexto de cotización usa pares exactos publicados y evita escoger la primera receta cuando hay varias composiciones posibles.

### Pendiente para cerrar la integración universal

- Declarar y revisar las 73 entradas del catálogo: sistema, componente y composiciones permitidas con evidencia o pendientes concretos.
- Incorporar composición (disposición de hojas/paños), perfiles por rol y reglas documentadas por configuración. Las referencias EKO revisadas no acreditan descuentos ni sistemas.
- Ofrecer elección de composición inequívoca en Guiada/Constructor cuando una línea tenga varias recetas.
- Completar pruebas numéricas independientes, casos negativos de selección, `pnpm fabrication:verify --build` y smoke autorizado en navegador. Esta pasada no ejecutó suites ni build.

El cambio local establece el contrato y sus primeros puentes; no modifica base de datos ni afirma que la integración universal esté terminada. Las recetas creadas por el maestro siguen pendientes de revisión/validación según sus fuentes y reglas reales.
