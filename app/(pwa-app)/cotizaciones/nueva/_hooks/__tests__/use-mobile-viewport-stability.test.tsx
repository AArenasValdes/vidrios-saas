/** @jest-environment jsdom */

import { renderHook } from "@testing-library/react";

import { useMobileViewportStability } from "../use-mobile-viewport-stability";

describe("useMobileViewportStability", () => {
  it("sincroniza el visual viewport y libera los estilos al desmontar", () => {
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    const originalViewport = window.visualViewport;

    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        height: 612.4,
        offsetTop: 11.8,
        addEventListener,
        removeEventListener,
      },
    });

    const { unmount } = renderHook(() => useMobileViewportStability());

    expect(document.documentElement.style.getPropertyValue("--cq-viewport-height")).toBe("612px");
    expect(document.documentElement.style.getPropertyValue("--cq-viewport-top")).toBe("12px");
    expect(document.body.style.overflow).toBe("hidden");
    expect(addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));

    unmount();

    expect(document.documentElement.style.getPropertyValue("--cq-viewport-height")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--cq-viewport-top")).toBe("");
    expect(document.body.style.overflow).toBe("");
    expect(removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));

    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: originalViewport,
    });
  });
});
