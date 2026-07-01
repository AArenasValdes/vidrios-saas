# KPI Dictionary - Ventora

Este diccionario define las metricas del Growth OS.

Metrica principal vigente:

**No optimizar por vistas. Medir mensajes recibidos -> demos -> pruebas iniciadas -> primera cotizacion creada -> pagos.**

Cada KPI tiene:

- definicion
- formula
- fuente de datos
- frecuencia de revision
- umbral saludable
- accion recomendada si esta bajo

---

## mensajes recibidos

- definicion: cantidad de conversaciones entrantes generadas por contenido, prospeccion o referidos
- formula: `count(mensajes_recibidos)`
- fuente de datos: registro manual de WhatsApp, Instagram, Facebook, formulario o CRM interno
- estado de medicion: manual hoy
- frecuencia de revision: semanal
- umbral saludable: tendencia creciente con calidad suficiente para clasificar
- accion si esta bajo: revisar dolor, demostracion y CTA unico de cada pieza

## pruebas iniciadas

- definicion: cantidad de usuarios que comenzaron una prueba guiada despues de demo o conversacion
- formula: `count(pruebas_iniciadas)`
- fuente de datos: registro comercial manual; no existe tabla nativa hoy
- estado de medicion: manual hoy, nativo requiere implementacion
- frecuencia de revision: semanal
- umbral saludable: `>= 1 por semana` en etapa inicial
- accion si esta bajo: cerrar cada demo con la accion "crear primera cotizacion hoy"

## primera cotizacion creada

- definicion: cantidad de usuarios de prueba que crean su primera cotizacion en Ventora
- formula: `count(usuarios_con_primera_cotizacion)`
- fuente de datos: `cotizaciones` filtrada por organizacion/usuario y fecha de prueba, o registro manual mientras no exista atribucion robusta
- estado de medicion: parcial hoy
- frecuencia de revision: semanal
- umbral saludable: `>= 70%` de pruebas iniciadas
- accion si esta bajo: simplificar onboarding, usar datos reales del maestro y acompanar la primera cotizacion el mismo dia

---

## leads encontrados

- definicion: cantidad de prospectos nuevos registrados en una ventana de tiempo
- formula: `count(prospectos_nuevos)`
- fuente de datos: CSV o JSON de prospeccion
- estado de medicion: manual hoy
- frecuencia de revision: semanal
- umbral saludable: `>= 20 por semana`
- accion si esta bajo: ampliar fuentes, bajar friccion de investigacion y asignar mas tiempo de lunes

## leads contactados

- definicion: cantidad de prospectos que recibieron un primer contacto manual
- formula: `count(contactos_enviados)`
- fuente de datos: CSV o JSON de prospeccion
- estado de medicion: manual hoy
- frecuencia de revision: semanal
- umbral saludable: `>= 10 por semana`
- accion si esta bajo: simplificar mensaje base y reducir tiempo de preparacion por lead

## tasa de respuesta

- definicion: porcentaje de leads contactados que responden
- formula: `respuestas / leads_contactados`
- fuente de datos: CSV o JSON de prospeccion
- estado de medicion: manual hoy
- frecuencia de revision: semanal
- umbral saludable: `>= 20%`
- accion si esta bajo: revisar fit del lead, mensaje y canal

## conversaciones reales

- definicion: respuestas que pasan de una interaccion minima a una conversacion comercial util
- formula: `count(respuestas_calificadas)`
- fuente de datos: registro manual de prospeccion
- estado de medicion: manual hoy
- frecuencia de revision: semanal
- umbral saludable: `>= 5 por semana`
- accion si esta bajo: refinar targeting y CTA de primer contacto

## demos agendadas

- definicion: cantidad de demos con fecha y hora comprometida
- formula: `count(demos_agendadas)`
- fuente de datos: registro comercial manual
- estado de medicion: manual hoy
- frecuencia de revision: semanal
- umbral saludable: `>= 2 por semana`
- accion si esta bajo: mejorar cierre de mensaje y follow-up

## demos realizadas

- definicion: demos efectivamente ejecutadas
- formula: `count(demos_realizadas)`
- fuente de datos: registro comercial manual
- estado de medicion: manual hoy
- frecuencia de revision: semanal
- umbral saludable: `>= 75% de las agendadas`
- accion si esta bajo: confirmar antes, acortar demo y reforzar valor previo

## pilotos iniciados

- definicion: cantidad de empresas que comenzaron un piloto real de 7 dias
- formula: `count(pilotos_iniciados)`
- fuente de datos: tablero comercial manual; no existe tabla nativa hoy
- estado de medicion: manual hoy, nativo requiere implementacion
- frecuencia de revision: semanal
- umbral saludable: `>= 1 por semana` en etapa inicial
- accion si esta bajo: cerrar la demo con siguiente paso concreto y oferta simple

## clientes pagados

