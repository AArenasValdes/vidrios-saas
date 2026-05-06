# Contexto Rapido Ventora

Ventora ya no debe entenderse como un cotizador tecnico. Hoy es **software comercial para empresas de vidrios y aluminio que captura, centraliza y ayuda a cerrar leads**.

Frase clave:

**"Capturo leads mientras estoy ocupado o dormido, y los centralizo en un solo lugar para que nadie se pierda."**

## Que ya existe

- Login con Supabase y usuario `admin`
- Solicitudes publicas por empresa en `/solicitud/[empresa]`
- Tracking `utm_source`, `utm_medium`, `utm_campaign`, `source_url`
- Generador de links por canal
- QR descargable como PNG
- Push al vendedor cuando entra lead
- Email async para lead nuevo
- Dashboard de solicitudes con origen y contacto por WhatsApp
- Clientes
- Cotizaciones
- PDF con branding
- Aprobacion publica por link
- Perfil comercial de empresa
- Base PWA
- Produccion activa en `ventorap.cl`

## Flujo principal correcto

1. Empresa publica su link o QR.
2. El lead entra desde canal trazable.
3. Ventora centraliza la solicitud.
4. El vendedor recibe aviso y responde rapido.
5. El lead avanza en seguimiento comercial.
6. Cuando corresponde, se crea cotizacion.
7. Se cierra por PDF, WhatsApp o link publico.

## Reglas importantes

- No reintroducir el cotizador tecnico complejo.
- No convertir esto en ERP, logistica o produccion.
- Pensar primero en captacion y conversion.
- Mantener multi-tenant por `organization_id`.
- Usar `admin` como rol operativo real del MVP.
- Cuidar solicitudes, origen, notificaciones y WhatsApp como core actual.
- Cuidar cotizaciones, PDF y aprobacion publica como core de cierre.
- Chrome o Edge en desktop es lo recomendado.
- En iPhone, usar Safari y agregar a pantalla de inicio.
- Brave no es navegador base recomendado para push.

## Foco actual

- endurecer flujo real de captacion
- validar UTM, QR, push y email
- consolidar pipeline comercial de solicitudes
- mantener cotizacion como herramienta de cierre
- validar copy y promesa comercial del producto

## No centrar ahora

- multi-sucursal
- round-robin
- analytics por vendedor
- Zapier/Make
- WhatsApp Business API
- automatizacion profunda

## Frase corta para resumir el producto

Ventora ayuda a empresas de vidrios y aluminio a capturar leads, ordenarlos y convertirlos en cotizaciones cerradas sin perder conversaciones ni origenes.
