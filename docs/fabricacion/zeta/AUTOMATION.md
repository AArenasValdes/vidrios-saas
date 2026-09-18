# Automatización segura del workflow Zeta

No usar Cloud Automation ni un agente en la nube para navegar Sistema Zeta con la cuenta del taller.

## Qué automatizar

Cuando cambie `docs/fabricacion/zeta/confirmed/**`:

```bash
pnpm zeta:validate
pnpm zeta:coverage
```

El reporte derivado es `docs/fabricacion/zeta/AUDIT.md`.
Falla si el schema es inválido, hay duplicados, conflictos, una receta confirmed incompleta o un corrimiento sospechoso de perfiles.

## Cómo activarlo en Cursor Automations

Esta sesión no abre el editor de Automations (el flujo interactivo pide confirmación aparte y no debe mezclarse con extracción Zeta).

Pasos posteriores, en Agents Window:

1. Crear una Automation nueva.
2. Trigger: Git (push o pull request) acotado a este repo y a `docs/fabricacion/zeta/confirmed/**`.
3. Tools: terminal. No habilitar Browser.
4. Instrucciones: correr los dos comandos PNPM de arriba; no iniciar sesión en Zeta; no escribir confirmed; responder con el resumen de AUDIT.md.
5. Compute: local o cloud **sin** sesión Zeta.

## Extracción live (manual / agente)

La extracción live usa **Cursor Browser** para navegar Zeta y **ingest** para persistir:

```bash
# Agente guarda plan.html/plan.txt en docs/fabricacion/zeta/raw/.../
pnpm zeta:ingest -- --target=<id>
```

Fallback técnico con Playwright (sesión en `tmp/zeta-auth/`):

```bash
pnpm zeta:extract -- --login
pnpm zeta:extract -- --live --manufacturer=SODAL --system=L25 --limit=1
```

## Qué no automatizar en CI

- Login.
- `pnpm zeta:extract -- --live`.
- Cualquier click en Sistema Zeta desde Automations sin sesión del taller.
