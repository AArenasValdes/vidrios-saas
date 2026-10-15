import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";
import { filterLineTemplatesForComponent } from "@/features/cotizaciones/new-quote/workflow-ui";
import { resolveFabricationRecipe } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { resolveSupplierPresentationsForQuoteItem } from "@/features/proveedor-catalogos/services/supplier-presentation-resolution.service";

const KEYS = [
  "ventora:kompen-prime-line-700",
  "ventora:kompen-form-line-800",
  "ventora:kompen-star-line-500",
  "ventora:thermowin-americana-s70",
] as const;

const LINE_KEYS = VENTORA_DEFAULT_LINE_CATALOG
  .filter((entry) =>
    KEYS.includes(entry.catalogKey as (typeof KEYS)[number]) ||
    entry.catalogKey?.startsWith("ventora:kompen-prime-line-700:configuration:") === true ||
    entry.catalogKey?.startsWith("ventora:kompen-form-line-800:configuration:") === true ||
    entry.catalogKey?.startsWith("ventora:kompen-star-line-500:configuration:") === true ||
    entry.catalogKey?.startsWith("ventora:thermowin-americana-s70:configuration:") === true
  )
  .map((entry) => entry.catalogKey as string);

function line(catalogKey: string, id: number): CotizacionLineTemplate {
  const source = VENTORA_DEFAULT_LINE_CATALOG.find((entry) => entry.catalogKey === catalogKey);
  if (!source) throw new Error(`Falta línea ${catalogKey}`);
  return {
    id,
    organizationId: 10,
    catalogKey: source.catalogKey ?? null,
    nombre: source.nombre,
    categoria: "pvc",
    unidadCobro: "m2",
    material: "PVC",
    vidrioPrincipalRecomendado: null,
    costoBase: 0,
    precioM2Sugerido: 0,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: source.proveedor ?? null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: source.catalogMetadata ?? {},
    isActive: true,
    sortOrder: id,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
  };
}

