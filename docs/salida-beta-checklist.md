# Checklist de Salida a Beta

Documento operativo para sacar este repo a una beta cerrada en el estado actual del producto.

Fecha de corte: 2026-03-20.

---

## Objetivo de esta beta

La meta no es salir con todo el SaaS terminado.

La meta es salir con un producto que permita a un pequeno grupo de empresas:

- iniciar sesion
- registrar clientes
- crear cotizaciones por componente
- generar PDF profesional
- compartir por WhatsApp
- configurar su marca basica

Beta sugerida:

- 5 a 15 empresas piloto
- 1 a 3 usuarios por empresa
- feedback semanal

---

## Definicion de "go" para beta cerrada

Se puede desplegar beta si se cumple esto:

- login funcionando en produccion
- clientes funcionando en produccion
- nueva cotizacion funcionando en produccion
- detalle de cotizacion funcionando
- PDF funcionando con logo o fallback
- WhatsApp funcionando al menos con link de respaldo
- branding de empresa funcionando
- no hay rutas rotas en el flujo principal
- variables de entorno cargadas
- migraciones minimas aplicadas en Supabase

Si uno de esos puntos falla, no hay go.

---

## Estado actual resumido

Lo que ya esta bien encaminado:

- auth real con Supabase
- clientes
- cotizaciones
- calculo por componente
- detalle
- PDF
- WhatsApp
- branding de empresa
- build de produccion pasando

Lo que aun bloquea salida limpia:

- alinear CTA y copy publico con el modelo real de beta cerrada
- validar migraciones SQL reales en Supabase
- validar `SUPABASE_SERVICE_ROLE_KEY` para rutas publicas de aprobacion
- falta smoke test manual completo de punta a punta
- falta validar el flujo publico `/presupuesto/[token]`
- falta validar PWA/offline real en dispositivo
- no hay monitoreo de errores de produccion
- las escrituras de cotizaciones siguen sin transaccion

Lo que no bloquea beta:

- metodo de pago
- PostHog
- OAuth
- pricing final publico
- UI separada de proyectos

---

## Checklist P0

Esto debe quedar cerrado antes de desplegar beta.

### 1. Base de datos y Supabase

- [ ] Ejecutar `docs/mvp-componentes-schema.sql` en el proyecto Supabase correcto.
- [ ] Verificar que `cotizacion_items` tenga `codigo`, `tipo_componente` y `orden`.
- [ ] Ejecutar `docs/organization-profile-schema.sql` o validar que su equivalente ya este aplicado.
- [ ] Verificar existencia del bucket `organization-assets`.
- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Verificar politicas RLS de `organization_profile`.
- [ ] Confirmar que login, lectura y escritura funcionan con un usuario real de prueba.

### 2. Variables y despliegue

- [ ] Configurar `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] Configurar `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Definir hosting inicial.
- [ ] Definir dominio beta o subdominio beta.
- [ ] Confirmar que `next build` pasa en el entorno final.

### 3. Flujo principal de producto

- [ ] Crear cliente en produccion.
- [ ] Crear cotizacion con al menos 2 componentes.
- [ ] Guardar como borrador.
- [ ] Reabrir y editar borrador.
- [ ] Guardar como presupuesto.
- [ ] Abrir detalle de cotizacion.
- [ ] Abrir vista `/print/cotizaciones/[id]`.
- [ ] Descargar PDF.
- [ ] Compartir por WhatsApp o validar fallback.
- [ ] Abrir `/presupuesto/[token]` desde el link publico.
- [ ] Aceptar o rechazar presupuesto desde el link publico.
- [ ] Eliminar cotizacion y confirmar soft delete.

### 4. Branding minimo

- [x] Reemplazar `[NOMBRE]` en landing.
- [x] Reemplazar `[NOMBRE]` en login.
- [ ] Definir nombre comercial visible del producto.
- [ ] Alinear CTA de beta cerrada vs acceso abierto en landing y `/planes`.
- [ ] Revisar footer y textos publicos finales.
- [ ] Cargar logo real y validar PDF con logo.
- [ ] Validar fallback sin logo.

### 5. Rutas rotas y UX critica

