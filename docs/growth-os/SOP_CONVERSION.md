# SOP Conversion - Ventora

Estado: vigente
Actualizado: 2026-08-14
Responsable: Agente de Conversión

Contrato: `WORKFLOW_STANDARD.md`
Disparador: mensaje nuevo, respuesta de prospecto o seguimiento pendiente.
Salida: demo, prueba guiada o cierre explícito del contacto.
KPI: mensaje → demo → prueba → primera cotización → pago.
Rutas afectadas: `/solicitudes`, `/cotizaciones/nueva`, `/print/cotizaciones/[id]`, `/presupuesto/[token]`.
QA: revisar WhatsApp, PDF y aprobación pública cuando aplique.

## Objetivo

Convertir mensajes en demos, pruebas guiadas, primera cotizacion creada y pagos con velocidad, claridad y foco en valor comercial real.

## Primer contacto

Meta:

- abrir conversacion relevante
- no vender de golpe
- conectar con un dolor visible

Formato sugerido:

```text
Hola [nombre], vi que en [empresa] trabajan [rubro/proyecto].
Te escribo porque Ventora ayuda a cotizar desde el celular y enviar un PDF profesional sin llegar a casa a armar presupuestos.
Si te hace sentido, te muestro una cotizacion real en 7 minutos.
```

## Follow-up

### Follow-up 1

- plazo: 2 a 3 dias
- objetivo: retomar sin presionar

### Follow-up 2

- plazo: 10 a 15 dias
- objetivo: cerrar si hay interes o salir

Formato sugerido:

```text
Te retomo esto porque creo que les puede servir si hoy toman medidas, precios o calculos por WhatsApp y despues tienen que armar el presupuesto en computador.
Si quieres, te muestro una cotizacion real hecha para [rubro].
```

## Calificacion

Un prospecto vale la pena si cumple la mayoria de estas condiciones:

- rubro alineado
- usa WhatsApp como canal principal
- cotiza manualmente o desde computador al final del dia
- usa Excel, Word, notas, WhatsApp, precio por metro cuadrado, margen o valor final
- quiere enviar propuestas mas profesionales
- puede tomar decision rapido
- entiende valor comercial simple

## Demo de 5 a 10 minutos

Secuencia sugerida:

1. problema: presupuesto pendiente al llegar a casa
2. crear cotizacion desde el celular
3. ingresar medidas, precio directo, margen o valor final
4. generar PDF profesional
5. enviar por WhatsApp
6. mostrar clientes y cotizaciones ordenados
7. explicar seguimiento antes del vencimiento

Cierre de demo:

- `Esto te serviria para dejar de armar presupuestos tarde en el computador?`
- `Probemos creando tu primera cotizacion hoy`

## Oferta piloto de 15 dias

El piloto debe incluir:

- configuracion basica
- prueba guiada
- primera cotizacion creada el mismo dia
- PDF profesional enviado o listo para enviar
- acompanamiento cercano

## Objeciones comunes

### `Yo ya uso WhatsApp`

Respuesta:

`Perfecto, Ventora no reemplaza WhatsApp. Te ayuda a convertir medidas, precios o calculos en una cotizacion profesional lista para enviar.`

### `No quiero algo complejo`

Respuesta:

`La idea no es complejidad. Es cotizar desde el celular y mandar un PDF claro sin rehacer el presupuesto en la noche.`

### `No tengo tiempo para aprender otro sistema`

Respuesta:

`Por eso el piloto es corto y enfocado en dejar andando solo lo minimo util.`

### `No necesito un ERP ni un cotizador tecnico`

Respuesta:

`Nosotros tampoco estamos vendiendo un ERP ni un sistema industrial. Ventora sirve para convertir precio, medidas o calculo en una propuesta profesional y movil; ademas, si tu empresa configura y valida sus recetas, genera cubicacion, despiece, tiras y una pauta de corte revisable en computador.`

## Cierre comercial

Oferta sugerida:

- `CLP 8.990 mensual`
- `CLP 79.990 Founder anual`
- `CLP 59.990 Solo Cotizacion anual`

Estructura de cierre:

1. recordar primera cotizacion creada
2. conectar con dolor original
3. presentar plan simple
4. dar opcion mensual o anual

## Criterios para decir que un prospecto si vale la pena

- responde con contexto
- muestra dolor real
- entiende rapido el valor
- puede crear una cotizacion durante la demo o el mismo dia
- tiene flujo comercial minimo existente

## Criterios para abandonar un prospecto

- no responde tras dos seguimientos razonables
- pide funciones fuera del foco del producto
- espera ERP, sistema de produccion, cubicacion, cortes, herrajes o desperdicio
- no cotiza de forma recurrente ni tiene urgencia comercial
- no hay posibilidad de decision en corto plazo
