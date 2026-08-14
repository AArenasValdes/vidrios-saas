import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { OrganizacionId } from "@/features/auth/types/auth";
import {
  ensureAuthWhatsappE164,
  getWhatsappValidationHint,
  normalizePhoneToE164,
  resolveAuthWhatsapp,
} from "@/features/organization-region/services/phone-number.service";
import { normalizeSupportedCountryCode } from "@/features/organization-region/services/organization-region.service";
import type { SupportedCountryCode } from "@/features/organization-region/types/organization-region";

export class AuthOAuthCompletionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "invalid_input"
      | "invalid_whatsapp"
      | "identity_conflict"
      | "email_taken"
      | "unauthenticated"
      | "provision_failed" = "provision_failed",
  ) {
    super(message);
    this.name = "AuthOAuthCompletionError";
  }
}

export type OAuthAccountCompletionValues = {
  nombre: string;
  empresaNombre: string;
  whatsapp: string;
  ciudadComuna: string;
  countryCode: SupportedCountryCode;
  consentimientoAceptado: boolean;
};

export type OAuthAccountCompletionState = {
  isComplete: boolean;
  organizationId: OrganizacionId | null;
  userId: number | null;
  values: OAuthAccountCompletionValues;
};

export type OAuthIdentityResolution =
  | {
      status: "linked";
      organizationId: OrganizacionId;
      userId: number;
      syncedAuthUserId: boolean;
      accountComplete: boolean;
    }
  | {
      status: "needs_signup";
    }
  | {
      status: "identity_conflict";
    };

export type ProvisionOAuthOrganizationResult = {
  organizationId: number;
  userId: number;
  email: string;
  empresaNombre: string;
  trialEndsAt: string | null;
  alreadyProvisioned: boolean;
  accountComplete: boolean;
};

type PublicUserRow = {
  id: number;
  correo: string | null;
  auth_user_id: string | null;
  organization_id: OrganizacionId | null;
  eliminado_en: string | null;
  nombre: string | null;
  whatsapp: string | null;
  ciudad_comuna: string | null;
  data_sharing_accepted_at: string | null;
};

type OrganizationRow = {
  nombre: string | null;
};

type OrganizationProfileRow = {
  empresa_nombre: string | null;
  country_code?: string | null;
};

type OAuthCompletionRpcRow = {
  result_organization_id: number | string;
  result_user_id: number | string;
  result_trial_ends_at: string | null;
  result_already_provisioned: boolean;
  result_account_complete: boolean;
};

const PUBLIC_USER_SELECT =
  "id, correo, auth_user_id, organization_id, eliminado_en, nombre, whatsapp, ciudad_comuna, data_sharing_accepted_at";

const COMPLETION_FIELD_LIMITS = {
  email: 320,
  nombre: 120,
  empresaNombre: 160,
  ciudadComuna: 120,
} as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

function hasRequiredText(value: string) {
  return value.length >= 2;
}

function buildEmptyCompletionValues(): OAuthAccountCompletionValues {
  return {
    nombre: "",
    empresaNombre: "",
    whatsapp: "",
    ciudadComuna: "",
    countryCode: "CL",
    consentimientoAceptado: false,
  };
}

async function getPublicUserByAuthUserId(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<PublicUserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select(PUBLIC_USER_SELECT)
    .eq("auth_user_id", authUserId)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    throw new AuthOAuthCompletionError(
      `No pudimos validar tu acceso: ${error.message}`,
    );
  }

  return (data as PublicUserRow | null) ?? null;
}

async function getPublicUserByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<PublicUserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select(PUBLIC_USER_SELECT)
    .ilike("correo", email)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    throw new AuthOAuthCompletionError(
      `No pudimos validar tu correo: ${error.message}`,
    );
  }

  return (data as PublicUserRow | null) ?? null;
}

async function resolvePublicUser(
  admin: SupabaseClient,
  input: { authUserId: string; email: string },
) {
  const linkedByAuthUserId = await getPublicUserByAuthUserId(
    admin,
    input.authUserId,
  );

  if (linkedByAuthUserId) {
    return linkedByAuthUserId;
  }

  return getPublicUserByEmail(admin, input.email);
}

