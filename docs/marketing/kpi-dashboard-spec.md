# KPI Dashboard Spec - Ventora

## Objetivo

Definir que debe medir cualquier dashboard comercial o de growth para Ventora y como debe presentarse.

## KPIs base

- leads encontrados
- leads contactados
- respuestas
- conversaciones reales
- demos agendadas
- pilotos activos
- pilotos convertidos a pago
- CAC estimado
- conversion contacto -> respuesta
- conversion respuesta -> demo
- conversion demo -> piloto
- conversion piloto -> pago

## KPIs complementarios

- tiempo a primera respuesta
- canal de origen
- objecion principal
- dias promedio a demo
- dias promedio a piloto
- cantidad de cotizaciones creadas por piloto

## Formulas sugeridas

- `conversion contacto -> respuesta = respuestas / leads contactados`
- `conversion respuesta -> demo = demos agendadas / respuestas`
- `conversion demo -> piloto = pilotos activos / demos agendadas`
- `conversion piloto -> pago = pilotos convertidos a pago / pilotos activos`
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

- prospectos
- contactos
- respuestas
- demos
- pilotos
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

Si un agente propone metricas o dashboards, debe entregar tambien una version HTML simple y editable.
