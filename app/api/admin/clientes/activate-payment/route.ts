import { NextResponse } from "next/server";

import {
  ManualPaymentActivationError,
  activateManualOrganizationPayment,
} from "@/features/admin/services/manual-payment-activation.service";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import { isBillingPlanCode } from "@/features/billing/types/plans";
import {
  isRequestBodyTooLargeError,
  parseJsonObjectBody,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

type ActivatePaymentBody = {
  organizationId?: number;
  planCode?: string;
  reference?: string;
};

export async function POST(request: Request) {
  try {
    await resolveVentoraAdminRouteContext();
    const body = await parseJsonObjectBody<
      ActivatePaymentBody & Record<string, unknown>
    >(request);
    const planCode = body?.planCode?.trim() ?? "";

    if (!isBillingPlanCode(planCode)) {
      return NextResponse.json({ error: "Plan no valido." }, { status: 400 });
    }

    const result = await activateManualOrganizationPayment({
      organizationId: Number(body?.organizationId),
      planCode,
      reference: body?.reference ?? null,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 413 });
    }

    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof ManualPaymentActivationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Fallo la activacion manual admin.", error);
    return NextResponse.json(
      { error: "No pudimos activar el pago." },
      { status: 500 }
    );
  }
}