- definicion: pilotos o prospectos que pasan a plan mensual o anual
- formula: `count(clientes_pagados_nuevos)`
- fuente de datos: registro comercial y estado de cuenta; no existe estado nativo de pago en el producto
- estado de medicion: manual hoy, nativo requiere implementacion
- frecuencia de revision: semanal y mensual
- umbral saludable: `>= 1 al mes` en etapa temprana
- accion si esta bajo: revisar activacion, objeciones y pricing

## MRR

- definicion: ingreso recurrente mensual activo
- formula: `sum(plan_mensual_equivalente_clientes_activos)`
- fuente de datos: registro manual de clientes pagados y plan contratado
- estado de medicion: manual hoy
- frecuencia de revision: semanal y mensual
- umbral saludable: crecimiento neto positivo mes a mes
- accion si esta bajo: empujar conversion y revisar churn

## ARR

- definicion: ingreso recurrente anualizado
- formula: `MRR * 12`
- fuente de datos: derivado de MRR
- estado de medicion: manual hoy
- frecuencia de revision: mensual
- umbral saludable: tendencia creciente sostenida
- accion si esta bajo: aumentar base pagada o ticket anual

## conversion contacto -> respuesta

- definicion: capacidad del mensaje de abrir conversacion
- formula: `respuestas / leads_contactados`
- fuente de datos: CSV o JSON de prospeccion
- estado de medicion: manual hoy
- frecuencia de revision: semanal
- umbral saludable: `>= 20%`
- accion si esta bajo: cambiar copy, canal o perfil objetivo

## conversion respuesta -> demo

- definicion: porcentaje de respuestas que se convierten en demo
- formula: `demos_agendadas / respuestas`
- fuente de datos: registro comercial
- estado de medicion: manual hoy
- frecuencia de revision: semanal
- umbral saludable: `>= 35%`
- accion si esta bajo: mejorar CTA y filtro del mensaje inicial

## conversion demo -> piloto

- definicion: porcentaje de demos realizadas que activan piloto
- formula: `pilotos_iniciados / demos_realizadas`
- fuente de datos: registro comercial
- estado de medicion: manual hoy
- frecuencia de revision: semanal
- umbral saludable: `>= 40%`
- accion si esta bajo: simplificar piloto y cerrar con siguiente paso en la demo

## conversion piloto -> pago

- definicion: porcentaje de pilotos que terminan pagando
- formula: `clientes_pagados / pilotos_iniciados`
- fuente de datos: registro comercial y activacion
- estado de medicion: manual hoy
- frecuencia de revision: mensual
- umbral saludable: `>= 50%`
- accion si esta bajo: revisar onboarding, primer valor y seguimiento durante piloto

## tiempo a primera respuesta

- definicion: tiempo entre ingreso de solicitud y primera respuesta util
- formula: `contactada_at - creado_en`
- fuente de datos: `solicitudes_contacto.contactada_at` si el equipo actualiza estado/contacto de forma consistente
- estado de medicion: parcial hoy
- frecuencia de revision: diaria y semanal
- umbral saludable: `< 5 minutos` en horario laboral
- accion si esta bajo: ajustar ritual operativo, alertas y ownership

## tiempo a cotizacion

- definicion: tiempo desde solicitud hasta primera cotizacion enviada
- formula: `cotizacion_enviada_en - solicitud_creada_en`
- fuente de datos: no hay relacion persistida y confiable hoy entre solicitud y primera cotizacion enviada
- estado de medicion: requiere implementacion
- frecuencia de revision: semanal
- umbral saludable: `< 24 horas` para casos simples
- accion si esta bajo: simplificar prefill y acelerar workflow de nueva cotizacion

## ticket promedio

- definicion: ingreso promedio por cliente pagado
- formula: `ingresos_totales / clientes_pagados`
- fuente de datos: registro comercial
- estado de medicion: manual hoy
- frecuencia de revision: mensual
- umbral saludable: consistente con pricing objetivo mensual/anual
- accion si esta bajo: revisar mezcla mensual/anual y upsell permitido

## churn estimado

- definicion: porcentaje estimado de clientes que dejan de pagar en el periodo
- formula: `clientes_perdidos / clientes_activos_inicio_periodo`
- fuente de datos: registro comercial y soporte
- estado de medicion: manual hoy
- frecuencia de revision: mensual
- umbral saludable: `< 5% mensual` en etapa temprana
- accion si esta bajo: llamar a clientes en riesgo y reforzar activacion continua

## activacion de usuario

- definicion: porcentaje de nuevos clientes que completan el primer circuito de valor
- formula: `clientes_activados / clientes_nuevos`
- fuente de datos: hoy solo puede inferirse manualmente o por campos de `organization_profile`, solicitudes y cotizaciones; una medicion robusta requiere tabla/eventos de onboarding
- estado de medicion: parcial hoy, robusto requiere implementacion
- frecuencia de revision: semanal
- umbral saludable: `>= 70%`
- accion si esta bajo: revisar onboarding guiado, copy y fricciones en configuracion
