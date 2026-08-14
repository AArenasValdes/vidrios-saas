# Documentación Ventora

Estado: vigente
Actualizado: 2026-08-14
Responsable: producto + agentes del repositorio

Entrada única para agentes, desarrollo, billing, base de datos y Growth OS.

## Ruta rápida

| Necesidad | Leer primero | Fuente de verdad |
|---|---|---|
| Cualquier tarea de código | `AGENTS.md` | Reglas técnicas y límites |
| Entender producto | `docs/VENTORA_GIRO_PRODUCTO_2026-07.md` | Giro, alcance y exclusiones |
| Ruta, API o pantalla | `docs/agent-map/ROUTES_MAP.md` | Rutas y archivos reales |
| Feature | `docs/agent-map/FEATURES_MAP.md` | UI, lógica y persistencia |
| Base de datos/RLS | `docs/agent-map/DATA_MODEL_MAP.md` + `supabase/docs/` | Tablas, políticas y migraciones |
| Componente reutilizable | `docs/agent-map/COMPONENTS_MAP.md` | Componentes y usos |
| Tarea técnica específica | `docs/agent-map/AGENT_TASK_GUIDE.md` | Lectura, riesgos y QA |
| Pagos | `docs/billing/README.md` | Estado operativo y runbook |
| Marketing/growth | `AGENTS_MARKETING.md` + `docs/growth-os/README.md` | Estrategia y ejecución |
| Marca y contenido | `docs/marketing/README.md` | Biblioteca táctica y branding |
| Handoff técnico | `docs/agent-map/` | Constructor, móvil, cubicación y onboarding |

## Jerarquía documental

1. `AGENTS.md`
2. `docs/VENTORA_GIRO_PRODUCTO_2026-07.md`
3. `docs/agent-map/README.md`
4. `docs/agent-map/ROUTES_MAP.md`, `FEATURES_MAP.md`, `DATA_MODEL_MAP.md`, `COMPONENTS_MAP.md`
5. `docs/billing/README.md`, `AGENTS_MARKETING.md` o `docs/growth-os/README.md` según tarea
6. Documentos de apoyo y handoffs
7. `docs/archive/` solo como historial; nunca como fuente vigente

Si dos documentos contradicen código o una fuente superior, detenerse, registrar la discrepancia y seguir la fuente superior.

## Estado actual resumido

- Fase 4: cubicación V1 configurable y revisable; recetas L5000/L20/L25 siguen pendientes de validación de taller.
- Cotización, PDF, WhatsApp, clientes, solicitudes y aprobación pública son núcleo comercial.
- Mercado Pago Chile opera en producción; otros mercados siguen apagados.
- Growth OS concentra prospección, contenido, conversión, onboarding, cobro y revisión semanal.
- Pauta de fabricación es interna, referencial, sin precios y separada del PDF cliente.

## Regla de mantenimiento

Todo cambio de ruta, feature, componente, tabla, RLS o workflow debe actualizar el mapa correspondiente y pasar:

```bash
pnpm docs:check
```

El manifest técnico generado está en `docs/agent-map/ROUTES_MANIFEST.json`. No editarlo manualmente; regenerar con:

```bash
node scripts/check-docs-drift.mjs --write-manifest
```
