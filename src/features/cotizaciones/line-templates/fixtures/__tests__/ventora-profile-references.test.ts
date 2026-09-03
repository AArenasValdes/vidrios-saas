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
});
