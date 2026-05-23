import { getAndroidManualInstallHintFromUserAgent } from "../install-app-prompt";

describe("install-app-prompt helpers", () => {
  it("detecta Opera Android y devuelve pasos manuales", () => {
    const hint = getAndroidManualInstallHintFromUserAgent(
      "Mozilla/5.0 (Linux; Android 14; moto g54) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 OPR/83.0.0000.00000"
    );

    expect(hint).toEqual({
      browserLabel: "Opera",
      menuLabel: "menu O",
      installLabel: "Instalar app",
      fallbackInstallLabel: "Agregar a pantalla principal",
    });
  });

  it("ignora navegadores no Android", () => {
    const hint = getAndroidManualInstallHintFromUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
    );

    expect(hint).toBeNull();
  });
});
