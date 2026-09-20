/** @jest-environment jsdom */

import { sharePublicPage } from "../share-public-page.service";

describe("sharePublicPage", () => {
  const originalShare = navigator.share;
  const originalClipboard = navigator.clipboard;

  afterEach(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: originalShare,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  });

  it("usa Web Share API cuando está disponible", async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });

    const result = await sharePublicPage({
      url: "https://ventorap.cl/solicitud/demo",
      empresaNombre: "Vidrios González",
      channel: "direct",
    });

    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cotiza con Vidrios González",
        url: "https://ventorap.cl/solicitud/demo",
      })
    );
  });

  it("copia el enlace si no hay Web Share", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const result = await sharePublicPage({
      url: "https://ventorap.cl/solicitud/demo",
      empresaNombre: "Vidrios González",
      channel: "direct",
    });

    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalled();
    expect(String(writeText.mock.calls[0]?.[0])).toContain(
      "https://ventorap.cl/solicitud/demo"
    );
  });

  it("no copia si la persona cancela el share nativo", async () => {
    const abortError = new DOMException("Share canceled", "AbortError");
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: jest.fn().mockRejectedValue(abortError),
    });
    const writeText = jest.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const result = await sharePublicPage({
      url: "https://ventorap.cl/solicitud/demo",
      channel: "direct",
    });

    expect(result).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });
});
