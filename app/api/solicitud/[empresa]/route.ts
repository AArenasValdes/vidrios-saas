import { NextResponse } from "next/server";

import {
  SolicitudContactoValidationError,
  solicitudesContactoService,
} from "@/features/solicitudes/services/solicitudes-contacto.service";
import {
  createSlidingWindowRateLimiter,
  parseJsonObjectBody,
  resolveRequestIp,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const EMPRESA_SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
const publicRequestRateLimiter = createSlidingWindowRateLimiter({
  namespace: "api:solicitud-empresa:public-request",
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: RATE_LIMIT_MAX_REQUESTS,
});

function normalizeEmpresaSlug(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!EMPRESA_SLUG_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ empresa: string }> }
) {
  const { empresa: rawEmpresa } = await context.params;
  const ip = resolveRequestIp(request);
  const empresa = normalizeEmpresaSlug(rawEmpresa);

  if (!empresa) {
    return NextResponse.json(
      { error: "No encontramos la empresa solicitada." },
      { status: 404 }
    );
  }

  if (await publicRequestRateLimiter.isRateLimited(ip)) {
    return NextResponse.json(
      {
        error:
          "Recibimos demasiadas solicitudes. Intenta nuevamente en unos minutos.",
      },
      { status: 429 }
    );
  }

  try {
    const body = await parseJsonObjectBody<{
      nombre?: string;
      contacto?: string;
      tipoTrabajo?: string;
      mensaje?: string;
      origen?: string | null;
      utmSource?: string | null;
      utmMedium?: string | null;
      utmCampaign?: string | null;
      sourceUrl?: string | null;
    }>(request);

    if (!body) {
      return NextResponse.json(
        { error: "La solicitud no tiene un formato valido." },
        { status: 400 }
      );
    }

    const publicConfig =
      await solicitudesContactoService.getPublicRequestConfig(empresa);

    if (!publicConfig) {
      return NextResponse.json(
        { error: "No encontramos la empresa solicitada." },
        { status: 404 }
      );
    }

    const solicitud = await solicitudesContactoService.createPublicRequest({
      organizationId: publicConfig.organizationId,
      countryCode: publicConfig.countryCode,
      empresa: publicConfig.empresaNombre,
      nombre: body.nombre ?? "",
      contacto: body.contacto ?? "",
      tipoTrabajo: body.tipoTrabajo ?? "",
      mensaje: body.mensaje ?? "",
      origen: body.origen ?? body.utmSource ?? "solicitud-publica",
      ip: ip,
      userAgent: request.headers.get("user-agent"),
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      sourceUrl: body.sourceUrl,
    });

    return NextResponse.json({ solicitud }, { status: 201 });
  } catch (error) {
    if (error instanceof SolicitudContactoValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[API] /api/solicitud/[empresa] POST", error);
    return NextResponse.json(
      { error: "No pudimos registrar la solicitud. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
