import { ensureCatalogDraftsClient } from "../seed-structural-draft-client";
import { repararBorradoresProyectantes } from "@/features/fabricacion/repositories/reparar-borrador-proyectante.repository";
import { fetchOrganizationCountryCodeClient } from "../fetch-organization-country-code-client";

jest.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/features/fabricacion/repositories/reparar-borrador-proyectante.repository", () => ({ repararBorradoresProyectantes: jest.fn() }));
jest.mock("../fetch-organization-country-code-client", () => ({ fetchOrganizationCountryCodeClient: jest.fn() }));
const mockRepair = jest.mocked(repararBorradoresProyectantes);
const mockCountry = jest.mocked(fetchOrganizationCountryCodeClient);

describe("reparación compartida entre catálogo y editor", () => {
  beforeEach(() => { jest.clearAllMocks(); mockCountry.mockResolvedValue("CL"); });

  it("ambas cargas esperan una única reparación", async () => {
    let finish!: (count: number) => void;
    mockRepair.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const first = ensureCatalogDraftsClient(801);
    const second = ensureCatalogDraftsClient("801");
    expect(first).toBe(second);
    await Promise.resolve();
    expect(mockRepair).toHaveBeenCalledTimes(1);
    finish(2);
    expect(await first).toBe(2);
    expect(await second).toBe(2);
  });

  it("permite reintentar tras error y no repara organizaciones fuera de Chile", async () => {
    mockRepair.mockRejectedValueOnce(new Error("Error temporal")).mockResolvedValueOnce(1);
    await expect(ensureCatalogDraftsClient(802)).rejects.toThrow("Error temporal");
    expect(await ensureCatalogDraftsClient(802)).toBe(1);
    mockCountry.mockResolvedValue("AR");
    expect(await ensureCatalogDraftsClient(803)).toBe(0);
    expect(mockRepair).toHaveBeenCalledTimes(2);
  });
});
