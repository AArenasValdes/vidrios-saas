# Contexto Rapido Ventora

Actualizado: 2026-07-24

Ventora **no** es un cotizador técnico ni un ERP. Es **software comercial para empresas de vidrios, aluminio y PVC**: captar leads, cotizar y cerrar (PDF/WhatsApp), con desktop de taller (catálogo, constructor, pauta opcional).

**Giro julio 2026:** `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`

## Frases clave

- Captación: **"Capturo leads mientras estoy ocupado o dormido, y los centralizo en un solo lugar para que nadie se pierda."**
- Cierre: **"Cotiza desde el celular, envía un PDF profesional y deja de llegar a casa a hacer presupuestos."**

## Que ya existe

- Login Supabase, captación `/solicitud/[empresa]`, UTM/QR/push/email
- Clientes, obras, cotizaciones, PDF branding, aprobación pública
- Catálogo privado de líneas/precios + import
- Constructor visual desktop (composiciones)
- **Recetas de fabricación** (pack multi-variante): plantillas L5000/L20/L25 sugeridas, bases tipológicas pendientes, pauta en cotizar, snapshot v2
- Resumen fabricación interno `/print/cotizaciones/[id]/fabricacion` (no es el PDF cliente)
- Dashboard comercial, PWA, trial / activación

## Flujo principal

1. Empresa publica link/QR → lead entra.
2. Vendedor responde (WhatsApp) → cotiza.
3. (Desktop) Línea de catálogo + medidas; opcional pauta/receta.
4. PDF comercial + WhatsApp / link de aprobación.
5. (Opcional) Resumen fabricación para el taller.

## Reglas importantes

- No vender como producción, CAD u optimizador.
- L5000/L20/L25 = **iniciales sugeridas**, no verificadas hasta piloto.
- Multi-tenant `organization_id`; soft delete.
- Cuidar rutas públicas, PDF y WhatsApp.

## Foco actual

- Calibrar plantillas corredera con piloto real.
- No promocionar cobertura tipológica amplia antes de fórmulas validadas.
- Mantener desktop taller vendible; no abrir CRM/Kanban.

## Alcance tecnico comunicable (2026-08-13)

Ventora puede generar cubicacion, despiece, tiras y pauta interna cuando la empresa configura y valida una receta por linea. Es una ayuda revisable en desktop, separada del PDF comercial y del precio por m2. No es cubicacion universal, optimizacion de barras, nesting, CNC ni fabricacion automatica.
