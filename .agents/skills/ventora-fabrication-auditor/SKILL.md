---
name: ventora-fabrication-auditor
description: Audita evidencia Zeta en docs/fabricacion/zeta/confirmed y derived. Valida schemas, duplicados e inconsistencias sin navegar Sistema Zeta. Use when auditing fabrication evidence, reviewing confirmed JSON, or running pnpm zeta:validate / zeta:coverage.
---

# Auditor de fabricación Zeta

Esta skill **no navega Sistema Zeta**.

Lee evidencia ya capturada, nunca la modifica.

## Qué hace

1. Leer `docs/fabricacion/zeta/confirmed/**/*.json`.
2. Normalizar snake_case legado → schema canónico.
3. Validar schema Zod y coherencia (perfiles/vidrio/accesorios, largos y cantidades > 0).
4. Detectar duplicados de identidad (fabricante+sistema+línea+hojas+medida).
5. Comparar perfiles entre recetas de la misma familia (2H vs 4H idénticos = sospechoso).
6. Revisar `derived/`: toda fórmula debe apuntar a `evidenceIds` confirmed. Nunca `validated` solo por Zeta.
7. Actualizar `docs/fabricacion/zeta/AUDIT.md`.

## Qué no hace

- No escribe ni reescribe `confirmed/`.
- No infiere cortes faltantes.
- No mezcla Alumet/HaceVentanas.
- No implementa `fabrication_recipes`.
- No abre Zeta ni usa la sesión del extractor.

## Comandos

```bash
pnpm zeta:validate
pnpm zeta:coverage
pnpm zeta:derive
```

## Reporte

`docs/fabricacion/zeta/AUDIT.md` es una vista derivada. Si hay schema inválido, duplicado, conflicto, código de perfil que desaparece entre recetas hermanas o receta confirmed incompleta, el comando falla.

## Paralelismo

Permitido junto a tests y coverage. Prohibido simultáneo con un extractor navegando Zeta.
