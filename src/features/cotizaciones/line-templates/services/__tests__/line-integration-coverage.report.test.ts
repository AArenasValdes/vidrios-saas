import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { auditarCatalogoLineasVentora } from "@/features/cotizaciones/line-templates/services/auditoria-catalogo-lineas-ventora.service";
import { auditarIntegridadCatalogoLineasVentora } from "@/features/cotizaciones/line-templates/services/auditoria-integridad-catalogo-lineas.service";
import { ARQUETIPO_CATALOGO_2026_10_05 } from "@/features/proveedor-catalogos/fixtures/arquetipo-catalogo-2026-10-05";
import { getCatalogProductConfigurations } from "@/features/cotizaciones/line-templates/services/line-template-compatibility.service";
import { auditImportedCatalog, evaluateLineIntegration, summarizeIntegration, type IntegrationRow } from "@/features/fabricacion/services/line-integration-coverage.service";

const out = path.join(process.cwd(), "test-results/fabrication/line-integration.json");
const catalogSource = "src/features/cotizaciones/line-templates/services/default-line-catalog.ts";
const technicalSource = "src/features/cotizaciones/line-templates/services/auditoria-catalogo-lineas-ventora.service.ts";

it("genera informe determinista de todas las líneas y configuraciones declaradas sin consultar datos remotos", () => {
  const catalogAudit = new Map(auditarCatalogoLineasVentora().map((row) => [row.catalogKey, row]));
  const integrity = auditarIntegridadCatalogoLineasVentora();
  const integrityByKey = new Map(integrity.lineas.map((row) => [row.catalogKey, row]));
  const occurrences = new Map<string, number>();
  for (const line of VENTORA_DEFAULT_LINE_CATALOG) {
    if (line.catalogKey) occurrences.set(line.catalogKey, (occurrences.get(line.catalogKey) ?? 0) + 1);
  }
  const rows: IntegrationRow[] = [];
  for (const line of VENTORA_DEFAULT_LINE_CATALOG) {
    const key = line.catalogKey ?? "";
    const audit = catalogAudit.get(key);
    const metadata = (line.catalogMetadata ?? {}) as Record<string, unknown>;
    const identitySource = typeof metadata.identitySource === "string" ? metadata.identitySource : null;
    const cuttingSource = typeof metadata.cuttingGuideSource === "string" ? metadata.cuttingGuideSource : null;
    const provenance = [catalogSource, identitySource].filter(Boolean).join("; ");
    const integrityRow = integrityByKey.get(key);
    const configs = getCatalogProductConfigurations(key);
    // No fabricar combinaciones por producto cartesiano. Sin par explícito, solo una fila pendiente.
    const declarations = configs.length ? configs : [null];
    const ids = new Set<string>();
    for (const configuration of declarations) {
      const configId = configuration?.id ?? "sin_configuracion_exacta";
      const duplicate = ids.has(configId) || (occurrences.get(key) ?? 0) > 1;
      ids.add(configId);
      const recipeStatus = audit?.fabricacionEstado ?? "cotizacion_comercial";
      // El estado técnico de una referencia general NO declara validación de esta variante exacta.
      const expectation = recipeStatus === "cotizacion_comercial" ? "commercial_only" : "pending";
      const item = evaluateLineIntegration({
        catalogKey: key,
        configurationId: configId,
        name: line.nombre,
        scope: "fixture",
        catalogSource: provenance,
        commercial: {
          declared: Boolean(key),
          exactPair: Boolean(configuration && configuration.componentType && configuration.openingType),
          ambiguous: duplicate || integrityRow?.nomenclaturaAmbigua === true,
          reason: duplicate ? "Clave/configuración duplicada en catálogo canónico." :
            integrityRow?.nomenclaturaAmbigua ? integrityRow.advertencias.join("; ") :
              "Sin par exacto publicable en fixture; la cotización comercial puede seguir operativa.",
        },
        sale: { configured: line.precioM2Sugerido > 0, amount: line.precioM2Sugerido, source: catalogSource },
        recipe: {
          expectation,
          exactVariant: false,
          contractPassed: null,
          evidence: audit?.validationStatus === "workshop_validated" ? "workshop_validated" :
            audit?.validationStatus === "documented" ? "documented" : "unverified",
          source: [technicalSource, cuttingSource].filter(Boolean).join("; "),
        },
        // deliberately not supplied: no snapshots/precios privados/glass panes/outputs in static catalog audit
      });
      // La presencia de una receta de referencia NO acredita esta variante publicada.
      rows.push({ ...item, referenciaTecnica: {
        estadoCatalogo: recipeStatus,
        listaParaProbar: audit?.listaParaProbar ?? false,
        evidencia: audit?.validationStatus ?? "unverified",
        perfilesReferenciales: integrityRow?.codigosReferenciales.length ?? 0,
        codigosRecetaDocumentados: integrityRow?.codigosDocumentadosReceta.length ?? 0,
        nota: "Sólo inventario estático; la resolución por variante exacta no fue ejecutada aquí.",
      } });
    }
  }
  rows.sort((a, b) => a.catalogKey.localeCompare(b.catalogKey) || a.configurationId.localeCompare(b.configurationId));
  const totals = summarizeIntegration(rows);
  const expectedLineKeys = new Set(
    VENTORA_DEFAULT_LINE_CATALOG.map((line) => line.catalogKey).filter((key): key is string => Boolean(key))
  );
  const importAudit = auditImportedCatalog({
    source: "src/features/proveedor-catalogos/fixtures/arquetipo-catalogo-2026-10-05.ts",
    technicalInputs: ARQUETIPO_CATALOGO_2026_10_05.technicalInputs,
    presentations: ARQUETIPO_CATALOGO_2026_10_05.presentations,
  });
  const payload = {
    version: 1,
    origin: "fixtures_locales",
    remote: { estado: "no_comprobada", consultas: 0, escrituras: 0 },
    fixtures: { lineasDeclaradas: expectedLineKeys.size, configuracionesDeclaradas: totals.configuraciones },
    denominadores: {
      ...totals,
      unidades: "Una verificación por configuración y por capa; NO representa perfiles ni paños individuales.",
      perfilesCompra: { requeridos: null, evaluados: 0, motivo: "Presentaciones privadas no consultadas" },
      referenciasVidrio: { declaradas: null, evaluadas: 0, motivo: "Snapshots y medidas manuales no consultados" },
    },
    importaciones: { arquetipo: importAudit },
    source: [catalogSource, technicalSource,
      "src/features/cotizaciones/line-templates/services/auditoria-integridad-catalogo-lineas.service.ts",
      "src/features/cotizaciones/line-templates/services/line-template-compatibility.service.ts"],
    rows,
  };
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  expect(rows).toHaveLength(totals.configuraciones);
  // Independent denominator: catches omitted canonical lines even if the
  // generated report repeats its own count consistently.
  expect(totals.lineas).toBe(expectedLineKeys.size);
  expect(totals.lineas).toBe(catalogAudit.size);
  expect(totals.lineas).toBe(integrity.resumen.totalLineas);
  expect(totals.porCapa.catalogo.total).toBe(totals.configuraciones);
  expect(totals.porCapa.vidrios.noComprobada).toBe(totals.configuraciones);
  expect(payload.remote.escrituras).toBe(0);
  expect(importAudit.totalPresentaciones).toBe(importAudit.rows.length);
  expect(importAudit.conteos.fallido).toBe(0);
  expect(importAudit.conteos.ambiguo).toBeGreaterThan(0);
});
