import { NextResponse } from "next/server";

import {
  ManualPaymentActivationError,
  extendOrganizationTrial,
} from "@/features/admin/services/manual-payment-activation.service";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";

type ExtendTrialBody = {
  organizationId?: number;
  extraDays?: number;
};

export async function POST(request: Request) {
  try {
    await resolveVentoraAdminRouteContext();
    const body = (await request.json().catch(() => null)) as ExtendTrialBody | null;

    const result = await extendOrganizationTrial({
      organizationId: Number(body?.organizationId),
      extraDays: body?.extraDays,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
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
