import "server-only";
import { unstable_cache } from "next/cache";
import {
  readSupplierNames,
  readSupplierPresentationPrices,
} from "../repositories/costo-tecnico-parcial.repository";

// Only the common, official catalog is shared. Authentication, organization
// adjustments and private overrides must remain outside this cache.
export const readMisPreciosReferenceCatalog = unstable_cache(async () => {
  const presentations = await readSupplierPresentationPrices();
  const providerKeys = [...new Set(presentations.flatMap((row) => row.providerKey ? [row.providerKey] : []))];
  const providerNames = await readSupplierNames(providerKeys);
  return { presentations, providerNames: [...providerNames] };
}, ["mis-precios-reference-catalog-v1"], { revalidate: 60 });
