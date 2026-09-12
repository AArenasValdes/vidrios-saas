# Prospecting System - Ventora

## Objetivo

Conseguir conversaciones, demos, pruebas guiadas y pagos con prospeccion manual de bajo costo, alta personalizacion y seguimiento disciplinado.

## Cliente objetivo

Prioridad inicial:

- vidrierias
- aluminio
- PVC
- shower door
- termopanel
- cierres de terraza
- instaladores que cotizan manualmente por metro cuadrado, precio directo, margen o valor final

Prioridad secundaria:

- usuarios con cotizador tecnico que necesitan convertir el calculo final en propuesta profesional, movil, enviable por WhatsApp y con seguimiento

## Fuentes para encontrar prospectos

- Google Maps
- Instagram
- Facebook Pages
- TikTok
- paginas web locales
- grupos publicos del rubro
- directorios de servicios locales

## Señales de buen prospecto

- publica trabajos o instalaciones recientes
- usa WhatsApp como canal principal
- menciona presupuestos, visitas a terreno o medidas por chat
- muestra trabajos profesionales pero propuestas poco formales
- atiende en terreno y probablemente cotiza al final del dia
- tiene presencia digital minima, pero activa

## Flujo operativo

1. Buscar cuentas y empresas del rubro por comuna o ciudad
2. Registrar cada hallazgo en CSV y JSON
3. Clasificar por prioridad
4. Enviar mensaje manual personalizado
5. Registrar respuesta o silencio
6. Hacer seguimiento corto y respetuoso
7. Llevar a demo corta con una cotizacion real
8. Activar prueba guiada
9. Lograr primera cotizacion creada el mismo dia
10. Hacer seguimiento antes del vencimiento
11. Ofrecer plan adecuado
12. Medir conversion

## Cadencia semanal

- lunes: construir lista y enriquecer datos
- martes a jueves: contacto y seguimiento
- viernes: revision de resultados
- sabado: mejoras del discurso y onboarding
- domingo: plan de la siguiente semana

## Volumen sugerido

Etapa inicial:

- 20 a 30 prospectos encontrados por semana
- 10 a 15 contactos manuales por semana
- 2 a 5 seguimientos por semana
- 1 a 3 demos por semana

## Plantilla de mensaje inicial

```text
Hola [nombre], vi [empresa/perfil] y note que trabajan [rubro/proyecto].
Estoy mostrando Ventora: una forma simple de cotizar desde el celular y enviar un PDF profesional sin llegar a casa a armar presupuestos.
Si te hace sentido, te muestro una cotizacion real en 7 minutos.
```

## Plantilla de seguimiento

```text
Hola [nombre], te escribo solo para retomar lo anterior.
Creo que Ventora puede servirles si hoy toman medidas o precios en WhatsApp y despues tienen que armar el presupuesto en computador.
Si quieres, te muestro como quedaria una cotizacion real para [rubro].
```

## Registros minimos

### CSV

`fecha,empresa,rubro,ciudad,contacto,canal,url_fuente,dolor_detectado,estado,proximo_paso,fecha_seguimiento,notas`

### JSON

```json
{
  "fecha": "2026-05-20",
  "empresa": "Vidrios Ejemplo",
  "rubro": "Shower door",
  "ciudad": "Santiago",
  "canal": "Instagram",
  "estado": "contactado",
  "proximo_paso": "seguimiento 3 dias"
}
```

## Reglas

- no spam
- no copiar y pegar bloques identicos a gran escala
- no insistir mas de lo razonable
- no automatizar cold outreach por WhatsApp al inicio
- siempre registrar el resultado

## Meta del sistema

No se busca volumen masivo. Se busca:

- entender el lenguaje del cliente
- detectar objeciones reales
- llevar interesados a demo y prueba guiada
- lograr primera cotizacion creada el mismo dia
- convertir aprendizaje en mejoras del producto

## Kit de prospeccion: semana del 7 al 13 de septiembre de 2026

Campana: `cotiza_en_terreno_2026_09`.
Meta: 20 prospectos registrados, 10 contactos manuales, 2–5 seguimientos y 1–3 demos. No usar blasting ni mensajes identicos.

### Mensaje A1 — Vidrieria o shower activa en Instagram

> Hola [nombre], vi el trabajo de [tipo de proyecto] que publicaron en [empresa/perfil]. Se nota que estan activos en terreno. Estoy mostrando Ventora, una forma simple de tomar el trabajo, armar una cotizacion desde el celular y enviar un PDF profesional sin llegar a casa a reconstruir todo. ¿Te muestro una cotizacion real en 7 minutos?

### Mensaje A2 — Taller de aluminio/PVC con presencia comercial

> Hola [nombre], vi que en [empresa] trabajan [linea/proyecto] en [comuna/ciudad]. Les escribo porque muchos talleres tienen medidas, precios y clientes repartidos entre WhatsApp, notas y Excel. Ventora ordena ese tramo y deja la cotizacion lista para enviar por WhatsApp. ¿Te muestro un ejemplo corto?

### Mensaje secundario — Usuario con cotizador tecnico

> Hola [nombre], si ya hacen el calculo tecnico en otro sistema, Ventora puede servirles para el paso comercial: convertir el precio o calculo final en una propuesta profesional desde el celular, enviarla por WhatsApp y hacer seguimiento. ¿Te muestro como queda una cotizacion real?

### Seguimiento 1 — 48 horas

> Hola [nombre], retomo esto una sola vez. La demo muestra solo el paso comercial: trabajo/medidas/precio → PDF → WhatsApp. Si hoy cotizas al final del dia, probablemente te haga sentido verlo. ¿Te muestro una cotizacion real?

### Seguimiento 2 — cierre respetuoso

> Cierro por aqui para no molestarte. Si mas adelante quieres verlo, te muestro una cotizacion real desde el celular.

### Pregunta de clasificacion para la demo

> ¿Cotizas mas en terreno desde el celular o al final del dia desde computador?

Usar respuesta por dispositivo:

- **Celular:** cotizacion rapida, cliente, item, precio, PDF y WhatsApp.
- **Computador:** catalogo de lineas/precios, continuidad de cotizacion y detalle interno revisable cuando corresponde.

### Registro de cada contacto

Antes de enviar, completar: observacion real, dolor probable, fuente exacta, prioridad y siguiente fecha. Despues enviar, registrar hora, mensaje utilizado, respuesta textual y proximo paso. Si no existe observacion real, no contactar aun.
