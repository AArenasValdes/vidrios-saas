import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export class OrganizationTestAccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationTestAccountError";
  }
}

type SetOrganizationTestAccountInput = {
  organizationId: number;
  isTestAccount: boolean;
};

export type SetOrganizationTestAccountResult = {
  organizationId: number;
  isTestAccount: boolean;
};

function normalizeOrganizationId(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new OrganizationTestAccountError("Organizacion no valida.");
  }

  return value;
}

export async function setOrganizationTestAccount(
  input: SetOrganizationTestAccountInput
): Promise<SetOrganizationTestAccountResult> {
  const organizationId = normalizeOrganizationId(input.organizationId);
  const admin = createAdminClient();

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .is("eliminado_en", null)
    .maybeSingle();

  if (organizationError) {
    throw new OrganizationTestAccountError(
      `No pudimos validar la organizacion: ${organizationError.message}`
    );
  }

  if (!organization) {
    throw new OrganizationTestAccountError("Organizacion no encontrada.");
  }

  type UpdateTestAccountTable = {
    update(values: { is_test_account: boolean }): {
      eq(column: "organization_id", value: number): {
        select(columns: string): {
          maybeSingle(): Promise<{
            data: { organization_id: number; is_test_account: boolean } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

  const organizationProfileTable = admin.from(
    "organization_profile"
  ) as unknown as UpdateTestAccountTable;

  const { data: profile, error: profileError } = await organizationProfileTable
    .update({ is_test_account: input.isTestAccount })
    .eq("organization_id", organizationId)
    .select("organization_id, is_test_account")
    .maybeSingle();

  if (profileError) {
    throw new OrganizationTestAccountError(
      `No pudimos actualizar la cuenta: ${profileError.message}`
    );
  }

  if (!profile) {
    throw new OrganizationTestAccountError(
      "No encontramos el perfil de la organizacion."
    );
  }

  return {
    organizationId,
    isTestAccount: Boolean(profile.is_test_account),
  };
}
