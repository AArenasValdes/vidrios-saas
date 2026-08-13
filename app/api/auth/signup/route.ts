import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { assertAuthRegisterRateLimit } from "@/features/auth/services/auth-register-rate-limit.service";
import {
  AuthOAuthCompletionError,
  provisionOrganizationFromOAuthUser,
} from "@/features/auth/services/auth-oauth-completion.service";
import { sendWelcomeEmail } from "@/features/auth/services/auth-welcome-email.service";
import {
  getWhatsappValidationHint,
  resolveSignupWhatsapp,
} from "@/features/organization-region/services/phone-number.service";
import { normalizeSupportedCountryCode } from "@/features/organization-region/services/organization-region.service";
import { parseJsonObjectBody } from "@/features/solicitudes/services/solicitudes-public-http.service";

type SignupBody = Record<string, unknown> & {
  nombre?: string;
  empresaNombre?: string;
  email?: string;
  password?: string;
  whatsapp?: string;
  whatsappLocal?: string;
  ciudadComuna?: string;
  consentimientoAceptado?: boolean;
  countryCode?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getAdminAuthErrorMessage(error: {
  message?: string;
  status?: number;
}) {
  const message = error.message?.toLowerCase() ?? "";

  if (error.status === 422 || message.includes("already been registered")) {
    return "Este correo ya tiene una cuenta. Inicia sesion para continuar.";
  }

  return "No pudimos crear tu acceso. Intenta de nuevo.";
}

function mapSignupErrorField(
  code: AuthOAuthCompletionError["code"] | "email_taken" | "auth_create_failed",
) {
  if (code === "invalid_whatsapp") return "whatsapp";
  if (code === "email_taken" || code === "identity_conflict") return "email";
  return undefined;
}

export async function POST(request: Request) {
  try {
    await assertAuthRegisterRateLimit(request);
  } catch {
    return NextResponse.json(
      {
        error:
          "Demasiados intentos desde esta red. Espera un momento e intenta de nuevo.",
      },
      { status: 429 },
    );
  }

  const body = await parseJsonObjectBody<SignupBody>(request);

  if (!body) {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

  if (!/^\S+@\S+\.\S+$/u.test(email)) {
    return NextResponse.json(
      { error: "Ingresa un correo valido." },
      { status: 400 },
    );
  }

  if (password.length < 8 || password.length > 72) {
    return NextResponse.json(
      { error: "Tu contrasena debe tener entre 8 y 72 caracteres." },
      { status: 400 },
    );
  }

  const countryCode = normalizeSupportedCountryCode(body.countryCode ?? "");
  const whatsapp = resolveSignupWhatsapp(
    String(body.whatsapp ?? ""),
    String(body.whatsappLocal ?? body.whatsapp ?? ""),
    countryCode,
  );

  if (!whatsapp) {
    console.error("[signup] invalid whatsapp", {
      countryCode,
      bodyWhatsappLen: String(body.whatsapp ?? "").length,
      bodyLocalLen: String(body.whatsappLocal ?? "").length,
    });
    return NextResponse.json(
      {
        error: getWhatsappValidationHint(
          countryCode,
          String(body.whatsappLocal ?? body.whatsapp ?? ""),
        ),
        code: "invalid_whatsapp",
        field: "whatsapp",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: createdAuth, error: createAuthError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createAuthError || !createdAuth.user) {
    return NextResponse.json(
      {
        error: getAdminAuthErrorMessage(createAuthError ?? {}),
        code:
          createAuthError?.status === 422 ? "email_taken" : "auth_create_failed",
      },
      { status: createAuthError?.status === 422 ? 409 : 500 },
    );
  }

  try {
    const result = await provisionOrganizationFromOAuthUser(
      {
        authUserId: createdAuth.user.id,
        email,
        nombre: body.nombre ?? "",
        empresaNombre: body.empresaNombre ?? "",
        whatsapp,
        ciudadComuna: body.ciudadComuna ?? "",
        countryCode,
        consentimientoAceptado: body.consentimientoAceptado === true,
      },
      { admin },
    );

    // No bloquea el alta si Resend falla.
    void sendWelcomeEmail({
      to: email,
      nombre: body.nombre ?? "",
      empresaNombre: body.empresaNombre ?? result.empresaNombre ?? "",
      trialEndsAt: result.trialEndsAt,
    });

    return NextResponse.json(
      {
        ok: true,
        organizationId: result.organizationId,
        trialEndsAt: result.trialEndsAt,
        accountComplete: result.accountComplete,
      },
      { status: 201 },
    );
  } catch (error) {
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(
      createdAuth.user.id,
    );

    if (deleteAuthError) {
      console.error(
        "No pudimos revertir un acceso sin organizacion.",
        deleteAuthError,
      );
    }

    if (error instanceof AuthOAuthCompletionError) {
      const status =
        error.code === "invalid_input" || error.code === "invalid_whatsapp"
          ? 400
          : error.code === "identity_conflict" || error.code === "email_taken"
            ? 409
            : 500;

      return NextResponse.json(
        { error: error.message, code: error.code, field: mapSignupErrorField(error.code) },
        { status },
      );
    }

    console.error("Fallo el registro con correo y contrasena.", error);
    return NextResponse.json(
      { error: "No pudimos crear tu cuenta. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
