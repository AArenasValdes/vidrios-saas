import {
  consumeLineasPreciosNavigationState,
  LINEAS_PRECIOS_NAVIGATION_STATE_KEY,
  saveLineasPreciosNavigationState,
  type LineasPreciosNavigationState,
} from "../lineas-precios-navigation-state";

describe("lineas precios navigation state", () => {
  const createMemoryStorage = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
  };

  const createState = (): LineasPreciosNavigationState => ({
    query: "",
    categoryFilter: "pvc",
    statusFilter: "todas",
    technicalFilter: "todas",
    providerFilter: "Todos los proveedores",
    expandedFamilyAccordions: { "ventora:VERATEC:elevadora": true },
    scrollY: 684,
    mobile: {
      scope: "providers",
      mineDrill: null,
      providerName: "VERATEC",
      providerFamilyKey: "elevadora",
      showHiddenUniversalReferences: false,
      selectedLineId: 1533,
    },
  });

  it("restores the provider, family, selected line, filters, and scroll position once", () => {
    const storage = createMemoryStorage();
    saveLineasPreciosNavigationState(storage, createState());

    expect(consumeLineasPreciosNavigationState(storage)).toEqual(createState());
    expect(storage.getItem(LINEAS_PRECIOS_NAVIGATION_STATE_KEY)).toBeNull();
    expect(consumeLineasPreciosNavigationState(storage)).toBeNull();
  });

  it("ignores malformed stored state", () => {
    const storage = createMemoryStorage();
    storage.setItem(LINEAS_PRECIOS_NAVIGATION_STATE_KEY, "{invalid json");

    expect(consumeLineasPreciosNavigationState(storage)).toBeNull();
    expect(storage.getItem(LINEAS_PRECIOS_NAVIGATION_STATE_KEY)).toBeNull();
  });
});
