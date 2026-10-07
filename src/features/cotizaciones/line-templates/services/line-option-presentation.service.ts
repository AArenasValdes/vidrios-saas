import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { getLineTemplateSystemMetadata, lineTemplateNeedsCommercialPrice } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { getFabricationRecipeFromMetadata } from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import { evaluateLineCompatibility, type LineCompatibilityContext } from "./line-template-compatibility.service";
import { resolveLineTemplateFamily } from "./line-template-family.service";

export type LineCatalogTab = "compatible" | "own" | "all";
export type LineFabricationState = "Sin despiece" | "Despiece disponible" | "Despiece preliminar";
export type LineCostState = "Sin costos" | "Costo parcial" | "Costo disponible";

/** Datos listos para presentar; mantiene recetas, snapshots e IDs internos fuera del componente. */
export type LineOptionViewModel = {
  id: string;
  name: string;
  provider: string | null;
  material: string;
  contextLabel: string;
  commercialPriceLabel: string;
  minimumLabel: string | null;
  roundingLabel: string | null;
  fabricationState: LineFabricationState;
  costState: LineCostState;
  technicalStateLabel: string | null;
  origin: "propia" | "catalogo";
  selected: boolean;
};

export type LineCatalogGroup = {
  key: string;
  label: string;
  origin: "propia" | "catalogo";
  templates: CotizacionLineTemplate[];
  families: Array<{ key: string; label: string; templates: CotizacionLineTemplate[] }>;
};

export function hasEnoughLineCompatibilityContext(context: LineCompatibilityContext | null | undefined) {
  return Boolean(context?.componentType?.trim() && context?.openingType?.trim() && context?.material?.trim());
}

export function getDefaultLineCatalogTab(input: {
  hasCompatibilityContext: boolean;
  hasOwnLines: boolean;
}): LineCatalogTab {
  if (input.hasCompatibilityContext) return "compatible";
  if (input.hasOwnLines) return "own";
  return "all";
}

export function isOwnLineTemplate(template: CotizacionLineTemplate) {
  return !template.catalogKey?.startsWith("ventora:");
}

export function buildLineOptionViewModel(input: {
  template: CotizacionLineTemplate;
  selected: boolean;
  displayName?: string;
  costState?: LineCostState;
}): LineOptionViewModel {
  const { template } = input;
  const recipe = getFabricationRecipeFromMetadata(template.catalogMetadata);
  const system = getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem;
  const family = resolveLineTemplateFamily(template);
  const configurationLabel = template.catalogMetadata?.configurationLabel;
  const configuredName = typeof configurationLabel === "string" && configurationLabel.trim()
    ? configurationLabel.trim()
    : null;
  const fabricationState: LineFabricationState = !recipe
    ? "Sin despiece"
    : recipe.status === "validada"
      ? "Despiece disponible"
      : "Despiece preliminar";
  const costState = input.costState ?? "Sin costos";
  const technicalStateLabel = recipe?.status === "validada"
    ? "Despiece disponible · Validada por taller"
    : recipe
      ? costState === "Sin costos" ? "Despiece preliminar" : `Despiece preliminar · ${costState}`
      : costState === "Sin costos" ? null : `Sin despiece · ${costState}`;

  return {
    id: String(template.id),
    // El selector puede aportar un nombre comercial más claro y específico que
    // la etiqueta genérica de configuración guardada en líneas canónicas.
    name: input.displayName?.trim() || configuredName || family.label || template.nombre,
    provider: template.proveedor?.trim() || null,
    material: template.categoria === "vidrio" ? "Cristal" : template.material,
    contextLabel: [template.proveedor?.trim(), template.material, system].filter(Boolean).join(" · "),
    commercialPriceLabel: lineTemplateNeedsCommercialPrice(template)
      ? "Precio pendiente"
      : `${new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(template.precioM2Sugerido)}/m²`,
    minimumLabel: template.minimoCobrable > 0
      ? `Mín. ${new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(template.minimoCobrable)}`
      : null,
    roundingLabel: template.redondeoPrecio > 0
      ? `Redondeo ${new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(template.redondeoPrecio)}`
      : null,
    fabricationState,
    costState,
    technicalStateLabel,
    origin: isOwnLineTemplate(template) ? "propia" : "catalogo",
    selected: input.selected,
  };
}

/** Mantiene la consulta de compatibilidad en el contrato compartido; no cambia el motor. */
export function filterLineCatalogTemplates(input: {
  templates: readonly CotizacionLineTemplate[];
  tab: LineCatalogTab;
  context?: LineCompatibilityContext | null;
  query?: string;
  material?: string | null;
  provider?: string | null;
}): CotizacionLineTemplate[] {
  const query = input.query?.trim().toLocaleLowerCase("es-CL") ?? "";
  return input.templates.filter((template) => {
    const own = isOwnLineTemplate(template);
    if (input.tab === "own" && !own) return false;
    if (input.tab === "compatible") {
      if (!hasEnoughLineCompatibilityContext(input.context)) return false;
      if (evaluateLineCompatibility({ line: template, context: input.context! }).commercial !== "compatible") return false;
    }
    if (input.material && template.material !== input.material && template.categoria !== "vidrio") return false;
    if (input.provider === "__sin_proveedor") {
      if (template.proveedor?.trim()) return false;
    } else if (input.provider && (template.proveedor?.trim() || "") !== input.provider) return false;
    if (!query) return true;
    const family = resolveLineTemplateFamily(template);
    const system = getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem ?? "";
    return [family.label, template.nombre, template.proveedor ?? "", template.material, system, String(Math.round(template.precioM2Sugerido))]
      .join(" ").toLocaleLowerCase("es-CL").includes(query);
  });
}

/** Agrupa por proveedor y luego por identidad de familia explícita, nunca por nombre/SKU. */
export function groupLineCatalogTemplates(templates: readonly CotizacionLineTemplate[]): LineCatalogGroup[] {
  const groups = new Map<string, LineCatalogGroup>();
  for (const template of templates) {
    const own = isOwnLineTemplate(template);
    const provider = template.proveedor?.trim() || "";
    const key = own ? `own:${String(template.organizationId)}` : `provider:${provider.toLocaleLowerCase("es-CL") || "catalog"}`;
    const family = resolveLineTemplateFamily(template);
    const existing = groups.get(key);
    if (existing) {
      existing.templates.push(template);
      if (!own) {
        const familyGroup = existing.families.find((entry) => entry.key === family.key);
        if (familyGroup) familyGroup.templates.push(template);
        else existing.families.push({ key: family.key, label: family.label, templates: [template] });
      }
      continue;
    }
    groups.set(key, {
      key,
      label: own ? "Mis líneas" : provider || "Catálogo Ventora",
      origin: own ? "propia" : "catalogo",
      templates: [template],
      families: own ? [] : [{ key: family.key, label: family.label, templates: [template] }],
    });
  }
  return [...groups.values()];
}
