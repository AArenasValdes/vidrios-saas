import { NextResponse } from "next/server";

import {
  SolicitudContactoValidationError,
  solicitudesContactoService,
} from "@/features/solicitudes/services/solicitudes-contacto.service";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const EMPRESA_SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
const recentRequestsByIp = new Map<string, number[]>();

function resolveIp(request: Request) {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

function normalizeEmpresaSlug(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!EMPRESA_SLUG_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

function isRateLimited(ip: string | null) {
  const key = ip || "unknown";
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recentRequests = (recentRequestsByIp.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart
  );

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    recentRequestsByIp.set(key, recentRequests);
    return true;
  }

  recentRequests.push(now);
  if (recentRequests.length > 0) {
    recentRequestsByIp.set(key, recentRequests);
  } else {
    recentRequestsByIp.delete(key);
  }
  return false;
}

async function parseBody(request: Request) {
  try {
    const parsed = await request.json();

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as {
      nombre?: string;
      contacto?: string;
      tipoTrabajo?: string;
      mensaje?: string;
      origen?: string | null;
      utmSource?: string | null;
      utmMedium?: string | null;
      utmCampaign?: string | null;
      sourceUrl?: string | null;
    };
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ empresa: string }> }
) {
  const { empresa: rawEmpresa } = await context.params;
  const ip = resolveIp(request);
  const empresa = normalizeEmpresaSlug(rawEmpresa);

  if (!empresa) {
    return NextResponse.json(
      { error: "No encontramos la empresa solicitada." },
      { status: 404 }
    );
  }

  if (isRateLimited(ip)) {
    return NextResponse.json(
      {
        error:
          "Recibimos demasiadas solicitudes. Intenta nuevamente en unos minutos.",
      },
      { status: 429 }
    );
  }

  try {
    const body = await parseBody(request);

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

    return NextResponse.json(
      { error: "No pudimos registrar la solicitud. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
