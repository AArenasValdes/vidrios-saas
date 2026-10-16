/** @jest-environment node */
import { createAdminClient } from "@/lib/supabase/admin";
import { listSupplierFamilyPreferences } from "../supplier-family-preferences.repository";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: jest.fn() }));

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>;

describe("preferencias habituales de proveedor", () => {
  it.each(["42P01", "PGRST205"])("mantiene compatibilidad cuando la tabla aún no existe (%s)", async (code) => {
    const eq = jest.fn().mockResolvedValue({ data: null, error: { code, message: "relation missing" } });
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockCreateAdminClient.mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>);

    await expect(listSupplierFamilyPreferences(17)).resolves.toEqual([]);
    expect(from).toHaveBeenCalledWith("organization_supplier_family_preferences");
    expect(eq).toHaveBeenCalledWith("organization_id", 17);
  });

  it("lee solo las preferencias de la organización solicitada", async () => {
    const eq = jest.fn().mockResolvedValue({
      data: [{ organization_id: 17, family_key: "universal:aluminio:l5000", provider_key: "arquetipo", updated_at: "2026-10-16T12:00:00Z" }],
      error: null,
    });
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockCreateAdminClient.mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>);

    await expect(listSupplierFamilyPreferences(17)).resolves.toEqual([{
      organizationId: 17,
      familyKey: "universal:aluminio:l5000",
      providerKey: "arquetipo",
      updatedAt: "2026-10-16T12:00:00Z",
    }]);
    expect(eq).toHaveBeenCalledWith("organization_id", 17);
  });
});
