import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

export type SupplierCatalogQaConfig = {
  enabled: boolean;
  allowedOrganizationIds: ReadonlySet<string>;
  newQuotesAfter: string | null;
  catalogLineKeys: ReadonlySet<string>;
};

export function getSupplierCatalogQaConfig(env: NodeJS.ProcessEnv = process.env): SupplierCatalogQaConfig {
  const enabled = env.SUPPLIER_CATALOG_V1_ENABLED?.trim().toLowerCase() === "true";
  const allowedOrganizationIds = new Set(
    (env.SUPPLIER_CATALOG_V1_QA_ORGANIZATION_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^\d+$/.test(value))
  );
  const cutoff = env.SUPPLIER_CATALOG_V1_NEW_QUOTES_AFTER?.trim() ?? "";
  const newQuotesAfter = Number.isFinite(Date.parse(cutoff)) ? new Date(cutoff).toISOString() : null;
  const veratecKeys = VENTORA_DEFAULT_LINE_CATALOG.flatMap((line) =>
    line.catalogKey?.startsWith("ventora:veratec-") ? [line.catalogKey] : []
  ).join(",");
  const catalogLineKeys = new Set((env.SUPPLIER_CATALOG_V1_CATALOG_LINE_KEYS || veratecKeys)
    .split(",").map((value) => value.trim()).filter(Boolean));
  return { enabled, allowedOrganizationIds, newQuotesAfter, catalogLineKeys };
}

export function matchesConfiguredPilotQuoteItems(items: readonly { catalogLineKey?: string | null }[], config: SupplierCatalogQaConfig) {
  return items.length > 0 && items.every((item) => config.catalogLineKeys.has(item.catalogLineKey?.trim() ?? ""));
}

export function isSupplierCatalogQaEnabledForOrganization(input: {
  organizationId: string | number | null | undefined;
  role: string | null | undefined;
  config: SupplierCatalogQaConfig;
}) {
  const organizationId = input.organizationId == null ? "" : String(input.organizationId);
  return input.config.enabled && input.role === "admin" && input.config.allowedOrganizationIds.has(organizationId);
}

/** La ejecución preliminar del piloto queda restringida a la cuenta QA designada. */
export function isSupplierCatalogQaEnabledForIdentity(input: {
  organizationId: string | number | null | undefined;
  role: string | null | undefined;
  userEmail: string | null | undefined;
  config: SupplierCatalogQaConfig;
}) {
  return (
    isSupplierCatalogQaEnabledForOrganization(input) &&
    input.userEmail?.trim().toLowerCase() === "admin@test.com"
  );
}

export function isQuoteEligibleForFirstSupplierCostSnapshot(input: {
  quoteCreatedAt: string | null | undefined;
  config: SupplierCatalogQaConfig;
}) {
  if (!input.quoteCreatedAt || !input.config.newQuotesAfter) return false;
  const createdAt = Date.parse(input.quoteCreatedAt);
  const cutoff = Date.parse(input.config.newQuotesAfter);
  return Number.isFinite(createdAt) && createdAt >= cutoff;
}


