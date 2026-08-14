import { NextResponse } from "next/server";

import {
  OrganizationProvisionError,
  provisionOrganizationAccount,
} from "@/features/admin/services/organization-provision.service";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import {
  isRequestBodyTooLargeError,
  parseJsonObjectBody,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

type ProvisionBody = {
  email?: string;
  empresaNombre?: string;
  isTestAccount?: boolean;
};

export async function POST(request: Request) {
  try {
    await resolveVentoraAdminRouteContext();
    const body = await parseJsonObjectBody<ProvisionBody & Record<string, unknown>>(
      request
    );

    const result = await provisionOrganizationAccount({
      email: body?.email ?? "",
      empresaNombre: body?.empresaNombre ?? "",
      isTestAccount: body?.isTestAccount === true,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return NextResponse.json(
        { error: "La solicitud es demasiado grande." },
        { status: 413 }
      );
    }
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof OrganizationProvisionError) {
      const status =
        error.code === "email_taken"
          ? 409
          : error.code === "invalid_input"
            ? 400
            : 500;

      return NextResponse.json({ error: error.message }, { status });
    }

    console.error("Fallo el provision admin.", error);

    const message =
      error instanceof Error ? error.message : "No pudimos crear la cuenta.";
    const missingServiceRole =
      /SUPABASE_SERVICE_ROLE_KEY/i.test(message) ||
      /createAdminClient/i.test(message);

    return NextResponse.json(
      {
        error: missingServiceRole
          ? "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor. Sin esa clave no se pueden crear cuentas desde /admin."
          : "No pudimos crear la cuenta.",
      },
      { status: 500 }
    );
  }
}