describe("Kompen Thermowin: contrato de integración documental", () => {
  const lines = LINE_KEYS.map((key, index) => line(key, index + 1));

  it.each([
    ["NUEVA PRIME LINE 700 2025 (2).pdf", "9E17573F771A74D218EFE658F9050CA590B91F6383090A5DF16783DADA18D54C"],
    ["NUEVO FORM LINE 800 2025 (1).pdf", "C35DCC1A42F3766EC547C51F80EF79CC702376C99A5BCFB855F5E2DBA463922C"],
    ["NUEVA STAR LINE 500 2025.pdf", "C477B4C7D857BD27429E1294AE26FF5D4BA43B8F364E6898ED6A1ACBAE018994"],
    ["NUEVO CATALOGO LINEA AMERICANA S-70 TW 2022.pdf", "33630F311285405342529723189344B296BF4865D636722C05D681C574AE23C7"],
    ["Catalogo de herrajes 2024 corregido.pdf 06.12.pdf", "8858503FF0252F81872FEAE4C8CFDD85172263DFA1FA85E213F953D34096C9F1"],
  ])("conserva fuente revisada %s", (document, expectedHash) => {
    const path = resolve(process.cwd(), "docs", "fabricacion", "Kompen Thermowin", document);
    const hash = createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
    expect(hash).toBe(expectedHash);
  });

  it("registra cuatro sistemas con identidad, procedencia y perfiles propios, sin precio supuesto", () => {
    expect(new Set(lines.map((entry) => entry.catalogKey)).size).toBe(12);
    expect(new Set(lines.map((entry) => entry.catalogMetadata?.familyKey)).size).toBe(4);
    for (const entry of lines) {
      expect(entry.precioM2Sugerido).toBe(0);
      expect(entry.catalogMetadata?.familyKey).toMatch(/^thermowin:/);
      expect(entry.catalogMetadata?.productCatalogEvidence?.document).toMatch(/\.pdf$/);
      expect(entry.catalogMetadata?.cuttingGuideSource).toBeUndefined();
      const profiles = getVentoraProfileReferencesForCatalogKey(entry.catalogKey)?.profiles ?? [];
      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles.every((profile) => profile.provider === "Thermowin Kompen")).toBe(true);
      expect(profiles.every((profile) => profile.source?.includes("docs/fabricacion/Kompen Thermowin/"))).toBe(true);
      expect(profiles.every((profile) => profile.codeStatus === "catalog_reference")).toBe(true);
    }
  });

  it("agrupa solo los perfiles Form Line 800 cuyo catálogo identifica ventana o puerta", () => {
    const profiles = getVentoraProfileReferencesForCatalogKey(KEYS[1])?.profiles ?? [];
    expect(profiles.find((profile) => profile.code === "KOM 804")?.applicationGroup).toBe("Ventanas correderas");
    expect(profiles.find((profile) => profile.code === "KOM 817")?.applicationGroup).toBe("Ventanas correderas");
    expect(profiles.find((profile) => profile.code === "R804")?.applicationGroup).toBe("Ventanas correderas");
    expect(profiles.find((profile) => profile.code === "KOM 815")?.applicationGroup).toBe("Puertas correderas");
    expect(profiles.find((profile) => profile.code === "KOM 820")?.applicationGroup).toBe("Puertas correderas");
    expect(profiles.find((profile) => profile.code === "R815")?.applicationGroup).toBe("Puertas correderas");
    expect(profiles.find((profile) => profile.code === "KOM 801")?.applicationGroup).toBeUndefined();
  });

  it.each([
    ["Ventana", "Abatible", [KEYS[0], KEYS[2]]],
    ["Ventana", "Corredera", [KEYS[1], KEYS[3]]],
    ["Ventana", "Guillotina", ["ventora:thermowin-americana-s70:configuration:ventana-guillotina"]],
    ["Ventana", "Celosía", ["ventora:thermowin-americana-s70:configuration:ventana-celosia"]],
    ["Puerta", "Corredera", ["ventora:kompen-form-line-800:configuration:puerta-corredera"]],
    ["Paño fijo", "Fijo", [
      "ventora:kompen-prime-line-700:configuration:pano-fijo",
      "ventora:kompen-star-line-500:configuration:pano-fijo",
      "ventora:thermowin-americana-s70:configuration:pano-fijo",
    ]],
  ])("filtra %s / %s por compatibilidad explícita", (tipo, sistema, expected) => {
    expect(filterLineTemplatesForComponent(lines, { tipo, sistema, material: "PVC" })
      .map((entry) => entry.catalogKey)).toEqual(expected);
  });

  it.each([
    ["Prime no combina puerta con apertura fija", "Puerta", "Fijo", KEYS[0]],
    ["Americana no ofrece ventana abatible", "Ventana", "Abatible", KEYS[3]],
    ["Form no combina paño fijo con corredera", "Paño fijo", "Corredera", KEYS[1]],
  ])("respeta los pares de componente y sistema: %s", (_label, type, opening, key) => {
    expect(filterLineTemplatesForComponent(lines, { tipo: type, sistema: opening, material: "PVC" })
      .map((entry) => entry.catalogKey)).not.toContain(key);
  });

  it("sin receta por sistema y composición no declara despiece", () => {
    for (const entry of lines) {
      expect(resolveFabricationRecipe([], {
        organizationId: 10,
        lineTemplateId: entry.id,
        catalogKey: entry.catalogKey,
        tipologia: "corredera",
        hojas: 2,
      }).estado).toBe("sin_receta");
    }
  });

  it("separa el mismo código comercial por familia al resolver precio/presentación", () => {
    const presentations = [
      { presentationId: "prime", providerKey: "thermowin", supplierSku: "PRIME-506", technicalCode: "KOM 506", recipeComponentCodes: [], familyKeys: ["thermowin:kom-700"], finishCode: null, finishName: null, finishResolution: "finish_independent" as const, commercialLengthMm: 6000 },
      { presentationId: "form", providerKey: "thermowin", supplierSku: "FORM-506", technicalCode: "KOM 506", recipeComponentCodes: [], familyKeys: ["thermowin:kom-800"], finishCode: null, finishName: null, finishResolution: "finish_independent" as const, commercialLengthMm: 6000 },
    ];
    const selection = resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "item-1", familyKey: "thermowin:kom-700", finishName: null, technicalCodes: ["KOM 506"] },
      presentations,
    });
    expect(selection).toMatchObject([{ status: "resolved", presentationId: "prime" }]);
  });
});
