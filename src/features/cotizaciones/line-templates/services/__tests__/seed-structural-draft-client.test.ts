const mockSeedStructural = jest.fn();
const mockSeedVariants = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));
jest.mock("@/features/fabricacion/repositories/reparar-borrador-proyectante.repository", () => ({
  repararBorradoresProyectantes: jest.fn().mockResolvedValue(0),
}));
jest.mock("../seed-structural-draft", () => ({
  seedStructuralDraftsForOrganization: (...args: unknown[]) => mockSeedStructural(...args),
}));
jest.mock("../seed-line-variant-recipes", () => ({
  seedLineVariantRecipesForOrganization: (...args: unknown[]) => mockSeedVariants(...args),
}));
jest.mock("../fetch-organization-country-code-client", () => ({
  fetchOrganizationCountryCodeClient: jest.fn().mockResolvedValue("CL"),
}));
jest.mock("@/features/fabricacion/repositories/fabrication-recipes.repository", () => ({
  createFabricationRecipesRepository: () => ({ list: jest.fn().mockResolvedValue([]) }),
}));

import { ensureStructuralDraftsClient } from "../seed-structural-draft-client";

describe("ensureStructuralDraftsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("vuelve a intentar cuando la primera ejecución no encontró líneas para sembrar", async () => {
    mockSeedStructural
      .mockResolvedValueOnce({ seeded: 0, skipped: 0 })
      .mockResolvedValueOnce({ seeded: 1, skipped: 0 });
    mockSeedVariants.mockResolvedValue({ seeded: 0, skipped: 0 });

    await expect(ensureStructuralDraftsClient("org-lines-added-later")).resolves.toBe(false);
    await expect(ensureStructuralDraftsClient("org-lines-added-later")).resolves.toBe(true);

    expect(mockSeedStructural).toHaveBeenCalledTimes(2);
  });

  it("vuelve a revisar líneas y variantes después de una siembra exitosa", async () => {
    mockSeedStructural.mockResolvedValue({ seeded: 1, skipped: 0 });
    mockSeedVariants.mockResolvedValue({ seeded: 1, skipped: 0 });

    await expect(ensureStructuralDraftsClient("org-s75", "line-s75")).resolves.toBe(true);
    await expect(ensureStructuralDraftsClient("org-s75", "line-s75")).resolves.toBe(true);

    // El seed es idempotente y consulta el catálogo en cada carga nueva; solo
    // se comparte la misma ejecución mientras aún está en curso.
    expect(mockSeedStructural).toHaveBeenCalledTimes(2);
    expect(mockSeedVariants).toHaveBeenCalledTimes(2);
  });
});
