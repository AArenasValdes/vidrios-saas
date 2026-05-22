import {
  buildPublicRequestShareClipboardText,
  buildPublicRequestShareText,
  getPublicRequestShareVariants,
} from "../public-request-share.service";

describe("public-request-share.service", () => {
  it("usa una variante corta para instagram", () => {
    const text = buildPublicRequestShareText({
      empresaNombre: "Ventora Glass",
      channel: "instagram",
    });

    expect(text).toContain("Cotiza aqui las 24 horas");
    expect(text).toContain("Dejame tu solicitud aqui");
  });

  it("usa una variante mas directa para whatsapp", () => {
    const text = buildPublicRequestShareText({
      empresaNombre: "Ventora Glass",
      channel: "whatsapp",
    });

    expect(text).toContain("Mandame tu solicitud por este link");
  });

  it("expone variantes por canal para usos futuros", () => {
    const variants = getPublicRequestShareVariants({
      empresaNombre: "Ventora Glass",
      channel: "facebook",
    });

    expect(variants).toHaveLength(2);
    expect(variants[0]?.label).toBeTruthy();
    expect(variants[1]?.label).toBeTruthy();
  });

  it("arma el clipboard final con texto y url", () => {
    const value = buildPublicRequestShareClipboardText({
      url: "https://ventorap.cl/solicitud/demo",
      empresaNombre: "Ventora Glass",
      channel: "qr",
    });

    expect(value).toContain("https://ventorap.cl/solicitud/demo");
    expect(value.split("\n").length).toBeGreaterThan(2);
  });
});
