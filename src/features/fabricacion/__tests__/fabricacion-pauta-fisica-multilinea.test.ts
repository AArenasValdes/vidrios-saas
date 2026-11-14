import { calcularCubicacionYPauta } from "../services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "../services/fabricacion-pauta-barras.service";
import { construirFabricacionTrabajoSnapshot } from "../services/fabricacion-trabajo-snapshot.service";
import { evaluarPautaFisicaTrabajo } from "../services/fabricacion-pauta-fisica.service";
import { buildAllSodalL25Recipes } from "../fixtures/sodal-l25-zeta-recipes";
import { crearRecetaL20AlumetricaVariant } from "../fixtures/l20-alumetrica-variant-recipes";
import { crearRecetaReferenciaL5000Corredera2H } from "../fixtures/bases-tipologicas-ventora";
import { crearRecetaVeratec7400Corredera, VERATEC_7400_VARIANT_MONOLITICO_4MM } from "../fixtures/veratec-7400-corredera-recipe";
import type { FabricacionCotizacionSnapshot } from "../types/fabricacion-snapshot";
import type { FabricationRecipeRecord } from "../types/fabricacion-persistence";
import { construirSnapshotFabricacionCotizacion } from "../services/fabricacion-cotizacion-snapshot.service";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { writeFileSync } from "node:fs";

const recipeCases = [
  { family: "L25", make: () => buildAllSodalL25Recipes().find((entry) => entry.recipeId === "monolitico_pierna_abierta_2h_1800x1500")!.definition, length: 6000 },
  { family: "L20", make: () => crearRecetaL20AlumetricaVariant({ variant: "pierna_abierta_jamba_2009", lineName: "L20" }), length: 6000 },
  { family: "L5000", make: () => crearRecetaReferenciaL5000Corredera2H(), length: 6000 },
  { family: "Veratec 7400", make: () => crearRecetaVeratec7400Corredera({ lineName: "Veratec 7400", variant: VERATEC_7400_VARIANT_MONOLITICO_4MM }), length: 5800 },
];
const passedFamilies = new Set<string>();

