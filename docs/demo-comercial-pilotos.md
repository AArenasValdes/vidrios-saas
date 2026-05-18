# Demo comercial Ventora para clientes piloto

Actualizado: 2026-05-17

## Objetivo

Mostrar en menos de 10 minutos que Ventora ayuda a:

1. captar una consulta mientras la empresa esta ocupada
2. centralizarla sin perderla
3. responder rapido por WhatsApp
4. convertirla en cotizacion
5. compartir un presupuesto profesional
6. registrar si el cliente avanza o no

Ventora no se presenta como ERP ni como cotizador tecnico.
Se presenta como herramienta comercial para captar, ordenar, cotizar y cerrar mas trabajos.

---

## Flujo recomendado de demo

### Preparacion de escena

- Usa 2 sesiones separadas:
  - sesion vendedor autenticada en Ventora
  - sesion cliente en incognito o en otro telefono
- Mantén abiertas estas rutas:
  - pagina publica: `/solicitud/[empresa]`
  - bandeja comercial: `/solicitudes`
  - nueva cotizacion: `/cotizaciones/nueva`
  - listado de cotizaciones: `/cotizaciones`
- Si puedes, deja una pestaña adicional lista para abrir el link publico `/presupuesto/[token]`.

### Guion de 8 a 10 minutos

#### 0. Apertura - 45 segundos

Mensaje:

> La mayoria de las vidrierias no pierde trabajos por falta de tecnica, los pierde porque las consultas llegan desordenadas, se responden tarde o quedan perdidas en WhatsApp. Ventora ordena ese tramo comercial completo.

#### 1. Pagina publica por empresa - 1 minuto

Ruta:

- `/solicitud/[empresa]`

Que mostrar:

- branding de la empresa
- trabajos/galeria
- horario
- boton de WhatsApp
- formulario de solicitud

Que decir:

> Cada empresa tiene su propia pagina lista para compartir. Sirve para captar consultas incluso cuando nadie puede responder al instante.

#### 2. Envio de solicitud por cliente - 1 minuto

Desde la sesion cliente:

- completa nombre
- WhatsApp
- tipo de trabajo
- medidas
- comuna
- mensaje
- consentimiento

Accion:

- enviar solicitud

Resultado esperado:

- mensaje de exito: `Solicitud enviada. Te contactaremos por WhatsApp para continuar.`

Que decir:

> El cliente no necesita llamar ni esperar. Deja su solicitud y la empresa la recibe ordenada, con contexto.

#### 3. Recepcion del lead en bandeja - 1 minuto

Ruta:

- `/solicitudes`

Que mostrar:

- nueva solicitud al tope
- estado `Nueva`
- origen del lead
- tipo de trabajo
- mensaje del cliente

Que decir:

> En lugar de perder la consulta en mensajes sueltos, entra a una bandeja comercial centralizada.

#### 4. Contacto por WhatsApp - 45 segundos

Accion:

- clic en `Contactar por WhatsApp`

Resultado esperado:

- se abre WhatsApp con mensaje armado

Que decir:

> El vendedor responde desde su canal real de venta, pero ya no parte desde cero ni buscando datos.

#### 5. Crear cotizacion desde la solicitud - 1 minuto

Accion:

- desde `/solicitudes`, clic en `Crear cotizacion`

Resultado esperado:

- apertura de `/cotizaciones/nueva`
- prefill con nombre, telefono, tipo de trabajo y contexto de la solicitud

Que decir:

> Ventora toma la consulta y la convierte en una cotizacion sin reescribir los datos.

#### 6. Guardar cotizacion y abrir PDF - 2 minutos

Ruta:

- `/cotizaciones/nueva`

Que mostrar:

- cliente y obra ya precargados
- items simples listos para la demo
- accion `Guardar presupuesto`
- apertura de PDF

Recomendacion:

- usa una cotizacion de 1 o 2 items maximo
- evita editar demasiados campos durante la demo

Que decir:

> La cotizacion aqui no es el producto completo. Es la herramienta para avanzar la oportunidad y cerrarla mejor.

#### 7. Compartir link publico - 45 segundos

Rutas:

- `/cotizaciones/[id]` o `/cotizaciones`

Acciones:

- `Copiar link` o compartir por WhatsApp

Resultado esperado:

- el presupuesto queda compartible por `/presupuesto/[token]`
- al compartir por WhatsApp, la cotizacion puede pasar a `Enviada`

