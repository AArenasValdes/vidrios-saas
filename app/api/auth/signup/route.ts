import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertAuthRegisterIdentityRateLimit,
  assertAuthRegisterRateLimit,
} from "@/features/auth/services/auth-register-rate-limit.service";
import { sendAccountActivationEmail } from "@/features/auth/services/auth-account-activation-email.service";
import {
  getWhatsappValidationHint,
  resolveSignupWhatsapp,
} from "@/features/organization-region/services/phone-number.service";
import { normalizeSupportedCountryCode } from "@/features/organization-region/services/organization-region.service";
import {
  isRateLimitUnavailableError,
  isRequestBodyTooLargeError,
  parseJsonObjectBody,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

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

function getVerificationRedirect(request: Request) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const origin = new URL(configuredOrigin || request.url).origin;

  if (process.env.VERCEL === "1" && !configuredOrigin) {
    throw new Error("NEXT_PUBLIC_APP_URL es obligatoria para activar cuentas.");
  }

  const redirect = new URL("/auth/callback", origin);
  redirect.searchParams.set("intent", "signup");
  redirect.searchParams.set("provider", "email");
  redirect.searchParams.set("next", "/activacion");
  return redirect.toString();
}

export async function POST(request: Request) {
  try {
    await assertAuthRegisterRateLimit(request);
  } catch (error) {
    if (isRateLimitUnavailableError(error)) {
      return NextResponse.json(
        { error: "El registro esta temporalmente protegido. Intenta nuevamente en unos minutos." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Demasiados intentos desde esta red. Espera un momento e intenta de nuevo.",
      },
      { status: 429 },
    );
  }

  let body: SignupBody | null;

  try {
    body = await parseJsonObjectBody<SignupBody>(request);
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return NextResponse.json(
        { error: "La solicitud de registro es demasiado grande." },
        { status: 413 },
      );
    }

    throw error;
  }

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

  try {
    await assertAuthRegisterIdentityRateLimit(email);
  } catch (error) {
    if (isRateLimitUnavailableError(error)) {
      return NextResponse.json(
        { error: "El registro esta temporalmente protegido. Intenta nuevamente en unos minutos." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Demasiados intentos para este correo. Espera un momento e intenta de nuevo." },
      { status: 429 },
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
  const { data: activation, error: createAuthError } =
    await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo: getVerificationRedirect(request),
        data: {
          ventora_signup: {
            version: 1,
            nombre: body.nombre ?? "",
            empresaNombre: body.empresaNombre ?? "",
            whatsapp,
            ciudadComuna: body.ciudadComuna ?? "",
            countryCode,
            consentimientoAceptado: body.consentimientoAceptado === true,
          },
        },
      },
    });

  const createdUser = activation.user;
  const actionLink = activation.properties?.action_link;

  if (createAuthError || !createdUser || !actionLink) {
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
    const activationEmail = await sendAccountActivationEmail({
      to: email,
      empresaNombre: body.empresaNombre ?? "",
      actionLink,
    });

    if (!activationEmail.sent) {
      await admin.auth.admin.deleteUser(createdUser.id);
      return NextResponse.json(
        { error: "No pudimos enviar el correo de activacion. Intenta nuevamente." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        verificationRequired: true,
        accountComplete: false,
      },
      { status: 202 },
    );
  } catch (error) {
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(
      createdUser.id,
    );

    if (deleteAuthError) {
      console.error(
        "No pudimos revertir un acceso sin organizacion.",
        deleteAuthError,
      );
    }

    console.error("Fallo el envio de activacion de cuenta.", error);
    return NextResponse.json(
      { error: "No pudimos crear tu cuenta. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
