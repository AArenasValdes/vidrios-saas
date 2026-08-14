# Ventora — Resumen maestro

Estado: vigente
Actualizado: 2026-08-14
Responsable: producto + marketing

Resumen ejecutivo. No reemplaza fuentes canónicas.

## Fuentes canónicas

- Reglas técnicas: `AGENTS.md`
- Índice documental: `docs/README.md`
- Giro de producto: `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`
- Rutas/features/datos: `docs/agent-map/README.md`
- Pagos: `docs/billing/README.md`
- Marketing: `AGENTS_MARKETING.md`
- Workflows: `docs/growth-os/README.md`

## Qué es Ventora

Software comercial para maestros, talleres y empresas de vidrio, aluminio y PVC. Captura solicitudes, ordena clientes y cotizaciones, permite cotizar desde celular/tablet/computador y ayuda a cerrar con PDF, WhatsApp o link público.

La cubicación, despiece, tiras y pauta de corte son opcionales, configurables por empresa, internos, referenciales y revisables por taller. No son CAD, ERP, nesting, CNC ni fabricación automática.

## Núcleo comercial

1. Captación pública y origen del lead.
2. Centralización y seguimiento.
3. Cotización móvil y desktop.
4. PDF profesional y WhatsApp.
5. Aprobación pública y seguimiento de cierre.
6. Catálogo privado y constructor cuando hace falta.

## Estado actual

- Fase 4: cubicación V1 multi-tipología en calibración.
- L5000/L20/L25: plantillas iniciales sugeridas, pendientes de validación de taller.
- Mercado Pago Chile: operativo en producción; otros mercados apagados.
- Growth OS: prospección, contenido, conversión, onboarding, cobro y revisión semanal.
- Rutas críticas: `/solicitud/[empresa]`, `/solicitudes`, `/cotizaciones/nueva`, `/print/cotizaciones/[id]`, `/presupuesto/[token]`.

## Límites

No abrir CRM enterprise, ERP, inventario, compras, logística, producción automática, optimización de barras, nesting ni nuevas tablas comerciales sin aprobación explícita.

## Comando de consistencia

```bash
pnpm docs:check
```
