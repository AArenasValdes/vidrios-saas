# Reel V002 — Ventora

Fecha objetivo: martes 8 de septiembre de 2026  
Formato: 1080×1920, 9:16, H.264, 30 fps, 28 segundos

## Caption

El cliente te pide precio en terreno. Si las medidas quedan en WhatsApp, la cotización empieza de nuevo al llegar a casa.

Ventora te ayuda a ordenar cliente, pieza, medidas y precio desde el celular, y dejar un PDF profesional listo para enviar.

Escríbeme DEMO.

#Ventora #Vidriería #Aluminio #PVC #Cotizaciones #EmprendedoresChile

## Mapa de edición

- 0–5 s: `Primer-Frame.mp4`, dolor de recibir una solicitud y anotar datos en terreno.
- 5–8 s: `SegundoFrame.mp4` completo, conservando la escena “Precio en otra nota”. No lleva placas ni máscaras agregadas por Remotion.
- 8–14 s: `tercer-Frame.mp4` completo, conservando la escena “Del terreno al teléfono”. No lleva placas ni máscaras agregadas por Remotion.
- 14–23 s: `CuartoFrame.mp4` como ambiente. La pantalla del teléfono se reemplaza por la captura real de cotización/PDF, conservada intacta.
- 23–28 s: imagen final entregada por el usuario, con zoom suave 100%→103,5%; no se agrega texto encima.

## Correcciones y límites

- Los cuatro clips de Flow se usan como escenas visuales según el orden narrativo solicitado.
- Se eliminaron únicamente las placas/máscaras que había agregado la composición anterior sobre `SegundoFrame.mp4` y `tercer-Frame.mp4`.
- `CuartoFrame.mp4` se usa como ambiente; su pantalla generada no queda visible y se reemplaza por la captura real.
- La imagen final de WhatsApp/DEMO se conserva como asset íntegro y solo recibe movimiento de escala suave.
- El PDF final usa la captura real entregada por el usuario, con datos ficticios de prueba; no se alteraron sus caracteres, precios, totales ni contenido.
- Todo el audio de los clips quedó silenciado. No se agregó música porque no había una pista con licencia comercial confirmada.
- La grabación móvil real de Ventora no se usa en esta versión, por indicación de edición. Para una versión con voz o música se necesita una pista/licencia o grabación aprobada.

## Validación

- Render Remotion: `VentoraReelV002`, 840/840 fotogramas.
- Decodificación completa con FFmpeg: sin errores.
- ESLint sobre la composición y `Root.tsx`: sin errores ni warnings.
- Revisión visual de los cortes y de muestras a lo largo de los 30 segundos: texto del PDF legible, sin deformación; CTA visible en el cierre.

No se publicó ni se programó automáticamente.
