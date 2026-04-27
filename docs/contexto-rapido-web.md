# Contexto Rapido Ventora

Ventora es un cotizador comercial vertical para vidrios y aluminio. No es un ERP ni un sistema tecnico de ingenieria. El usuario principal es el maestro, taller o instalador que necesita cotizar rapido en terreno con una propuesta clara, un PDF profesional y salida por WhatsApp.

## Lo que ya existe

- Login con Supabase y usuario `admin`
- Clientes
- Cotizaciones con flujo guiado
- Sistemas sugeridos y edicion rapida
- Calculo simple con costo proveedor + margen
- PDF profesional con branding
- Compartir por WhatsApp
- Aprobacion o rechazo publico por link
- Perfil comercial de empresa
- Push notifications para el maestro
- Landing publica y base PWA
- Produccion activa en `ventorap.cl`
- Base de observabilidad tecnica en layout con Vercel Analytics y Speed Insights

## Flujo principal

1. Entra o inicia sesion.
2. Crea cliente y cotizacion.
3. El sistema propone un sistema base.
4. Ajusta solo lo necesario.
5. Genera PDF y comparte por WhatsApp.
6. El cliente revisa el link publico y aprueba o rechaza.

## Reglas importantes

- No reintroducir el cotizador tecnico complejo.
- No convertir esto en ERP, logistica o inventario.
- Mantener multi-tenant por `organization_id`.
- Usar `admin` como rol operativo real del MVP.
- Cuidar PDF, WhatsApp, aprobacion publica y push como core.
- Chrome o Edge en desktop es lo recomendado para el maestro.
- En iPhone, usar Safari y agregar a pantalla de inicio.
- Brave no es navegador base recomendado para alertas push.

## Lo que aun falta cerrar o verificar

- Validacion real de PWA en dispositivo
- Guardado de cotizaciones mas robusto; hoy puede quedar estado parcial si falla un paso intermedio
- Verificacion real de migraciones, bucket `organization-assets` y `SUPABASE_SERVICE_ROLE_KEY`
- RLS y multi-tenant con usuarios reales
- Seguimiento del paso 2 en movil; sigue siendo el punto mas sensible de UX
- Landing y CTA con criterio de salida, no solo visual
- Encodings rotos heredados en algunas vistas o tests
- Onboarding comercial y validacion de salida
- Observabilidad de produccion completa, mas alla de la base tecnica ya integrada
- Evaluar luego billing, analytics de producto y monitoreo operativo

## Frase corta para resumir el producto

Ventora ayuda a maestros y talleres a cotizar rapido con sistemas sugeridos, PDF profesional, WhatsApp y seguimiento comercial simple.