Que decir:

> El cliente puede revisar el presupuesto desde un link limpio, sin pedirle que entre a un sistema.

#### 8. Presupuesto publico y respuesta del cliente - 1 minuto

Ruta:

- `/presupuesto/[token]`

Que mostrar:

- total
- resumen del alcance
- boton `Ver` o `Descargar` PDF
- botones `Aprobar presupuesto` y `Prefiero revisarlo`

Haz una de estas dos demos:

- demo principal: aprobar
- demo alternativa: rechazar para mostrar seguimiento

Que decir:

> Aqui el cliente revisa la propuesta y responde desde el mismo enlace. La respuesta queda registrada al instante.

#### 9. Estado comercial actualizado - 45 segundos

Vuelve a:

- `/cotizaciones`
- y si quieres, `/cotizaciones/[id]`

Que mostrar:

- estado `Aprobada` o `Rechazada`
- en detalle, el presupuesto ya no queda solo como enviado

Vuelve tambien a:

- `/solicitudes`

Que mostrar:

- la solicitud asociada en `Cotizacion creada` si ya se genero el presupuesto

Cierre:

> En menos de 10 minutos viste el recorrido completo: entra la consulta, se ordena, se responde, se cotiza y queda claro si el cliente avanzo o no.

---

## Datos demo recomendados

## Empresa demo

Usa una empresa ficticia pero creible. Recomendacion:

- Nombre: `Vidrios Rivera`
- Slug publico: `vidrios-rivera`
- Ciudad/zona visible: `Santiago Sur`
- WhatsApp empresa: un numero real de prueba que puedas abrir durante la demo
- Email empresa: `contacto@vidriosrivera.cl`
- Estado de publicacion: pagina publica activa

## Copy recomendado para la pagina publica

### Hero

- Titulo: `Cotiza tus ventanas, shower o cierres sin esperar respuesta inmediata`
- Subtitulo: `Recibimos tu solicitud, la ordenamos y te contactamos por WhatsApp con una propuesta clara.`

### Formulario

- Titulo: `Cuéntanos que necesitas`
- Subtitulo: `Deja tus datos y te contactamos por WhatsApp para revisar medidas, opciones y tiempos.`

### Mensaje de confianza

- `Tu solicitud llega directo al equipo comercial.`

### Valor corto

- `Cotizacion clara, seguimiento ordenado y respuesta comercial mas rapida.`

## Servicios visibles recomendados

Muestra solo 4 a 6 servicios faciles de entender:

- Ventanas de aluminio
- Shower door
- Cierres de terraza
- Mamparas
- Termopanel

## Galeria recomendada

- 3 a 5 imagenes maximo
- trabajos terminados y visualmente claros
- evita fotos oscuras, obra en proceso o imagenes demasiado tecnicas

## Lead demo recomendado

- Nombre: `Carolina Mella`
- WhatsApp: un numero real de prueba o uno controlado por ti
- Tipo de trabajo: `Cierre de terraza`
- Medidas: `3,20 m x 2,10 m`
- Comuna: `La Florida`
- Mensaje: `Quiero cerrar mi terraza antes del invierno. Me interesa una opcion sobria y facil de mantener.`

## Cotizacion demo recomendada

Haz una cotizacion simple, comercial y facil de explicar:

- Cliente: `Carolina Mella`
- Obra: `Cierre de terraza La Florida`
- Items: 1 o 2
- Ejemplo item 1: `Cierre de terraza linea comercial`
- Ejemplo item 2: `Puerta corredera de acceso`
- Vigencia: 15 dias
- Nota comercial sugerida:
  - `Incluye visita de confirmacion, fabricacion e instalacion. Tiempos sujetos a validacion final en terreno.`

## Monto demo recomendado

- usa un total facil de recordar y verbalizar
- rango sugerido: `CLP 1.200.000` a `CLP 2.400.000`
- evita montos demasiado bajos porque le quitan seriedad

## Escenario de respuesta del cliente

Prepara 2 variantes:

- principal: aprobacion para cerrar en alto
- respaldo: rechazo para mostrar que igual queda trazabilidad comercial

---

## Checklist antes de presentar

## Configuracion