- [x] Corregir o remover links a `/planes`.
- [ ] Confirmar que `/offline` funciona.
- [ ] Confirmar que el service worker queda registrado en produccion.
- [ ] Confirmar que el service worker no rompe navegacion normal ni cachea datos autenticados.
- [ ] Revisar mobile en login, nueva cotizacion, detalle y print.
- [ ] Revisar mobile en `/presupuesto/[token]`.
- [ ] Revisar textos con encoding roto visibles al usuario.

---

## Checklist P1

Esto no deberia bloquear la beta cerrada, pero si deberia entrar en la primera semana post-despliegue.

### 1. Calidad operativa

- [ ] Definir un canal de reporte de errores para pilotos.
- [ ] Agregar monitoreo de errores de frontend y backend.
- [ ] Agregar logging minimo para errores del flujo de cotizacion.
- [ ] Agregar logging para link publico de aprobacion y print/PDF.
- [ ] Registrar quien usa el sistema y con que frecuencia.

### 2. Validacion comercial

- [ ] Definir lista de empresas piloto.
- [ ] Crear script de onboarding manual.
- [ ] Preparar mensaje de invitacion beta.
- [ ] Preparar formulario corto de feedback.
- [ ] Medir tiempo real para crear una cotizacion desde cero.

### 3. Pulido de producto

- [ ] Revisar copy del dashboard.
- [ ] Revisar copy del detalle de cotizacion.
- [ ] Revisar copy del PDF.
- [ ] Confirmar que el mensaje de WhatsApp es suficientemente profesional.
- [ ] Confirmar que subtotal, descuento y total visibles al cliente son correctos en `/presupuesto/[token]`.
- [ ] Revisar si mostrar costo proveedor en PDF es deseado o debe ocultarse para cliente final.

---

## Checklist P2

Esto puede esperar hasta despues de validar uso real.

- [ ] Metodo de pago.
- [ ] Suscripciones y billing.
- [ ] Analiticas de producto tipo PostHog.
- [ ] Pricing final publicado.
- [ ] OAuth.
- [ ] CRM mas profundo.
- [ ] Gestion explicita de proyectos.
- [ ] Automatizaciones comerciales.

---

## Go / No-Go rapido

### Go

Haz deploy beta si ya estan resueltos:

- P0 completo
- flujo punta a punta validado con una cuenta real
- branding minimo cerrado
- sin rutas publicas rotas en el camino de conversion

### No-Go

No hagas deploy beta si ocurre cualquiera de estos:

- no se pueden guardar cotizaciones reales
- el PDF falla o sale roto
- WhatsApp no tiene ni share ni fallback por link
- branding de empresa no guarda
- faltan columnas o politicas en Supabase
- la landing principal apunta a rutas inexistentes
- el flujo publico de aprobacion no registra o muestra mal la respuesta del cliente

---

## Secuencia sugerida para esta semana

### Dia 1

- aplicar migraciones
- validar auth
- validar bucket y branding

### Dia 2

- alinear CTA y copy publico
- revisar landing, `/planes` y login

### Dia 3

- smoke test funcional completo en desktop y movil
- validar `/presupuesto/[token]` y PWA real
- ajustar errores rapidos

### Dia 4

- desplegar beta cerrada
- cargar 1 o 2 empresas piloto

### Dia 5

- observar uso real
- registrar bugs
- priorizar correcciones

---

## Capacidad inicial esperable

Sin pruebas de carga reales, la estimacion debe ser conservadora.

Escenario razonable para primera beta:

- 50 a 150 empresas
- 200 a 800 usuarios activos mensuales
- 20 a 50 usuarios concurrentes

Esta estimacion asume:

- despliegue correcto en hosting moderno
- Supabase bien configurado
- uso moderado
- sin picos de trafico de marketing

Si la beta empieza a moverse fuerte, lo siguiente a revisar es:

- indices SQL
- latencia de queries
- errores en exportacion PDF
- limites de storage
- observabilidad

---

## Nota importante

No bloquees la salida a beta por pagos o analiticas.

Primero valida:

- que la gente realmente use el flujo
- que genere cotizaciones
- que envie PDFs
- que los clientes puedan responder presupuestos sin friccion
- que el producto ahorre tiempo real

Despues de eso, recien tiene sentido meter:

- pago online
- planes
- PostHog
- embudos
- conversion y retention
