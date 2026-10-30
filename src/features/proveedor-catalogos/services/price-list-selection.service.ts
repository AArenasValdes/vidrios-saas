export type SupplierPriceListCandidate = {
  id: string;
  providerKey: string;
  revision: string;
  publishedOn: string | null;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
};

export type SupplierPriceListReferenceStatus =
  | "within_stated_validity"
  | "active_by_ventora_policy"
  | "historical_reference"
  | "not_yet_valid";

export type SelectedSupplierPriceListCandidate = SupplierPriceListCandidate & {
  referenceStatus: SupplierPriceListReferenceStatus;
};

export type SupplierPriceListSelection = {
  listId?: string;
  revision?: string;
};

export class PriceListSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PriceListSelectionError";
  }
}

function compareNewest(left: SupplierPriceListCandidate, right: SupplierPriceListCandidate) {
  return (right.validFrom ?? "").localeCompare(left.validFrom ?? "") ||
    (right.publishedOn ?? "").localeCompare(left.publishedOn ?? "") ||
    right.createdAt.localeCompare(left.createdAt) ||
    right.revision.localeCompare(left.revision);
}

function hasStarted(list: SupplierPriceListCandidate, asOf: string) {
  return !list.validFrom || list.validFrom <= asOf;
}

function isEffective(list: SupplierPriceListCandidate, asOf: string) {
  return (!list.validFrom || list.validFrom <= asOf) && (!list.validUntil || list.validUntil >= asOf);
}

function isAlumco(providerKey: string) {
  return providerKey.trim().toLocaleLowerCase("es-CL") === "alumco";
}

function referenceStatus(list: SupplierPriceListCandidate, providerKey: string, asOf: string): SupplierPriceListReferenceStatus {
  if (list.validFrom && list.validFrom > asOf) return "not_yet_valid";
  // Ventora treats the imported Alumco list as active. Its printed end date
  // belongs to the source quotation, not to the price list's use in Ventora.
  if (isAlumco(providerKey)) return "active_by_ventora_policy";
  return isEffective(list, asOf) ? "within_stated_validity" : "historical_reference";
}

function withReferenceStatus(list: SupplierPriceListCandidate, providerKey: string, asOf: string): SelectedSupplierPriceListCandidate {
  return { ...list, referenceStatus: referenceStatus(list, providerKey, asOf) };
}

/** Resolve exactly one list per provider. An explicit or preferred list can never cross providers. */
export function selectSupplierPriceLists(input: {
  lists: readonly SupplierPriceListCandidate[];
  selectedByProvider?: Readonly<Record<string, SupplierPriceListSelection>>;
  preferredListIdsByProvider?: Readonly<Record<string, string>>;
  asOf?: Date;
}): Map<string, SelectedSupplierPriceListCandidate> {
  const asOf = (input.asOf ?? new Date()).toISOString().slice(0, 10);
  const providers = new Set([
    ...input.lists.map((list) => list.providerKey),
    ...Object.keys(input.selectedByProvider ?? {}),
    ...Object.keys(input.preferredListIdsByProvider ?? {}),
  ]);
  const selected = new Map<string, SelectedSupplierPriceListCandidate>();

  for (const providerKey of providers) {
    const providerLists = input.lists.filter((list) => list.providerKey === providerKey);
    const explicit = input.selectedByProvider?.[providerKey];
    if (explicit) {
      const matches = providerLists.filter((list) =>
        (!explicit.listId || list.id === explicit.listId) &&
        (!explicit.revision || list.revision === explicit.revision)
      );
      if (!matches.length || (!explicit.listId && !explicit.revision)) {
        throw new PriceListSelectionError(`La lista seleccionada no pertenece al proveedor ${providerKey}.`);
      }
      if (!hasStarted(matches[0], asOf)) throw new PriceListSelectionError(`La lista seleccionada del proveedor ${providerKey} todavía no es aplicable.`);
      selected.set(providerKey, withReferenceStatus(matches[0], providerKey, asOf));
      continue;
    }

    const preferredListId = input.preferredListIdsByProvider?.[providerKey];
    if (preferredListId) {
      const preferred = providerLists.find((list) => list.id === preferredListId);
      if (!preferred) throw new PriceListSelectionError(`La lista preferida no pertenece al proveedor ${providerKey}.`);
      if (!hasStarted(preferred, asOf)) throw new PriceListSelectionError(`La lista preferida del proveedor ${providerKey} todavía no es aplicable.`);
      selected.set(providerKey, withReferenceStatus(preferred, providerKey, asOf));
      continue;
    }

    if (isAlumco(providerKey)) {
      const activeByVentoraPolicy = providerLists.filter((list) => hasStarted(list, asOf)).sort(compareNewest);
      if (activeByVentoraPolicy[0]) {
        selected.set(providerKey, withReferenceStatus(activeByVentoraPolicy[0], providerKey, asOf));
      }
      continue;
    }

    const active = providerLists.filter((list) => isEffective(list, asOf)).sort(compareNewest);
    if (active[0]) {
      selected.set(providerKey, withReferenceStatus(active[0], providerKey, asOf));
    }
  }

  return selected;
}
