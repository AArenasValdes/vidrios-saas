import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export class OrganizationProvisionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "invalid_input"
      | "email_taken"
      | "provision_failed" = "provision_failed"
  ) {
    super(message);
    this.name = "OrganizationProvisionError";
  }
}

export type ProvisionOrganizationInput = {
  email: string;
  password: string;
  empresaNombre: string;
  isTestAccount?: boolean;
};

export type ProvisionOrganizationResult = {
  organizationId: number;
  authUserId: string;
  userId: number;
  email: string;
  empresaNombre: string;
  trialEndsAt: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeEmpresaNombre(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function validateProvisionOrganizationInput(
  input: ProvisionOrganizationInput
) {
  const email = normalizeEmail(input.email);
  const password = input.password?.trim() ?? "";
  const empresaNombre = normalizeEmpresaNombre(input.empresaNombre ?? "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new OrganizationProvisionError(
      "Ingresa un correo valido.",
      "invalid_input"
    );
  }

  if (password.length < 8) {
    throw new OrganizationProvisionError(
      "La contrasena debe tener al menos 8 caracteres.",
      "invalid_input"
    );
  }

  if (empresaNombre.length < 2) {
    throw new OrganizationProvisionError(
      "Ingresa el nombre de la empresa.",
      "invalid_input"
    );
  }

  return { email, password, empresaNombre };
}

async function findPublicUserByEmail(
  supabase: SupabaseClient,
  email: string
) {
  const { data, error } = await supabase
    .from("users")
    .select("id, correo, eliminado_en")
    .ilike("correo", email)
    .maybeSingle();

  if (error) {
    throw new OrganizationProvisionError(
      `No pudimos validar el correo: ${error.message}`
    );
  }

  return data;
}

export async function provisionOrganizationAccount(
  input: ProvisionOrganizationInput,
  deps: { admin?: SupabaseClient } = {}
): Promise<ProvisionOrganizationResult> {
  const { email, password, empresaNombre } =
    validateProvisionOrganizationInput(input);
  const admin = deps.admin ?? createAdminClient();

  const existingUser = await findPublicUserByEmail(admin, email);

  if (existingUser && !existingUser.eliminado_en) {
    throw new OrganizationProvisionError(
      "Ya existe una cuenta con ese correo.",
      "email_taken"
    );
  }

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .insert({
      nombre: empresaNombre,
      correo: email,
    })
    .select("id")
    .single();

  if (organizationError || !organization) {
    throw new OrganizationProvisionError(
      `No pudimos crear la organizacion: ${organizationError?.message ?? "sin respuesta"}`
    );
  }

  const organizationId = Number(organization.id);
  let authUserId: string | null = null;

  try {
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      throw new OrganizationProvisionError(
        `No pudimos crear el usuario de acceso: ${authError?.message ?? "sin respuesta"}`
      );
    }

    authUserId = authData.user.id;

    const { data: publicUser, error: publicUserError } = await admin
      .from("users")
      .insert({
        correo: email,
        organization_id: organizationId,
        rol: "admin",
        auth_user_id: authUserId,
      })
      .select("id")
      .single();

    if (publicUserError || !publicUser) {
      throw new OrganizationProvisionError(
        `No pudimos vincular el usuario interno: ${publicUserError?.message ?? "sin respuesta"}`
      );
    }

    const { data: profile, error: profileError } = await admin
      .from("organization_profile")
      .select("plan_code, subscription_status, trial_ends_at")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (profileError) {
      throw new OrganizationProvisionError(
        `No pudimos validar el trial: ${profileError.message}`
      );
    }

    if (profile?.plan_code !== "trial") {
      throw new OrganizationProvisionError(
        `La organizacion quedo con plan_code ${profile?.plan_code ?? "null"} en vez de trial.`
      );
    }

    if (input.isTestAccount) {
      type UpdateTestAccountTable = {
        update(values: { is_test_account: boolean }): {
          eq(column: "organization_id", value: number): Promise<{
            error: { message: string } | null;
          }>;
        };
      };

      const organizationProfileTable = admin.from(
        "organization_profile"
      ) as unknown as UpdateTestAccountTable;

      const { error: testAccountError } = await organizationProfileTable
        .update({ is_test_account: true })
        .eq("organization_id", organizationId);

      if (testAccountError) {
        throw new OrganizationProvisionError(
          `No pudimos marcar la cuenta de prueba: ${testAccountError.message}`
        );
      }
    }

    return {
      organizationId,
      authUserId,
      userId: Number(publicUser.id),
      email,
      empresaNombre,
      trialEndsAt: profile?.trial_ends_at ?? null,
    };
  } catch (error) {
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId).catch(() => undefined);
    }

    await admin.from("organizations").delete().eq("id", organizationId);

    if (error instanceof OrganizationProvisionError) {
      throw error;
    }

    throw new OrganizationProvisionError(
      error instanceof Error ? error.message : "No pudimos crear la cuenta."
    );
  }
}
