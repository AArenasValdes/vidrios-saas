/** @jest-environment jsdom */

import {
  buildExplicitNewQuoteHref,
  clearPersistedWorkflowState,
  isExplicitNewQuoteRequest,
  safelySetWorkflowStorageValue,
} from "../workflow-ui";

describe("persistencia local del flujo de cotizacion", () => {
  it("no rompe el flujo cuando Safari rechaza escribir en localStorage", () => {
    const storagePrototype = Object.getPrototypeOf(window.localStorage) as Storage;
    const originalSetItemDescriptor = Object.getOwnPropertyDescriptor(storagePrototype, "setItem");
    Object.defineProperty(storagePrototype, "setItem", {
      configurable: true,
      value: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
    });

    try {
      expect(safelySetWorkflowStorageValue("cotizacion-workflow:new", "{}")).toBe(false);
    } finally {
      if (originalSetItemDescriptor) {
        Object.defineProperty(storagePrototype, "setItem", originalSetItemDescriptor);
      }
    }
  });

  it("tolera que el storage no permita limpiar un borrador", () => {
    const storagePrototype = Object.getPrototypeOf(window.localStorage) as Storage;
    const originalRemoveItemDescriptor = Object.getOwnPropertyDescriptor(
      storagePrototype,
      "removeItem"
    );
    Object.defineProperty(storagePrototype, "removeItem", {
      configurable: true,
      value: () => {
        throw new DOMException("Storage disabled", "SecurityError");
      },
    });

    try {
      expect(() => clearPersistedWorkflowState("cotizacion-workflow:new")).not.toThrow();
    } finally {
      if (originalRemoveItemDescriptor) {
        Object.defineProperty(storagePrototype, "removeItem", originalRemoveItemDescriptor);
      }
    }

  });

  it("distingue nueva cotización explícita de reabrir el mismo path", () => {
    expect(buildExplicitNewQuoteHref()).toBe("/cotizaciones/nueva?nueva=1");
    expect(isExplicitNewQuoteRequest("1")).toBe(true);
    expect(isExplicitNewQuoteRequest(null)).toBe(false);
  });
});
