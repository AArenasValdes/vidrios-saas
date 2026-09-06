# Playbook UTM y primera campaña Meta — Ventora

Estado: operativo para piloto
Actualizado: 2026-08-19

## Objetivo

Medir el recorrido completo desde Meta hasta una acción comercial real en Ventora:

`anuncio -> solicitud -> primera cotización -> PDF -> pago`

Las conversiones principales viven en Ventora. Windsor queda como fuente de medios pagados y orgánicos; no se usa para inventar conversiones que la aplicación no confirmó.

## Convención obligatoria

Usar minúsculas, guion bajo y nombres estables:

- `utm_source`: plataforma (`facebook`, `instagram`, `whatsapp`, `qr`, `web`)
- `utm_medium`: ubicación o tipo (`paid_social`, `organic_social`, `group`, `mensaje`, `bio`, `offline`)
- `utm_campaign`: objetivo y periodo (`demo_cotizador_2026_08`)
- `utm_content`: pieza o variante (`reel_01`, `carrusel_01`, `testimonio_01`)
- `utm_term`: audiencia o búsqueda, solo si aplica

Ejemplo:

```text
https://www.ventorap.cl/solicitud/SLUG?origen=facebook&utm_source=facebook&utm_medium=paid_social&utm_campaign=demo_cotizador_2026_08&utm_content=reel_01
```

## Primera campaña recomendada

- Campaña: `demo_cotizador_2026_08`
- Objetivo: conversaciones o solicitudes calificadas, no tráfico vacío
- Audiencia inicial: maestros, instaladores y empresas de vidrio/aluminio/PVC en Chile
- CTA: `Te muestro una cotización real`
- Destino: página pública de solicitud de la empresa, no una URL genérica
- Variantes: `reel_01`, `reel_02`, `testimonio_01`

Para grupos de Facebook usar `utm_source=facebook` y `utm_medium=group`. El nombre del grupo, segmento y resultados de alcance/interacción se registran en la metadata manual de la pieza editorial. No publicar promesas de más clientes, ventas garantizadas, ERP, fabricación automática ni cortes exactos para máquina.

## Control antes de activar anuncios

1. Confirmar que el slug de la página pública funciona en incógnito.
2. Abrir el enlace con UTM y enviar una solicitud de prueba.
3. Confirmar el registro en `/solicitudes` y en `/solicitudes/canales`.
4. Crear la cotización desde esa solicitud.
5. Confirmar que la cotización conserva la relación `solicitud_id`.
6. Registrar en la revisión semanal: solicitudes, primeras cotizaciones, PDF y pagos.

## Regla de decisión

No escalar por impresiones, likes o seguidores. La campaña continúa solo si produce solicitudes calificadas y usuarios que crean su primera cotización.

## Estado de conexiones

- Meta Ads: conectado en Windsor.
- Facebook orgánico: conectado en Windsor.
- Instagram: conectado en Windsor.
- GA4: pendiente y fuera del piloto actual.