export async function getOAuthAccountCompletionState(
  input: {
    authUserId: string;
    email: string;
  },
  deps: { admin?: SupabaseClient } = {},
): Promise<OAuthAccountCompletionState> {
  const authUserId = input.authUserId.trim();
  const email = normalizeEmail(input.email);

  if (!authUserId || !email) {
    throw new AuthOAuthCompletionError(
      "No pudimos validar tu sesion de Google.",
      "unauthenticated",
    );
  }

  const admin = deps.admin ?? createAdminClient();
  const publicUser = await resolvePublicUser(admin, { authUserId, email });

  if (!publicUser) {
    return {
      isComplete: false,
      organizationId: null,
      userId: null,
      values: buildEmptyCompletionValues(),
    };
  }

  if (publicUser.auth_user_id && publicUser.auth_user_id !== authUserId) {
    throw new AuthOAuthCompletionError(
      "Este correo ya esta vinculado a otra cuenta de acceso.",
      "identity_conflict",
    );
  }

  const organizationId = publicUser.organization_id;
  let organization: OrganizationRow | null = null;
  let profile: OrganizationProfileRow | null = null;

  if (organizationId != null) {
    const [organizationResult, profileResult] = await Promise.all([
      admin
        .from("organizations")
        .select("nombre")
        .eq("id", organizationId)
        .is("eliminado_en", null)
        .maybeSingle(),
      admin
        .from("organization_profile")
        .select("empresa_nombre, country_code")
        .eq("organization_id", organizationId)
        .maybeSingle(),
    ]);

    if (organizationResult.error) {
      throw new AuthOAuthCompletionError(
        `No pudimos leer tu taller: ${organizationResult.error.message}`,
      );
    }

    if (profileResult.error) {
      throw new AuthOAuthCompletionError(
        `No pudimos leer la configuracion del taller: ${profileResult.error.message}`,
      );
    }

    organization = (organizationResult.data as OrganizationRow | null) ?? null;
    profile = (profileResult.data as OrganizationProfileRow | null) ?? null;
  }

  const values: OAuthAccountCompletionValues = {
    nombre: normalizeText(publicUser.nombre ?? ""),
    empresaNombre: normalizeText(
      profile?.empresa_nombre ?? organization?.nombre ?? "",
    ),
    whatsapp:
      normalizePhoneToE164(
        publicUser.whatsapp ?? "",
        normalizeSupportedCountryCode(profile?.country_code),
      ) ?? "",
    ciudadComuna: normalizeText(publicUser.ciudad_comuna ?? ""),
    countryCode: normalizeSupportedCountryCode(profile?.country_code),
    consentimientoAceptado: Boolean(publicUser.data_sharing_accepted_at),
  };

  const isComplete =
    organizationId != null &&
    hasRequiredText(values.nombre) &&
    hasRequiredText(values.empresaNombre) &&
    Boolean(values.whatsapp) &&
    values.consentimientoAceptado;

  return {
    isComplete,
    organizationId,
    userId: Number(publicUser.id),
    values,
  };
}

export async function resolveOAuthIdentity(
  input: {
    authUserId: string;
    email: string;
  },
  deps: { admin?: SupabaseClient } = {},
): Promise<OAuthIdentityResolution> {
  const authUserId = input.authUserId.trim();
  const email = normalizeEmail(input.email);

  if (!authUserId || !email) {
    throw new AuthOAuthCompletionError(
      "No pudimos validar tu sesion de Google.",
      "unauthenticated",
    );
  }

  const admin = deps.admin ?? createAdminClient();
  const linkedByAuthUserId = await getPublicUserByAuthUserId(admin, authUserId);

  if (linkedByAuthUserId?.organization_id != null) {
    const completion = await getOAuthAccountCompletionState(
      { authUserId, email },
      { admin },
    );

    return {
      status: "linked",
      organizationId: linkedByAuthUserId.organization_id,
      userId: Number(linkedByAuthUserId.id),
      syncedAuthUserId: false,
      accountComplete: completion.isComplete,
    };
  }

  const linkedByEmail = await getPublicUserByEmail(admin, email);

  if (!linkedByEmail) {
    return { status: "needs_signup" };
  }

  if (linkedByEmail.auth_user_id && linkedByEmail.auth_user_id !== authUserId) {
    return { status: "identity_conflict" };
  }

  let syncedAuthUserId = false;

  if (!linkedByEmail.auth_user_id) {
    const { error: syncError } = await admin
      .from("users")
      .update({ auth_user_id: authUserId })
      .eq("id", linkedByEmail.id)
      .is("auth_user_id", null);

    if (syncError) {
      throw new AuthOAuthCompletionError(
        `No pudimos vincular tu acceso: ${syncError.message}`,
      );
    }

    syncedAuthUserId = true;
  }

  if (linkedByEmail.organization_id == null) {
    return { status: "needs_signup" };
  }

  const completion = await getOAuthAccountCompletionState(
    { authUserId, email },
    { admin },
  );

  return {
    status: "linked",
    organizationId: linkedByEmail.organization_id,
    userId: Number(linkedByEmail.id),
    syncedAuthUserId,
    accountComplete: completion.isComplete,
  };
}

