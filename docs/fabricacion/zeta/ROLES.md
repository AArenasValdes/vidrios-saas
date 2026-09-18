# Roles del workflow Zeta

Cursor no permite registrar subagents arbitrarios en este repo; estos roles son la convención operativa.

| Rol | Puede navegar Zeta | Responsabilidad |
|---|---|---|
| ZETA EXTRACTOR | Sí, en exclusiva | `pnpm zeta:extract`, Browser/Playwright, raw + confirmed nuevos |
| FABRICATION AUDITOR | No | `pnpm zeta:validate`, duplicados, AUDIT.md |
| TEST AGENT | No | Tests de schema/scripts/self-check |
| DOC AGENT | No | `pnpm zeta:coverage`, INDEX.md |

Lock: `tmp/zeta-auth/extract.lock`. Si existe, no abrir otra sesión Zeta.

Multitask / worktrees: usar worktrees solo para cambios de código en paralelo. No crear worktrees para lecturas. Nunca dos worktrees navegando Zeta con la misma cuenta.
