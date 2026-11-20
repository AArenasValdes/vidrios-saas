import { listWorkshopCatalogProfiles } from "../workshop-presentation-catalog.service";

describe("referencias sugeridas de Mis precios", () => {
  it.each([
    ["ventora:l42", "4201"],
    ["ventora:veratec-7400-corredera", "7401"],
    ["ventora:kompen-prime-line-700", "KOM 701"],
  ])("expone códigos documentados de %s sin cambiar su estado técnico", (catalogKey, expectedCode) => {
    const profiles = listWorkshopCatalogProfiles(catalogKey);
    expect(profiles.some((profile) => profile.code === expectedCode)).toBe(true);
    expect(profiles.every((profile) => profile.code.trim() && profile.name.trim())).toBe(true);
  });

  it("no fabrica referencias para líneas sin códigos canónicos", () => {
    expect(listWorkshopCatalogProfiles("ventora:linea-comercial-pendiente")).toEqual([]);
  });
});