export async function provisionOrganizationFromOAuthUser(
  input: {
    authUserId: string;
    email: string;
    nombre: string;
    empresaNombre: string;
    whatsapp: string;
    ciudadComuna: string;
    countryCode: SupportedCountryCode | string;
    consentimientoAceptado: boolean;
  },
  deps: { admin?: SupabaseClient } = {},
): Promise<ProvisionOAuthOrganizationResult> {
  const authUserId = input.authUserId.trim();
  const email = normalizeEmail(input.email);
  const nombre = normalizeText(input.nombre ?? "");
  const empresaNombre = normalizeText(input.empresaNombre ?? "");
  const ciudadComuna = normalizeText(input.ciudadComuna ?? "");
  const countryCode = normalizeSupportedCountryCode(input.countryCode);
  const whatsapp = resolveAuthWhatsapp(input.whatsapp ?? "", countryCode);

  if (!authUserId || !email) {
    throw new AuthOAuthCompletionError(
      "No pudimos validar tu sesion.",
      "unauthenticated",
    );
  }

  if (email.length > COMPLETION_FIELD_LIMITS.email) {
    throw new AuthOAuthCompletionError(
      "El correo supera el largo permitido.",
      "invalid_input",
    );
  }

  if (!hasRequiredText(nombre)) {
    throw new AuthOAuthCompletionError("Ingresa tu nombre.", "invalid_input");
  }

  if (nombre.length > COMPLETION_FIELD_LIMITS.nombre) {
    throw new AuthOAuthCompletionError(
      "Tu nombre es demasiado largo.",
      "invalid_input",
    );
  }

  if (!hasRequiredText(empresaNombre)) {
    throw new AuthOAuthCompletionError(
      "Ingresa el nombre del taller.",
      "invalid_input",
    );
  }

  if (empresaNombre.length > COMPLETION_FIELD_LIMITS.empresaNombre) {
    throw new AuthOAuthCompletionError(
      "El nombre del taller es demasiado largo.",
      "invalid_input",
    );
  }

  if (!whatsapp) {
    throw new AuthOAuthCompletionError(
      getWhatsappValidationHint(countryCode, input.whatsapp ?? ""),
      "invalid_whatsapp",
    );
  }

  const whatsappE164 = ensureAuthWhatsappE164(whatsapp);
  if (!whatsappE164) {
    throw new AuthOAuthCompletionError(
      getWhatsappValidationHint(countryCode, input.whatsapp ?? ""),
      "invalid_whatsapp",
    );
  }

  if (ciudadComuna.length > 0 && ciudadComuna.length < 2) {
    throw new AuthOAuthCompletionError(
      "La ciudad o comuna debe tener al menos 2 caracteres.",
      "invalid_input",
    );
  }

  if (ciudadComuna.length > COMPLETION_FIELD_LIMITS.ciudadComuna) {
    throw new AuthOAuthCompletionError(
      "La ciudad o comuna es demasiado larga.",
      "invalid_input",
    );
  }

  if (!input.consentimientoAceptado) {
    throw new AuthOAuthCompletionError(
      "Debes aceptar la creacion de la cuenta y el contacto directo.",
      "invalid_input",
    );
  }

  const admin = deps.admin ?? createAdminClient();
  const { data, error } = await admin.rpc("complete_google_oauth_account", {
    p_auth_user_id: authUserId,
    p_email: email,
    p_nombre: nombre,
    p_empresa_nombre: empresaNombre,
    p_whatsapp: whatsappE164,
    p_ciudad_comuna: ciudadComuna,
    p_consent: true,
    p_country_code: countryCode,
  });

  if (error) {
    if (error.code === "23505") {
      throw new AuthOAuthCompletionError(
        "Este correo ya esta vinculado a otra cuenta de acceso.",
        "identity_conflict",
      );
    }

    if (error.code === "22023") {
      const message = error.message ?? "";
      if (/whatsapp/i.test(message)) {
        throw new AuthOAuthCompletionError(
          getWhatsappValidationHint(countryCode, input.whatsapp ?? ""),
          "invalid_whatsapp",
        );
      }
      throw new AuthOAuthCompletionError(message, "invalid_input");
    }

    if (error.code === "28000") {
      throw new AuthOAuthCompletionError(
        "No pudimos validar tu sesion.",
        "unauthenticated",
      );
    }

    throw new AuthOAuthCompletionError(
      `No pudimos completar tu cuenta: ${error.message}`,
    );
  }

  const result = (
    Array.isArray(data) ? data[0] : data
  ) as OAuthCompletionRpcRow | null;

  if (!result?.result_organization_id || !result.result_user_id) {
    throw new AuthOAuthCompletionError(
      "La cuenta no quedo vinculada a una organizacion valida.",
    );
  }

  return {
    organizationId: Number(result.result_organization_id),
    userId: Number(result.result_user_id),
    email,
    empresaNombre,
    trialEndsAt: result.result_trial_ends_at ?? null,
    alreadyProvisioned: Boolean(result.result_already_provisioned),
    accountComplete: Boolean(result.result_account_complete),
  };
}
