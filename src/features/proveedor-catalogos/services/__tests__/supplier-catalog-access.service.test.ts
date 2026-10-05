import { canManageSupplierCatalog, canReadSupplierCatalog } from "../supplier-catalog-access.service";

describe("acceso al catálogo de proveedores en producción", () => {
  it("permite consultar el catálogo compartido desde cualquier organización activa", () => {
    expect(canReadSupplierCatalog(3)).toBe(true);
    expect(canReadSupplierCatalog(941)).toBe(true);
    expect(canReadSupplierCatalog(null)).toBe(false);
  });

  it("permite a administración y maestros mantener precios propios del taller", () => {
    expect(canManageSupplierCatalog("admin")).toBe(true);
    expect(canManageSupplierCatalog("tecnico")).toBe(true);
    expect(canManageSupplierCatalog("viewer")).toBe(false);
  });
});
