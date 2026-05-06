# Checklist de Salida - Beta Comercial

Actualizado: 2026-05-05.

Documento operativo para decidir si hay `go` o `no-go`.

Esta salida ya no se evalua solo como "cotizador funcionando".
Se evalua como **sistema real de captacion y cierre comercial**.

---

## Objetivo de esta salida

Salir con una version que permita a un pequeno grupo de empresas:

- publicar su enlace de solicitud
- captar leads desde links o QR
- saber de donde viene cada lead
- recibir aviso cuando llega una solicitud
- responder por WhatsApp sin perder el lead
- hacer seguimiento comercial basico
- crear cotizacion cuando el lead avance
- cerrar con PDF o link publico

No se busca salir con:

- multi-sucursal
- reparto automatico de leads
- analytics por vendedor
- integraciones profundas
- automatizaciones complejas

---

## Definicion de "go"

Hay `go` si estas condiciones son verdaderas al mismo tiempo:

- `/solicitud/[empresa]` funciona en produccion
- las UTM y `source_url` se guardan bien
- el dashboard muestra origen y datos correctos
- push o email notifica cuando entra lead
- el vendedor puede contactar por WhatsApp rapido
- la empresa puede crear cotizacion desde el flujo operativo
- PDF sale correcto
- `/presupuesto/[token]` funciona de punta a punta
- variables de entorno y Supabase estan validados
- no hay errores visibles graves en desktop y movil

Si una de esas falla, no hay `go`.

---

## Estado de corte

### Ya esta razonablemente listo

- captacion publica por empresa
- tracking de origen
- links por canal
- QR descargable
- dashboard de solicitudes
- push para lead nuevo
- base de email async
- clientes, cotizaciones, PDF y WhatsApp
- build de produccion pasando

### Sigue siendo riesgo real

- validacion real de push y email en entorno final
- pipeline comercial aun no consolidado
- falta smoke test manual completo
- falta observabilidad minima
- PWA/offline no validado en dispositivo
- landing y CTA aun necesitan validacion comercial final
- quedan posibles textos heredados con encoding roto

---

## Plan realista - Proximas 48 horas

## Bloque 1 - Infra y entorno final

Esto debe cerrarse primero.

- [ ] Confirmar proyecto Supabase correcto.
- [ ] Aplicar migraciones pendientes reales.
- [ ] Verificar bucket `organization-assets`.
- [ ] Confirmar `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Confirmar `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`.
- [ ] Confirmar variables de entorno en hosting final.
- [ ] Validar RLS y aislamiento por `organization_id`.

Entregable:

- evidencia de que login, lectura y escritura funcionan con usuario real

---

## Bloque 2 - Captacion punta a punta

Esto define si la promesa principal del producto existe de verdad.

- [ ] Abrir link publico de solicitud de una empresa real.
- [ ] Entrar con UTM desde al menos 3 canales.
- [ ] Crear lead desde link directo.
- [ ] Crear lead desde QR.
- [ ] Confirmar `utm_source`, `utm_medium`, `utm_campaign`, `source_url`.
- [ ] Confirmar badge de origen en dashboard.
- [ ] Confirmar push al vendedor.
- [ ] Confirmar email async al vendedor.
- [ ] Abrir contacto por WhatsApp desde dashboard.

Entregable:

- evidencia de que Ventora capta, registra y avisa un lead real

---

## Bloque 3 - Seguimiento y cierre

Esto valida que el lead no solo entra, sino que puede convertirse.

- [ ] Cambiar estado comercial de la solicitud si aplica.
- [ ] Crear cliente real.
- [ ] Crear cotizacion desde el flujo operativo.
- [ ] Guardar borrador.
- [ ] Reabrir y editar borrador.
- [ ] Guardar como presupuesto.
- [ ] Abrir detalle.
- [ ] Abrir print.
- [ ] Generar PDF.
- [ ] Compartir por WhatsApp.
- [ ] Abrir `/presupuesto/[token]`.
- [ ] Aprobar o rechazar presupuesto desde el link.

Entregable:

- checklist manual completado con al menos un lead cerrado o procesado completo

---

## Bloque 4 - UX critica y errores visibles

Esto no es maquillaje; es cierre de uso real.

- [ ] Revisar landing en desktop y movil.
- [ ] Revisar solicitud publica en desktop y movil.
- [ ] Revisar dashboard de solicitudes.
- [ ] Revisar configuracion de enlace/slug de empresa.
- [ ] Revisar cotizacion y PDF.
- [ ] Revisar `/presupuesto/[token]` en movil.
- [ ] Corregir textos con encoding roto visibles al usuario.
- [ ] Revisar estados vacios y errores recuperables.
- [ ] Revisar CTA y promesa comercial.

Entregable:

- lista corta de bugs corregidos y 0 bloqueantes visuales

---

## Bloque 5 - Robustez minima antes de abrir

Esto es lo minimo para no salir ciegos.

- [ ] Agregar monitoreo de errores de frontend.
- [ ] Agregar monitoreo de errores de backend o rutas criticas.
- [ ] Agregar logging basico para:
  - crear solicitud
  - notificar lead
  - crear cotizacion
  - print/PDF
  - aprobacion publica
- [ ] Documentar donde ver errores si algo falla.
- [ ] Revisar manejo de error en escrituras parciales.

Entregable:

- ruta clara para detectar fallas en produccion

---

## Bloque 6 - Decision de salida

Cuando los 5 bloques anteriores esten cerrados:

- [ ] Definir si la salida es beta cerrada o produccion inicial controlada.
- [ ] Definir empresas piloto iniciales.
- [ ] Definir canal de soporte y feedback.
- [ ] Definir responsable de monitorear primeras 24 horas.
- [ ] Definir foco inmediato de Fase 2.

Entregable:

- decision `go / no-go` con responsables claros

---

## P0 - Bloqueantes absolutos

No salir si cualquiera de estos sigue pendiente:

- [ ] no entra un lead real
- [ ] no se guarda el origen del lead
- [ ] push y email no tienen validacion minima
- [ ] el dashboard no muestra solicitudes reales
- [ ] no se pueden guardar cotizaciones reales
- [ ] PDF falla o sale roto
- [ ] `/presupuesto/[token]` falla
- [ ] faltan migraciones reales en Supabase
- [ ] variables de entorno no estan confirmadas
- [ ] error visible grave en movil en flujo principal

---

## P1 - Puede entrar justo despues de salir

- [ ] consolidar kanban comercial
- [ ] mejorar metricas de origen y conversion
- [ ] hardening de PWA y cache
- [ ] revision de copy final del dashboard
- [ ] onboarding de empresas piloto

---

## P2 - No meter ahora

- [ ] multi-sucursal
- [ ] round-robin
- [ ] analytics por vendedor
- [ ] Zapier/Make
- [ ] WhatsApp Business API
- [ ] billing
- [ ] OAuth real
- [ ] CRM profundo
- [ ] gestion explicita de proyectos

---

## Nota de criterio

Lo que queda ya no es "inventar mas cotizador".

Lo que queda es:

- validar captacion real
- endurecer seguimiento
- cerrar mejor
- desplegar con foco comercial

Si hay duda entre una feature futura y una validacion real, gana la validacion real.
