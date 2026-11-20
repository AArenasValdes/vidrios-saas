import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";

export type WorkshopCatalogProfile = { code: string; name: string; role: string };

/** Only offers explicitly coded catalog references; pending and visual references stay out. */
export function listWorkshopCatalogProfiles(catalogKey: string): WorkshopCatalogProfile[] {
  return getVentoraProfileReferencesForCatalogKey(catalogKey)?.profiles
    .filter((profile) => profile.codeStatus === "catalog_reference" && Boolean(profile.code?.trim()))
    .map((profile) => ({ code: profile.code!.trim(), name: profile.name, role: profile.role })) ?? [];
}
