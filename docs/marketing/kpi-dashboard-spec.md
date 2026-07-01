# KPI Dashboard Spec - Ventora

## Objetivo

Definir que debe medir cualquier dashboard comercial o de growth para Ventora y como debe presentarse.

## KPIs base

- mensajes recibidos
- demos
- pruebas iniciadas
- primera cotizacion creada
- pagos
- conversion mensaje -> demo
- conversion demo -> prueba
- conversion prueba -> primera cotizacion
- conversion primera cotizacion -> pago

## KPIs complementarios

- tiempo a primera respuesta
- canal de origen
- objecion principal
- dias promedio a demo
- dias promedio a prueba guiada
- dias promedio a primera cotizacion creada
- cantidad de cotizaciones creadas por prueba

## Formulas sugeridas

- `conversion mensaje -> demo = demos / mensajes recibidos`
- `conversion demo -> prueba = pruebas iniciadas / demos`
- `conversion prueba -> primera cotizacion = primeras cotizaciones creadas / pruebas iniciadas`
- `conversion primera cotizacion -> pago = pagos / primeras cotizaciones creadas`
- `CAC estimado = costo total del periodo / clientes pagados`

## Estructura del dashboard HTML

Todo dashboard debe incluir:

1. resumen del periodo
2. tarjetas KPI
3. tabla de embudo
4. tabla por canal
5. lista de acciones de la semana
6. bloque de aprendizajes u objeciones

## Requisitos del HTML

- simple
- bonito
- responsive
- editable a mano
- legible en mobile
- sin dependencias pesadas

## Secciones sugeridas

### Hero

- nombre del reporte
- periodo
- objetivo del mes

### Tarjetas KPI

- 6 a 8 metricas clave

### Embudo

- mensajes recibidos
- demos
- pruebas iniciadas
- primera cotizacion creada
- pagos

### Canales

- Facebook
- Instagram
- Google Maps
- TikTok
- web local
- referidos

### Acciones

- tareas completadas
- tareas pendientes

## Fuentes de datos

- CSV de prospeccion
- JSON de seguimiento
- eventos del producto
- notas manuales del equipo

## Regla obligatoria

No optimizar por vistas. Si un agente propone metricas o dashboards, debe priorizar mensajes recibidos -> demos -> pruebas iniciadas -> primera cotizacion creada -> pagos y entregar tambien una version HTML simple y editable.
