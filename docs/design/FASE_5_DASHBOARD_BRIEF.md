# Brief — Fase 5 Dashboard Desktop (Ventora)

**Estado:** cerrado en implementación desktop (≥1024) — 2026-07-18. Dirección visual aprobada e implementada; refinamiento editorial de densidad/gráfico también aplicado.  
**Fecha:** 2026-07-18  
**Fuente de producto:** `docs/VENTORA_DESKTOP_TALLER_ROADMAP.md` § Fase 5  
**Branding:** `docs/marketing/brand-guidelines.md`

---

## Decisiones cerradas

- Flujo real del maestro: **cotizar → PDF → WhatsApp**.
- Cola principal del dashboard: **Por enviar** (no “seguimiento”).
- KPI hero: **Valor cotizado**.
- No CRM, Kanban, oportunidades ni cobros.
- No forzar dark premium de marketing en toda la app autenticada.
- Desktop ≥1024 es la superficie a rediseñar primero; mobile no es el foco de este corte.
- Implementación en código solo después de aprobar dirección visual.

---

## Prompt para IA de diseño (copiar tal cual)

```text
Diseña el DASHBOARD DESKTOP de Ventora (app autenticada, ≥1024px). No escribas código de producción: entrega dirección visual (layout, jerarquía, estados vacíos, desktop shell si aplica) lista para implementar después.

## Qué es Ventora
Software comercial para talleres de vidrios, aluminio y PVC.
Promesa: cotizar desde el celular, preparar mejor desde desktop, PDF profesional, WhatsApp, ordenar clientes/obras/cotizaciones.
NO es ERP, CRM enterprise, cotizador técnico, ni software de fábrica.
Usuario principal del dashboard desktop: dueño/admin del taller (maestro) que quiere ver valor y saber qué enviar hoy.

## Flujo real que debe empujar la UI
1. Crear cotización
2. Generar / descargar PDF
3. Enviar por WhatsApp
El seguimiento formal casi no se usa. NO diseñes un tablero de “pendientes de seguimiento”, pipeline, Kanban ni CRM.

## Superficie
- Ruta: /dashboard
- Prioridad: DESKTOP ≥1024px (estación de trabajo / demo de venta)
- Mobile: fuera de alcance de este rediseño (solo no romper el contrato de datos)
- Opcional: proponer cómo elevar el shell desktop (sidebar + tipografía + espacios) para que toda la app se sienta premium en demos, sin oscurecer todo el sistema

## Contenido obligatorio (datos reales, no inventar métricas)
Prioridad visual:
1. Hero: saludo breve + VALOR COTIZADO (monto grande, KPI principal) + CTA fuerte “Nueva cotización”
2. Cola “POR ENVIAR”: lista accionable de cotizaciones listas para PDF/WhatsApp
   - Criterio de producto: Creada o PDF generado, aún no enviada/aprobada/rechazada/terminada
   - Cada fila: cliente/obra (o “Cliente” si cotización rápida), monto, estado neutro, acción clara
3. KPIs secundarios (pocos, no muro de 8 cards): PDF generados, Aprobadas / valor aprobado, quizás cotizaciones del mes
4. Cotizaciones recientes (compactas)
5. Empty states claros y premium (sin cotizaciones / sin nada por enviar)
6. Alertas de respuesta pública (aprobada/rechazada) SOLO si existen; nunca como alerta dominante tipo “tienes N pendientes”

Fuera de V1 / no destacar:
- Pendientes de seguimiento
- Margen estimado (salvo que lo muestres como opcional y discreto; no inventar rentabilidad)
- Más de 2 gráficos; si hay gráfico, máximo 1–2 muy simples
- Embudo Kanban, cobros, oportunidades, roles, equipos

## Dirección de diseño (crítico)
Quiero algo FULL PREMIUM, fácil de entender en 3 segundos, que dé ganas de comprar el sistema.
NO quiero:
- dashboard SaaS genérico (Inter + cards blancas + 6 KPIs iguales + purple/indigo)
- look “hecho por IA”: cream + serif terracotta, purple gradients, glow, pills infinitas, icon rows, stat strips sin acción
- ERP denso, oscuro industrial pesado, ni marketing dark forzado en toda la app
- clutter: badges flotantes, stickers, muchas tipografías, sombras multi-capa

SÍ quiero:
- Claridad comercial premium: una composición con jerarquía obvia (hero → qué hacer ahora → secundario)
- Respiro, alineación, tipografía con carácter pero legible (no default stack genérico si propones fuentes; indica familia)
- Paleta de apoyo de marca (usar con criterio en app clara, no dark total):
  - negro premium #050505, negro azulado #0B0F17, grafito #111827
  - azul eléctrico #1E88FF (CTA principal)
  - plata #E6E8EB, acero #8A96A6, blanco de apoyo
- Superficies claras/productivas con acentos sobrios; profundidad sutil, no neon
- Sensación de taller moderno / vidrio-aluminio / arquitectura, sin stock barato ni robots/IA abstracta
- Una acción principal obvia; el resto en silencio visual
- Estados vacíos que vendan el producto (invitan a crear la primera cotización), no placeholders grises tristes

## Entregables que necesito de ti
1. Concepto en 1 párrafo (qué sensación y por qué no es genérico)
2. Wireframe / layout desktop (zonas, proporciones, primer viewport)
3. Jerarquía tipográfica y espaciado (sistema)
4. Tratamiento de: hero valor, cola Por enviar, KPIs, recientes, empty
5. Propuesta de shell (sidebar) si eleva la percepción premium sin romper productividad
6. 2–3 microdetalles de craft (motion sutil, empty, hover) — sin ruido
7. Lista explícita de anti-patrones que evitaste
8. Variante A/B solo si aporta; no saturar

## Criterio de éxito
Un dueño de vidriería debe abrir el dashboard y pensar: “acá veo cuánto cotizé y qué me falta enviar” — y querer usar Ventora todos los días. Debe verse vendible en una demo de 60 segundos.
```

---
