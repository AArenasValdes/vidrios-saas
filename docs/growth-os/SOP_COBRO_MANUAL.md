# SOP Cobro Manual - Ventora

Estado: vigente con fallback manual
Actualizado: 2026-08-31
Responsable: billing + Agente de Conversión

Contrato: `WORKFLOW_STANDARD.md`
Disparador: pago por transferencia mientras el proveedor automático no aplica.
Salida: activación confirmada y registrada con referencia.
KPI: pagos confirmados y tiempo de activación.
Rutas afectadas: `/admin/clientes`, `/cuenta-vencida`, `/cuenta/suscripcion`.
QA: validar organización, plan, monto, vencimiento y ledger; nunca guardar secretos.

## Cuando usar

Mientras no haya cuenta bancaria de empresa para Flow o Transbank, todos los pagos se confirman manualmente por transferencia y WhatsApp.

## Planes SaaS con script

| Plan | Comando | Monto | Duracion |
|------|---------|-------|----------|
| Ventora Cotización mensual | `--plan quote_only_monthly` | $6.990 | 1 mes |
| Ventora Cotización anual | `--plan quote_only_annual` | $59.990 | 12 meses |
| Ventora Comercial mensual | `--plan founder_monthly` | $9.990 | 1 mes |
| Ventora Comercial anual | `--plan founder_full_annual` | $89.990 | 12 meses |

```bash
pnpm pilot:payment:activate --organization-id 12 --plan founder_monthly --reference "transferencia junio 2026"
# O en una linea sin flags (util en Windows):
pnpm pilot:payment:activate 12 founder_monthly "transferencia junio 2026"
```

Tambien disponible desde `/admin/clientes` (allowlist).

## Flujo operativo

1. Cliente confirma plan por WhatsApp.
2. Cliente transfiere y envia comprobante.
3. Activas con el script o panel admin usando el `organization_id` correcto.
4. Respondes por WhatsApp: empresa, plan y fecha de vencimiento.

## Mensaje tipo al cliente

> Hola [nombre], recibimos tu pago. Tu cuenta Ventora queda activa hasta [fecha]. Cualquier duda, escribenos.

## Fuera de este flujo

- **Plan Empresa Acompanado desde $250.000:** oferta consultiva. No usar el script de pagos SaaS.

## Auditoria de trial incorrecto

```bash
pnpm pilot:org:audit-trials
pnpm pilot:org:fix-trials --dry-run
```
