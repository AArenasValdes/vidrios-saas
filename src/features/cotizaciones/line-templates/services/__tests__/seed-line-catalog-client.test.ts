const mockFetchCountry = jest.fn();
const mockSeedCatalog = jest.fn();

jest.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("../fetch-organization-country-code-client", () => ({
  fetchOrganizationCountryCodeClient: (...args: unknown[]) => mockFetchCountry(...args),
}));
jest.mock("../default-line-catalog", () => ({
  seedDefaultLineCatalog: (...args: unknown[]) => mockSeedCatalog(...args),
}));

import { ensureDefaultLineCatalogClient } from "../seed-line-catalog-client";

describe("ensureDefaultLineCatalogClient", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reintenta si inicialmente falta el país de la organización", async () => {
    mockFetchCountry.mockResolvedValueOnce(null).mockResolvedValueOnce("CL");
    mockSeedCatalog.mockResolvedValue({ seeded: 17, skipped: 0, status: "completed" });

    await expect(ensureDefaultLineCatalogClient("org-country-pending")).resolves.toBe(false);
    await expect(ensureDefaultLineCatalogClient("org-country-pending")).resolves.toBe(true);

    expect(mockFetchCountry).toHaveBeenCalledTimes(2);
    expect(mockSeedCatalog).toHaveBeenCalledTimes(1);
  });

  it("reintenta una carga que falló sin bloquear la organización", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockFetchCountry.mockResolvedValue("CL");
    mockSeedCatalog
      .mockRejectedValueOnce(new Error("fallo temporal"))
      .mockResolvedValueOnce({ seeded: 17, skipped: 0, status: "completed" });

    await expect(ensureDefaultLineCatalogClient("org-retry")).resolves.toBe(false);
    await expect(ensureDefaultLineCatalogClient("org-retry")).resolves.toBe(true);

    expect(mockSeedCatalog).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it("comparte una sincronización concurrente de la misma organización", async () => {
    mockFetchCountry.mockResolvedValue("CL");
    mockSeedCatalog.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ seeded: 17, skipped: 0, status: "completed" }), 5))
    );

    const first = ensureDefaultLineCatalogClient("org-concurrent");
    const second = ensureDefaultLineCatalogClient("org-concurrent");

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(mockSeedCatalog).toHaveBeenCalledTimes(1);
  });
});