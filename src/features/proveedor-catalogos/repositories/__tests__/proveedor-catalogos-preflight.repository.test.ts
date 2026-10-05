/** @jest-environment node */
import { VERATEC_7400_JUNIO_2026_IMPORT } from "../../fixtures/veratec-7400-junio-2026";
import { importSupplierCatalogBatch, type ProveedorCatalogosClient } from "../proveedor-catalogos.repository";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: jest.fn() }));

it("detiene un proveedor incompatible antes de la primera escritura", async () => {
  const upsert = jest.fn();
  const from = jest.fn((table: string) => ({
    select: () => ({
      in: async () => ({ data: [], error: null }),
      eq: () => ({
        in: async () => ({ data: [], error: null }),
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        maybeSingle: async () => ({ data: table === "catalogo_proveedores"
          ? { proveedor_key: "xelena", nombre: "Otro proveedor", fabricante: "Otro" } : null, error: null }),
      }),
    }),
    upsert,
  }));
  await expect(importSupplierCatalogBatch(VERATEC_7400_JUNIO_2026_IMPORT, { from } as unknown as ProveedorCatalogosClient))
    .rejects.toThrow(/Importación detenida.*catalogo_proveedores/);
  expect(upsert).not.toHaveBeenCalled();
});
