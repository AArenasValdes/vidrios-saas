import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccountActivationEmail } from "@/features/auth/services/auth-account-activation-email.service";

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
  activationSent: true;
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
  const empresaNombre = normalizeEmpresaNombre(input.empresaNombre ?? "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new OrganizationProvisionError(
      "Ingresa un correo valido.",
      "invalid_input"
    );
  }

  if (empresaNombre.length < 2) {
    throw new OrganizationProvisionError(
      "Ingresa el nombre de la empresa.",
      "invalid_input"
    );
  }

  return { email, empresaNombre };
}

function getActivationRedirect() {
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appOrigin) {
    throw new OrganizationProvisionError(
      "Falta NEXT_PUBLIC_APP_URL para crear la invitacion."
    );
  }

  const redirect = new URL("/auth/callback", appOrigin);
  redirect.searchParams.set("intent", "signup");
  redirect.searchParams.set("provider", "email");
  redirect.searchParams.set("next", "/auth/definir-contrasena");
  return redirect.toString();
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
  const { email, empresaNombre } =
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
      await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          redirectTo: getActivationRedirect(),
        },
      });

    if (authError || !authData.user || !authData.properties?.action_link) {
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

    const activationEmail = await sendAccountActivationEmail({
      to: email,
      empresaNombre,
      actionLink: authData.properties.action_link,
    });

    if (!activationEmail.sent) {
      throw new OrganizationProvisionError(
        "No pudimos enviar la invitacion. Revisa la configuracion de correo."
      );
    }

    return {
      organizationId,
      authUserId,
      userId: Number(publicUser.id),
      email,
      empresaNombre,
      trialEndsAt: profile?.trial_ends_at ?? null,
      activationSent: true,
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
