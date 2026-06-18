# Capture report - Ventora Demo Master

Base URL: https://www.ventorap.cl
Viewport: 390x844
Fecha: 2026-06-18T06:45:20.130Z

## Resultado

- `login`: OK
- `dashboard`: OK -> `dashboard.png`
- `clientes`: OK -> `clientes.png`
- `solicitudes`: OK -> `solicitudes.png`
- `canalesQr`: OK -> `canales-qr.png`
- `cotizaciones`: OK -> `cotizaciones.png`
- `nuevaCotizacion`: OK -> `nueva-cotizacion.png`
- `configuracionEmpresa`: OK -> `configuracion-empresa.png`
- `configuracionPagina`: OK -> `configuracion-pagina.png`

## Config opcional

- `VENTORA_DEMO_PUBLIC_SLUG` no configurado: se omite captura de pagina publica.
- `VENTORA_DEMO_QUOTE_TOKEN` no configurado: se omiten presupuesto publico y PDF.

## Notas

- Datos sensibles se enmascaran visualmente con CSS antes de capturar.
- Si una ruta falla, el script continua con las siguientes capturas.