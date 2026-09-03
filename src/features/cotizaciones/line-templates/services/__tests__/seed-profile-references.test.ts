import { seedProfileReferencesForOrganization } from "../seed-profile-references";
import { LINE_PROFILE_REFERENCE_SEED_VERSION } from "@/features/cotizaciones/line-templates/types/line-profile-references";

describe("seedProfileReferencesForOrganization", () => {
  it("no hace nada si no hay líneas Ventora", async () => {
    const result = await seedProfileReferencesForOrganization("org-1", {
      listVentoraLineTemplates: async () => [],
      updateLineTemplateMetadata: async () => undefined,
    });

    expect(result).toEqual({ seeded: 0, skipped: 0 });
  });

  it("siembra referencias solo en líneas sin workshopProfiles", async () => {
    const updates: Array<Record<string, unknown>> = [];

    const result = await seedProfileReferencesForOrganization("org-2", {
      async listVentoraLineTemplates() {
        return [
          {
            id: 10,
            catalog_key: "ventora:l5000",
            catalog_metadata: { needsCommercialPrice: true },
          },
          {
            id: 11,
            catalog_key: "ventora:optima-s28-corredera-2h",
            catalog_metadata: {
              workshopProfiles: {
                seedVersion: LINE_PROFILE_REFERENCE_SEED_VERSION,
                profiles: [
                  {
                    code: null,
                    name: "Riel superior",
                    role: "Marco",
                    description: "Riel superior",
                    provider: null,
                    source: null,
                    codeStatus: "pending_validation",
                  },
                ],
              },
            },
          },
        ];
      },
      async updateLineTemplateMetadata({ catalogMetadata }) {
        updates.push(catalogMetadata);
      },
    });

    expect(result.seeded).toBe(1);
    expect(result.skipped).toBe(1);
    expect(updates).toHaveLength(1);
    expect(updates[0]?.workshopProfiles).toMatchObject({
      seedVersion: LINE_PROFILE_REFERENCE_SEED_VERSION,
      profiles: expect.arrayContaining([
        expect.objectContaining({ code: "5001", role: "Marco" }),
      ]),
    });
  });

  it("no duplica perfiles en una segunda ejecución", async () => {
    let storedMetadata: Record<string, unknown> = { needsCommercialPrice: true };

    const deps = {
      async listVentoraLineTemplates() {
        return [
          {
            id: 20,
            catalog_key: "ventora:l5000",
            catalog_metadata: storedMetadata,
          },
        ];
      },
      async updateLineTemplateMetadata({
        catalogMetadata,
      }: {
        catalogMetadata: Record<string, unknown>;
      }) {
        storedMetadata = catalogMetadata;
      },
    };

    const first = await seedProfileReferencesForOrganization("org-3", deps);
    const second = await seedProfileReferencesForOrganization("org-3", deps);

    expect(first.seeded).toBe(1);
    expect(second.seeded).toBe(0);
    expect(second.skipped).toBe(1);

    const profiles = (
      storedMetadata.workshopProfiles as { profiles: unknown[] } | undefined
    )?.profiles;
    expect(profiles).toHaveLength(7);
  });
});
