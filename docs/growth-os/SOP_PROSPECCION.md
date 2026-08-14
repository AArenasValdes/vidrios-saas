# SOP Prospeccion - Ventora

Estado: vigente
Actualizado: 2026-08-14
Responsable: Agente de Atracción

Contrato: `WORKFLOW_STANDARD.md`
Disparador: falta de prospectos calificados o inicio de ciclo semanal.
Salida: lista priorizada con siguiente paso y fecha de seguimiento.
KPI: prospectos encontrados, contactados y respondidos.
Rutas afectadas: `/solicitud/[empresa]`, `/solicitudes/canales`, `/configuracion/pagina-venta`.
QA: validar links, fuente exacta y ausencia de spam.

## Objetivo

Encontrar, priorizar y contactar prospectos del rubro vidrios/aluminio en Chile con bajo costo, alto contexto y cero spam.

## Fuentes publicas permitidas

- Google Maps
- Facebook Pages
- Instagram
- TikTok
- paginas web locales
- directorios de servicios regionales
- grupos publicos relacionados al rubro
- MercadoLibre Servicios y vitrinas similares si aplica

## Campos de captura obligatorios

- fecha de hallazgo
- nombre comercial
- rubro principal
- ciudad o comuna
- region
- telefono o WhatsApp visible
- Instagram o Facebook
- sitio web
- fuente exacta
- observacion del negocio
- dolor detectado
- prioridad
- estado del contacto
- fecha de seguimiento
- notas

## Criterios de prioridad

### Prioridad A

- negocio activo y visible
- rubro totalmente alineado
- WhatsApp visible
- publicaciones recientes
- sin landing clara o con captacion desordenada

### Prioridad B

- rubro alineado
- contacto disponible
- actividad moderada
- valor potencial medio

### Prioridad C

- contacto incompleto
- baja actividad
- fit dudoso
- negocio fuera del foco inmediato

## Como clasificar leads

Usar dos ejes:

### 1. Fit de rubro

- alto
- medio
- bajo

### 2. Urgencia aparente

- alta: muchas publicaciones, respuestas visibles, alta dependencia de WhatsApp
- media: activo pero menos claro
- baja: presencia minima o poco alineada

Clasificacion sugerida:

- `A1`: fit alto + urgencia alta
- `A2`: fit alto + urgencia media
- `B1`: fit medio + urgencia alta
- `B2`: fit medio + urgencia media
- `C`: resto

## Como registrar fuente

La fuente debe quedar trazable.

Formato sugerido:

- `Google Maps - Santiago Centro - busqueda "vidrieria"`
- `Instagram - @vidriosejemplo - reel 2026-05-18`
- `Facebook Grupo - Vidrieros Chile - post de cierre de terraza`
- `Sitio web - https://empresa.cl/contacto`

## Como preparar mensaje personalizado

Antes de escribir, identificar al menos una observacion real:

- tipo de trabajo que publican
- comuna o ciudad donde operan
- presencia fuerte en WhatsApp
- ausencia de formulario claro
- publicaciones de proyectos recientes

Plantilla base:

```text
Hola [nombre], vi que en [empresa] trabajan [tipo de proyecto/rubro].
Te escribo porque estamos mostrando una herramienta simple para que las consultas no se pierdan, se respondan mas rapido por WhatsApp y terminen en cotizacion con link o PDF.
Si te hace sentido, te muestro un ejemplo corto para [rubro].
```

## Como evitar spam

- no enviar mensajes masivos identicos
- no usar blasting ni automatizacion fria
- no insistir mas de 2 seguimientos cortos
- no contactar si no hay contexto suficiente
- salir rapido si no hay interes

## Cadencia diaria

- 30 min: busqueda y registro
- 30 min: enriquecimiento de datos
- 45 min: contacto manual
- 20 min: seguimiento a interesados
- 10 min: actualizar CSV y JSON

Meta inicial diaria:

- 5 a 8 nuevos prospectos registrados
- 3 a 5 mensajes personalizados
- 1 a 2 seguimientos

## Formato CSV

```csv
fecha,empresa,rubro,ciudad,region,telefono,instagram,facebook,sitio_web,fuente,dolor_detectado,prioridad,estado,fecha_seguimiento,notas
2026-05-20,Vidrios Ejemplo,Shower door,Santiago,RM,+56911111111,@vidriosejemplo,,https://ejemplo.cl,Instagram - reel 2026-05-19,WhatsApp visible pero sin landing,A1,nuevo,2026-05-23,Publica trabajos recientes
```

## Formato JSON

```json
{
  "fecha": "2026-05-20",
  "empresa": "Vidrios Ejemplo",
  "rubro": "Shower door",
  "ciudad": "Santiago",
  "region": "RM",
  "fuente": "Instagram - reel 2026-05-19",
  "dolor_detectado": "WhatsApp visible pero sin landing",
  "prioridad": "A1",
  "estado": "nuevo",
  "fecha_seguimiento": "2026-05-23"
}
```

## Checklist de calidad del lead

- pertenece al rubro correcto
- opera en Chile
- tiene algun punto de contacto real
- hay una razon concreta para pensar que Ventora le sirve
- la fuente quedo trazable
- existe una observacion util para personalizar el mensaje
- tiene prioridad asignada