describe("matriz transversal del motor de barras", () => {
  it.each(recipeCases)("$family: conserva cortes y declara parámetros físicos pendientes", ({ family, make, length }) => {
    const recipe = make();
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1800, altoTotalMm: 1500, cantidad: 1,
      hojas: recipe.identidad.hojas, modulos: recipe.identidad.modulos, variante: recipe.identidad.variante,
    });
    const plan = construirPautaBarrasFabricacion({ receta: recipe, resultado: result });
    expect(plan.calculable).toBe(true);
    expect(plan.parametrosFisicos?.estado).toBe("pendiente");
    expect(plan.barras.every((bar) => bar.largoComercialMm === length)).toBe(true);
    expect(plan.barras.flatMap((bar) => bar.cortes)).toHaveLength(result.perfiles.reduce((sum, row) => sum + row.cantidadPiezas, 0));
    for (const bar of plan.barras) {
      expect(new Set(bar.cortes.map((cut) => cut.codigoPerfil)).size).toBe(1);
      expect(bar.usadoMm + bar.sobranteMm).toBe(bar.largoComercialMm);
      expect(bar.usadoMm).toBeLessThanOrEqual(bar.largoComercialMm);
    }
    const snapshot = { lineTemplateId: 10, pautaBarras: plan } as FabricacionCotizacionSnapshot;
    const work = construirFabricacionTrabajoSnapshot({ items: [{ id: "v1", codigo: "V1", nombre: "Ventana", lineaComercial: recipe.identidad.nombre, snapshot }] });
    expect(work?.bars.flatMap((bar) => bar.cortes)).toHaveLength(result.perfiles.reduce((sum, row) => sum + row.cantidadPiezas, 0));
    expect(evaluarPautaFisicaTrabajo(work)).toBe("teorica");
    const first = result.perfiles[0]!;
    const boundaryRecipe = { ...recipe, configuracionCorte: {
      perdidaCorteMm: 0, despunteInicialMm: 0, sobranteMinimoAprovechableMm: null,
      confirmacionFisica: { procedimiento: "por_pieza" as const, fuente: "Fixture de prueba", largosComercialesConfirmados: true as const },
    } };
    const exact = construirPautaBarrasFabricacion({ receta: boundaryRecipe, resultado: {
      ...result, perfiles: [{ ...first, medidaMm: length, cantidadPiezas: 1, totalLinealMm: length }],
    } });
    expect(exact.barras[0]?.sobranteMm).toBe(0);
    const oversized = construirPautaBarrasFabricacion({ receta: boundaryRecipe, resultado: {
      ...result, perfiles: [{ ...first, medidaMm: length + 1, cantidadPiezas: 1, totalLinealMm: length + 1 }],
    } });
    expect(oversized.calculable).toBe(false);
    passedFamilies.add(family);
  });

  it("Veratec: una presentación explícita de 6800 mm cambia el largo sin perder cortes", () => {
    const recipe = recipeCases[3]!.make();
    const result = calcularCubicacionYPauta(recipe, { anchoTotalMm: 1800, altoTotalMm: 1500, cantidad: 1, hojas: 2, modulos: 2, variante: VERATEC_7400_VARIANT_MONOLITICO_4MM });
    const plan = construirPautaBarrasFabricacion({ receta: recipe, resultado: result });
    const codes = [...new Set(plan.barras.flatMap((bar) => bar.cortes.map((cut) => cut.codigoPerfil)))];
    const snapshot = { lineTemplateId: 10, pautaBarras: plan } as FabricacionCotizacionSnapshot;
    const work = construirFabricacionTrabajoSnapshot({ items: [{
      id: "v1", codigo: "V1", nombre: "Ventana", lineaComercial: "Veratec 7400", snapshot,
      requireSupplierPresentation: true, supplierPresentationSelections: codes.map((code) => ({
        technicalCode: code, status: "resolved" as const, presentationId: `p-${code}`, providerKey: "xelena",
        supplierSku: `sku-${code}`, finishCode: "200", finishName: "Negro", commercialLengthMm: 6800,
      })),
    }] });
    expect(work?.bars.every((bar) => bar.largoComercialMm === 6800)).toBe(true);
    expect(work?.bars.flatMap((bar) => bar.cortes)).toHaveLength(plan.barras.flatMap((bar) => bar.cortes).length);
    expect(evaluarPautaFisicaTrabajo(work)).toBe("teorica");
  });

  it("bloquea una pauta conjunta que duplica un corte aunque la barra cierre aritméticamente", () => {
    const definition = crearRecetaReferenciaL5000Corredera2H();
    const recipe = { id: "r1", organizationId: 1, lineTemplateId: 10, scope: "organization", version: 1,
      status: "validated", definition, sourceType: "manual" } as FabricationRecipeRecord;
    const snapshot = construirSnapshotFabricacionCotizacion({ recipe, entrada: {
      anchoTotalMm: 1800, altoTotalMm: 1500, cantidad: 1, hojas: 2, modulos: 2,
      variante: definition.identidad.variante,
    } });
    const row = { id: "v1", codigo: "V1", tipo: "Ventana", nombre: "Corredera", lineaComercial: "L5000",
      ancho: 1800, alto: 1500, cantidad: 1, fabricacionSnapshot: snapshot,
      observaciones: encodeCotizacionItemPresentationMeta({ lineTemplateId: "10", fabricacionTipologia: "corredera" }) };
    const work = construirFabricacionTrabajoSnapshot({ items: [{ id: row.id, codigo: row.codigo, nombre: row.nombre, lineaComercial: row.lineaComercial, snapshot }] })!;
    expect(buildFabricationQuoteSummary([row], { trabajoSnapshot: work }).profileCoverage?.jointPlanStatus).toBe("theoretical");
    const corrupt = structuredClone(work);
    const bar = corrupt.bars[0]!;
    const cut = bar.cortes[0]!;
    const used = bar.despunteInicialMm + cut.largoMm + bar.perdidaCorteMm;
    corrupt.bars.push({ ...bar, indice: bar.indice + 100, cortes: [cut], usadoMm: used, sobranteMm: bar.largoComercialMm - used });
    corrupt.totalBars += 1;
    corrupt.totalProfilesLinealMm += cut.largoMm;
    corrupt.totalWasteMm += bar.largoComercialMm - used;
    expect(evaluarPautaFisicaTrabajo(corrupt)).toBe("teorica");
    expect(buildFabricationQuoteSummary([row], { trabajoSnapshot: corrupt }).profileCoverage?.jointPlanStatus).toBe("blocked");
  });

  it("genera una matriz conservadora por familia de catálogo", () => {
    const verified: Record<string, string> = {
      "universal:aluminio:l25": "L25", "universal:aluminio:l20": "L20",
      "universal:aluminio:l5000": "L5000", "veratec:sliding-7400": "Veratec 7400",
    };
    const rows = new Map<string, { family: string; keys: Set<string>; tested: string | null }>();
    for (const line of VENTORA_DEFAULT_LINE_CATALOG) {
      const key = line.catalogKey?.trim();
      if (!key) continue;
      const meta = line.catalogMetadata as Record<string, unknown> | null | undefined;
      const family = typeof meta?.familyKey === "string" ? meta.familyKey : key;
      const row = rows.get(family) ?? { family, keys: new Set<string>(), tested: verified[family] ?? null };
      row.keys.add(key);
      rows.set(family, row);
    }
    const lines = ["familia,claves,motor_comun,empaquetado,limite_capacidad,parametros_fisicos,resultado"];
    for (const row of [...rows.values()].sort((a, b) => a.family.localeCompare(b.family))) {
      const pass = row.tested != null && passedFamilies.has(row.tested);
      const fields = [row.family, [...row.keys].join(" | "), pass ? "verificado en variante representativa" : "sin verificar",
        pass ? "probado" : "sin cobertura", pass ? "probado" : "sin cobertura", pass ? "pendientes en fixture" : "sin verificar",
        pass ? "PASS representativo" : "SIN COBERTURA"];
      lines.push(fields.map((value) => `"${value.replace(/"/g, '""')}"`).join(","));
    }
    expect(passedFamilies.size).toBe(4);
    if (process.env.VENTORA_PAUTA_MATRIX_PATH) writeFileSync(process.env.VENTORA_PAUTA_MATRIX_PATH, `${lines.join("\n")}\n`, "utf8");
  });
});
