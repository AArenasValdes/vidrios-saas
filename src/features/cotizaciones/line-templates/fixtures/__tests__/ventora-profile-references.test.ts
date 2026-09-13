import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";
import {
  formatLineProfileReferenceCode,
  getLineTemplateWorkshopProfiles,
} from "@/features/cotizaciones/line-templates/types/line-profile-references";

describe("ventora profile references", () => {
  it("expone códigos y roles para Serie 5000", () => {
    const payload = getVentoraProfileReferencesForCatalogKey("ventora:l5000");
    expect(payload?.profiles).toHaveLength(7);
    expect(payload?.profiles[0]).toMatchObject({
      code: "5001",
      name: "Riel inferior",
      role: "Marco",
      codeStatus: "catalog_reference",
    });
    expect(payload?.profiles.map((profile) => profile.code)).toEqual([
      "5001",
      "5002",
      "5003",
      "5004",
      "5005",
      "5006",
      "5007",
    ]);
  });

  it("deja Óptima S-28 y PVC sin códigos inventados", () => {
    const optima = getVentoraProfileReferencesForCatalogKey(
      "ventora:optima-s28-corredera-2h"
    );
    const pvc = getVentoraProfileReferencesForCatalogKey(
      "ventora:winhouse-new-s75-doble-riel"
    );

    expect(optima?.profiles.length).toBeGreaterThan(0);
    expect(pvc?.profiles.length).toBeGreaterThan(0);
    expect(optima?.profiles.every((profile) => profile.code == null)).toBe(true);
    expect(pvc?.profiles.every((profile) => profile.code == null)).toBe(true);
    expect(
      optima?.profiles.every(
        (profile) => profile.codeStatus === "pending_validation"
      )
    ).toBe(true);
  });

  it("lee workshopProfiles desde catalog_metadata", () => {
    const payload = getVentoraProfileReferencesForCatalogKey("ventora:l20");
    const metadata = { workshopProfiles: payload };
    const parsed = getLineTemplateWorkshopProfiles(metadata);

    expect(parsed?.profiles).toHaveLength(7);
    expect(formatLineProfileReferenceCode(parsed!.profiles[0]!)).toBe("2001");
  });

  it("expone los códigos técnicos fidedignos de AL-32 y AL-42", () => {
    const al32 = getVentoraProfileReferencesForCatalogKey("ventora:l32");
    const al42 = getVentoraProfileReferencesForCatalogKey("ventora:l42");

    expect(al32?.profiles.map((profile) => profile.code)).toEqual([
      "3201",
      "3202",
      "3204",
      "3205",
      "3208",
    ]);
    expect(al42?.profiles.map((profile) => profile.code)).toEqual([
      "4201",
      "4209",
      "4202",
      "4204",
      "4229",
      "4206",
      "4231",
      "4220",
      "4230",
      "4250",
    ]);
    const s33 = getVentoraProfileReferencesForCatalogKey("ventora:s33-corredera-2h");
    const s33Rpt = getVentoraProfileReferencesForCatalogKey("ventora:s33-rpt-corredera-2h");
    expect(s33?.profiles.map((profile) => profile.code)).toEqual([
      "3301",
      "3302",
      "3303",
      "3304",
      "3308",
    ]);
    expect(s33Rpt?.profiles.map((profile) => profile.code)).toEqual([
      "3324",
      "3308",
      "3303",
      "3304",
      "3470",
    ]);
    expect(
      [...(al32?.profiles ?? []), ...(al42?.profiles ?? [])].every(
        (profile) =>
          profile.codeStatus === "catalog_reference" &&
          profile.source === "Estudio técnico de líneas aportado por el usuario (2026-09-13)"
      )
    ).toBe(true);
  });

  it("expone códigos del estudio para S60 sin marcar receta validada", () => {
    const payload = getVentoraProfileReferencesForCatalogKey("ventora:winhouse-s60");

    expect(payload?.profiles.map((profile) => profile.code)).toEqual([
      "7160Z00013",
      "7160Z00016",
      "720000200",
      "716CZ00001",
      "716CZ00002",
      "716CZ00003",
      "726332612N",
      "2433242N",
      "4040BOX15",
      "78200010001",
    ]);
    expect(
      payload?.profiles.every((profile) => profile.codeStatus === "catalog_reference")
    ).toBe(true);
  });

  it("expone refuerzos Andes y conserva perfiles principales pendientes", () => {
    const payload = getVentoraProfileReferencesForCatalogKey(
      "ventora:winhouse-andes-monorriel"
    );

    expect(payload?.profiles.filter((profile) => profile.code)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PL-SLA-TC-MLT-12", role: "Refuerzo" }),
        expect.objectContaining({ code: "PL-SLA-TC-H54-12", role: "Refuerzo" }),
        expect.objectContaining({ code: "HL-ACC-5X5-APOC-MA", role: "Accesorio" }),
      ])
    );
    expect(
      payload?.profiles.some(
        (profile) =>
          profile.name === "Marco monorriel corredera Andes" && profile.code == null
      )
    ).toBe(true);
  });
});
