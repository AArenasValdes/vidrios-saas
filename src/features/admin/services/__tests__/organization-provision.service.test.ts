import {
  OrganizationProvisionError,
  validateProvisionOrganizationInput,
} from "@/features/admin/services/organization-provision.service";

describe("validateProvisionOrganizationInput", () => {
  it("normaliza email y empresa", () => {
    expect(
      validateProvisionOrganizationInput({
        email: " Dueno@Empresa.CL ",
        empresaNombre: "  Vidrios   del Sur ",
      })
    ).toEqual({
      email: "dueno@empresa.cl",
      empresaNombre: "Vidrios del Sur",
    });
  });

  it("rechaza empresa vacia", () => {
    expect(() =>
      validateProvisionOrganizationInput({
        email: "dueno@empresa.cl",
        empresaNombre: " ",
      })
    ).toThrow(OrganizationProvisionError);
  });
});
