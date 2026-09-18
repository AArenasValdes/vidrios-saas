# Conflictos y límites — SODAL / L25

## C-001 — Auditoría Ventora frente a Planes Zeta

- La auditoría `docs/agent-map/PAUTA_AUDITORIA_25_LINEAS.md` describe `ventora:l25` como receta `draft`, no validada en taller, con referencias y ajustes internos.
- Los JSON en `confirmed/` provienen exclusivamente de Planes de armado de Sistema Zeta.
- No se mezclan ni se usan los datos de auditoría para completar perfiles, largos, vidrio o accesorios de Zeta.

## C-002 — Proyecto acumulado con más de seis hojas

- En `ALE-5 | test`, Zeta calculó consumos para 2H + 3H + 4H, pero el Plan visible conservó solo las dos primeras configuraciones.
- Clasificación: `CONFLICT`, no `RECETA NO EXISTE`.
- Resolución documental: la 4H reforzada monolítica queda en `pending` hasta una prueba aislada.

## C-003 — Cambio de componente monolítico a DVH

- Al reutilizar un marco monolítico y cambiarlo a `L-25 DVH PIERNA CERRADA` con `TE4104`, Zeta mostró `No se ha encontrado la línea de productos`.
- La prueba no es válida para negar la receta DVH porque violó la regla de componente nuevo.
- Clasificación: `CONFLICT / ERROR DE AUTOMATIZACIÓN`.

## C-004 — Errores Zeta sin Plan

Mensajes observados en pruebas previas: `No se ha encontrado el producto`, `El perfil TUB 10050 no tiene perfiles compuestos asignados`, `Ocurrió un error en retroceder: TypeError: Cannot read properties of undefined (reading 'h1')`, `ReferenceError: DM is not defined` y errores de reglas/render. Ninguno entra en `confirmed/`.
