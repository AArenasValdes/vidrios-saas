import {
  resolveFabricacionParametrosCorte,
  debeAplicarParametrosDeTaller,
  filtrarParametrosCortePorOrganizacion,
  resolveFabricationMaterialForQuoteItem,
  type FabricacionParametrosCorteConfirmados,
} from "@/features/fabricacion/services/fabricacion-parametros-corte.service";

const organization: FabricacionParametrosCorteConfirmados = {
  perdidaCorteMm: 3,
  despunteInicialMm: 12,
  procedimiento: "por_pieza",
  fuente: "Parámetros de corte confirmados por el taller.",
  largosComercialesConfirmados: false,
  confirmedBy: "user-1",
  confirmedAt: "2026-11-14T12:00:00.000Z",
  organizationId: 41,
};

describe("resolveFabricacionParametrosCorte", () => {
  it("aplica defaults solo a cotizaciones nuevas de líneas de aluminio", () => {
    expect(debeAplicarParametrosDeTaller({ isNewQuote: true, catalogMaterial: "Aluminio" })).toBe(true);
    expect(debeAplicarParametrosDeTaller({ isNewQuote: true, catalogMaterial: "PVC" })).toBe(false);
    expect(debeAplicarParametrosDeTaller({ isNewQuote: false, catalogMaterial: "Aluminio" })).toBe(false);
    expect(debeAplicarParametrosDeTaller({ isNewQuote: true, catalogMaterial: null })).toBe(false);
  });
  it("no aplica parámetros cargados para otra organización", () => {
    expect(filtrarParametrosCortePorOrganizacion(organization, 41)).toBe(organization);
    expect(filtrarParametrosCortePorOrganizacion(organization, 42)).toBeNull();
    expect(filtrarParametrosCortePorOrganizacion(organization, null)).toBeNull();
  });

  it("resuelve el material explícito de una línea privada sin asumir aluminio en metadata legacy", () => {
    expect(resolveFabricationMaterialForQuoteItem({
      catalogMaterial: null,
      observations: "[m:Aluminio][lti:927][lck:custom:linea-aluminio]",
    })).toBe("Aluminio");
    expect(resolveFabricationMaterialForQuoteItem({
      catalogMaterial: null,
      observations: "[m:PVC][lti:928][lck:custom:linea-pvc]",
    })).toBe("PVC");
    expect(resolveFabricationMaterialForQuoteItem({
      catalogMaterial: null,
      observations: "[lti:929][lck:custom:linea-legacy]",
    })).toBeNull();
    expect(resolveFabricationMaterialForQuoteItem({
      catalogMaterial: "PVC",
      observations: "[m:Aluminio]",
    })).toBe("PVC");
  });
  it("prioriza el ajuste confirmado para el trabajo sobre taller y receta", () => {
    const result = resolveFabricacionParametrosCorte({
      organizationSettings: organization,
      jobOverride: { ...organization, perdidaCorteMm: 4 },
      recipeConfiguration: {
        perdidaCorteMm: 2,
        despunteInicialMm: 5,
        sobranteMinimoAprovechableMm: 100,
        confirmacionFisica: {
          procedimiento: "por_pieza",
          fuente: "Manual de receta",
          largosComercialesConfirmados: true,
        },
      },
    });

    expect(result).toMatchObject({
      perdidaCorteMm: 4,
      despunteInicialMm: 12,
      source: "job_override",
      organizationId: 41,
    });
  });

  it("usa parámetros del taller si la receta no documenta ambos valores", () => {
    const result = resolveFabricacionParametrosCorte({
      organizationSettings: organization,
      recipeConfiguration: {
        perdidaCorteMm: null,
        despunteInicialMm: null,
        sobranteMinimoAprovechableMm: 70,
      },
    });

    expect(result).toMatchObject({
      perdidaCorteMm: 3,
      despunteInicialMm: 12,
      source: "organization",
      sobranteMinimoAprovechableMm: 70,
    });
  });

  it("prioriza los valores confirmados del taller sobre los parámetros documentados de receta", () => {
    const result = resolveFabricacionParametrosCorte({
      organizationSettings: organization,
      recipeConfiguration: {
        perdidaCorteMm: 2,
        despunteInicialMm: 5,
        sobranteMinimoAprovechableMm: 70,
      },
    });

    expect(result).toMatchObject({
      perdidaCorteMm: 3,
      despunteInicialMm: 12,
      source: "organization",
      largosComercialesConfirmados: false,
    });
  });

  it("usa parámetros de receta cuando no hay defaults confirmados del taller", () => {
    const result = resolveFabricacionParametrosCorte({
      recipeConfiguration: {
        perdidaCorteMm: 2,
        despunteInicialMm: 5,
        sobranteMinimoAprovechableMm: 70,
        confirmacionFisica: {
          procedimiento: "por_pieza",
          fuente: "Manual de receta",
          largosComercialesConfirmados: true,
        },
      },
    });

    expect(result).toMatchObject({
      perdidaCorteMm: 2,
      despunteInicialMm: 5,
      source: "recipe",
      largosComercialesConfirmados: true,
    });
  });

  it("mantiene el cálculo teórico si no hay confirmación suficiente", () => {
    expect(resolveFabricacionParametrosCorte({})).toMatchObject({
      perdidaCorteMm: null,
      despunteInicialMm: null,
      procedure: null,
      source: "unknown",
    });
  });
});
