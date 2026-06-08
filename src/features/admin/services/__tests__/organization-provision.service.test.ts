import {
  OrganizationProvisionError,
  validateProvisionOrganizationInput,
} from "@/features/admin/services/organization-provision.service";

describe("validateProvisionOrganizationInput", () => {
  it("normaliza email y empresa", () => {
    expect(
      validateProvisionOrganizationInput({
        email: " Dueno@Empresa.CL ",
        password: "clave1234",
        empresaNombre: "  Vidrios   del Sur ",
      })
    ).toEqual({
      email: "dueno@empresa.cl",
      password: "clave1234",
      empresaNombre: "Vidrios del Sur",
    });
  });

  it("rechaza contrasena corta", () => {
    expect(() =>
      validateProvisionOrganizationInput({
        email: "dueno@empresa.cl",
        password: "123",
        empresaNombre: "Vidrios",
      })
    ).toThrow(OrganizationProvisionError);
  });

  it("rechaza empresa vacia", () => {
    expect(() =>
      validateProvisionOrganizationInput({
        email: "dueno@empresa.cl",
        password: "clave1234",
        empresaNombre: " ",
      })
    ).toThrow(OrganizationProvisionError);
  });
});
