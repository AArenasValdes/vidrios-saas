import { getSupplierCatalogQaConfig, isQuoteEligibleForFirstSupplierCostSnapshot, isSupplierCatalogQaEnabledForOrganization, matchesConfiguredPilotQuoteItems } from "../proveedor-catalogo-qa.service";

describe("supplier catalog QA gate", () => {
  it("permanece apagado si no hay configuración explícita", () => {
    const config = getSupplierCatalogQaConfig({} as NodeJS.ProcessEnv);
    expect(config.enabled).toBe(false);
    expect(isSupplierCatalogQaEnabledForOrganization({ organizationId: 5, role: "admin", config })).toBe(false);
  });

  it("habilita catálogo sin exigir un proveedor ni revisión global cuando la organización está autorizada", () => {
    const config = getSupplierCatalogQaConfig({
      SUPPLIER_CATALOG_V1_ENABLED: "true",
      SUPPLIER_CATALOG_V1_QA_ORGANIZATION_IDS: "5",
    } as NodeJS.ProcessEnv);
    expect(config.enabled).toBe(true);
    expect(isSupplierCatalogQaEnabledForOrganization({ organizationId: 5, role: "admin", config })).toBe(true);
  });

  it("limita acceso a administradores y organizaciones allowlist", () => {
    const config = getSupplierCatalogQaConfig({
      SUPPLIER_CATALOG_V1_ENABLED: "true",
      SUPPLIER_CATALOG_V1_QA_ORGANIZATION_IDS: "5, 8",
      SUPPLIER_CATALOG_V1_NEW_QUOTES_AFTER: "2026-09-30T00:00:00.000Z",
    } as NodeJS.ProcessEnv);
    expect(isSupplierCatalogQaEnabledForOrganization({ organizationId: "5", role: "admin", config })).toBe(true);
    expect(isSupplierCatalogQaEnabledForOrganization({ organizationId: "5", role: "member", config })).toBe(false);
    expect(isSupplierCatalogQaEnabledForOrganization({ organizationId: "6", role: "admin", config })).toBe(false);
  });

  it("solo deja congelar el primer snapshot para cotizaciones desde la fecha autorizada", () => {
    const config = getSupplierCatalogQaConfig({ SUPPLIER_CATALOG_V1_NEW_QUOTES_AFTER: "2026-09-30T00:00:00.000Z" } as NodeJS.ProcessEnv);
    expect(isQuoteEligibleForFirstSupplierCostSnapshot({ quoteCreatedAt: "2026-09-29T23:59:59.000Z", config })).toBe(false);
    expect(isQuoteEligibleForFirstSupplierCostSnapshot({ quoteCreatedAt: "2026-09-30T00:00:00.000Z", config })).toBe(true);
    expect(isQuoteEligibleForFirstSupplierCostSnapshot({ quoteCreatedAt: null, config })).toBe(false);
  });
});

it("cambia las líneas piloto por configuración explícita sin lógica de precio por marca", () => {
  const config = getSupplierCatalogQaConfig({ SUPPLIER_CATALOG_V1_CATALOG_LINE_KEYS: "ventora:veratec-7400-corredera,ejemplo:otra-linea" } as NodeJS.ProcessEnv);
  expect(matchesConfiguredPilotQuoteItems([{ catalogLineKey: "ventora:veratec-7400-corredera" }], config)).toBe(true);
  expect(matchesConfiguredPilotQuoteItems([{ catalogLineKey: "ejemplo:otra-linea" }], config)).toBe(true);
  expect(matchesConfiguredPilotQuoteItems([{ catalogLineKey: "otra" }], config)).toBe(false);
  expect(matchesConfiguredPilotQuoteItems([], config)).toBe(false);
});
