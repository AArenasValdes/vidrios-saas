import { NextResponse } from "next/server";

import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import {
  OrganizationTestAccountError,
  setOrganizationTestAccount,
} from "@/features/admin/services/organization-test-account.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import {
  isRequestBodyTooLargeError,
  parseJsonObjectBody,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

type SetTestAccountBody = {
  organizationId?: number;
  isTestAccount?: boolean;
};

export async function POST(request: Request) {
  try {
    await resolveVentoraAdminRouteContext();
    const body = await parseJsonObjectBody<
      SetTestAccountBody & Record<string, unknown>
    >(request);

    const result = await setOrganizationTestAccount({
      organizationId: Number(body?.organizationId),
      isTestAccount: Boolean(body?.isTestAccount),
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 413 });
    }

    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof OrganizationTestAccountError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Fallo el marcado de cuenta test admin.", error);
    return NextResponse.json(
      { error: "No pudimos actualizar la cuenta." },
      { status: 500 }
    );
  }
}
