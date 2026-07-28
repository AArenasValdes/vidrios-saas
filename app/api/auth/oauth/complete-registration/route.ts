import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { assertAuthRegisterRateLimit } from "@/features/auth/services/auth-register-rate-limit.service";
import {
  AuthOAuthCompletionError,
  provisionOrganizationFromOAuthUser,
} from "@/features/auth/services/auth-oauth-completion.service";
import { parseJsonObjectBody } from "@/features/solicitudes/services/solicitudes-public-http.service";

type CompleteRegistrationBody = Record<string, unknown> & {
  nombre?: string;
  empresaNombre?: string;
  whatsapp?: string;
  ciudadComuna?: string;
  consentimientoAceptado?: boolean;
};

export async function POST(request: Request) {
  try {
    await assertAuthRegisterRateLimit(request);
  } catch {
    return NextResponse.json(
      {
        error:
          "Demasiados intentos desde esta red. Espera un momento e intenta de nuevo.",
      },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await parseJsonObjectBody<CompleteRegistrationBody>(request);

  if (!body) {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  try {
    const result = await provisionOrganizationFromOAuthUser({
      authUserId: user.id,
      email: user.email,
      nombre: body.nombre ?? "",
      empresaNombre: body.empresaNombre ?? "",
      whatsapp: body.whatsapp ?? "",
      ciudadComuna: body.ciudadComuna ?? "",
      consentimientoAceptado: body.consentimientoAceptado === true,
    });

    return NextResponse.json({
      ok: true,
      organizationId: result.organizationId,
      alreadyProvisioned: result.alreadyProvisioned,
      trialEndsAt: result.trialEndsAt,
      accountComplete: result.accountComplete,
    });
  } catch (error) {
    if (error instanceof AuthOAuthCompletionError) {
      const status =
        error.code === "identity_conflict"
          ? 409
          : error.code === "email_taken"
            ? 409
            : error.code === "invalid_input"
              ? 400
              : error.code === "unauthenticated"
                ? 401
                : 500;

      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }

    console.error("Fallo el registro OAuth.", error);
    return NextResponse.json(
      { error: "No pudimos crear tu cuenta." },
      { status: 500 }
    );
  }
}
