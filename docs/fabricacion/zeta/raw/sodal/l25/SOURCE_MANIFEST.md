# Fuentes brutas y trazabilidad — SODAL / L25

## Fuente primaria de transcripción

- `docs/SODAL_LINEA25_ZETA_2026-09-18.md`
  - Registros PA-3: V-001 a V-006.
  - Repetición proyecto nuevo: PA-5 y PA-2.
  - Diagnóstico de avisos, errores y límite de proyecto.

## Auditoría Ventora leída

- `docs/agent-map/PAUTA_AUDITORIA_25_LINEAS.md`
  - Serie 25 / `ventora:l25`: receta persistida `draft`, no validada en taller.
  - Variantes L25 multi-hoja: 3H/4H reforzada-pierna abierta documentadas como slots pendientes en la auditoría.
  - Regla: procedencia documental, receta persistida y validación física son estados independientes.

## Exclusiones

No se copiaron a `confirmed/` fórmulas Ventora, consumos con pérdidas, referencias de catálogo, datos de Alumet/HaceVentanas/Google ni resultados de Zeta sin Plan de armado.

Las capturas nuevas del extractor viven en `docs/fabricacion/zeta/raw/sodal/l25/<recipe-id>/`. El self-check no reemplaza esta evidencia confirmada.

## Registro PA-40

- `PA-40_VENTORA-ZETA-PENDING-001.md`: Plan de armado observado directamente en el proyecto de prueba `idProject=46374`.
- Configuración confirmada: `L-25 MONOLITICO PIERNA ABIERTA REFORZADA`, 4H, `3000 × 1500 mm`, vidrio `CTI5`.
- La descarga fue intentada desde el botón `Descargar`; el conector no expuso un PDF local verificable. La confirmación se basa exclusivamente en los datos visibles del Plan de armado.

## Registro PA-41

- `PA-41_VENTORA-ZETA-PENDING-BATCH-001.md`: Plan de armado observado directamente en el proyecto de prueba `idProject=46375`.
- Configuración confirmada: `L-25 DVH PIERNA ABIERTA`, 2H, `1800 × 1500 mm`, vidrio `TE4104`.
- La descarga fue intentada desde el botón `Descargar`; el conector no expuso un PDF local verificable. La confirmación se basa exclusivamente en los datos visibles del Plan de armado.

## Registros PA-42 a PA-48

- `PA-42_VENTORA-ZETA-BATCH-001.md`: `L-25 DVH PIERNA CERRADA`, 2H, `1800 × 1500 mm`, proyecto de prueba `idProject=46376`.
- `PA-43_VENTORA-ZETA-BATCH-002.md`: `L-25 DVH PIERNA CERRADA`, 3H, `3000 × 1500 mm`, proyecto de prueba `idProject=46377`.
- `PA-44_VENTORA-ZETA-BATCH-003.md`: `L-25 DVH PIERNA CERRADA`, 4H, `3000 × 1500 mm`, proyecto de prueba `idProject=46378`.
- `PA-45_VENTORA-ZETA-BATCH-004.md`: `L-25 MONOLITICO PIERNA CERRADA`, 3H, `3000 × 1500 mm`, proyecto de prueba `idProject=46379`.
- `PA-46_VENTORA-ZETA-BATCH-005.md`: `L-25 MONOLITICO PIERNA CERRADA`, 4H, `3000 × 1500 mm`, proyecto de prueba `idProject=46380`.
- `PA-47_VENTORA-ZETA-BATCH-006.md`: `L-25 DVH PIERNA ABIERTA`, 3H, `3000 × 1500 mm`, proyecto de prueba `idProject=46381`.
- `PA-48_VENTORA-ZETA-BATCH-007.md`: `L-25 DVH PIERNA ABIERTA`, 4H, `3000 × 1500 mm`, proyecto de prueba `idProject=46382`.
- En todos los casos el botón `Descargar` fue visible; el conector de navegador no expuso una ruta local verificable del PDF. La confirmación se basa exclusivamente en las tablas visibles del Plan de armado.

## Registros geométricos PA-50 a PA-53

- `PA-50_VENTORA-ZETA-BATCH-009.md`: `L-25 MONOLITICO PIERNA ABIERTA`, 3H, `2400 × 1500 mm`, proyecto de prueba `idProject=46384`.
- `PA-51_VENTORA-ZETA-BATCH-010.md`: `L-25 MONOLITICO PIERNA ABIERTA REFORZADA`, 3H, `2400 × 1500 mm`, proyecto de prueba `idProject=46385`.
- `PA-52_VENTORA-ZETA-BATCH-011.md`: `L-25 DVH PIERNA ABIERTA REFORZADA`, 3H, `2400 × 1500 mm`, proyecto de prueba `idProject=46386`.
- `PA-53_VENTORA-ZETA-BATCH-012.md`: `L-25 DVH PIERNA CERRADA`, 3H, `2400 × 1500 mm`, proyecto de prueba `idProject=46387`.
- En cada prueba se extrajeron únicamente los largos horizontales, anchos de vidrio y cotas globales solicitados; el Plan mostró botón `Descargar`, pero el conector no expuso un PDF local verificable.
