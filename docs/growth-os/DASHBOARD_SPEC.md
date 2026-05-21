# Dashboard Spec - Ventora Growth OS

## Objetivo

Definir el contrato funcional del dashboard HTML de crecimiento para Ventora.

## Estructura visual

1. encabezado con periodo, foco del mes y filtros
2. tarjetas KPI
3. embudo comercial
4. tablas por canal y region
5. proyeccion 30/60/90 dias
6. semaforo comercial semanal
7. tabla de experimentos
8. tabla de prospectos
9. recomendaciones automaticas

## Dataset esperado

El dashboard debe poder recibir como minimo:

- periodo
- objetivos del mes
- prospectos con fecha, canal, region, estado y prioridad
- conteos del embudo
- clientes pagados y valor mensual equivalente
- experimentos activos
- acciones recomendadas

## Graficos

Graficos minimos requeridos:

- barras horizontales para embudo
- barras por canal
- barras por region
- linea o bloques de proyeccion MRR 30/60/90

No usar librerias externas obligatorias.

## Tarjetas KPI

Minimo:

- leads encontrados
- leads contactados
- tasa de respuesta
- conversaciones reales
- demos agendadas
- pilotos activos
- clientes pagados
- MRR

Cada KPI debe indicar su estado de medicion:

- `nativa`: medible hoy con datos del producto
- `manual`: depende de CSV, JSON o registro comercial externo
- `parcial`: existe una aproximacion hoy, pero no una medicion robusta
- `pendiente`: requiere implementacion

## Filtros

El dashboard debe permitir filtrar por:

- fecha
- canal
- region

## Semaforo comercial

Estados sugeridos:

- verde: se cumple o supera meta
- amarillo: cerca de meta
- rojo: bajo el umbral saludable

Debe aplicar al menos a:

- respuesta
- demos
- pilotos
- activacion

## Proyeccion 30/60/90 dias

La proyeccion debe mostrar:

- clientes pagados estimados
- MRR estimado
- ARR derivado

## Tabla de experimentos

Campos minimos:

- nombre
- hipotesis
- owner
- estado
- KPI
- fecha de revision

## Tabla de prospectos

Campos minimos:

- empresa
- rubro
- region
- canal
- prioridad
- estado
- siguiente paso

## Recomendaciones automaticas

El dashboard debe traducir datos a accion. Ejemplos:

- `Tasa de respuesta baja: revisar mensaje inicial o fit del lead`
- `Pocos pilotos: reforzar cierre de demo`
- `RM domina volumen: abrir test en V region o Biobio`

## Regla de honestidad operativa

El dashboard no debe presentar como nativa una metrica que hoy solo existe en registro manual o mock.

## Regla obligatoria

Debe ser un archivo HTML standalone, responsive, editable y sin dependencia de build.
