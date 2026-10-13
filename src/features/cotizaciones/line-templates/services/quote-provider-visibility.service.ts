import { resolveDefaultLineCatalogProvider } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  createQuoteProviderVisibilityRepository,
  type QuoteProviderVisibilityRepository,
} from "@/features/cotizaciones/line-templates/repositories/quote-provider-visibility.repository";

export function normalizeQuoteProviderKey(value: string | null | undefined): string | null {
  const normalized = (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (!normalized || normalized === "sin-proveedor") return null;
  return normalized.slice(0, 80);
}

export function getQuoteProviderKeyForLine(
  template: Pick<CotizacionLineTemplate, "proveedor" | "catalogKey">
): string | null {
  const provider = template.proveedor?.trim() || resolveDefaultLineCatalogProvider(template.catalogKey);
  return normalizeQuoteProviderKey(provider);
}

export function filterQuoteTemplatesByProviderVisibility<T extends Pick<CotizacionLineTemplate, "proveedor" | "catalogKey">>(
  templates: readonly T[],
  hiddenProviderKeys: ReadonlySet<string>
): T[] {
  if (hiddenProviderKeys.size === 0) return [...templates];
  return templates.filter((template) => {
    const providerKey = getQuoteProviderKeyForLine(template);
    return !providerKey || !hiddenProviderKeys.has(providerKey);
  });
}

type QuoteProviderVisibilityServiceDeps = {
  repository?: QuoteProviderVisibilityRepository;
};

export function createQuoteProviderVisibilityService(deps: QuoteProviderVisibilityServiceDeps = {}) {
  const repository = deps.repository ?? createQuoteProviderVisibilityRepository();

  return {
    listHiddenProviderKeys(organizationId: string | number) {
      return repository.listHiddenProviderKeys(organizationId);
    },
    setProviderHidden(organizationId: string | number, providerKey: string, hidden: boolean) {
      return repository.setProviderHidden(organizationId, providerKey, hidden);
    },
  };
}

export const quoteProviderVisibilityService = createQuoteProviderVisibilityService();
