import { buildTechnicalCardStatus } from "@/features/cotizaciones/line-templates/services/catalogo-fabricacion-card-status";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { crearBaseTipologicaVentora } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";

function makeTemplate(
  overrides?: Partial<CotizacionLineTemplate>
): CotizacionLineTemplate {
  return {
    id: 1,
    organizationId: 1,
    nombre: "Serie demo",
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: null,
    costoBase: 0,
    precioM2Sugerido: 45000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: "Alar",
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {},
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
    ...overrides,
  };
}

function makeRecipe(
  status: FabricationRecipeRecord["status"]
): FabricationRecipeRecord {
  let nextId = 0;
  const definition = crearBaseTipologicaVentora({
    tipologia: "corredera",
    hojas: 2,
    modulos: 2,
    lineName: "Serie demo",
    createId: () => `status-${nextId++}`,
  });

  return {
    id: `recipe-${status}`,
    organizationId: 1,
    lineTemplateId: 1,
    scope: "organization",
    providerName: "Alar",
    lineName: "Serie demo",
    typology: "corredera",
    leavesCount: 2,
    variant: "estandar",
    version: 1,
    status,
    definition,
    sourceType: "manual",
    sourceReference: "base-ventora:corredera:2",
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("catalogo fabricacion card status", () => {
  it("usa lenguaje Fabricación y no bloquea cotizar sin configurar", () => {
    const status = buildTechnicalCardStatus(makeTemplate(), []);

    expect(status).toMatchObject({
      label: "Sin configurar",
      detail: "Puedes cotizar igualmente.",
      actionLabel: "Configurar fabricación",
      filter: "solo_cotizar",
    });
  });

  it("distingue borrador, lista para probar y validada", () => {
    expect(buildTechnicalCardStatus(makeTemplate(), [makeRecipe("draft")])).toMatchObject({
      label: "Borrador",
      actionLabel: "Continuar configuración",
    });
    expect(
      buildTechnicalCardStatus(makeTemplate(), [makeRecipe("testing")])
    ).toMatchObject({
      label: "Borrador",
      actionLabel: "Continuar configuración",
    });
    expect(
      buildTechnicalCardStatus(makeTemplate(), [makeRecipe("validated")])
    ).toMatchObject({
      label: "Validada",
      detail: "Lista para generar despiece y pauta.",
      actionLabel: "Ver fabricación",
    });
  });
});
