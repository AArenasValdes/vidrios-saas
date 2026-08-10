import { getLineTemplateProfilePreview } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

describe("getLineTemplateProfilePreview", () => {
  it("expone solo previews con asset seguro y procedencia", () => {
    expect(
      getLineTemplateProfilePreview({
        profilePreview: {
          assetUrl: "/catalogos/serie-32-seccion.png",
          sourceLabel: "Catálogo oficial Alar",
          sourcePage: 18,
        },
      })
    ).toEqual({
      assetUrl: "/catalogos/serie-32-seccion.png",
      sourceLabel: "Catálogo oficial Alar",
      sourcePage: 18,
    });
  });

  it("oculta assets sin procedencia o con protocolo no permitido", () => {
    expect(
      getLineTemplateProfilePreview({
        profilePreview: { assetUrl: "data:image/svg+xml,perfil", sourceLabel: "Manual" },
      })
    ).toBeNull();

    expect(
      getLineTemplateProfilePreview({
        profilePreview: { assetUrl: "https://proveedor.cl/perfil.png", sourceLabel: "" },
      })
    ).toBeNull();

    expect(
      getLineTemplateProfilePreview({
        profilePreview: { assetUrl: "//untrusted.example/perfil.svg", sourceLabel: "Manual" },
      })
    ).toBeNull();
  });
});
