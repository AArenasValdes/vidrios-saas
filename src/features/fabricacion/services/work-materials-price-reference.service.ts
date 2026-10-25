import type {
  WorkProfileMaterialRow,
  WorkProfilePriceReferenceRow,
} from "./fabrication-work-materials.service";

type PricedProfileReference = WorkProfilePriceReferenceRow & {
  netPrice: number;
  currency: string;
  status: "priced";
};

function normalizeIdentity(value: string | null | undefined) {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

/** Resolve a supplier reference only when every saved identity dimension agrees. */
export function resolveExactProfilePriceReference(
  profile: WorkProfileMaterialRow,
  references: readonly WorkProfilePriceReferenceRow[] | undefined
) {
  if (!profile.familyKey || profile.itemCodes.length === 0 || !Number.isFinite(profile.bars) || profile.bars <= 0) return null;

  const matches = references?.filter((reference) =>
    reference.technicalCode === profile.code &&
    reference.familyKey === profile.familyKey &&
    (!profile.supplierPresentationId || reference.presentationId === profile.supplierPresentationId) &&
    normalizeIdentity(reference.finish) === normalizeIdentity(profile.configuredFinish ?? profile.finish) &&
    reference.commercialLengthMm === profile.commercialLengthMm &&
    (!profile.supplierProviderKey || reference.providerKey === profile.supplierProviderKey) &&
    (!profile.supplierSku || reference.supplierSku === profile.supplierSku)
  ) ?? [];

  const matchedByItem = profile.itemCodes.map((itemCode) => {
    const itemMatches = matches.filter((reference) => reference.itemCode === itemCode);
    if (itemMatches.length !== 1) return null;
    const [reference] = itemMatches;
    if (reference?.status !== "priced" || reference.netPrice == null || !Number.isFinite(reference.netPrice) || reference.netPrice <= 0 || !reference.currency) return null;
    return reference as PricedProfileReference;
  }).filter((reference): reference is PricedProfileReference => reference != null);
  if (matchedByItem.length !== profile.itemCodes.length) return null;

  const [first] = matchedByItem;
  if (!first) return null;
  const samePresentation = matchedByItem.every((reference) =>
    reference?.presentationId === first.presentationId &&
    reference.providerKey === first.providerKey &&
    reference.supplierSku === first.supplierSku &&
    reference.netPrice === first.netPrice &&
    reference.currency === first.currency &&
    reference.purchaseUnit === first.purchaseUnit
  );
  return samePresentation ? first : null;
}

export type ResolvedProfileSupplierPrice = {
  providerKey: string | null;
  providerLabel: string;
  supplierSku: string | null;
  unitPrice: number;
  currency: string;
  basis: string;
  source: "linked_material_price" | "exact_presentation";
};

/** One shared association path for mobile, PDF and Excel exports. */
export function resolveProfileSupplierPrice(
  profile: WorkProfileMaterialRow,
  references: readonly WorkProfilePriceReferenceRow[] | undefined
): ResolvedProfileSupplierPrice | null {
  if (profile.price && profile.price.sourceKind !== "reference") return null;
  const linkedPrice = profile.price?.sourceKind === "reference" ? profile.price : null;
  if (linkedPrice && linkedPrice.unitPrice > 0 && Number.isFinite(linkedPrice.unitPrice) && linkedPrice.currency) {
    return {
      providerKey: linkedPrice.providerKey ?? null,
      providerLabel: linkedPrice.sourceLabel,
      supplierSku: linkedPrice.sku || profile.supplierSku || null,
      unitPrice: linkedPrice.unitPrice,
      currency: linkedPrice.currency,
      basis: linkedPrice.basis,
      source: "linked_material_price",
    };
  }
  const reference = resolveExactProfilePriceReference(profile, references);
  if (!reference) return null;
  return {
    providerKey: reference.providerKey,
    providerLabel: reference.providerLabel,
    supplierSku: reference.supplierSku,
    unitPrice: reference.netPrice,
    currency: reference.currency,
    basis: reference.purchaseUnit,
    source: "exact_presentation",
  };
}

export function calculateProfileReferenceTotal(
  profile: Pick<WorkProfileMaterialRow, "bars" | "commercialLengthMm">,
  price: { unitPrice: number; basis?: string | null; purchaseUnit?: string | null }
) {
  if (!Number.isFinite(price.unitPrice) || price.unitPrice <= 0 || !Number.isFinite(profile.bars) || profile.bars <= 0) return null;
  const basis = normalizeIdentity(price.basis ?? price.purchaseUnit);
  if (basis === "por tira" || basis === "tira") return price.unitPrice * profile.bars;
  if (basis === "por metro" || basis === "metro") {
    return price.unitPrice * profile.bars * profile.commercialLengthMm / 1000;
  }
  return null;
}

export function formatProfilePriceBasis(value: string | null | undefined) {
  const basis = normalizeIdentity(value);
  if (basis === "tira" || basis === "por tira") return "por tira";
  if (basis === "unidad" || basis === "por unidad") return "por unidad";
  if (basis === "metro" || basis === "por metro") return "por metro";
  return value?.trim() || "Unidad pendiente";
}
