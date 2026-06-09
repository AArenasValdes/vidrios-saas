import { OrganizationTestAccountError } from "@/features/admin/services/organization-test-account.service";

describe("OrganizationTestAccountError", () => {
  it("expone nombre de error", () => {
    const error = new OrganizationTestAccountError("Organizacion no valida.");

    expect(error.name).toBe("OrganizationTestAccountError");
    expect(error.message).toBe("Organizacion no valida.");
  });
});
