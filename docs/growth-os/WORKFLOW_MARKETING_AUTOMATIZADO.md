# Workflow de Marketing Automatizado y Medible - Ventora

Estado: vigente  
Actualizado: 2026-09-06  
Responsable: Growth OS + marketing Ventora

Este workflow une contenido, medicion, conversaciones, demos, pilotos y conversion. Su objetivo es dejar de decidir por intuicion o solo por vistas.

## 1. Objetivo

Mover prospectos desde contenido organico hasta una primera cotizacion creada y, cuando exista ajuste, un piloto o pago.

El embudo operativo es:

`contenido -> mensaje -> conversacion -> demo -> prueba -> primera cotizacion -> pago`

## 2. Disparador

Ejecutar en cualquiera de estos casos:

- inicio de cada semana;
- publicacion de una nueva pieza;
- llegada de un mensaje desde TikTok, Instagram, Facebook o WhatsApp;
- seguimiento pendiente;
- revision semanal de metricas.

## 3. Entradas

### Contenido

- video vertical o carrusel real;
- un solo dolor del rubro;
- una demostracion concreta de Ventora;
- un CTA unico: `Te muestro una cotizacion real`;
- `content_id`, canal, fecha, hook y campana.

### Registro de publicacion

Usar `docs/marketing/PLANILLA_CONTENIDO_VENTORA.csv` con estos datos como minimo:

`id, fecha_publicacion, canal, formato, tema, audiencia, hook, cta, utm_campaign, utm_content, estado`

### Registro comercial

Usar el CSV o JSON de prospeccion existente para cada persona que responda:

`fecha, empresa, rubro, ciudad, contacto, canal, url_fuente, dolor_detectado, estado, proximo_paso, fecha_seguimiento, notas`

## 4. Lectura obligatoria

- `AGENTS_MARKETING.md`
- `docs/growth-os/AGENTS_GROWTH_OS.md`
- `docs/growth-os/WORKFLOW_STANDARD.md`
- `docs/growth-os/KPI_DICTIONARY.md`
- `docs/growth-os/SOP_CONTENIDO.md`
- `docs/growth-os/SOP_CONVERSION.md`
- `docs/marketing/PLANILLA_CONTENIDO_VENTORA.csv`

## 5. Pasos

### A. Planificar la semana - domingo o lunes

Responsable: marketing.

1. Elegir un subrubro o dolor: vidrieria, aluminio, PVC, shower, termopanel o cierres.
2. Preparar 3 videos cortos y 1 carrusel.
3. Publicar cada pieza por separado en TikTok, Instagram y Facebook.
4. No usar Stories como parte del objetivo principal durante esta etapa.
5. Crear un `content_id` unico por pieza y mantener el mismo `utm_campaign`.

Automatizable: plantilla de contenido, captions, nomenclatura y calendario.  
Manual: revisar que la grabacion no exponga datos personales y subir cada pieza.

### B. Publicar y medir - dia de publicacion

Responsable: marketing.

1. Subir el video limpio, sin marca de agua de otra plataforma.
2. Mantener el hook visible durante el primer segundo.
3. Usar subtitulos legibles y no tapar la interfaz.
4. Registrar hora y canal en la planilla.
5. Repetir la publicacion en los tres canales sin cambiar la promesa principal.

Registrar despues de 24 y 72 horas:

- alcance o reproducciones;
- retencion inicial y reproducciones completas;
- compartidos y guardados;
- visitas al perfil;
- mensajes recibidos;
- demos, pruebas, primeras cotizaciones y pagos atribuidos.

Nota: las metricas sociales son manuales hoy. No presentarlas como datos nativos de Ventora.

### C. Clasificar mensajes - dentro de 5 minutos en horario laboral

Responsable: conversion.

1. Registrar canal y `content_id` si la persona viene de una pieza.
2. Identificar rubro, forma actual de cotizar y dolor principal.
3. Responder con una pregunta, no con un bloque largo.

Mensaje base:

```text
Hola [nombre]. Gracias por escribirme. ¿Hoy cotizas principalmente desde el celular en terreno o al final del dia desde computador?
```

4. Si hay dolor real, ofrecer una demo breve:

```text
Te muestro una cotizacion real y como queda lista para enviar por WhatsApp. Toma unos 7 minutos.
```

### D. Ejecutar demo - 5 a 10 minutos

Responsable: conversion.

Mostrar solo este circuito:

1. trabajo o cliente;
2. pieza, medidas y cantidad;
3. linea y precio comercial;
4. cotizacion clara;
5. PDF profesional;
6. envio o preparacion para WhatsApp.

No presentar Ventora como ERP, software de fabricacion, optimizador de cortes, nesting, CNC o cubicador universal.

