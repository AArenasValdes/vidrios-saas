import { NextResponse } from "next/server";

import {
  ManualPaymentActivationError,
  extendOrganizationTrial,
} from "@/features/admin/services/manual-payment-activation.service";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import {
  isRequestBodyTooLargeError,
  parseJsonObjectBody,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

type ExtendTrialBody = {
  organizationId?: number;
  extraDays?: number;
};

export async function POST(request: Request) {
  try {
    await resolveVentoraAdminRouteContext();
    const body = await parseJsonObjectBody<
      ExtendTrialBody & Record<string, unknown>
    >(request);

    const result = await extendOrganizationTrial({
      organizationId: Number(body?.organizationId),
      extraDays: body?.extraDays,
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

    console.error("Fallo la extension de trial admin.", error);
    return NextResponse.json(
      { error: "No pudimos extender el trial." },
      { status: 500 }
    );
  }
}
