# Growth OS - Ventora

Estado: vigente
Actualizado: 2026-08-14
Responsable: Growth OS

## Que es

El Growth OS de Ventora es la capa operativa persistente para ejecutar crecimiento comercial dentro del repositorio sin depender de prompts sueltos.

Su objetivo es que cualquier agente o persona pueda entrar al repo y responder cuatro preguntas sin pedir contexto adicional:

1. Que parte del embudo comercial se quiere mover
2. Que agente de growth debe actuar
3. Que rutas del producto afectan ese objetivo
4. Como se mide si la accion funciono

## Alcance

Este Growth OS esta hecho para la realidad de Ventora:

- Chile
- rubro vidrios, aluminio, PVC, shower door, termopanel y cierres de terraza
- captacion manual y organica
- centralizacion de leads
- respuesta rapida por WhatsApp
- cotizacion simple
- cierre por PDF o link publico

No cubre ERP, produccion, stock, compras, logistica ni CRM enterprise.

## Como se usa

Orden recomendado:

1. Leer `C:\Users\aless\vidrios-saas\AGENTS.md`
2. Leer `C:\Users\aless\vidrios-saas\docs\agent-map\README.md`
3. Leer `C:\Users\aless\vidrios-saas\docs\growth-os\AGENTS_GROWTH_OS.md`
4. Elegir el agente correcto segun el objetivo
5. Revisar la SOP correspondiente
6. Revisar `ROUTE_OWNERSHIP.md` si la tarea toca producto
7. Revisar `KPI_DICTIONARY.md` y `DASHBOARD_SPEC.md` para medir impacto

## Que agente usar segun el objetivo

### Si el objetivo es atraer mas demanda

Usar: `Agente de Atraccion: Generador de Autoridad`

Casos:

- buscar prospectos
- planificar contenido organico
- mejorar pagina publica para captar mas solicitudes
- reforzar links por canal y QR

### Si el objetivo es convertir interes en demos, pilotos y pagos

Usar: `Agente de Conversion: Speed-to-Lead Specialist`

Casos:

- mejorar velocidad de respuesta
- ordenar seguimiento manual
- optimizar solicitud -> WhatsApp -> cotizacion
- aumentar aprobaciones y cierres

### Si el objetivo es activar y retener al cliente nuevo

Usar: `Agente de Entrega y Exito: Arquitecto de Onboarding`

Casos:

- activar mini landing
- configurar empresa
- generar primera solicitud
- generar primera cotizacion
- asegurar primer circuito cerrado

### Si el objetivo es escalar con orden, medicion y alianzas

Usar: `Agente de Operativa y Escalamiento: Orquestador de Procesos y Alianzas`

Casos:

- definir KPIs
- crear dashboards
- coordinar experimentos
- estandarizar rutinas
- evaluar alianzas y Kapso/WhatsApp

## Estructura de esta carpeta

- `AGENTS_GROWTH_OS.md`: definicion persistente de los agentes
- `ROUTE_OWNERSHIP.md`: ownership comercial de rutas criticas
- `SOP_PROSPECCION.md`: sistema operativo de prospeccion manual
- `SOP_CONTENIDO.md`: sistema operativo de contenido organico
- `SOP_CONVERSION.md`: sistema operativo de conversion a piloto y pago
- `SOP_ONBOARDING.md`: sistema operativo de activacion y primeros logros
- `KPI_DICTIONARY.md`: diccionario de metricas
- `DASHBOARD_SPEC.md`: contrato funcional del dashboard
- `growth-dashboard.html`: dashboard standalone con datos mock
- `PROMPTS_LIBRARY.md`: prompts reutilizables
- `WEEKLY_OPERATING_SYSTEM.md`: rutina semanal
- `WORKFLOW_STANDARD.md`: contrato obligatorio de cada workflow
- `WORKFLOW_PRODUCT_CHANGE.md`: workflow para cambios de producto originados por marketing
- `DEMO_PLAYBOOK.md`: demo comercial vigente para pilotos
- `PARTNERSHIPS_PLAYBOOK.md`: playbook de alianzas
- `KAPSO_WHATSAPP_PLAN.md`: plan tecnico/comercial para evaluar Kapso
- `ONBOARDING_FEATURE_BRIEF.md`: brief para onboarding guiado dentro del producto

## Principios del Growth OS

- toda accion debe empujar captacion, centralizacion, WhatsApp, cotizacion o cierre
- todo debe poder medirse
- la prospeccion inicial es manual
- las mejoras de producto deben salir de fricciones reales del embudo
- ninguna ruta publica critica se toca sin plan de QA
- PDF y WhatsApp se consideran instrumentos de cierre activos

## Relacion con otras carpetas

- `docs/agent-map/` es el mapa tecnico fuente de verdad para rutas, features y datos
- `docs/marketing/` contiene playbooks tacticos de marketing ya creados
- `docs/growth-os/` consolida la capa operativa completa y persistente

## Regla de ejecucion

Si una tarea de growth va a tocar producto:

1. identificar la ruta o feature implicada
2. revisar ownership
3. revisar riesgos
4. definir QA manual obligatorio
5. solo despues proponer implementacion

## Workflow estándar

Todo nuevo workflow debe seguir `WORKFLOW_STANDARD.md`. Los workflows existentes son:

| Objetivo | Archivo |
|---|---|
| Prospección | `SOP_PROSPECCION.md` |
| Contenido | `SOP_CONTENIDO.md` |
| Conversión | `SOP_CONVERSION.md` |
| Onboarding | `SOP_ONBOARDING.md` |
| Cobro | `SOP_COBRO_MANUAL.md` + `docs/billing/README.md` |
| Revisión semanal | `WEEKLY_OPERATING_SYSTEM.md` |
| Cambio de producto | `WORKFLOW_PRODUCT_CHANGE.md` |