### E. Activar prueba - mismo dia

Responsable: onboarding + conversion.

Meta minima:

- primera cotizacion creada;
- primer PDF generado;
- siguiente paso acordado.

Si el taller pregunta por fabricacion, aclarar que cualquier pauta es interna, configurada por la empresa y revisable desde computador.

### F. Seguimiento

Responsable: conversion.

- 48 horas: preguntar si pudo crear la primera cotizacion.
- dia 7: revisar uso y friccion.
- dia 12 o 13: preparar decision antes del vencimiento del piloto.
- dia 15: ofrecer el plan adecuado o cerrar el piloto sin insistir.

No hacer mas de dos seguimientos sin una respuesta contextual.

### G. Revisar y decidir - viernes

Responsable: operativa.

Revisar el embudo completo, no solo las vistas:

`mensajes -> demos -> pruebas -> primera cotizacion -> pagos`

Aplicar estas decisiones:

| Señal | Diagnostico probable | Accion siguiente |
|---|---|---|
| pocas reproducciones iniciales | hook debil o pieza poco clara | probar otro hook con el mismo cuerpo |
| reproducciones pero pocos mensajes | CTA o dolor poco concreto | mostrar resultado y cambiar CTA |
| mensajes pero pocas demos | respuesta o clasificacion confusa | usar pregunta corta y demo de 7 minutos |
| demos pero pocas pruebas | valor poco aterrizado | cerrar creando la primera cotizacion |
| pruebas pero pocas primeras cotizaciones | friccion de onboarding | acompanamiento y datos reales del taller |
| primeras cotizaciones pero pocos pagos | valor o seguimiento insuficiente | revisar uso, objeciones y plan |

Cambiar una sola variable por experimento: hook, formato, audiencia, CTA o demostracion.

## 6. Salida

Al cerrar cada ciclo deben existir:

- planilla de contenido actualizada;
- registro de mensajes y prospectos;
- metricas de 24 y 72 horas;
- demos y pruebas con siguiente paso;
- primera cotizacion y pago atribuidos cuando corresponda;
- un aprendizaje semanal;
- una sola accion priorizada para la siguiente semana.

## 7. KPI

KPI principal:

`mensajes recibidos -> demos -> pruebas -> primera cotizacion -> pagos`

KPI complementarios:

- retencion de los primeros 3 segundos;
- reproducciones completas;
- compartidos y guardados;
- tiempo a primera respuesta;
- conversion mensaje -> demo;
- conversion demo -> prueba;
- conversion prueba -> primera cotizacion;
- conversion primera cotizacion -> pago.

Las vistas sirven como contexto para diagnosticar alcance, no como objetivo final.

## 8. Siguiente accion

Cada viernes registrar:

```text
aprendizaje: [que observamos]
hipotesis: [por que pudo ocurrir]
experimento_siguiente: [una sola variable]
responsable: [persona]
fecha_revision: [fecha]
```

## 9. Criterios de detencion

Detener o rehacer una pieza si:

- expone nombres, telefonos, correos o datos de clientes;
- usa una promesa de mas clientes o mas ventas garantizadas;
- presenta una pauta referencial como corte exacto;
- intenta explicar todas las funciones en un solo video;
- genera vistas pero atrae consultas fuera del foco de Ventora;
- requiere spam o contacto masivo para sostenerse.

Detener un prospecto si no responde despues de dos seguimientos razonables o pide un ERP, produccion automatica o un cotizador tecnico universal.

## 10. Rutas afectadas

Ninguna. Este workflow usa registro operativo y canales externos. No agrega rutas, tablas ni automatizaciones dentro del producto.

## 11. QA

Antes de publicar:

- revisar datos sensibles en video, capturas y PDF;
- verificar que la pieza se entienda sin audio;
- confirmar un solo dolor, una demostracion y un CTA;
- validar que el texto coincida con lo que Ventora hace hoy;
- registrar `content_id`, canal y fecha.

Antes de cerrar una demo:

- confirmar que el PDF se genera correctamente;
- confirmar que WhatsApp o el enlace de cierre siguen funcionando;
- registrar el siguiente paso y la fecha.

## Nivel de automatizacion actual

### Disponible ahora

- plantillas de guion y caption;
- nomenclatura de contenido;
- planilla CSV y JSON;
- reglas de decision por KPI;
- recordatorios operativos manuales;
- reutilizacion de una pieza en tres canales.

### Pendiente de integracion

- importar automaticamente metricas de TikTok, Instagram y Facebook;
- consolidar mensajes sociales en un solo inbox;
- alertas automaticas por mensaje nuevo;
- atribucion robusta de contenido a primera cotizacion y pago.

No automatizar outreach frio por WhatsApp ni mensajes identicos masivos.
