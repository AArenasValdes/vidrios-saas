import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import {
  parseProductFeedbackSubmission,
  ProductFeedbackValidationError,
  submitProductFeedback,
} from "@/features/product-feedback/services/product-feedback.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const context = await resolveAuthenticatedRouteContext();
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "El contenido de la propuesta no es válido." }, { status: 400 });
    }

    const submission = parseProductFeedbackSubmission(body);
    await submitProductFeedback({
      ...submission,
      organizationId: context.profile.organizationId!,
      authUserId: context.user.id,
    });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof ProductFeedbackValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("No se pudo registrar una propuesta de producto.", error);
    return NextResponse.json(
      { error: "No pudimos guardar tu propuesta. Inténtalo otra vez en un momento." },
      { status: 500 }
    );
  }
}