- confirmar que la empresa demo tenga `slug` publico correcto
- confirmar que la pagina publica este publicada
- confirmar que haya logo y color de marca visibles
- confirmar que el telefono de empresa abra WhatsApp correctamente
- confirmar que la galeria tenga 3 a 5 imagenes presentables

## Datos

- limpiar solicitudes antiguas o dejar solo las que no confundan
- dejar una solicitud previa si quieres mostrar historial, pero que no tape la nueva
- dejar un cliente demo consistente con la solicitud
- dejar lista una cotizacion borrador de respaldo por si falla el flujo en vivo

## Flujo

- probar que `Crear cotizacion` desde `/solicitudes` abra `/cotizaciones/nueva` con prefill
- probar que `Guardar presupuesto` funcione con los items demo
- probar que el PDF abra rapido
- probar que `Copiar link` funcione
- probar que `/presupuesto/[token]` cargue desde sesion no autenticada
- probar que `Aprobar presupuesto` y `Prefiero revisarlo` registren respuesta

## Tecnico

- hacer la demo con `build + start`, no con `dev`
- usar buena conexion o red estable
- abrir la sesion cliente en incognito o en otro equipo
- tener WhatsApp Desktop o Web ya autenticado
- desactivar notificaciones o pestañas que distraigan

## Pestañas recomendadas

- pestaña 1: `/solicitud/[empresa]`
- pestaña 2: `/solicitudes`
- pestaña 3: `/cotizaciones`
- pestaña 4: WhatsApp Web

---

## Riesgos que debes probar antes

## Riesgos de captacion

- la pagina publica no carga porque el slug no coincide
- la pagina no aparece porque la empresa no esta publicada
- el formulario rechaza el WhatsApp por formato invalido
- el rate limit bloquea pruebas repetidas desde la misma IP

## Riesgos de centralizacion

- la solicitud entra pero no aparece primera en `/solicitudes`
- el origen/UTM llega vacio y no puedes explicar el canal
- el boton de WhatsApp no arma bien el numero o el mensaje

## Riesgos de cotizacion

- el prefill desde solicitud no pasa nombre, telefono u obra
- la nueva cotizacion requiere demasiados clics para la demo
- el PDF demora mucho o no abre en el navegador usado

## Riesgos de cierre

- el link publico no copia o no abre desde incognito
- el token del presupuesto usado para demo ya no es el vigente
- el cliente aprueba/rechaza pero el estado no se refresca en `/cotizaciones`
- la solicitud queda en `Nueva` o `Contactada` aunque ya mostraste cotizacion creada

## Riesgos de narrativa

- caer en una explicacion tecnica de componentes, lineas o formulas
- vender Ventora como ERP, taller o sistema de produccion
- dedicar demasiado tiempo al armado de la cotizacion en vez del flujo comercial completo

---

## Discurso comercial breve

Version corta de 20 a 30 segundos:

> Ventora ayuda a empresas de vidrios y aluminio a captar consultas, ordenarlas en un solo lugar, responder mas rapido por WhatsApp y convertirlas en cotizaciones que se pueden compartir y cerrar mejor.

Version de 45 a 60 segundos:

> Ventora no busca reemplazar como fabricas ni como instalas. Resuelve el tramo comercial que mas se pierde: las consultas que llegan cuando estas ocupado, las conversaciones desordenadas y el poco seguimiento despues del primer contacto. Con Ventora la consulta entra por una pagina propia, queda centralizada, se responde por WhatsApp, se transforma en cotizacion y se registra si el cliente avanza o no. Eso te ayuda a perder menos oportunidades y cerrar mas trabajos con menos desorden.

---

## Frases utiles durante la demo

- `Esto capta mientras estas en terreno o fuera de horario.`
- `La gracia no es solo cotizar; es que la consulta no se pierda.`
- `El vendedor sigue usando WhatsApp, pero ya con contexto y orden.`
- `El cliente responde desde un link simple, no desde un sistema complejo.`
- `Aqui ya no dependes de memoria ni de chats sueltos para saber en que quedo cada oportunidad.`

---

## Orden sugerido para una demo comercial fuerte

1. problema real del rubro
2. pagina publica y captura
3. bandeja de solicitudes
4. WhatsApp
5. cotizacion
6. PDF y link
7. aprobacion o rechazo
8. estado comercial final

Si el tiempo aprieta, recorta configuracion y detalle tecnico. Nunca recortes captura, centralizacion, WhatsApp y cierre.
