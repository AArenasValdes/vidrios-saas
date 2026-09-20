import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertAuthRegisterRateLimit } from "@/features/auth/services/auth-register-rate-limit.service";
import {
  AuthOAuthCompletionError,
  provisionOrganizationFromOAuthUser,
} from "@/features/auth/services/auth-oauth-completion.service";
import {
  isAuthEmailConfirmed,
  readPendingEmailSignup,
} from "@/features/auth/services/auth-pending-email-signup.service";
import { sendWelcomeEmail } from "@/features/auth/services/auth-welcome-email.service";
import { seedDefaultLineCatalogServer } from "@/features/cotizaciones/line-templates/services/seed-line-catalog-server";
import { isRateLimitUnavailableError } from "@/features/solicitudes/services/solicitudes-public-http.service";
import type { User } from "@supabase/supabase-js";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function resolveAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    await assertAuthRegisterRateLimit(request);
  } catch (error) {
    if (isRateLimitUnavailableError(error)) {
      return NextResponse.json(
        { error: "El registro esta temporalmente protegido. Intenta nuevamente." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Demasiados intentos desde esta red. Espera un momento e intenta de nuevo.",
      },
      { status: 429 }
    );
  }

  const accessToken = getBearerToken(request);
  const admin = resolveAdminClient();
  let user: User | null = null;

  if (accessToken && admin) {
    const bearerResult = await admin.auth.getUser(accessToken);
    if (!bearerResult.error && bearerResult.data.user) {
      user = bearerResult.data.user;
    }
  }

  if (!user) {
    const cookieClient = await createClient();
    const cookieResult = await cookieClient.auth.getUser();
    if (!cookieResult.error && cookieResult.data.user) {
      user = cookieResult.data.user;
    }
  }

  if (!user?.email) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const pending = readPendingEmailSignup(user.user_metadata);
  const emailConfirmed = isAuthEmailConfirmed(user);

  // #region agent log
  fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "e60979",
    },
    body: JSON.stringify({
      sessionId: "e60979",
      hypothesisId: "A",
      location: "complete-pending-signup/route.ts:POST",
      message: "Complete pending email signup requested",
      data: {
        hasPendingSignup: Boolean(pending),
        emailConfirmed,
        usedBearer: Boolean(accessToken),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!pending) {
    return NextResponse.json(
      { error: "No hay un alta de correo pendiente.", code: "no_pending_signup" },
      { status: 404 }
    );
  }

  if (!emailConfirmed) {
    return NextResponse.json(
      {
        error: "Abre el correo de activacion de Ventora y usa ese enlace.",
        code: "email_not_confirmed",
      },
      { status: 409 }
    );
  }

  try {
    const result = await provisionOrganizationFromOAuthUser({
      authUserId: user.id,
      email: user.email,
      ...pending,
    });

    if (!result.alreadyProvisioned) {
      await seedDefaultLineCatalogServer(result.organizationId).catch(
        () => undefined
      );

      await sendWelcomeEmail({
        to: user.email,
        nombre: pending.nombre,
        empresaNombre: result.empresaNombre,
        trialEndsAt: result.trialEndsAt,
      });
    }

    return NextResponse.json({
      ok: true,
      organizacionId: result.organizationId,
      rol: "admin",
      alreadyProvisioned: result.alreadyProvisioned,
      accountComplete: result.accountComplete,
    });
  } catch (error) {
    if (error instanceof AuthOAuthCompletionError) {
      const status =
        error.code === "identity_conflict" || error.code === "email_taken"
          ? 409
          : error.code === "invalid_input" || error.code === "invalid_whatsapp"
            ? 400
            : error.code === "unauthenticated"
              ? 401
              : 500;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status }
      );
    }

    console.error("Fallo completar el alta pendiente de correo.", error);
    return NextResponse.json(
      { error: "No pudimos completar tu cuenta." },
      { status: 500 }
    );
  }
}
