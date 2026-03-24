# Checklist de Salida - Beta o Produccion Inicial

Actualizado: 2026-03-23.

Documento operativo para cerrar salida en las proximas 24 a 48 horas.

Este documento ya no esta pensado como lista larga de deseos.
Esta pensado como lista corta de cierre para decidir si hay `go` o `no-go`.

---

## Objetivo de esta salida

Salir con una version que permita a un pequeno grupo de empresas:

- iniciar sesion
- registrar clientes
- crear cotizaciones por componente
- generar PDF profesional
- compartir por WhatsApp
- revisar y responder presupuestos desde link publico
- configurar branding basico de empresa

No se busca salir con:

- pagos
- analytics
- OAuth
- proyectos como modulo separado
- automatizaciones comerciales

---

## Definicion de "go"

Hay `go` si estas condiciones son verdaderas al mismo tiempo:

- login funciona en produccion
- clientes funciona en produccion
- nueva cotizacion funciona con datos reales
- PDF sale correcto
- WhatsApp funciona o tiene fallback util
- branding de empresa persiste
- `/presupuesto/[token]` funciona de punta a punta
- variables de entorno y Supabase estan validados
- no hay errores visibles graves en desktop y movil

Si una de esas falla, no hay `go`.

---

## Estado de corte

### Ya esta razonablemente listo

- landing y login mucho mas alineados visualmente
- navbar, branding y secciones publicas en mejor estado
- dashboard, clientes y cotizaciones operativos
- PDF y WhatsApp implementados
- build de produccion pasando

### Sigue siendo riesgo real

- escrituras no transaccionales en cotizaciones
- validacion real de Supabase en entorno final
- falta smoke test manual completo
- falta observabilidad minima
- PWA/offline no validado en dispositivo
- flujo publico de aprobacion necesita validacion real
- quedan posibles textos heredados con encoding roto

---

## Plan realista - Proximas 48 horas

## Bloque 1 - Infra y entorno final

Esto debe cerrarse primero.

- [ ] Confirmar proyecto Supabase correcto.
- [ ] Aplicar migraciones pendientes reales.
- [ ] Verificar columnas de componentes en `cotizacion_items`.
- [ ] Verificar `organization_profile`.
- [ ] Verificar bucket `organization-assets`.
- [ ] Confirmar `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Confirmar variables de entorno en hosting final.
- [ ] Validar RLS y aislamiento por `organization_id`.

Entregable:

- evidencia de que login, lectura y escritura funcionan con usuario real

---

## Bloque 2 - Flujo comercial punta a punta

Esto define si el producto puede usarse o no.

- [ ] Crear cliente real.
- [ ] Crear cotizacion con 2 o 3 componentes.
- [ ] Guardar borrador.
- [ ] Reabrir y editar borrador.
- [ ] Guardar como presupuesto.
- [ ] Abrir detalle.
- [ ] Abrir print.
- [ ] Generar PDF.
- [ ] Compartir por WhatsApp.
- [ ] Abrir `/presupuesto/[token]`.
- [ ] Aprobar o rechazar presupuesto desde el link.
- [ ] Confirmar que estados y timestamps cambian correctamente.
- [ ] Confirmar soft delete.

Entregable:

- checklist manual completado con una cuenta real

---

## Bloque 3 - UX critica y errores visibles

Esto no es maquillaje; es cierre de uso real.

- [ ] Revisar login en desktop y movil.
- [ ] Revisar nueva cotizacion en desktop y movil.
- [ ] Revisar detalle de cotizacion.
- [ ] Revisar PDF con y sin logo.
- [ ] Revisar `/presupuesto/[token]` en movil.
- [ ] Corregir textos con encoding roto visibles al usuario.
- [ ] Revisar estados vacios y errores recuperables.
- [ ] Revisar links publicos y CTA.

Entregable:

- lista corta de bugs corregidos y 0 bloqueantes visuales

---

## Bloque 4 - Robustez minima antes de abrir

Esto es lo minimo para no salir ciegos.

- [ ] Agregar monitoreo de errores de frontend.
- [ ] Agregar monitoreo de errores de backend o rutas criticas.
- [ ] Agregar logging basico para:
  - crear cotizacion
  - actualizar cotizacion
  - print/PDF
  - aprobacion publica
- [ ] Documentar donde ver errores si algo falla.
- [ ] Revisar manejo de error en escrituras parciales de cotizaciones.

Entregable:

- ruta clara para detectar fallas en produccion

---

## Bloque 5 - Decision de salida

Cuando los 4 bloques anteriores esten cerrados:

- [ ] Definir si la salida es beta cerrada o produccion inicial controlada.
- [ ] Definir dominio final o subdominio.
- [ ] Definir empresas piloto iniciales.
- [ ] Definir canal de soporte y feedback.
- [ ] Definir responsable de monitorear primeras 24 horas.

Entregable:

- decision `go / no-go` con responsables claros

---

## P0 - Bloqueantes absolutos

No salir si cualquiera de estos sigue pendiente:

- [ ] no se pueden guardar cotizaciones reales
- [ ] PDF falla o sale roto
- [ ] branding no persiste
- [ ] `/presupuesto/[token]` falla
- [ ] faltan migraciones reales en Supabase
- [ ] variables de entorno no estan confirmadas
- [ ] error visible grave en movil en flujo principal

---

## P1 - Puede entrar justo despues de salir

- [ ] mejorar consistencia de escritura con estrategia transaccional o compensacion
- [ ] hardening de PWA y cache
- [ ] revision de copy final del dashboard
- [ ] revision del mensaje de WhatsApp final
- [ ] onboarding de empresas piloto

---

## P2 - No meter ahora

- [ ] pagos
- [ ] billing
- [ ] PostHog
- [ ] OAuth real
- [ ] CRM profundo
- [ ] gestion explicita de proyectos

---

## Secuencia recomendada de trabajo

### Hoy

1. cerrar Supabase final
2. ejecutar smoke test completo
3. corregir bugs bloqueantes

### Manana

1. agregar monitoreo y logging minimo
2. repetir smoke test en entorno desplegado
3. decidir `go / no-go`
4. abrir a pilotos

---

## Nota de criterio

Lo que queda ya no es "inventar mas producto".

Lo que queda es:

- validar
- endurecer
- corregir
- desplegar

Si hay duda entre una feature nueva y una validacion real, gana la validacion real.
