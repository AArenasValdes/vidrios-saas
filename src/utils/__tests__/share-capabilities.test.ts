import {
  DEFAULT_COTIZACION_SHARE_EXPERIENCE,
  detectLikelyMobileDevice,
  resolveCotizacionShareExperience,
} from "../share-capabilities";

describe("share-capabilities utils", () => {
  it("debe detectar un dispositivo movil por user agent", () => {
    expect(
      detectLikelyMobileDevice({
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36",
        maxTouchPoints: 5,
        screenWidth: 412,
      })
    ).toBe(true);
  });

  it("debe resolver el CTA de compartir por WhatsApp cuando el navegador puede compartir archivos", () => {
    expect(
      resolveCotizacionShareExperience({
        canSharePdf: true,
        isLikelyMobile: true,
      })
    ).toMatchObject({
      actionLabel: "Compartir por WhatsApp",
      canSharePdf: true,
    });
  });

  it("debe usar el fallback de escritorio cuando no puede compartir archivos", () => {
    expect(
      resolveCotizacionShareExperience({
        canSharePdf: false,
        isLikelyMobile: false,
      })
    ).toEqual(DEFAULT_COTIZACION_SHARE_EXPERIENCE);
  });
});
