export type SupplierPriceListCandidate = {
  id: string;
  providerKey: string;
  revision: string;
  publishedOn: string | null;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
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

function isEffective(list: SupplierPriceListCandidate, asOf: string) {
  return (!list.validFrom || list.validFrom <= asOf) && (!list.validUntil || list.validUntil >= asOf);
}

/** Resolve exactly one list per provider. An explicit or preferred list can never cross providers. */
export function selectSupplierPriceLists(input: {
  lists: readonly SupplierPriceListCandidate[];
  selectedByProvider?: Readonly<Record<string, SupplierPriceListSelection>>;
  preferredListIdsByProvider?: Readonly<Record<string, string>>;
  asOf?: Date;
}) {
  const asOf = (input.asOf ?? new Date()).toISOString().slice(0, 10);
  const providers = new Set([
    ...input.lists.map((list) => list.providerKey),
    ...Object.keys(input.selectedByProvider ?? {}),
    ...Object.keys(input.preferredListIdsByProvider ?? {}),
  ]);
  const selected = new Map<string, SupplierPriceListCandidate>();

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
      selected.set(providerKey, matches[0]);
      continue;
    }

    const preferredListId = input.preferredListIdsByProvider?.[providerKey];
    if (preferredListId) {
      const preferred = providerLists.find((list) => list.id === preferredListId);
      if (!preferred) throw new PriceListSelectionError(`La lista preferida no pertenece al proveedor ${providerKey}.`);
      if (!isEffective(preferred, asOf)) throw new PriceListSelectionError(`La lista preferida del proveedor ${providerKey} no está vigente.`);
      selected.set(providerKey, preferred);
      continue;
    }

    const active = providerLists.filter((list) => isEffective(list, asOf)).sort(compareNewest);
    if (active[0]) selected.set(providerKey, active[0]);
  }

  return selected;
}
