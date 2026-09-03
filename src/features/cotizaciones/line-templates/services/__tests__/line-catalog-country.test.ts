import {
  auditNonChileOrganizationsWithVentoraCatalog,
  resolveDefaultLineCatalogSeedDecision,
} from "../line-catalog-country";

describe("resolveDefaultLineCatalogSeedDecision", () => {
  it("permite seed solo para Chile", () => {
    expect(resolveDefaultLineCatalogSeedDecision("CL")).toEqual({
      shouldSeed: true,
      status: null,
      normalizedCountryCode: "CL",
    });
  });

  it("bloquea seed para otros países", () => {
    expect(resolveDefaultLineCatalogSeedDecision("AR")).toEqual({
      shouldSeed: false,
      status: "blocked_non_chile",
      normalizedCountryCode: "AR",
    });
  });

  it("bloquea seed si falta país", () => {
    expect(resolveDefaultLineCatalogSeedDecision(null)).toEqual({
      shouldSeed: false,
      status: "blocked_missing_country",
      normalizedCountryCode: null,
    });
    expect(resolveDefaultLineCatalogSeedDecision("   ")).toEqual({
      shouldSeed: false,
      status: "blocked_missing_country",
      normalizedCountryCode: null,
    });
  });
});

describe("auditNonChileOrganizationsWithVentoraCatalog", () => {
  it("cuenta organizaciones no chilenas con líneas ventora:*", async () => {
    const result = await auditNonChileOrganizationsWithVentoraCatalog({
      async listOrganizationCountries() {
        return [
          { organizationId: "org-cl", countryCode: "CL" },
          { organizationId: "org-ar", countryCode: "AR" },
          { organizationId: "org-mx", countryCode: "MX" },
          { organizationId: "org-empty", countryCode: null },
        ];
      },
      async countVentoraCatalogLines(organizationId) {
        if (organizationId === "org-ar") return 23;
        if (organizationId === "org-empty") return 2;
        return 0;
      },
    });

    expect(result.organizationCount).toBe(2);
    expect(result.totalVentoraLines).toBe(25);
    expect(result.rows).toEqual([
      { organizationId: "org-ar", countryCode: "AR", ventoraLineCount: 23 },
      { organizationId: "org-empty", countryCode: null, ventoraLineCount: 2 },
    ]);
  });
});
