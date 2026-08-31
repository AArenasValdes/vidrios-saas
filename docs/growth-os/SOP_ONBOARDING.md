# SOP Onboarding - Ventora

Estado: vigente
Actualizado: 2026-08-14
Responsable: Agente de Entrega y Éxito

Contrato: `WORKFLOW_STANDARD.md`
Disparador: prueba iniciada o cuenta provisionada.
Salida: empresa configurada y primera cotización creada.
KPI: tiempo a primera cotización y conversión a pago.
Rutas afectadas: `/configuracion/empresa`, `/configuracion/pagina-venta`, `/activacion`, `/cotizaciones/nueva`.
QA: validar trial, tenant, PDF y no asignar `quote_only` durante trial.

## Objetivo

Activar a un nuevo cliente para que llegue rapido a su primer resultado comercial dentro de Ventora.

## Reglas de planes y trial

- **Trial (15 dias gratis):** `plan_code = trial` en `organization_profile`. Da acceso **Founder Full** completo: solicitudes, pagina publica y cotizaciones.
- **Nunca** asignar `quote_only` durante el trial. Ese plan ($6.990 mensual o $59.990/anual) solo aplica despues de un pago explicito de Ventora Cotización.
- **Founder Full pagado:** `plan_code = founder_full` + `subscription_status = active`.
  - Mensual manual: $8.990 (`billing_period = monthly`, `plan_type = monthly`).
  - Anual: $79.990 (`billing_period = yearly`, `plan_type = founder`).
- **Alta de cuenta operativa:** usar `pnpm pilot:org:provision` o el panel admin. `/registro` publico solo guarda una solicitud asistida en `solicitudes_contacto` con `contexto = registro-saas`; no crea Auth, organizacion ni trial.
- **Datos de empresa** (logo, slug, telefono, pagina): completarlos en Ventora en `/configuracion/empresa` y `/configuracion/pagina-venta`, no en SQL.

Ver cobros manuales en `SOP_COBRO_MANUAL.md`.

## Secuencia de activacion

### 1. Configuracion empresa

Checklist:

- nombre comercial
- telefono
- email
- direccion
- logo
- color de marca
- slug publico

Ruta:

- `/configuracion/empresa`

### 2. Pagina publica

Checklist:

- hero claro
- subtitulo comercial
- horario
- galeria minima
- publicacion activa

Ruta:

- `/configuracion/pagina-venta`

### 3. Link y QR

Checklist:

- link directo copiado
- link para Instagram
- link para Facebook
- QR descargado

Ruta:

- `/solicitudes/canales`

### 4. Primera solicitud

Checklist:

- abrir `/solicitud/[empresa]`
- enviar una solicitud de prueba
- verificar que aparezca en `/solicitudes`

Nota:

- esta ruta se usa para validar captacion real
- no es superficie donde deba mostrarse onboarding guiado al cliente SaaS

### 5. Primera cotizacion

Checklist:

- usar solicitud real o de prueba
- crear primera cotizacion
- validar total y guardado

Ruta:

- `/cotizaciones/nueva`

### 6. Primer PDF o link compartido

Checklist:

- generar PDF
- compartir link publico
- abrir detalle de cotizacion

Rutas:

- `/cotizaciones`
- `/cotizaciones/[id]`

Validacion opcional de cierre:

- abrir `/presupuesto/[token]` solo para comprobar que el link publico funciona

### 7. Primer seguimiento comercial

Checklist:

- responder por WhatsApp
- registrar si hubo respuesta en CSV/JSON comercial o actualizar estado/contactada en Ventora
- definir siguiente accion

## Checklist de activacion

- perfil de empresa completo
- landing publicada
- QR o link listo para usar
- primera solicitud creada
- primera cotizacion enviada
- primer PDF o link compartido
- primer seguimiento realizado

## Senales de riesgo de abandono

- no completa slug o datos de empresa
- no publica la landing
- no prueba una solicitud real
- no llega a primera cotizacion en los primeros 3 dias
- no comparte PDF o link
- dice que todo sigue ocurriendo fuera del sistema sin cambio

## Accion recomendada ante riesgo

- reducir complejidad
- proponer llamada corta
- guiar con checklist visible
- empujar un solo objetivo de valor por dia
