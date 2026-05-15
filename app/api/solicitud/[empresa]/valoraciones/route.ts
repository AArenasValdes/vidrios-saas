import { NextResponse } from "next/server";

import {
  PublicLandingTestimonialValidationError,
  validatePublicLandingTestimonialInput,
} from "@/features/public-landing-testimonials/services/public-landing-testimonial.service";
import { createPublicLandingTestimonialSubmission } from "@/features/public-landing-testimonials/repositories/public-landing-testimonial-server.repository";
import { solicitudesContactoService } from "@/features/solicitudes/services/solicitudes-contacto.service";
import {
  createSlidingWindowRateLimiter,
  parseJsonObjectBody,
  resolveRequestIp,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

export const dynamic = "force-dynamic";

const EMPRESA_SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
const testimonialRateLimiter = createSlidingWindowRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 3,
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
  const empresa = normalizeEmpresaSlug(rawEmpresa);
  const ip = resolveRequestIp(request);

  if (!empresa) {
    return NextResponse.json(
      { error: "No encontramos la empresa solicitada." },
      { status: 404 }
    );
  }

  if (testimonialRateLimiter.isRateLimited(ip)) {
    return NextResponse.json(
      {
        error:
          "Recibimos demasiadas valoraciones desde este dispositivo. Intenta nuevamente más tarde.",
      },
      { status: 429 }
    );
  }

  try {
    const body = await parseJsonObjectBody<{
      nombreCorto?: string;
      comentario?: string;
      estrellas?: number;
    }>(request);

    if (!body) {
      return NextResponse.json(
        { error: "La valoracion no tiene un formato valido." },
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

    const normalizedInput = validatePublicLandingTestimonialInput({
      nombreCorto: body.nombreCorto ?? "",
      comentario: body.comentario ?? "",
      estrellas: Number(body.estrellas ?? 0),
    });

    const testimonial = await createPublicLandingTestimonialSubmission({
      organizationId: publicConfig.organizationId,
      ...normalizedInput,
    });

    return NextResponse.json({ testimonial }, { status: 201 });
  } catch (error) {
    if (error instanceof PublicLandingTestimonialValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "No pudimos guardar tu valoracion. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
