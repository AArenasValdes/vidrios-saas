import { NextResponse } from "next/server";

import { assertAuthRegisterRateLimit } from "@/features/auth/services/auth-register-rate-limit.service";
import {
  resolveRequestIp,
  isRateLimitUnavailableError,
  isRequestBodyTooLargeError,
  parseJsonObjectBody,
} from "@/features/solicitudes/services/solicitudes-public-http.service";
import {
  SolicitudContactoValidationError,
  solicitudesContactoService,
} from "@/features/solicitudes/services/solicitudes-contacto.service";

type RegisterBody = Record<string, unknown> & {
  nombre?: string;
  empresa?: string;
  whatsapp?: string;
  ciudadComuna?: string;
  mensaje?: string;
};

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
          "Demasiados intentos de registro desde esta red. Espera un momento e intenta de nuevo.",
      },
      { status: 429 }
    );
  }

  let body: RegisterBody | null;

  try {
    body = await parseJsonObjectBody<RegisterBody>(request);
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return NextResponse.json(
        { error: "La solicitud es demasiado grande." },
        { status: 413 }
      );
    }
    throw error;
  }

  if (!body) {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  try {
    await solicitudesContactoService.createSaasRegistrationRequest({
      nombre: body.nombre ?? "",
      empresa: body.empresa ?? "",
      whatsapp: body.whatsapp ?? "",
      ciudadComuna: body.ciudadComuna ?? "",
      mensaje: body.mensaje ?? "",
      origen: "registro-saas",
      ip: resolveRequestIp(request),
      userAgent: request.headers.get("user-agent"),
      sourceUrl: request.headers.get("referer") ?? request.url,
    });

    return NextResponse.json({
      ok: true,
      message:
        "Recibimos tus datos. Te contactaremos por WhatsApp para dejar tu cuenta configurada.",
    });
  } catch (error) {
    if (error instanceof SolicitudContactoValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Fallo la solicitud de cuenta de prueba.", error);
    return NextResponse.json(
      { error: "No pudimos recibir tu solicitud. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
